import type { LeagueConfig } from './leagues.config.js';
import {
  LEAGUE_TIERS,
  type LeagueMedalCode,
  type LeagueOutcomeCode,
  type LeagueTierCode,
} from './leagues.constants.js';

export interface RankableMember {
  id: string;
  userId: string;
  elevationM: number;
  qualifyingTrips: number;
  enrolledAt: Date;
}

export interface RankedMember extends RankableMember {
  rank: number;
  outcome: LeagueOutcomeCode;
  medal: LeagueMedalCode | null;
  nextTier: LeagueTierCode;
}

export function placementTier(
  xp: number,
  thresholds: LeagueConfig['xpThresholds'],
): LeagueTierCode {
  let index = 0;
  for (let i = 1; i < thresholds.length; i += 1) {
    if (xp >= thresholds[i]) index = i;
  }
  return LEAGUE_TIERS[index];
}

export function movementFor(
  size: number,
  config: LeagueConfig,
): { promote: number; demote: number } {
  const row = config.movement.find((candidate) => size >= candidate.min);
  return row
    ? { promote: row.promote, demote: row.demote }
    : { promote: 0, demote: 0 };
}

export function rankDivision(
  members: RankableMember[],
  tier: LeagueTierCode,
  config: LeagueConfig,
): RankedMember[] {
  const sorted = [...members].sort(
    (a, b) =>
      b.elevationM - a.elevationM ||
      a.enrolledAt.getTime() - b.enrolledAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  let previous: number | null = null;
  let rank = 0;
  const ranks = sorted.map((member, index) => {
    if (member.elevationM !== previous) rank = index + 1;
    previous = member.elevationM;
    return { ...member, rank };
  });
  const movement = movementFor(ranks.length, config);
  const promotionCutoff =
    movement.promote > 0
      ? (ranks[movement.promote - 1]?.elevationM ?? null)
      : null;
  const demotionIndex = ranks.length - movement.demote;
  const demotionCutoff =
    movement.demote > 0 ? (ranks[demotionIndex]?.elevationM ?? null) : null;
  const demotionTieCrosses =
    demotionCutoff !== null &&
    demotionIndex > 0 &&
    ranks[demotionIndex - 1]?.elevationM === demotionCutoff;

  return ranks.map((member) => {
    const promotes =
      promotionCutoff !== null &&
      member.qualifyingTrips > 0 &&
      member.elevationM >= promotionCutoff;
    const demotes =
      tier !== 'scout' &&
      demotionCutoff !== null &&
      (demotionTieCrosses
        ? member.elevationM < demotionCutoff
        : member.elevationM <= demotionCutoff);
    const outcome: LeagueOutcomeCode = promotes
      ? tier === 'legend'
        ? 'champion'
        : 'promoted'
      : demotes
        ? 'demoted'
        : 'stayed';
    const tierIndex = LEAGUE_TIERS.indexOf(tier);
    const nextTier =
      outcome === 'promoted'
        ? LEAGUE_TIERS[Math.min(tierIndex + 1, LEAGUE_TIERS.length - 1)]
        : outcome === 'demoted'
          ? LEAGUE_TIERS[Math.max(tierIndex - 1, 0)]
          : tier;
    const medal: LeagueMedalCode | null =
      member.rank === 1
        ? 'gold'
        : member.rank === 2
          ? 'silver'
          : member.rank === 3
            ? 'bronze'
            : null;
    return { ...member, outcome, medal, nextTier };
  });
}
