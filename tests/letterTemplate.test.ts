import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LETTER_TEMPLATE, letterTemplateOrDefault, templateSlots, MAX_TEMPLATE_CHARS,
} from '@/lib/letterTemplate';

describe('letterTemplateOrDefault', () => {
  it('falls back when a user clears theirs', () => {
    // Clearing the box should restore the default, not produce a letter with
    // no shape at all.
    for (const v of ['', '   ', null, undefined]) {
      expect(letterTemplateOrDefault(v)).toBe(DEFAULT_LETTER_TEMPLATE);
    }
  });

  it('keeps a template the user actually wrote', () => {
    expect(letterTemplateOrDefault('Hello [Name], I saw your post.'))
      .toBe('Hello [Name], I saw your post.');
  });

  it('caps length so one template cannot dominate the prompt', () => {
    expect(letterTemplateOrDefault('x'.repeat(MAX_TEMPLATE_CHARS + 500)))
      .toHaveLength(MAX_TEMPLATE_CHARS);
  });
});

describe('templateSlots', () => {
  it('finds every bracket the model has to fill', () => {
    const slots = templateSlots(DEFAULT_LETTER_TEMPLATE);
    expect(slots).toContain("[Client's Name]");
    expect(slots).toContain('[relevant skill]');
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });

  it('does not repeat a slot used twice', () => {
    expect(templateSlots('[Name] and again [Name]')).toEqual(['[Name]']);
  });

  it('ignores a runaway bracket rather than swallowing the letter', () => {
    expect(templateSlots(`[${'x'.repeat(200)}]`)).toEqual([]);
  });

  it('returns nothing for a template with no slots', () => {
    expect(templateSlots('Hi, I would like to apply.')).toEqual([]);
  });
});
