/**
 * Opaque strip behind the iOS status bar.
 *
 * Installed on the home screen (`black-translucent` + `viewport-fit=cover`),
 * iOS 26 lays its Liquid Glass edge blur over the top of the app, about 40pt
 * past the status bar: the top bar and the landing nav (GitHub, login) sat
 * inside that blur and looked like they slid under the clock (reported by
 * @thierry on an iPhone 14, 29 September 2026). Several apps report that iOS
 * leaves the edge alone under a fixed box with a background; on that iPhone it
 * did not. So the content starts below the blur (--inset-top), and this strip,
 * in the app's background color, fills the band above it.
 *
 * Its height is --inset-top (theme.css): 0 in a Safari tab and on desktop, so
 * it only exists where the status bar overlaps the page. In the installed app
 * on iOS it also covers the 2.5rem clearance kept below the status bar, since
 * the strip alone, as tall as the status bar, did not stop the blur on the
 * device (retested 1 October 2026): what scrolls up under the blur is then
 * this plain color, never text. z-[25]: above the page, under the dimmed
 * overlay (z-30) and the drawer (z-40) of the mobile sidebar.
 */
export function StatusBarBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-testid="status-bar-backdrop"
      className="pointer-events-none fixed inset-x-0 top-0 z-[25] h-[var(--inset-top)] bg-[var(--github-bg)]"
    />
  );
}
