import * as React from 'react';
import { Button } from './button';

type ButtonProps = React.ComponentProps<typeof Button>;

interface SidebarRowButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  locked?: boolean;
}

export function SidebarRowButton({
  locked = false,
  ...props
}: SidebarRowButtonProps) {
  return (
    <Button
      variant={locked ? 'tl-sidebar-row-locked' : 'tl-sidebar-row'}
      size="tl-sidebar-row"
      {...props}
    />
  );
}
