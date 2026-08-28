// ─── CV text extraction ───────────────────────────────────────────────────────
// Almost nobody keeps their CV as plain text. It is a PDF, or a Word file
// exported from Canva or Google Docs — and asking someone to open it, select
// all, and paste is the step where they give up and skip the profile entirely.
// A profile that never gets filled in is a cover letter that cites nothing.
//
// The parsers are heavy (pdfjs is about a megabyte), so both are imported
// dynamically. An instance with 512 MB of RAM should not carry them for every
// request when most requests are searches.

export const MAX_CV_BYTES = 5 * 1024 * 1024;   // 5 MB — a CV that big is scanned images
export const MAX_CV_CHARS = 20_000;            // what the personalize prompt can use

export type CvFileKind = 'pdf' | 'docx' | 'text';

/**
 * Decided by extension rather than the browser's MIME type, which is
 * inconsistent across platforms — Windows reports .docx as everything from
 * `application/octet-stream` to nothing at all.
 */
export function cvFileKind(filename: string): CvFileKind | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (['txt', 'md', 'rtf'].includes(ext)) return 'text';
  return null;
}

/**
 * Collapses the whitespace that PDF extraction always produces: a page of
 * positioned text comes back with stray line breaks mid-sentence and runs of
 * spaces where the layout had columns. Left alone it wastes prompt tokens and
 * reads as noise to the model.
 */
export function tidyCvText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CV_CHARS);
}

export async function extractCvText(
  buffer: ArrayBuffer,
  kind: CvFileKind,
): Promise<string> {
  if (kind === 'text') {
    return tidyCvText(new TextDecoder().decode(buffer));
  }

  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return tidyCvText(value);
  }

  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return tidyCvText(Array.isArray(text) ? text.join('\n') : text);
}

/**
 * A scanned CV — a photo of paper inside a PDF — extracts to nothing or to a
 * handful of stray characters. Saying so beats saving an empty profile and
 * letting the user discover later that their letters cite no experience.
 */
export function looksEmpty(text: string): boolean {
  return text.replace(/\s/g, '').length < 100;
}
