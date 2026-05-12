# Fantasy Roguelike Gacha

A mobile roguelike with tactical formation combat and a gacha collection system.

## Stack

- **Frontend**: Phaser.js (TypeScript) + Vite + Capacitor (Android/iOS)
- **Backend**: Node.js + Express + PostgreSQL + Prisma

## Project Structure

```
gamingadd/
├── frontend/   # Phaser.js game
├── backend/    # Node.js REST API
└── assets/     # AI image generation prompts
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env  # fill in your DB URL and JWT secret
npx prisma migrate dev
npm run dev
```

## Android Build

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

## Gameplay

1. **Formation phase**: Place your heroes on a 3×3 grid before each fight
2. **Auto-combat**: Combat resolves automatically based on positions and synergies
3. **Run structure**: Corridor of rooms — combats, events, shop, rest, boss
4. **Gacha**: Spend gold to draw heroes and relics (pity at 80 pulls)
5. **Meta-progression**: Permanent talent tree unlocked between runs

## Contributing

All PRs, commits, and CI are managed autonomously by Claude Code.
