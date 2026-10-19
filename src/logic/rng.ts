// Le hasard est injecté partout (constitution IV) : en jeu on passe Math.random,
// en test un générateur à graine fixe pour rejouer un tirage à l'identique.
export type Rng = () => number;

// mulberry32 : 32 bits d'état, qualité suffisante pour des tests statistiques
// sur un million de tirages, et aucune dépendance.
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
