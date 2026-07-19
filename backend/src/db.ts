import { PrismaClient } from '@prisma/client';

// Client Prisma unique pour tout le backend. Chaque fichier de routes en
// instanciait un : quatre pools de connexions distincts vers la même base,
// pour rien. Prisma gère déjà le pooling en interne — un seul client suffit.
export const prisma = new PrismaClient();
