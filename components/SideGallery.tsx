import Reveal from '@/components/Reveal';
import CrossfadePhoto, { type PhotoPair } from '@/components/CrossfadePhoto';

// Photos of freelancers at work, down the empty sides of the page below the
// hero, so the wide margins beside the centre column are not bare. Used with
// the permission of the people in them. Decoration only: no names, no quotes,
// nothing that presents them as customers. The testimonials are the only
// place on the page that speaks for a user.
//
// Every slot holds two photos and trades between them, all on the same clock,
// so the page turns over as one.
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

export const GALLERY_PAIRS: PhotoPair[] = [
  [{ src: '/gallery/laptop-selfie.jpg' }, { src: '/gallery/bed-excel.jpg', focus: 'object-[30%_50%]' }],
  [{ src: '/gallery/headphones.jpg' }, { src: '/gallery/cafe-macbook.jpg' }],
  [{ src: '/gallery/cafe-laptop.jpg', focus: 'object-[35%_45%]' }, { src: '/gallery/dual-monitors.jpg', focus: 'object-[38%_50%]' }],
  [{ src: '/gallery/zoom-call.jpg', focus: 'object-top' }, { src: '/gallery/lap-terrace.jpg' }],
  [{ src: '/gallery/bed-laptop.jpg' }, { src: '/gallery/hills-coffee.jpg' }],
  // The hero's home-desk photo is the sixth partner: five new photos for six
  // slots, and reusing one of the five would put the same picture on both
  // sides of the screen at once, since they all change together.
  [{ src: '/gallery/matcha-laptop.jpg' }, { src: '/hero/home-desk.jpg' }],
];

type Card = {
  pair: PhotoPair;
  top: string;
  tilt: string;
  align: string;
  /** negative, so the cards are already out of step when the page loads */
  floatDelay: string;
};

const LEFT: Card[] = [
  { pair: GALLERY_PAIRS[0], top: 'top-[3%]',  tilt: '-rotate-3', align: 'justify-end',   floatDelay: '0s' },
  { pair: GALLERY_PAIRS[2], top: 'top-[37%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-2.5s' },
  { pair: GALLERY_PAIRS[4], top: 'top-[71%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-5s' },
];

const RIGHT: Card[] = [
  { pair: GALLERY_PAIRS[1], top: 'top-[14%]', tilt: 'rotate-3',  align: 'justify-start', floatDelay: '-1.5s' },
  { pair: GALLERY_PAIRS[3], top: 'top-[48%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-4s' },
  { pair: GALLERY_PAIRS[5], top: 'top-[80%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-6s' },
];

function Column({ cards, side }: { cards: Card[]; side: 'left' | 'right' }) {
  return (
    <div
      className={`hidden xl:block pointer-events-none absolute inset-y-0 ${
        side === 'left' ? 'left-8 right-[calc(50%+23rem)]' : 'right-8 left-[calc(50%+23rem)]'
      }`}
    >
      {cards.map(card => (
        <div key={card.pair[0].src} className={`absolute inset-x-0 ${card.top} flex ${card.align}`}>
          <Reveal from={side} duration={1100} className="w-full max-w-[22rem]">
            <div className="animate-float motion-reduce:animate-none" style={{ animationDelay: card.floatDelay }}>
              <div className={`${card.tilt} rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/10`}>
                <CrossfadePhoto pair={card.pair} sizes="352px" className="aspect-[3/4] rounded-xl" />
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
