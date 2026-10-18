import { vi } from 'vitest';
import { levelTable } from '../../../../prisma/seed/game-config.data.js';
import type { GameConfigService } from '../game-config.service.js';
import { levelTableSchema } from '../game-config.schema.js';
import type {
  FactCounts,
  LevelsRepository,
  LevelUpRecord,
  UserProgress,
} from '../levels.repository.js';
import { LevelsService } from '../levels.service.js';

const USER = 'user_1';
const AT = new Date('2026-07-15T07:00:00Z');

function setup(
  progress: UserProgress,
  counts: FactCounts,
  pending: LevelUpRecord[] = [],
) {
  const seen: string[] = [];
  const repo = {
    findProgress: () => Promise.resolve(progress),
    factCounts: () => Promise.resolve(counts),
    pendingLevelUps: () => Promise.resolve(pending),
    placeCountsByRequiredLevel: () => Promise.resolve({ 1: 4, 2: 3, 3: 1 }),
    markLevelUpSeen: (_userId: string, id: string) => {
      seen.push(id);
      return Promise.resolve(id === 'lu_mine');
    },
  };
  const config = {
    levelTable: () => Promise.resolve(levelTableSchema.parse(levelTable)),
  } as unknown as GameConfigService;
  const service = new LevelsService(
    repo as unknown as LevelsRepository,
    config,
  );
  return { service, seen };
}

const counts = (extra: Partial<FactCounts> = {}): FactCounts => ({
  lessonsTotal: 0,
  lessonsByTier: {},
  checkInsByDifficulty: {},
  verifiedSpots: 0,
  ...extra,
});

describe('LevelsService reads (AC3)', () => {
  it('listLevels: 7 rows with the config numbers and places per required level', async () => {
    const { service } = setup(
      { level: 1, xpTotal: 0, levelReachedAt: AT },
      counts(),
    );
    const { items } = await service.listLevels();
    expect(items).toHaveLength(7);
    expect(items[1]).toEqual({
      level: 2,
      xp: 300,
      lessons: { kind: 'count', tier: null, required: 2 },
      checkIns: { required: 2, minDifficulty: 1 },
      verifiedSpots: 0,
      maxDifficulty: 2,
      newPlacesCount: 3,
    });
    expect(items[6].newPlacesCount).toBe(0);
  });

  it('getMyLevel: next bars use the gate rules (tier lessons, min difficulty), pending level-ups mapped', async () => {
    const { service } = setup(
      { level: 2, xpTotal: 420, levelReachedAt: AT },
      counts({
        lessonsTotal: 5,
        lessonsByTier: { '1': 2, '2': 3 },
        checkInsByDifficulty: { 1: 4, 2: 1, 3: 1 },
      }),
      [
        {
          id: 'lu_1',
          userId: USER,
          fromLevel: 1,
          toLevel: 2,
          createdAt: AT,
          seenAt: null,
        },
      ],
    );
    const me = await service.getMyLevel(USER);
    expect(me).toEqual({
      level: 2,
      xpTotal: 420,
      reachedAt: AT.toISOString(),
      next: {
        level: 3,
        xp: { current: 420, required: 1000 },
        lessons: { current: 3, required: 6, kind: 'tier', tier: '2' },
        checkIns: { current: 2, required: 5, minDifficulty: 2 },
        verifiedSpots: null,
      },
      pendingLevelUps: [
        {
          id: 'lu_1',
          fromLevel: 1,
          toLevel: 2,
          maxDifficulty: 2,
          newPlacesCount: 3,
        },
      ],
    });
  });

  it('getMyLevel: next is null at level 7; L7 shows verified spots when L6', async () => {
    const top = setup(
      { level: 7, xpTotal: 20000, levelReachedAt: AT },
      counts(),
    );
    expect((await top.service.getMyLevel(USER)).next).toBeNull();
    const six = setup(
      { level: 6, xpTotal: 9000, levelReachedAt: AT },
      counts({ lessonsTotal: 30, verifiedSpots: 1 }),
    );
    expect((await six.service.getMyLevel(USER)).next).toMatchObject({
      lessons: { current: 30, required: 36, kind: 'all' },
      verifiedSpots: { current: 1, required: 3 },
    });
  });
});

describe('LevelsService.markLevelUpSeen (AC3)', () => {
  it("answers LEVEL_UP_NOT_FOUND for an id that is not the user's", async () => {
    const { service, seen } = setup(
      { level: 1, xpTotal: 0, levelReachedAt: AT },
      counts(),
    );
    await expect(
      service.markLevelUpSeen(USER, 'lu_mine'),
    ).resolves.toBeUndefined();
    await expect(
      service.markLevelUpSeen(USER, 'lu_other'),
    ).rejects.toMatchObject({ code: 'LEVEL_UP_NOT_FOUND', status: 404 });
    expect(seen).toEqual(['lu_mine', 'lu_other']);
  });
});

describe('LevelsService.grantForQa (AC3)', () => {
  it('writes each item through award/recordFact with its own qa:<uuid> refId', async () => {
    const { service } = setup(
      { level: 1, xpTotal: 0, levelReachedAt: AT },
      counts(),
    );
    const award = vi.spyOn(service, 'award').mockResolvedValue({
      entry: null,
      created: true,
      capped: false,
      levelUps: [],
    });
    const record = vi.spyOn(service, 'recordFact').mockResolvedValue({
      fact: {
        id: 'f',
        userId: USER,
        kind: 'lesson',
        refId: 'r',
        tier: null,
        difficulty: null,
        createdAt: AT,
      },
      created: true,
      levelUps: [],
    });

    await service.grantForQa(USER, {
      xp: 300,
      lessons: [{ tier: '1' }, { tier: '1' }],
      checkIns: [{ difficulty: 1 }],
      verifiedSpots: 2,
    });

    expect(award).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'qa_grant', amount: 300 }),
      expect.any(Date),
    );
    const facts = record.mock.calls.map(([input]) => input);
    expect(facts.map((f) => f.kind)).toEqual([
      'lesson',
      'lesson',
      'check_in',
      'verified_spot',
      'verified_spot',
    ]);
    expect(facts[2]).toMatchObject({ difficulty: 1 });
    const refIds = [
      ...award.mock.calls.map(([input]) => input.refId),
      ...facts.map((f) => f.refId),
    ];
    expect(new Set(refIds).size).toBe(6);
    for (const refId of refIds) expect(refId).toMatch(/^qa:[0-9a-f-]{36}$/);
  });
});
