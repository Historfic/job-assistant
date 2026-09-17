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
// Only from xl, like the hero photos: narrower, the margin has no room.

type Card = {
  src: string;
  top: string;
  tilt: string;
  align: string;
  /** negative, so the cards are already out of step when the page loads */
  floatDelay: string;
  focus?: string;
};

const LEFT: Card[] = [
  { src: '/gallery/laptop-selfie.jpg', top: 'top-[3%]',  tilt: '-rotate-3', align: 'justify-end',   floatDelay: '0s' },
  { src: '/gallery/cafe-laptop.jpg',   top: 'top-[37%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-2.5s', focus: 'object-[35%_45%]' },
  { src: '/gallery/bed-laptop.jpg',    top: 'top-[71%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-5s' },
];

const RIGHT: Card[] = [
  { src: '/gallery/headphones.jpg',    top: 'top-[14%]', tilt: 'rotate-3',  align: 'justify-start', floatDelay: '-1.5s' },
  { src: '/gallery/zoom-call.jpg',     top: 'top-[48%]', tilt: '-rotate-2', align: 'justify-end',   floatDelay: '-4s', focus: 'object-top' },
  { src: '/gallery/matcha-laptop.jpg', top: 'top-[80%]', tilt: 'rotate-2',  align: 'justify-start', floatDelay: '-6s' },
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
