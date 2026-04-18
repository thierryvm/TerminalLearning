import * as React from 'react';
import { Button } from './button';

type ButtonProps = React.ComponentProps<typeof Button>;

type SidebarLessonButtonProps = Omit<ButtonProps, 'variant' | 'size'>;

export function SidebarLessonButton(props: SidebarLessonButtonProps) {
  return <Button variant="tl-sidebar-lesson" size="tl-sidebar-lesson" {...props} />;
}
