/**
 * ValidationNoticeList — FE-006, DET-003
 *
 * Renders blocking notices in role="alert" (distinct).
 * Renders warnings in an advisory region (role="region" with label).
 * Both sections shown when both present.
 */

import type { SimulationValidation } from "@/api/generated/models/simulation-validation";
import type { ValidationNotice } from "@/api/generated/models/validation-notice";
import { cn } from "@/lib/utils";

interface ValidationNoticeListProps {
  validation: SimulationValidation;
}

function NoticeItem({ notice }: { notice: ValidationNotice }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-xs">{notice.code}</span>
      <span className="text-xs">{notice.message}</span>
    </div>
  );
}

function ValidationNoticeList({ validation }: ValidationNoticeListProps) {
  const hasBlocking = validation.blocking.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (!hasBlocking && !hasWarnings) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Blocking notices — role="alert" so screen-reader announces immediately */}
      {hasBlocking && (
        <div
          role="alert"
          className={cn(
            "p-3 rounded border",
            "bg-red-50 border-red-300 text-red-900",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-200"
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            {/* WCAG: icon + label (not color alone) */}
            <span aria-hidden="true" className="font-bold text-red-600 dark:text-red-400">✕</span>
            <span className="text-xs font-bold uppercase tracking-wide">Bloqueos activos</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {validation.blocking.map((notice, idx) => (
              <NoticeItem key={`blocking-${idx}`} notice={notice} />
            ))}
          </div>
        </div>
      )}

      {/* Warning notices — advisory region, not role="alert" */}
      {hasWarnings && (
        <div
          role="region"
          aria-label="Advertencias"
          className={cn(
            "p-3 rounded border",
            "bg-yellow-50 border-yellow-300 text-yellow-900",
            "dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200"
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            {/* WCAG: icon + label (not color alone) */}
            <span aria-hidden="true" className="font-bold text-yellow-600 dark:text-yellow-400">▲</span>
            <span className="text-xs font-bold uppercase tracking-wide">Advertencias</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {validation.warnings.map((notice, idx) => (
              <NoticeItem key={`warning-${idx}`} notice={notice} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { ValidationNoticeList };
