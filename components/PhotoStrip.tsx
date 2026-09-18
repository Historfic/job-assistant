import Image from 'next/image';
import { GALLERY_PHOTOS } from '@/components/SideGallery';

// The same photos as the side columns, for the screens that have no side: below
// xl they pass through in a band instead. Used with the permission of the people
// in them, and decoration only — no names, no quotes, nothing that presents them
// as customers.
//
// The row is rendered twice and slid exactly half its width, which puts the
// copy where the original started: the loop never shows a gap or a jump.
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
        {[...GALLERY_PHOTOS, ...GALLERY_PHOTOS].map((photo, i) => (
          <div
            key={`${photo.src}-${i}`}
            className="relative w-64 sm:w-80 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-md shadow-slate-900/5"
          >
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="320px"
              className={`object-cover ${photo.focus ?? ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
