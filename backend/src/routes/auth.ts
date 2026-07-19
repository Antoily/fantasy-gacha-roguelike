import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password || username.length < 3 || password.length < 6) {
    res.status(400).json({ message: 'Identifiant ≥3 chars, mot de passe ≥6 chars requis.' });
    return;
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) { res.status(409).json({ message: 'Ce pseudo est déjà pris.' }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, passwordHash } });
  await prisma.progress.create({ data: { userId: user.id } });

  res.status(201).json({ token: signToken(user.id), userId: user.id });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) { res.status(400).json({ message: 'Champs requis.' }); return; }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Identifiants incorrects.' });
    return;
  }

  res.json({ token: signToken(user.id), userId: user.id });
}));

export default router;
