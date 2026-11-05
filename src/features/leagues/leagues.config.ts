import { z } from 'zod';
import { DEFAULT_LEAGUE_CONFIG } from './leagues.constants.js';

const movementSchema = z.object({
  min: z.number().int().min(2).max(15),
  promote: z.number().int().min(0).max(15),
  demote: z.number().int().min(0).max(15),
});

export const leagueConfigSchema = z.object({
  startAt: z.string().datetime(),
  settlementHours: z.number().int().min(0).max(168),
  divisionCapacity: z.number().int().min(2).max(15),
  xpThresholds: z.tuple([
    z.literal(0),
    z.number().int().positive(),
    z.number().int().positive(),
    z.number().int().positive(),
    z.number().int().positive(),
  ]),
  movement: z.array(movementSchema).length(3),
});

export type LeagueConfig = z.infer<typeof leagueConfigSchema>;
export const FALLBACK_LEAGUE_CONFIG: LeagueConfig = {
  startAt: DEFAULT_LEAGUE_CONFIG.startAt,
  settlementHours: DEFAULT_LEAGUE_CONFIG.settlementHours,
  divisionCapacity: DEFAULT_LEAGUE_CONFIG.divisionCapacity,
  xpThresholds: [...DEFAULT_LEAGUE_CONFIG.xpThresholds],
  movement: DEFAULT_LEAGUE_CONFIG.movement.map((row) => ({ ...row })),
};
