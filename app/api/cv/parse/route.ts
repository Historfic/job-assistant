// ─── POST /api/cv/parse ───────────────────────────────────────────────────────
// Turns an uploaded CV into plain text for the cover-letter prompt.
//
// Parsing happens on the server because the PDF and Word parsers are about a
// megabyte of JavaScript each. Shipping them to every visitor to serve the
// minority who upload a file would slow the landing page for everyone.
//
// Nothing is stored here. The text goes back to the browser, the user sees it
// and can edit it, and only then does saving the profile write anything.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  extractCvText, cvFileKind, looksEmpty, MAX_CV_BYTES,
} from '@/lib/cvExtract';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
  }

  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json({
      error: 'That file is over 5 MB. A CV that large is usually scanned pages — export it as a PDF from Word or Google Docs instead.',
    }, { status: 413 });
  }

  const kind = cvFileKind(file.name);
  if (!kind) {
    return NextResponse.json({
      error: 'Please upload a PDF, Word (.docx) or plain text file.',
    }, { status: 415 });
  }

  try {
    const text = await extractCvText(await file.arrayBuffer(), kind);

    if (looksEmpty(text)) {
      return NextResponse.json({
        error: kind === 'pdf'
          // The common case: a phone photo of a printed CV saved as a PDF.
          // There is no text in it to find, and saying "parse failed" would
          // send the user hunting for a problem with our software.
          ? 'We could not read any text from that PDF. If it is a scan or a photo, save it from Word or Google Docs instead, or paste your experience below.'
          : 'That file seems to be empty.',
      }, { status: 422 });
    }

    return NextResponse.json({ text, chars: text.length, filename: file.name });
  } catch (err) {
    console.error('[/api/cv/parse]', err);
    return NextResponse.json({
      error: 'We could not read that file. Try a different format, or paste your experience below.',
    }, { status: 500 });
  }
}
