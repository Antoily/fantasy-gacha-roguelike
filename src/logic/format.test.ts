import { describe, expect, it } from 'vitest';
import { formatAmount } from './format';

describe('formatAmount', () => {
  it.each([[0, '0'], [900, '900'], [9000, '9 000'], [1234567, '1 234 567']])('%d → %s', (n, s) => {
    expect(formatAmount(n)).toBe(s.replace(/ /g, '\u00a0'));
  });
});
