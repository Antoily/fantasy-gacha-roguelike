import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  // Top 20 by best zones cleared, then rooms cleared
  const topProgress = await prisma.progress.findMany({
    orderBy: [{ bestZones: 'desc' }, { bestRooms: 'desc' }],
    take: 20,
    include: { user: { select: { username: true } } },
  });

  const entries = topProgress.map((p, i) => ({
    rank: i + 1,
    username: p.user.username,
    bestZones: p.bestZones,
    bestRooms: p.bestRooms,
  }));

  res.json({ entries });
}));

export default router;
