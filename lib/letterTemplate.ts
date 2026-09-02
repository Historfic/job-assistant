// ─── Cover letter template ────────────────────────────────────────────────────
// The shape a generated letter starts from, and the one thing about the output
// a user can actually control.
//
// A starting point, not a cage. Employers routinely hide instructions in the
// job post — "tell me about a project you built", "name the tools you use",
// "start your reply with the word BANANA" — and those are a filter. A letter
// that follows a template through one of those is discarded unread, so the
// prompt is explicit that the job post outranks this.
//
// Before this, the letter came back however the model felt like writing it.
// Someone who applies twenty times a week has their own voice and their own
// structure, and no way to say so — the only options were accept it or rewrite
// it by hand every time.
//
// The bracketed parts are instructions to the model, not text to leave in. A
// letter that reaches an employer still saying "[Client's Name]" is worse than
// no letter, so the prompt is explicit that every bracket must be replaced or
// the line dropped.

export const DEFAULT_LETTER_TEMPLATE = `Hi [Client's Name],

I came across your job post and noticed you're looking for someone who can help with [specific task from the job description].

I've been building my skills in [relevant skill], and I even created portfolio projects similar to what you're looking for. I attached them below so you can see how I approach this type of work.

I also noticed [something specific about their business, website, or social media], and I already have a few ideas that might help.

I'd love the opportunity to discuss how I can contribute to your team. Looking forward to hearing from you!`;

export const MAX_TEMPLATE_CHARS = 3_000;

/** Falls back to the default when a user has cleared theirs to nothing. */
export function letterTemplateOrDefault(template?: string | null): string {
  const trimmed = (template ?? '').trim();
  return trimmed.length > 0 ? trimmed.slice(0, MAX_TEMPLATE_CHARS) : DEFAULT_LETTER_TEMPLATE;
}

/**
 * Anything in [square brackets] is a slot the model must fill from the job and
 * the CV. Used to tell it exactly which ones it is responsible for, so it
 * cannot quietly leave one in.
 */
export function templateSlots(template: string): string[] {
  return [...new Set(template.match(/\[[^\]]{1,80}\]/g) ?? [])];
}
