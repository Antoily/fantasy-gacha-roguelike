import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 n'attrape pas les promesses rejetées : sans ce wrapper, la moindre
// erreur Prisma (base injoignable, contrainte violée) laisse la requête pendre
// jusqu'au timeout côté client et lève un `unhandledRejection` côté serveur.
// Toute route async doit passer par ici.
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
