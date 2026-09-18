import CrossfadePhoto from '@/components/CrossfadePhoto';
import { GALLERY_PAIRS } from '@/components/SideGallery';

// The same photos as the side columns, for the screens that have no side: below
// xl they pass through in a band instead. Used with the permission of the people
// in them, and decoration only — no names, no quotes, nothing that presents them
// as customers.
//
// The row is rendered twice and slid exactly half its width, which puts the
// copy where the original started: the loop never shows a gap or a jump. Both
// copies of a photo swap on the same clock, so the seam stays invisible.
// Hovering pauses it, in case someone wants to look at one.
//
// Reduced motion leaves it still and makes the band scrollable by hand, so the
// photos past the edge are still reachable.

export default function PhotoStrip() {
  return (
    <div
      aria-hidden="true"
      className="xl:hidden py-8 overflow-x-auto motion-safe:overflow-hidden
                 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="flex w-max gap-3 animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
        {[...GALLERY_PAIRS, ...GALLERY_PAIRS].map((pair, i) => (
          <CrossfadePhoto
            key={`${pair[0].src}-${i}`}
            pair={pair}
            sizes="320px"
            className="w-64 sm:w-80 aspect-[3/4] shrink-0 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5"
          />
        ))}
      </div>
    </div>
  );
}
