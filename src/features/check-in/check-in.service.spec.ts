import { describe, expect, it } from 'vitest';
import type { GameConfigService } from '../levels/game-config.service.js';
import type {
  AwardInput,
  FactInput,
  LevelsService,
} from '../levels/levels.service.js';
import type { WeeklyPathService } from '../weekly-path/weekly-path.service.js';
import type {
  CheckInRecord,
  CheckInRepository,
  NewCheckIn,
} from './check-in.repository.js';
import { CheckInService } from './check-in.service.js';

const NOW = new Date('2026-10-10T06:00:00Z');
const CONFIG = {
  xpByDifficulty: [40, 60, 80, 100, 120],
  radiusMByType: {
    peak: 300,
    waterfall: 300,
    cave: 200,
    lake: 1000,
    canyon: 1000,
    camping: 1000,
    trail: 1000,
  },
  maxAccuracyM: 50,
  maxAgeHours: 72,
  demoPerIpPerDay: 5,
};
const PLACE = {
  id: 'place_1',
  type: 'peak' as const,
  latitude: 41.3,
  longitude: 69.3,
  difficulty: 3,
};

/** In-memory repository with the DB's two unique keys. */
function setup() {
  const rows: (NewCheckIn & CheckInRecord)[] = [];
  const awards: AwardInput[] = [];
  const facts: FactInput[] = [];
  const repo: Pick<
    CheckInRepository,
    'findByClientId' | 'findPlace' | 'insert' | 'setOutcome'
  > = {
    findByClientId: (userId, clientId) =>
      Promise.resolve(
        rows.find((r) => r.userId === userId && r.clientId === clientId) ??
          null,
      ),
    findPlace: (id) => Promise.resolve(id === PLACE.id ? PLACE : null),
    insert: (c) => {
      const counted = !rows.some(
        (r) =>
          r.userId === c.userId &&
          r.placeId === c.placeId &&
          r.month === c.month &&
          r.counted,
      );
      const row = {
        ...c,
        id: `ci_${rows.length + 1}`,
        counted,
        xpAwarded: 0,
        pathVisited: false,
      };
      rows.push(row);
      return Promise.resolve(row);
    },
    setOutcome: (id, outcome) => {
      Object.assign(rows.find((r) => r.id === id) ?? {}, outcome);
      return Promise.resolve();
    },
  };
  const levels: Pick<LevelsService, 'award' | 'recordFact'> = {
    award: (input) => {
      awards.push(input);
      return Promise.resolve({
        entry: {
          id: `xp_${awards.length}`,
          amount: input.amount,
        } as never,
        created: true,
        capped: false,
        levelUps: [],
      });
    },
    recordFact: (input) => {
      facts.push(input);
      return Promise.resolve({
        fact: {} as never,
        created: true,
        levelUps: [],
      });
    },
  };
  const gameConfig: Pick<GameConfigService, 'checkInConfig'> = {
    checkInConfig: () => Promise.resolve(CONFIG),
  };
  const weeklyPath: Pick<WeeklyPathService, 'recordVisit'> = {
    recordVisit: () => Promise.resolve({ recorded: true }),
  };
  const svc = new CheckInService(
    repo as CheckInRepository,
    gameConfig as GameConfigService,
    levels as LevelsService,
    weeklyPath as WeeklyPathService,
  );
  return { svc, awards, facts };
}

const body = (clientId: string, recordedAt = NOW) => ({
  clientId,
  placeId: PLACE.id,
  lat: 41.3001,
  lng: 69.3,
  accuracyM: 10,
  recordedAt: recordedAt.toISOString(),
});

describe('CheckInService (AC1)', () => {
  it('first check-in of the month counts: XP by difficulty, fact and path visit', async () => {
    const { svc, awards, facts } = setup();
    const out = await svc.create('user_1', body('c1'), NOW);
    expect(out.created).toBe(true);
    expect(out.result).toMatchObject({
      counted: true,
      xp: 80,
      pathVisited: true,
      levelUps: [],
    });
    expect(awards).toEqual([
      {
        userId: 'user_1',
        source: 'check_in',
        refId: out.result.id,
        amount: 80,
      },
    ]);
    expect(facts).toEqual([
      {
        userId: 'user_1',
        kind: 'check_in',
        refId: out.result.id,
        difficulty: 3,
      },
    ]);
  });

  it('a repeat in the same month is stored uncounted with 0 XP; the same clientId replays the stored result', async () => {
    const { svc, awards } = setup();
    const first = await svc.create('user_1', body('c1'), NOW);
    const repeat = await svc.create('user_1', body('c2'), NOW);
    expect(repeat).toMatchObject({
      created: true,
      result: { counted: false, xp: 0, pathVisited: false },
    });
    const replayed = await svc.create('user_1', body('c1'), NOW);
    expect(replayed).toEqual({ created: false, result: first.result });
    expect(awards).toHaveLength(1);
  });

  it('the next Tashkent month counts again', async () => {
    const { svc, awards } = setup();
    const lastDay = new Date('2026-10-31T18:00:00Z');
    const nextMonth = new Date('2026-10-31T20:00:00Z'); // 1 Nov 01:00 Tashkent
    await svc.create('user_1', body('c1', lastDay), nextMonth);
    const again = await svc.create('user_1', body('c2', nextMonth), nextMonth);
    expect(again.result).toMatchObject({ counted: true, xp: 80 });
    expect(awards).toHaveLength(2);
  });
});
