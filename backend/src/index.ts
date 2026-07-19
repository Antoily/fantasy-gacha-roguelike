import express from 'express';
import cors from 'cors';
// Importé en premier : lit .env et vérifie les variables obligatoires.
// Un secret manquant doit faire échouer le démarrage, pas dégrader en silence.
import { PORT, CORS_ORIGIN } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import progressRoutes from './routes/progress';
import runsRoutes from './routes/runs';
import leaderboardRoutes from './routes/leaderboard';

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/progress', progressRoutes);
app.use('/runs', runsRoutes);
app.use('/leaderboard', leaderboardRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// Doit rester le dernier `use` : Express identifie le handler d'erreur à ses
// quatre paramètres, et ne l'atteint que si rien avant n'a répondu.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend lancé sur le port ${PORT}`);
});

export default app;
