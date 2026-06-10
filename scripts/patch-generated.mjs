#!/usr/bin/env node
/**
 * patch-generated.mjs
 *
 * Post-generate patch for DEBT-F7-005 (and related generator incompatibilities).
 *
 * Problems fixed by this script:
 *
 * 1. PAGE MODEL COLLAPSE (OfferingPage / SimulationPage / StaffPage)
 *    The OpenAPI TypeScript-Axios generator collapses `allOf(PageMeta + {content: T[]})` to a
 *    bare `PageMeta` alias, dropping the `content` field. Source files that access `.content` on
 *    these types get TS2339 errors. The fix: rewrite the three model files to restore the
 *    `& { content: T[] }` intersection type, matching the OpenAPI spec intent.
 *
 * 2. PARAMETER PROPERTIES IN base.ts (erasableSyntaxOnly violation)
 *    The generator emits constructor parameter properties (`protected basePath: string = …`,
 *    `public field: string`) in BaseAPI and RequiredError. TypeScript 5.5+ with
 *    `erasableSyntaxOnly: true` (required for Node.js native TypeScript strip-types support)
 *    disallows this syntax. The fix: rewrite the constructors to use explicit field declarations
 *    and assignments instead of parameter properties.
 *
 * This script is called automatically via the `postapi:generate` npm hook after every
 * `pnpm api:generate` run. It is idempotent: safe to run on already-patched files.
 *
 * Usage:
 *   node scripts/patch-generated.mjs          # called automatically via postapi:generate
 *   node scripts/patch-generated.mjs --check  # dry-run: exit 1 if any file needs patching
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GENERATED = resolve(ROOT, "src/api/generated");
const GENERATED_MODELS = resolve(GENERATED, "models");

const CHECK_MODE = process.argv.includes("--check");

// ---------------------------------------------------------------------------
// Patch 1: Page model collapse — restore content: T[] intersection
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PagePatchTarget
 * @property {string} file          - filename inside src/api/generated/models/
 * @property {string} typeName      - TypeScript type name (e.g. "OfferingPage")
 * @property {string} contentType   - the T in content: T[] (e.g. "Offering")
 * @property {string} contentImport - relative import for content type (e.g. "./offering")
 */

/** @type {PagePatchTarget[]} */
const PAGE_PATCH_TARGETS = [
  {
    file: "offering-page.ts",
    typeName: "OfferingPage",
    contentType: "Offering",
    contentImport: "./offering",
  },
  {
    file: "simulation-page.ts",
    typeName: "SimulationPage",
    contentType: "Simulation",
    contentImport: "./simulation",
  },
  {
    file: "staff-page.ts",
    typeName: "StaffPage",
    contentType: "Staff",
    contentImport: "./staff",
  },
];

/**
 * Patch a Page model file to restore the content field.
 * Preserves the generator header comment block verbatim.
 *
 * @param {string} original
 * @param {PagePatchTarget} target
 * @returns {{ content: string, changed: boolean }}
 */
function patchPageModel(original, target) {
  const { typeName, contentType, contentImport } = target;

  // Already patched: contains the intersection type
  const patchedPattern = new RegExp(
    `export type ${typeName} = PageMeta & \\{ content: ${contentType}\\[\\] \\};`
  );
  if (patchedPattern.test(original)) {
    return { content: original, changed: false };
  }

  const lines = original.split("\n");
  // Find end of the generator banner (the first line that is exactly " */")
  const bannerEndIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "*/");
  const bannerLines = bannerEndIdx >= 0 ? lines.slice(0, bannerEndIdx + 1) : [];

  const patched = [
    ...bannerLines,
    "",
    `import type { ${contentType} } from '${contentImport}';`,
    `import type { PageMeta } from './page-meta';`,
    "",
    `/**`,
    ` * @type ${typeName}`,
    ` * Generator bug workaround: allOf(PageMeta + content) collapses to PageMeta alias.`,
    ` * Manually restored content field from OpenAPI spec.`,
    ` */`,
    `export type ${typeName} = PageMeta & { content: ${contentType}[] };`,
    "",
  ].join("\n");

  return { content: patched, changed: true };
}

// ---------------------------------------------------------------------------
// Patch 2: base.ts — remove parameter properties (erasableSyntaxOnly fix)
// ---------------------------------------------------------------------------

const BASE_TS_PATH = resolve(GENERATED, "base.ts");

/**
 * Rewrite the constructor parameter properties in BaseAPI and RequiredError
 * to use explicit field declarations + body assignments, compatible with
 * `erasableSyntaxOnly: true`.
 *
 * Generator pattern (BEFORE):
 *   constructor(config?: Configuration, protected basePath: string = BASE_PATH, protected axios: AxiosInstance = globalAxios) { ... }
 *   constructor(public field: string, msg?: string) { ... }
 *
 * Patched form (AFTER):
 *   protected basePath: string;
 *   protected axios: AxiosInstance;
 *   constructor(config?: Configuration, basePath: string = BASE_PATH, axios: AxiosInstance = globalAxios) {
 *     this.basePath = basePath;
 *     this.axios = axios;
 *     ...original body...
 *   }
 *
 * @param {string} original
 * @returns {{ content: string, changed: boolean }}
 */
