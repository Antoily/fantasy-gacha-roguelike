import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', async (req: Request, res: Response) => {
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

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? '', { expiresIn: '30d' });
  res.status(201).json({ token, userId: user.id });
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) { res.status(400).json({ message: 'Champs requis.' }); return; }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Identifiants incorrects.' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? '', { expiresIn: '30d' });
  res.json({ token, userId: user.id });
});

export default router;
