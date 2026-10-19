import type { Rng } from './rng';

// Générateur scripté pour les tests : rend les valeurs dans l'ordre, puis échoue
// bruyamment si le code en consomme plus que prévu.
export function scriptedRng(values: readonly number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`scriptedRng épuisé après ${values.length} valeurs`);
    return values[i++]!;
  };
}
