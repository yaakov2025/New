import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[opacity,transform,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-fg shadow-[0_1px_1px_rgb(0_0_0_/_0.08),0_8px_20px_-8px_rgb(47_93_86_/_0.55)] hover:-translate-y-px hover:shadow-[0_1px_1px_rgb(0_0_0_/_0.08),0_14px_28px_-10px_rgb(47_93_86_/_0.65)] hover:brightness-[1.06]",
        secondary:
          "bg-surface text-fg shadow-[0_0_0_1px_var(--color-border)] hover:-translate-y-px hover:bg-surface-2 hover:shadow-[0_0_0_1px_var(--color-border),0_6px_16px_-8px_rgb(28_25_21_/_0.25)]",
        ghost: "text-fg hover:bg-surface-2",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_var(--color-border)] hover:-translate-y-px hover:border-primary hover:bg-surface hover:shadow-[0_0_0_1px_var(--color-primary),0_6px_16px_-8px_rgb(28_25_21_/_0.2)]",
        danger:
          "bg-danger text-primary-fg shadow-[0_8px_20px_-8px_rgb(155_58_50_/_0.55)] hover:-translate-y-px hover:brightness-[1.06]",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-5",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
