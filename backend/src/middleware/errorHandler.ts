import type { Request, Response, NextFunction } from 'express';
import { IS_PRODUCTION } from '../config';

// Dernier filet : renvoie toujours du JSON (le handler par défaut d'Express
// renvoie du HTML, que le client ne sait pas lire — `res.json()` échouerait).
// Le détail de l'erreur ne sort pas en production.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error('[erreur non gérée]', err);

  res.status(500).json({
    message: 'Erreur serveur.',
    ...(IS_PRODUCTION ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}
