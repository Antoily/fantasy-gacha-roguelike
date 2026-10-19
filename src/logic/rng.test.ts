import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('rejoue exactement la même suite pour une même graine', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const suiteA = Array.from({ length: 50 }, a);
    const suiteB = Array.from({ length: 50 }, b);
    expect(suiteA).toEqual(suiteB);
  });

  it('donne une autre suite pour une autre graine', () => {
    const a = Array.from({ length: 10 }, mulberry32(1));
    const b = Array.from({ length: 10 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('reste dans [0, 1) et couvre tout l’intervalle', () => {
    const rng = mulberry32(7);
    const values = Array.from({ length: 100_000 }, rng);
    expect(values.every(v => v >= 0 && v < 1)).toBe(true);
    // Un générateur cassé (constante, moitié d'intervalle) échoue ici.
    expect(Math.min(...values)).toBeLessThan(0.001);
    expect(Math.max(...values)).toBeGreaterThan(0.999);
  });
});