function patchBaseTs(original) {
  // Already patched guard: check that the parameter properties are gone
  if (
    !original.includes("protected basePath: string = BASE_PATH") &&
    !original.includes("protected axios: AxiosInstance = globalAxios") &&
    !original.includes("public field: string")
  ) {
    return { content: original, changed: false };
  }

  let patched = original;

  // --- BaseAPI constructor ---
  // Before: constructor(configuration?: Configuration, protected basePath: string = BASE_PATH, protected axios: AxiosInstance = globalAxios) {
  // After:  constructor(configuration?: Configuration, basePath: string = BASE_PATH, axios: AxiosInstance = globalAxios) {
  //         with field declarations added to the class body before the constructor
  patched = patched.replace(
    /constructor\(configuration\?: Configuration, protected basePath: string = BASE_PATH, protected axios: AxiosInstance = globalAxios\)/,
    "constructor(configuration?: Configuration, basePath: string = BASE_PATH, axios: AxiosInstance = globalAxios)"
  );

  // Add field declarations before the constructor in BaseAPI class
  patched = patched.replace(
    /export class BaseAPI \{\s*protected configuration: Configuration \| undefined;/,
    [
      "export class BaseAPI {",
      "    protected configuration: Configuration | undefined;",
      "    protected basePath: string;",
      "    protected axios: AxiosInstance;",
      "",
    ].join("\n")
  );

  // Add field assignments at start of BaseAPI constructor body
  // The original body is:
  //   if (configuration) {
  //       this.configuration = configuration;
  //       this.basePath = configuration.basePath ?? basePath;
  //   }
  // We need to add: this.basePath = basePath; this.axios = axios; BEFORE the if block
  patched = patched.replace(
    /constructor\(configuration\?: Configuration, basePath: string = BASE_PATH, axios: AxiosInstance = globalAxios\) \{\s*(if \(configuration\))/,
    [
      "constructor(configuration?: Configuration, basePath: string = BASE_PATH, axios: AxiosInstance = globalAxios) {",
      "        this.basePath = basePath;",
      "        this.axios = axios;",
      "        $1",
    ].join("\n")
  );

  // --- RequiredError constructor ---
  // Before: constructor(public field: string, msg?: string) {
  // After:  field: string; constructor(field: string, msg?: string) { this.field = field; ... }
  // For RequiredError: super must be called before accessing this.
  // Before: constructor(public field: string, msg?: string) {
  //             super(msg);
  //             this.name = "RequiredError"
  //         }
  // After:  field: string;
  //         constructor(field: string, msg?: string) {
  //             super(msg);
  //             this.field = field;
  //             this.name = "RequiredError"
  //         }
  patched = patched.replace(
    /export class RequiredError extends Error \{\s*constructor\(public field: string, msg\?: string\) \{\s*super\(msg\);/,
    [
      "export class RequiredError extends Error {",
      "    field: string;",
      "    constructor(field: string, msg?: string) {",
      "        super(msg);",
      "        this.field = field;",
    ].join("\n")
  );

  return { content: patched, changed: true };
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

/** @type {Array<{ label: string, file: string, patch: () => { content: string, changed: boolean } }>} */
const ALL_PATCHES = [
  ...PAGE_PATCH_TARGETS.map((target) => ({
    label: `models/${target.file}`,
    file: resolve(GENERATED_MODELS, target.file),
    patch: () => {
      const orig = readFileSync(resolve(GENERATED_MODELS, target.file), "utf-8");
      return patchPageModel(orig, target);
    },
  })),
  {
    label: "base.ts",
    file: BASE_TS_PATH,
    patch: () => {
      const orig = readFileSync(BASE_TS_PATH, "utf-8");
      return patchBaseTs(orig);
    },
  },
];

let anyPatchNeeded = false;
let patchCount = 0;

for (const { label, file, patch } of ALL_PATCHES) {
  if (!existsSync(file)) {
    if (CHECK_MODE) {
      console.error(`[patch-generated] MISSING: ${label} (run pnpm api:generate first)`);
      anyPatchNeeded = true;
    } else {
      console.warn(`[patch-generated] SKIP: ${label} not found`);
    }
    continue;
  }

  const { content: patched, changed } = patch();

  if (!changed) {
    console.log(`[patch-generated] OK (already patched): ${label}`);
    continue;
  }

  if (CHECK_MODE) {
    console.error(
      `[patch-generated] NEEDS PATCH: ${label} — run pnpm api:generate to re-apply`
    );
    anyPatchNeeded = true;
  } else {
    writeFileSync(file, patched, "utf-8");
    console.log(`[patch-generated] PATCHED: ${label}`);
    patchCount++;
  }
}

const total = ALL_PATCHES.length;
if (CHECK_MODE) {
  if (anyPatchNeeded) {
    console.error("\n[patch-generated] Check FAILED — some files need patching");
    process.exit(1);
  } else {
    console.log("\n[patch-generated] Check PASSED — all files correctly patched");
    process.exit(0);
  }
} else {
  console.log(
    `\n[patch-generated] Done. ${patchCount} file(s) patched, ${total - patchCount} already correct.`
  );
}
