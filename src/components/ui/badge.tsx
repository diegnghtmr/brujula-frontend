import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Circle,
  Zap,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Badge uses rounded-full (overrides shadcn default)
// Academic state variants
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Standard shadcn variants
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",

        // Semantic state variants
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",

        // Academic enrollment state variants (subtle/outline/muted mapping)
        aprobada: "border-transparent bg-success-subtle text-success-subtle-foreground",
        "en-curso": "border-transparent bg-info-subtle text-info-subtle-foreground",
        cancelada: "border-transparent bg-warning-subtle text-warning-subtle-foreground",
        reprobada: "border-transparent bg-destructive-subtle text-destructive-subtle-foreground",
        pendiente: "border-transparent bg-muted text-muted-foreground",
        habilitada: "border border-success bg-background text-success-subtle-foreground",
        bloqueada: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Icon mapping per academic state. */
const ACADEMIC_STATE_ICONS: Partial<
  Record<NonNullable<BadgeProps["variant"]>, LucideIcon>
> = {
  aprobada: CheckCircle2,
  "en-curso": Clock,
  cancelada: XCircle,
  reprobada: AlertTriangle,
  pendiente: Circle,
  habilitada: Zap,
  bloqueada: Lock,
};

/** Label mapping per academic state (for screen readers and tooltips) */
// eslint-disable-next-line react-refresh/only-export-components -- ACADEMIC_STATE_LABELS is a companion constant required by consuming components (CourseStatusBadge). Splitting to a separate file would create a circular dependency with BadgeProps.
export const ACADEMIC_STATE_LABELS: Partial<
  Record<NonNullable<BadgeProps["variant"]>, string>
> = {
  aprobada: "Aprobada",
  "en-curso": "En curso",
  cancelada: "Cancelada",
  reprobada: "Reprobada",
  pendiente: "Pendiente",
  habilitada: "Habilitada",
  bloqueada: "Bloqueada",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showIcon?: boolean;
}

function Badge({ className, variant, showIcon = false, children, ...props }: BadgeProps) {
  const Icon =
    showIcon && variant ? ACADEMIC_STATE_ICONS[variant as keyof typeof ACADEMIC_STATE_ICONS] : undefined;

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children ?? (variant ? ACADEMIC_STATE_LABELS[variant as keyof typeof ACADEMIC_STATE_LABELS] : null)}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- badgeVariants must be co-exported with Badge so consumers (e.g. Link elements styled as badges) can apply the same variants without rendering a Badge wrapper.
export { Badge, badgeVariants };
