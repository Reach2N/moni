/**
 * The public homepage surface. It is deliberately light-only: the visual
 * contract is a white canvas with a small secondary band, even when the host
 * operating system is using dark mode. The owner dashboard under /app is a
 * separate legacy surface and is not changed here.
 */

/**
 * Declares "JavaScript is running on this page" before the body paints, which
 * is what lets the scroll entrances hide their start state in CSS instead of
 * from a layout effect that cannot run until hydration. See the scroll
 * entrances block at the bottom of globals.css for the rules it gates.
 *
 * It is an inline script rather than next/script because the only thing that
 * matters is that it runs during parsing, ahead of the markup below it. Any
 * deferred or hydration-time equivalent lands after first paint, which is the
 * bug this exists to remove.
 *
 * The timer is the failsafe. Setting the attribute is a promise that something
 * will un-hide the content, and src/lib/motion/gsap.ts republishes GSAP on
 * window as soon as it is imported, so an absent window.gsap several seconds in
 * means the motion bundle never arrived. Dropping the attribute then is the
 * difference between a page with no animation and a page with no words.
 */
const MOTION_FLAG = `(function(){var d=document.documentElement;d.dataset.motion='on';
setTimeout(function(){if(!window.gsap){delete d.dataset.motion}},6000)})()`

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="moni-hig min-h-dvh bg-surface text-label">
      <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
      {children}
    </div>
  )
}
