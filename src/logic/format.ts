// Séparateur de milliers : espace insécable (U+00A0), pour qu'un montant ne soit jamais
// coupé en fin de ligne. Pas `toLocaleString('fr-FR')` : son espace fine (U+202F)
// manque dans certaines polices et s'affiche en carré.
export function formatAmount(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}
