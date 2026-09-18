import Image from 'next/image';
import Reveal from '@/components/Reveal';

// Photos of freelancers at work, down the empty sides of the page below the
// hero, so the wide margins beside the centre column are not bare. Used with
// the permission of the people in them. Decoration only: no names, no quotes,
// nothing that presents them as customers. The testimonials are the only
// place on the page that speaks for a user.
//
// Staggered, not in rows: the left and right cards sit at different heights,
// so the eye zigzags down with the page instead of reading a grid.
//
// Each card slides in from its own side when scrolled to, then floats gently.
// The slide, the float and the tilt each live on their own wrapper because
// all three are transforms, and one element holds only one transform.
//
// Only from xl. Narrower, the margin has no room — PhotoStrip shows the same
// photos there instead.

export interface GalleryPhoto {
  src: string;
  /** object-position, where centring would cut the person out */
  focus?: string;
}

export const GALLERY_PHOTOS: GalleryPhoto[] = [
  { src: '/gallery/laptop-selfie.jpg' },
  { src: '/gallery/headphones.jpg' },
  { src: '/gallery/cafe-laptop.jpg', focus: 'object-[35%_45%]' },
  { src: '/gallery/zoom-call.jpg', focus: 'object-top' },
  { src: '/gallery/bed-laptop.jpg' },
  { src: '/gallery/matcha-laptop.jpg' },
];

const photo = (src: string) => GALLERY_PHOTOS.find(p => p.src.includes(src))!;

type Card = GalleryPhoto & {
  top: string;
  tilt: string;
  align: string;
  /** negative, so the cards are already out of step when the page loads */
  floatDelay: string;
};

const LEFT: Card[] = [
  { ...photo('laptop-selfie'), top: 'top-[3%]',  tilt: '-rotate-3', align: 'justify-end',   floatDelay: '0s' },
  { ...photo('cafe-laptop'),   top: 'top-[37%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-2.5s' },
  { ...photo('bed-laptop'),    top: 'top-[71%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-5s' },
];

const RIGHT: Card[] = [
  { ...photo('headphones'),    top: 'top-[14%]', tilt: 'rotate-3',  align: 'justify-start', floatDelay: '-1.5s' },
  { ...photo('zoom-call'),     top: 'top-[48%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-4s' },
  { ...photo('matcha-laptop'), top: 'top-[80%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-6s' },
];

function Column({ cards, side }: { cards: Card[]; side: 'left' | 'right' }) {
  return (
    <div
      className={`hidden xl:block pointer-events-none absolute inset-y-0 ${
        side === 'left' ? 'left-8 right-[calc(50%+23rem)]' : 'right-8 left-[calc(50%+23rem)]'
      }`}
    >
      {cards.map(card => (
        <div key={card.src} className={`absolute inset-x-0 ${card.top} flex ${card.align}`}>
          <Reveal from={side} duration={1100} className="w-full max-w-[15rem]">
            <div className="animate-float motion-reduce:animate-none" style={{ animationDelay: card.floatDelay }}>
              <div className={`${card.tilt} rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/10`}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                  <Image
                    src={card.src}
                    alt=""
                    fill
                    sizes="240px"
                    className={`object-cover ${card.focus ?? ''}`}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

export default function SideGallery() {
  return (
    <div aria-hidden="true">
      <Column cards={LEFT} side="left" />
      <Column cards={RIGHT} side="right" />
    </div>
  );
}
