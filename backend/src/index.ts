import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import progressRoutes from './routes/progress';
import runsRoutes from './routes/runs';
import leaderboardRoutes from './routes/leaderboard';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-game-domain.com'] // replace with real domain
    : '*',
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/progress', progressRoutes);
app.use('/runs', runsRoutes);
app.use('/leaderboard', leaderboardRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Route introuvable.' }));

app.listen(PORT, () => {
  console.log(`🚀 Backend lancé sur le port ${PORT}`);
});

export default app;
