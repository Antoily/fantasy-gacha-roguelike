import { Router, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { zonesCleared, roomsCleared, victory, goldEarned, heroesUsed } = req.body as {
    zonesCleared?: number;
    roomsCleared?: number;
    victory?: boolean;
    goldEarned?: number;
    heroesUsed?: string[];
  };

  if (zonesCleared === undefined || roomsCleared === undefined || victory === undefined) {
    res.status(400).json({ message: 'Champs requis manquants.' });
    return;
  }

  const run = await prisma.run.create({
    data: {
      userId: req.userId!,
      zonesCleared,
      roomsCleared,
      victory,
      goldEarned: goldEarned ?? 0,
      heroesUsed: heroesUsed ?? [],
    },
  });
  res.status(201).json({ run });
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const runs = await prisma.run.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ runs });
}));

export default router;
