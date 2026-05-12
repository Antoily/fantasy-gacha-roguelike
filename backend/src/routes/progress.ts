import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const progress = await prisma.progress.findUnique({ where: { userId: req.userId } });
  if (!progress) { res.status(404).json({ message: 'Progression introuvable.' }); return; }
  res.json({ progress });
});

router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { progress } = req.body as {
    progress?: {
      unlockedHeroIds?: string[];
      ownedRelicIds?: string[];
      totalGold?: number;
      talentTree?: unknown;
      gachaState?: unknown;
      bestZones?: number;
      bestRooms?: number;
    };
  };
  if (!progress) { res.status(400).json({ message: 'Corps invalide.' }); return; }

  const updated = await prisma.progress.upsert({
    where: { userId: req.userId },
    create: {
      userId: req.userId!,
      unlockedHeroIds: progress.unlockedHeroIds ?? [],
      ownedRelicIds: progress.ownedRelicIds ?? [],
      totalGold: progress.totalGold ?? 0,
      talentTree: (progress.talentTree as object) ?? {},
      gachaState: (progress.gachaState as object) ?? {},
      bestZones: progress.bestZones ?? 0,
      bestRooms: progress.bestRooms ?? 0,
    },
    update: {
      unlockedHeroIds: progress.unlockedHeroIds,
      ownedRelicIds: progress.ownedRelicIds,
      totalGold: progress.totalGold,
      talentTree: progress.talentTree as object,
      gachaState: progress.gachaState as object,
      bestZones: progress.bestZones,
      bestRooms: progress.bestRooms,
    },
  });
  res.json({ progress: updated });
});

export default router;
