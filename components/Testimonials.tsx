import Image from 'next/image';
import Reveal from '@/components/Reveal';

// Says who this is for, in real users' own words. Kurt and Ditha agreed to their
// first name, photo and quote being shown. Quotes stay exactly as they wrote
// them, in Taglish, with an English line underneath for readers who need one.
//
// On a wide screen the remote-work photo runs down the left edge of the page,
// full height of the section, filling what was empty margin; the heading and
// the quotes sit to its right. The photo is portrait, which suits a tall side
// panel better than a box beside the heading. Below lg it becomes a banner
// above the heading.

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
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Reveal from="left" className="relative h-56 sm:h-72 lg:h-auto">
        <Image
          src="/testimonials/remote-work.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 34vw, 100vw"
          className="object-cover object-[50%_62%] lg:object-[50%_55%]"
        />
      </Reveal>

      <div className="px-5 py-12 sm:py-14 lg:px-12 lg:py-20">
        <div className="max-w-2xl mx-auto">
          <Reveal from="up">
            <h2 className="text-center lg:text-left text-[24px] sm:text-[30px] lg:text-[34px] font-extrabold tracking-tight text-slate-900 leading-tight text-balance">
              Built for Filipino freelancers
            </h2>
            <p className="text-center lg:text-left text-[15px] sm:text-base text-slate-600 mt-3 leading-relaxed">
              VAs, support, admin, design and bookkeeping, from Manila to Davao.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} from="up" delay={150 + i * 150} className="h-full">
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
      </div>
    </div>
  );
}
