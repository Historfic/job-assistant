import { LegalPage, Section, CONTACT_EMAIL } from '../legal';
import { PRICE_COPY, REGULAR_PRICE_COPY, FOUNDING_SEATS, TIER_LIMITS } from '@/lib/tiers';

// Deliberately plain. Terms that hide the refund rule in clause 14(b) are how
// you end up arguing with a customer in a Facebook comment thread, which costs
// far more than any refund.

export const metadata = {
  title: 'Terms of Service — EasyClient',
  description: 'What EasyClient promises, what it costs, and what it does not guarantee.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p className="text-slate-600">
        Plain terms for a simple product. Using EasyClient means you accept them.
      </p>

      <Section heading="What EasyClient is">
        <p>
          A search tool. It looks across OnlineJobs.ph, LinkedIn and Upwork at once, ranks
          what it finds by how well it fits you, and can draft a cover letter for a listing
          you like.
        </p>
        <p>
          <strong className="text-slate-900 font-semibold">We are not an employer, a recruiter, or an agency.</strong>{' '}
          We do not post the jobs, we do not vet the clients, and we have no relationship
          with them. Every listing links back to its original post so you can check it
          yourself — please do.
        </p>
      </Section>

      <Section heading="What we do not promise">
        <p>
          We cannot promise you a job, a client, an interview, or income. Nobody honestly
          can. What we promise is that a search saves you time compared with opening three
          sites yourself.
        </p>
        <p>
          Job listings come from other websites. We do not control whether one is accurate,
          still open, or legitimate. Use the same judgement you would use applying
          anywhere — and never pay anyone to be hired.
        </p>
      </Section>

      <Section heading="Free and full access">
        <p>
          Free accounts get <strong className="text-slate-900 font-semibold">{TIER_LIMITS.free.searches} searches
          in total</strong>, on OnlineJobs.ph, showing up to {TIER_LIMITS.free.results} results each,
          with no card and no payment details asked.
        </p>
        <p>
          Full access is <strong className="text-slate-900 font-semibold">{PRICE_COPY}</strong> and adds LinkedIn
          and Upwork, and {TIER_LIMITS.pro.searches} searches a day.
        </p>
        <p>
          The first {FOUNDING_SEATS} members pay {PRICE_COPY} and keep that price for as
          long as they stay subscribed, even after it rises to {REGULAR_PRICE_COPY} for new
          members.
        </p>
      </Section>

      <Section heading="Paying">
        <p>
          Payment is by GCash, BPI or GoTyme. You send the payment and a screenshot of the
          receipt, and we switch your account on by hand — normally within the hour during
          the day.
        </p>
        <p>
          <strong className="text-slate-900 font-semibold">There is no card on file and nothing renews
          automatically.</strong> Nothing can be charged without you deciding to send it. To
          continue another month, you send another payment. To stop, you simply do not —
          there is nothing to cancel and no cancellation fee.
        </p>
      </Section>

      <Section heading="Refunds">
        <p>
          If EasyClient did not give you value in a month you paid for, tell us and we will
          refund that month. No form, no argument.
        </p>
        <p>
          This does not cover a month you already used heavily and are asking for back after
          it ended, and we may decline repeat refunds from the same account.
        </p>
      </Section>

      <Section heading="Fair use">
        <p>Do not:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Share one account between several people</li>
          <li>Resell or republish the results</li>
          <li>Script or automate searches to get around the daily limit</li>
          <li>Use EasyClient to break the terms of OnlineJobs.ph, LinkedIn or Upwork</li>
        </ul>
        <p>
          We may suspend an account doing any of these. Where the cause is honest confusion
          rather than deliberate abuse, we will tell you first.
        </p>
      </Section>

      <Section heading="Interruptions">
        <p>
          EasyClient depends on other companies&apos; websites and services. Any of them can
          change, break, or block access, sometimes without notice. We will fix what we can
          as fast as we can.
        </p>
        <p>
          If a failure on our side loses you a significant part of a month you paid for, ask
          and we will extend it or refund it.
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          You can stop at any time by not paying again, and ask us to delete your account
          whenever you want.
        </p>
        <p>
          We may close an account that breaks these terms. If we close a paid account for
          any other reason, we refund the unused part of the month.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the extent the law allows, our liability is limited to what you paid us in the
          last twelve months. We are not liable for a job you did not get, a client who did
          not pay you, or a listing that turned out to be false.
        </p>
        <p>
          Nothing here removes rights you have under Philippine consumer law.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>These terms are governed by the laws of the Republic of the Philippines.</p>
      </Section>

      <Section heading="Contact">
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:text-blue-700 font-medium">{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
