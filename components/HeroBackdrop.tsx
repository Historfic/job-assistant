import Image from 'next/image';

// Behind the landing-page hero: soft drifting glows at every width, and a photo
// down each empty side from xl up.
//
// Pure CSS in a server component. The hero is on screen at load, so all of this
// plays immediately rather than waiting for a script to hydrate.
//
// The side panels are placed against this full-width box, not hung off the
// centre column with vw units: 100vw includes the scrollbar on Windows, so a
// vw-sized panel came out a scrollbar's width off and the gap to the screen
// edge differed from side to side. 23rem is half the 42rem column plus a 2rem
// gap, the same gap the panels keep from the screen edge.
//
// Photos only from xl. Narrower, the margin would hold a sliver of photo, and a
// phone has no side at all.

export default function HeroBackdrop() {
  return (
    <div aria-hidden="true">
      {/* Faded out toward the bottom, so the glows end softly rather than at a
          clipped line where the hero meets the next section. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        <div className="absolute -top-24 left-[8%] w-72 h-72 sm:w-[30rem] sm:h-[30rem] rounded-full bg-blue-400/35 blur-3xl animate-drift-a motion-reduce:animate-none" />
        <div className="absolute top-[18%] right-[6%] w-64 h-64 sm:w-[26rem] sm:h-[26rem] rounded-full bg-sky-300/45 blur-3xl animate-drift-b motion-reduce:animate-none" />
        <div className="absolute top-[38%] left-[34%] w-60 h-60 sm:w-[24rem] sm:h-[24rem] rounded-full bg-indigo-400/30 blur-3xl animate-drift-c motion-reduce:animate-none" />
      </div>

      <div className="hidden xl:block absolute top-16 bottom-0 left-8 right-[calc(50%+23rem)] rounded-3xl overflow-hidden animate-wipe-in motion-reduce:animate-none">
        <Image
          src="/testimonials/remote-work.jpg"
          alt=""
          fill
          sizes="30vw"
          className="object-cover animate-slow-zoom motion-reduce:animate-none"
        />
      </div>

      <div className="hidden xl:block absolute top-16 bottom-0 right-8 left-[calc(50%+23rem)] rounded-3xl overflow-hidden animate-wipe-in-right motion-reduce:animate-none">
        <Image
          src="/hero/home-desk.jpg"
          alt=""
          fill
          sizes="30vw"
          className="object-cover animate-slow-zoom motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}
