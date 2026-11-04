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

/** `lessons.config`: hearts per day, XP for a first / perfect first completion, daily lesson goal. */
export const lessonsConfigSchema = z
  .object({
    heartsPerDay: z.number().int().min(1),
    xpFirst: z.number().int().min(1),
    xpPerfect: z.number().int().min(1),
    dailyGoal: z.number().int().min(1),
  })
  .refine((config) => config.xpPerfect >= config.xpFirst, {
    message: 'xpPerfect must be at least xpFirst',
    path: ['xpPerfect'],
  });

export type LessonsConfig = z.infer<typeof lessonsConfigSchema>;

/** `path.config` (weekly-path): nodes per monthly path, chest XP and the distance origin. */
export const pathConfigSchema = z.object({
  nodes: z.number().int().min(1).max(7),
  chestXp: z.number().int().min(0),
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export type PathConfig = z.infer<typeof pathConfigSchema>;

/** `trip.config` (trip-plan): alert delay, time limits and the gear-list thresholds. */
export const tripConfigSchema = z.object({
  alertDelayMin: z.number().int().min(0),
  maxDurationH: z.number().int().min(1),
  planAheadDays: z.number().int().min(0),
  startGraceMin: z.number().int().min(0),
  gear: z.object({
    waterLPerHour: z.number().positive(),
    waterMinL: z.number().min(0),
    frostMaxC: z.number(),
    sunMinC: z.number(),
    headlampWithinMinOfSunset: z.number().int().min(0),
  }),
});

export type TripConfig = z.infer<typeof tripConfigSchema>;

/** `trip.active` (active-trip): ping cadence, waypoint XP rules, SOS cooldown and the live-link window. */
export const tripActiveConfigSchema = z.object({
  pingEveryMin: z.number().int().min(1),
  waypoint: z.object({
    xp: z.number().int().min(0),
    minDistanceM: z.number().int().min(0),
    minGapMin: z.number().int().min(0),
    maxPerTrip: z.number().int().min(0),
    maxAccuracyM: z.number().min(0),
  }),
  sosCooldownSec: z.number().int().min(0),
  liveAfterCheckoutH: z.number().min(0),
});

export type TripActiveConfig = z.infer<typeof tripActiveConfigSchema>;

const metres = z.number().int().min(1);

/** `checkIn.config` (check-in): XP per difficulty 1–5, radius per place type, fix limits, demo quota. */
export const checkInConfigSchema = z.object({
  xpByDifficulty: z.array(z.number().int().min(1)).length(MAX_DIFFICULTY),
  radiusMByType: z.object({
    peak: metres,
    waterfall: metres,
    cave: metres,
    lake: metres,
    canyon: metres,
    camping: metres,
    trail: metres,
  }),
  maxAccuracyM: z.number().min(0),
  maxAgeHours: z.number().min(0),
  demoPerIpPerDay: z.number().int().min(0),
});

export type CheckInConfig = z.infer<typeof checkInConfigSchema>;
/** `streaks.config` (streaks): free freezes per Asia/Tashkent month, shared by flame and boot. */
export const streaksConfigSchema = z.object({
  freezesPerMonth: z.number().int().min(0),
});

export type StreaksConfig = z.infer<typeof streaksConfigSchema>;
export type LevelRow = z.infer<typeof levelRowSchema>;
export type LevelTable = z.infer<typeof levelTableSchema>;
export type DailyCaps = z.infer<typeof dailyCapsSchema>;
