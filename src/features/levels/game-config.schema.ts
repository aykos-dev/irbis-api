import { z } from 'zod';
import {
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  XP_SOURCES,
} from './levels.constants.js';

const count = z.number().int().min(0);
const difficulty = z.number().int().min(MIN_DIFFICULTY).max(MAX_DIFFICULTY);

export const LEVEL_COUNT = 7;

const levelRowSchema = z
  .object({
    level: z.number().int().min(1).max(LEVEL_COUNT),
    xp: count,
    lessons: z.object({
      kind: z.enum(['count', 'tier', 'all']),
      tier: z.string().min(1).nullable(),
      required: count,
    }),
    checkIns: z.object({ required: count, minDifficulty: difficulty }),
    verifiedSpots: count,
    maxDifficulty: difficulty,
  })
  .refine(
    (row) => (row.lessons.kind === 'tier') === (row.lessons.tier !== null),
    {
      message:
        'lessons.tier is required for kind "tier" and must be null otherwise',
      path: ['lessons', 'tier'],
    },
  );

/** `levels.table`: 7 rows, levels 1..7 in order, XP thresholds never decreasing. */
export const levelTableSchema = z
  .array(levelRowSchema)
  .length(LEVEL_COUNT)
  .refine((rows) => rows.every((row, i) => row.level === i + 1), {
    message: 'levels must be 1..7 in ascending order',
  })
  .refine(
    (rows) => rows.every((row, i) => i === 0 || row.xp >= rows[i - 1].xp),
    {
      message: 'xp thresholds must be non-decreasing',
    },
  );

/** `xp.dailyCaps`: per-source XP cap per Asia/Tashkent day; a source not listed has no cap. */
export const dailyCapsSchema = z.partialRecord(
  z.enum(XP_SOURCES),
  z.number().int().positive(),
);

export type LevelRow = z.infer<typeof levelRowSchema>;
export type LevelTable = z.infer<typeof levelTableSchema>;
export type DailyCaps = z.infer<typeof dailyCapsSchema>;
