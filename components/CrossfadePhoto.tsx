import Image from 'next/image';

// One photo slot that keeps swapping between two photos.
//
// Both images are stacked and always loaded; the top one fades in and out over
// the bottom one. Swapping the `src` of a single tag instead would show a blank
// frame on a slow connection, and the browser could not fade between two states
// of one element.
//
// Every slot runs on the same clock, with no per-card offset: the whole page
// turns over at once, which is what the owner asked for.

export interface Photo {
  src: string;
  /** object-position, where centring would cut the person out */
  focus?: string;
}

export type PhotoPair = [Photo, Photo];

export default function CrossfadePhoto({
  pair,
  sizes,
  className = '',
}: {
  pair: PhotoPair;
  sizes: string;
  className?: string;
}) {
  const [first, second] = pair;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={first.src} alt="" fill sizes={sizes} className={`object-cover ${first.focus ?? ''}`} />
      <div className="absolute inset-0 animate-crossfade motion-reduce:animate-none">
        <Image src={second.src} alt="" fill sizes={sizes} className={`object-cover ${second.focus ?? ''}`} />
      </div>
    </div>
  );
}
