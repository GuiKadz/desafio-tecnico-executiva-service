import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border-2 border-border bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 active:not-aria-[haspopup]:translate-y-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[var(--shadow-brutal)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[var(--shadow-brutal-lg)] active:translate-y-0 active:translate-x-0 active:shadow-[var(--shadow-brutal-sm)]',
        accent:
          'bg-accent text-accent-foreground shadow-[var(--shadow-brutal)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[var(--shadow-brutal-lg)] active:translate-y-0 active:translate-x-0 active:shadow-[var(--shadow-brutal-sm)]',
        outline:
          'border-border bg-background shadow-[var(--shadow-brutal-sm)] hover:bg-secondary hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[var(--shadow-brutal)] active:translate-y-0 active:translate-x-0 active:shadow-none',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
        ghost:
          'border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive:
          'bg-destructive text-white shadow-[var(--shadow-brutal)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[var(--shadow-brutal-lg)] active:translate-y-0 active:translate-x-0 active:shadow-[var(--shadow-brutal-sm)]',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-1.5 px-4 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-6 gap-1 px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 px-3 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10',
        'icon-xs':
          "size-6 in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 in-data-[slot=button-group]:rounded-md',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
