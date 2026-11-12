import { describe, expect, it } from 'vitest';
import { rollAmount } from './motion';

describe('rollAmount', () => {
  it('part de l’ancienne valeur et finit exactement sur la nouvelle', () => {
    expect(rollAmount(9000, 8900, 0)).toBe(9000);
    expect(rollAmount(9000, 8900, 1)).toBe(8900);
    expect(rollAmount(0, 7, 0.999)).toBe(7);
  });

  it('reste borné hors de [0, 1]', () => {
    expect(rollAmount(100, 200, -0.5)).toBe(100);
    expect(rollAmount(100, 200, 1.5)).toBe(200);
  });

  it('passe par des entiers intermédiaires, dans l’ordre, à la hausse comme à la baisse', () => {
    const up = [0.25, 0.5, 0.75].map(t => rollAmount(0, 150, t));
    expect(up).toEqual([38, 75, 113]);
    const down = [0.25, 0.5, 0.75].map(t => rollAmount(9000, 8000, t));
    expect(down).toEqual([8750, 8500, 8250]);
  });
});
