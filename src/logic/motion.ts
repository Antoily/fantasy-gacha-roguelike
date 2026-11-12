// Montant affiché pendant qu'il défile (007, révision du 2026-11-09 : FR-015).
// progress de 0 à 1 ; hors bornes, la valeur reste celle du départ ou de l'arrivée, et
// l'arrivée est exacte : les montants sont entiers.
export function rollAmount(from: number, to: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return Math.round(from + (to - from) * t);
}
