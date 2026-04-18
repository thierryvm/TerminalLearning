import * as React from 'react';
import { Button } from './button';
import { cn } from './utils';

type ButtonProps = React.ComponentProps<typeof Button>;

interface EnvPillProps extends Omit<ButtonProps, 'variant' | 'size'> {
  active?: boolean;
  activeClassName?: string;
}

export function EnvPill({
  active = false,
  activeClassName,
  className,
  ...props
}: EnvPillProps) {
  return (
    <Button
      variant="tl-env-pill"
      size="tl-env-pill"
      aria-pressed={active}
      className={cn(active && activeClassName, className)}
      {...props}
    />
  );
}
