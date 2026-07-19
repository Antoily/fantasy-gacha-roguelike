import 'dotenv/config';

// Un secret absent ne doit JAMAIS dégrader en silence : avec
// `process.env.JWT_SECRET ?? ''`, tous les tokens étaient signés et vérifiés
// avec la chaîne vide — n'importe qui pouvait forger un token pour n'importe
// quel userId. On préfère un backend qui refuse de démarrer.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
      `La renseigner dans backend/.env avant de démarrer le serveur.`,
    );
  }
  return value;
}

export const JWT_SECRET = required('JWT_SECRET');

export const JWT_EXPIRES_IN = '30d';

export const PORT = parseInt(process.env.PORT ?? '4000', 10);

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Origines autorisées par CORS. En production, la liste doit venir de
// l'environnement : la valeur codée en dur était `https://your-game-domain.com`,
// un placeholder qui aurait bloqué le vrai frontend le jour de la mise en ligne.
// En développement, tout est autorisé — c'est sans conséquence en local.
export const CORS_ORIGIN: string[] | '*' = IS_PRODUCTION
  ? required('CORS_ORIGIN').split(',').map(o => o.trim()).filter(Boolean)
  : '*';
