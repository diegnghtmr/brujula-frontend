import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Skeleton — decorative loading placeholder (DESIGN §6.15).
 *
 * Renders an animated `bg-muted` bar. Respects `prefers-reduced-motion`
 * via `motion-reduce:animate-none`. The element is `aria-hidden` by default
 * because the accessible "loading" announcement comes from the wrapping
 * `role="status"` container that each usage site must provide.
 */
function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-muted animate-pulse motion-reduce:animate-none rounded-md",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
