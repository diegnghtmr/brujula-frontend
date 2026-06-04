import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Ignore generated code and build output
  globalIgnores(["dist", "src/api/generated", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // FCC-001: Forbid direct axios imports outside the generated client directory.
      // All API calls must go through the generated *Api classes and src/api/client.ts.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "Direct axios imports are forbidden. Use the generated API client from '@/api/client' instead.",
            },
          ],
          patterns: [
            {
              group: ["axios/*"],
              message:
                "Direct axios imports are forbidden. Use the generated API client from '@/api/client' instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Allow direct axios import in the client configuration file and generated code
    files: ["src/api/client.ts", "src/api/generated/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
