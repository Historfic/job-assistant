import { LegalPage, Section, CONTACT_EMAIL } from '../legal';

// Written against what the schema actually stores (supabase/migrations/) rather
// than a template. If a table or a third party changes, this page changes too —
// a privacy notice that drifts from the code is worse than none, because it is
// a written claim that is no longer true.

export const metadata = {
  title: 'Privacy Policy — EasyClient',
  description: 'What EasyClient collects, why, who it is shared with, and your rights under the Data Privacy Act.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-slate-600">
        EasyClient is a job search tool for Filipino freelancers, operated from the
        Philippines. This page explains exactly what we collect, why, and what you can
        make us do about it. It is written to comply with the{' '}
        <strong className="text-slate-900 font-semibold">Data Privacy Act of 2012 (RA 10173)</strong>.
      </p>

      <Section heading="What we collect">
        <p>Only what the product needs to work:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-slate-900 font-semibold">Your email address and name</strong> — from signing up, or from Google if you use Google sign-in. Used to identify your account and send you what you asked for.</li>
          <li><strong className="text-slate-900 font-semibold">Your searches</strong> — the keyword and which job sites you searched. Used to enforce your daily search limit.</li>
          <li><strong className="text-slate-900 font-semibold">Jobs you mark applied or rejected</strong> — so we stop showing you the same listings.</li>
          <li><strong className="text-slate-900 font-semibold">Your career profile and CV text</strong> — only if you choose to add it. Used to personalise cover letters.</li>
          <li><strong className="text-slate-900 font-semibold">Your OnlineJobs.ph session</strong> — only if you connect it, and only after you agree to a notice that says we are storing it.</li>
        </ul>
        <p>
          We do not collect payment card details. There is no card on file, because payment
          happens outside the app by GCash or bank transfer.
        </p>
      </Section>

      <Section heading="Your OnlineJobs.ph connection">
        <p>
          Connecting your OnlineJobs.ph account is <strong className="text-slate-900 font-semibold">optional</strong>.
          The product works without it; connecting only improves cover letter personalisation.
        </p>
        <p>
          <strong className="text-slate-900 font-semibold">We never ask for or store your OnlineJobs password.</strong>{' '}
          What is stored is a session token, encrypted with AES-256-GCM before it touches
          the database, so it is unreadable to anyone who obtained a copy of the data
          without also holding the encryption key.
        </p>
        <p>
          You can disconnect it at any time from your dashboard, which deletes the stored
          session immediately.
        </p>
      </Section>

      <Section heading="Who else sees your data">
        <p>
          We do not sell your data, and we do not share it for advertising. We use these
          service providers to run the product, and each sees only what it needs:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-slate-900 font-semibold">Supabase</strong> — accounts and database.</li>
          <li><strong className="text-slate-900 font-semibold">Render</strong> — hosting.</li>
          <li><strong className="text-slate-900 font-semibold">Apify</strong> — collects public job listings. Receives your search keyword, not your identity.</li>
          <li><strong className="text-slate-900 font-semibold">Anthropic and OpenRouter</strong> — analyse job listings and draft cover letters. Receive job text and, if you added one, your CV text.</li>
          <li><strong className="text-slate-900 font-semibold">Google</strong> — only if you choose Google sign-in.</li>
          <li><strong className="text-slate-900 font-semibold">Gmail / SMTP</strong> — only when you ask us to email a set of results to yourself.</li>
        </ul>
        <p>
          Some of these process data outside the Philippines. Where that happens, it is done
          under each provider&apos;s own contractual data protection terms.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          For as long as your account exists. Delete your account and everything tied to it
          is deleted with it — searches, saved jobs, career profile, and any
          OnlineJobs connection.
        </p>
        <p>
          Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:text-blue-700 font-medium">{CONTACT_EMAIL}</a>{' '}
          to have your account deleted. We do it by hand, normally within a few days.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>Under the Data Privacy Act you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Be told what we hold about you</li>
          <li>Get a copy of it</li>
          <li>Have anything wrong corrected</li>
          <li>Have it erased or blocked</li>
          <li>Object to how we are using it</li>
          <li>Complain to the National Privacy Commission</li>
        </ul>
        <p>
          To use any of these, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:text-blue-700 font-medium">{CONTACT_EMAIL}</a>.
          You do not need to give a reason, and it costs nothing.
        </p>
      </Section>

      <Section heading="Security, honestly stated">
        <p>
          Passwords are handled by Supabase and never stored by us in readable form.
          OnlineJobs sessions are encrypted. Database access is restricted per user by
          row-level security, so one account cannot read another&apos;s data.
        </p>
        <p>
          No system is perfectly secure, and we will not pretend otherwise. If data of
          yours is ever exposed, we will tell you and the National Privacy Commission, as
          the law requires.
        </p>
      </Section>

      <Section heading="Children">
        <p>EasyClient is for people aged 18 and over. We do not knowingly collect data from minors.</p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes in a way that affects you, we will say so on this page and
          update the date at the top. Continuing to use EasyClient after that means you
          accept the change.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions, requests, or complaints:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:text-blue-700 font-medium">{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
