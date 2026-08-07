import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-lg font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 disabled:grayscale min-h-14 px-6 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:text-white active:bg-[var(--brand)] active:text-white",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] border-2 border-[var(--border-strong)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] active:bg-[var(--primary-hover)] active:text-white",
        outline:
          "border-2 border-[var(--border-strong)] bg-white text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] active:bg-[var(--primary-hover)] active:text-white",
        danger:
          "bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] hover:text-white active:bg-[#6b1515] active:text-white",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white active:bg-[var(--primary-hover)] active:text-white",
      },
      size: {
        default: "min-h-14 px-6 text-lg",
        large: "min-h-16 px-8 text-xl",
        small: "min-h-11 px-4 text-base",
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
