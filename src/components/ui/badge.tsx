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

// DESIGN §7.3 override: Badge uses rounded-full
// Academic state variants per DESIGN §6.3
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

        // Academic enrollment state variants (DESIGN §6.3)
        aprobada: "border-transparent bg-state-aprobada text-state-aprobada-foreground",
        "en-curso": "border-transparent bg-state-en-curso text-state-en-curso-foreground",
        cancelada: "border-transparent bg-state-cancelada text-state-cancelada-foreground",
        reprobada: "border-transparent bg-state-reprobada text-state-reprobada-foreground",
        pendiente: "border-transparent bg-state-pendiente text-state-pendiente-foreground",
        habilitada: "border-transparent bg-state-habilitada text-state-habilitada-foreground",
        bloqueada: "border-transparent bg-state-bloqueada text-state-bloqueada-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Icon mapping per academic state (DESIGN §6.3) */
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

export { Badge, badgeVariants };
