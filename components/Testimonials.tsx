import Image from 'next/image';
import Reveal from '@/components/Reveal';

// Says who this is for, in real users' own words. Kurt and Ditha agreed to their
// first name, photo and quote being shown. Quotes stay exactly as they wrote
// them, in Taglish, with an English line underneath for readers who need one.
//
// Sits in the same centre column as every other section, the two quotes side
// by side. The remote-work photo that used to be here lives beside the hero.
// On scroll the heading rises in, then the quotes one after the other.

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
      <Reveal from="up">
        <h2 className="text-center text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-900 text-balance">
          Built for Filipino freelancers
        </h2>
        <p className="text-center text-[15px] text-slate-600 mt-2.5">
          VAs, support, admin, design and bookkeeping, from Manila to Davao.
        </p>
      </Reveal>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} from="up" delay={250 + i * 200} className="h-full">
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
