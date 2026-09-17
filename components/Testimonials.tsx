import Image from 'next/image';
import Reveal from '@/components/Reveal';

// Says who this is for, in real users' own words. Kurt and Ditha agreed to their
// first name, photo and quote being shown. Quotes stay exactly as they wrote
// them, in Taglish, with an English line underneath for readers who need one.
//
// The remote-work photo sits beside the heading and the quotes get a row of
// their own underneath, so each quote reads as a person's card rather than a
// caption on the photo. On a phone it stacks: heading, photo, quotes.

const TESTIMONIALS = [
  {
    name: 'Kurt',
    photo: '/testimonials/kurt.jpg',
    focus: '68% 24%', // mirror selfie — the face sits upper right
    quote: 'Yung consistent mag-apply araw-araw mahirap pero buti na lng mas napadali',
    english: 'Staying consistent with applying every day is hard, but good thing it got so much easier.',
  },
  {
    name: 'Ditha',
    photo: '/testimonials/ditha.jpg',
    focus: '50% 18%',
    quote: 'Mas easy mag-apply ngayon',
    english: 'Applying is so much easier now.',
  },
];

export default function Testimonials() {
  return (
    <div>
      <div className="grid items-center gap-7 sm:grid-cols-2 sm:gap-10">
        <Reveal from="left">
          <h2 className="text-center sm:text-left text-[24px] sm:text-[34px] font-extrabold tracking-tight text-slate-900 leading-tight text-balance">
            Built for Filipino freelancers
          </h2>
          <p className="text-center sm:text-left text-[15px] sm:text-base text-slate-600 mt-3 leading-relaxed">
            VAs, support, admin, design and bookkeeping, from Manila to Davao.
          </p>
        </Reveal>

        <Reveal from="right" delay={150}>
          {/* The source is portrait; a landscape crop keeps the laptop and the
              coffee, which is the part that says "working remotely". */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10">
            <Image
              src="/testimonials/remote-work.jpg"
              alt=""
              fill
              sizes="(min-width: 640px) 420px, 100vw"
              className="object-cover object-[50%_62%]"
            />
          </div>
        </Reveal>
      </div>

      <div className="mt-8 sm:mt-10 grid gap-4 sm:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} from="up" delay={i * 150} className="h-full">
            <figure className="h-full flex flex-col bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-900/5">
              <blockquote>
                <p lang="fil" className="text-[16px] font-semibold text-slate-900 leading-snug">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p lang="en" className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  {t.english}
                </p>
              </blockquote>
              {/* mt-auto pins the name to the bottom, so the two cards line up
                  even though one quote is three times longer than the other. */}
              <figcaption className="flex items-center gap-2.5 mt-auto pt-5">
                <Image
                  src={t.photo}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  style={{ objectPosition: t.focus }}
                />
                <span className="text-sm font-bold text-slate-900">{t.name}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
