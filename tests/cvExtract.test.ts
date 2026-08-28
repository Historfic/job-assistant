import { describe, it, expect } from 'vitest';
import { cvFileKind, tidyCvText, looksEmpty, MAX_CV_CHARS } from '@/lib/cvExtract';

describe('cvFileKind', () => {
  it('reads the extension, not the browser MIME type', () => {
    // Windows reports .docx as anything from octet-stream to nothing at all,
    // so the filename is the only reliable signal.
    expect(cvFileKind('Rafael CV.pdf')).toBe('pdf');
    expect(cvFileKind('resume.DOCX')).toBe('docx');
    expect(cvFileKind('notes.txt')).toBe('text');
  });

  it('rejects formats we cannot read', () => {
    expect(cvFileKind('cv.doc')).toBeNull();     // legacy binary Word
    expect(cvFileKind('cv.pages')).toBeNull();
    expect(cvFileKind('photo.jpg')).toBeNull();
    expect(cvFileKind('noextension')).toBeNull();
  });
});

describe('tidyCvText', () => {
  it('collapses the whitespace PDF extraction leaves behind', () => {
    expect(tidyCvText('Virtual   Assistant \n  4 years')).toBe('Virtual Assistant\n4 years');
  });

  it('keeps paragraph breaks but drops the runs of blank lines', () => {
    expect(tidyCvText('One\n\n\n\nTwo')).toBe('One\n\nTwo');
  });

  it('normalises Windows line endings', () => {
    expect(tidyCvText('One\r\nTwo')).toBe('One\nTwo');
  });

  it('caps the length so one CV cannot dominate the prompt', () => {
    expect(tidyCvText('a'.repeat(MAX_CV_CHARS + 5_000))).toHaveLength(MAX_CV_CHARS);
  });
});

describe('looksEmpty', () => {
  it('flags a scanned CV, which extracts to almost nothing', () => {
    expect(looksEmpty('')).toBe(true);
    expect(looksEmpty('   \n \n  ')).toBe(true);
    expect(looksEmpty('Page 1')).toBe(true);
  });

  it('accepts a real one', () => {
    expect(looksEmpty('Virtual Assistant with four years of experience. '.repeat(4))).toBe(false);
  });
});
