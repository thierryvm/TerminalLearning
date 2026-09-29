/**
 * Opaque strip behind the iOS status bar.
 *
 * Installed on the home screen (`black-translucent` + `viewport-fit=cover`),
 * iOS 26 lays its Liquid Glass edge blur over the top of the app, about 40pt
 * past the status bar: the top bar and the landing nav (GitHub, login) sat
 * inside that blur and looked like they slid under the clock (reported by
 * @thierry on an iPhone 14, 29 September 2026). iOS leaves the edge alone
 * when a fixed box with a background covers the top edge, and shows that
 * box's color instead. This strip is that box, in the app's background color.
 *
 * Its height is env(safe-area-inset-top): 0 in a Safari tab and on desktop,
 * so it only exists where the status bar overlaps the page.
 */
export function StatusBarBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-testid="status-bar-backdrop"
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[env(safe-area-inset-top)] bg-[var(--github-bg)]"
    />
  );
}
