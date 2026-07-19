import { Router, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// `ownedRelicIds` et `talentTree` ne sont plus acceptés : reliques et arbre de
// talents sont hors design (la seule progression méta est le déblocage de
// héros). Les colonnes existent encore en base avec leurs valeurs par défaut —
// leur suppression demande une migration, à faire séparément.
interface ProgressPayload {
  unlockedHeroIds?: string[];
  totalGold?: number;
  gachaState?: object;
  bestZones?: number;
  bestRooms?: number;
}

router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const progress = await prisma.progress.findUnique({ where: { userId: req.userId! } });
  if (!progress) { res.status(404).json({ message: 'Progression introuvable.' }); return; }
  res.json({ progress });
}));

router.put('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { progress } = req.body as { progress?: ProgressPayload };
  if (!progress) { res.status(400).json({ message: 'Corps invalide.' }); return; }

  const updated = await prisma.progress.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      unlockedHeroIds: progress.unlockedHeroIds ?? [],
      totalGold: progress.totalGold ?? 0,
      gachaState: progress.gachaState ?? {},
      bestZones: progress.bestZones ?? 0,
      bestRooms: progress.bestRooms ?? 0,
    },
    update: {
      unlockedHeroIds: progress.unlockedHeroIds,
      totalGold: progress.totalGold,
      gachaState: progress.gachaState,
      bestZones: progress.bestZones,
      bestRooms: progress.bestRooms,
    },
  });
  res.json({ progress: updated });
}));

export default router;
