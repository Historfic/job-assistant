// Says who this is for, visually. Decorative only — these are not customers
// and make no claim to be, which is why there are no names or quotes attached.
// Testimonials stay out until real ones exist.
//
// Drop four photos into /public as filipino-1.jpg … filipino-4.jpg. Until they
// exist, the slots render as quiet placeholders rather than broken images.

const SLOTS = [1, 2, 3, 4];
const HAS_PHOTOS = process.env.NEXT_PUBLIC_HAS_PEOPLE_PHOTOS === 'true';

export default function FilipinoStrip() {
  return (
    <div>
      <h2 className="text-center text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-900 text-balance">
        Built for Filipino freelancers
      </h2>
      <p className="text-center text-[15px] text-slate-600 mt-2.5">
        VAs, support, admin, design, bookkeeping — from Manila to Davao.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
        {SLOTS.map(n => (
          <div key={n} className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-200 border border-slate-300">
            {HAS_PHOTOS ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/filipino-${n}.jpg`}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full grid place-items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Photo {n}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
