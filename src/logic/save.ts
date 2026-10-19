import { CATALOGUE } from '../data/catalogue';
import { initialProgression, type Progression } from './progression';

// Format persistant : ADR 0005. Toute évolution = version + 1 et une migration.
export const SAVE_KEY = 'gacha.save';
export const SAVE_VERSION = 1;

type Data = Record<string, unknown>;
// Migration de la version N (clé) vers N + 1.
export type Migrations = Readonly<Record<number, (data: Data) => Data>>;
const MIGRATIONS: Migrations = {};

export type SaveStatus = 'new' | 'loaded' | 'corrupted';

const KNOWN_IDS = new Set(CATALOGUE.map(i => i.id));

export function serializeSave(p: Progression): string {
  return JSON.stringify({ version: SAVE_VERSION, currency: p.currency, owned: p.owned });
}

export function parseSave(
  raw: string | null,
  migrations: Migrations = MIGRATIONS,
): { progression: Progression; status: SaveStatus } {
  if (raw === null) return { progression: initialProgression(), status: 'new' };
  const progression = decode(raw, migrations);
  return progression
    ? { progression, status: 'loaded' }
    : { progression: initialProgression(), status: 'corrupted' };
}

function decode(raw: string, migrations: Migrations): Progression | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || !Number.isInteger(data.version)) return null;

  while ((data.version as number) < SAVE_VERSION) {
    const migrate = migrations[data.version as number];
    if (!migrate) return null;
    data = migrate(data);
    if (!isObject(data) || !Number.isInteger(data.version)) return null;
  }
  if (data.version !== SAVE_VERSION) return null;

  const { currency, owned } = data;
  if (!Number.isInteger(currency) || (currency as number) < 0 || !isObject(owned)) return null;

  const kept: Record<string, number> = {};
  for (const [id, count] of Object.entries(owned)) {
    if (!Number.isInteger(count) || (count as number) < 1) return null;
    // Le catalogue est provisoire : un élément retiré disparaît sans casser la partie.
    if (KNOWN_IDS.has(id)) kept[id] = count as number;
  }
  return { currency: currency as number, owned: kept };
}

function isObject(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
