import {
  levelTable,
  xpDailyCaps,
} from '../../../../prisma/seed/game-config.data.js';
import type { GameConfigService } from '../game-config.service.js';
import { dailyCapsSchema, levelTableSchema } from '../game-config.schema.js';
import type {
  FactCounts,
  FactKey,
  LevelFactRecord,
  LevelsRepository,
  LevelUpRecord,
  Tx,
  UserProgress,
  XpEntryRecord,
  XpKey,
} from '../levels.repository.js';
import { LevelsService } from '../levels.service.js';

const USER = 'user_1';
const TX = {} as Tx;

/** In-memory LevelsRepository: same contract, unique keys enforced like the DB. */
class FakeRepository {
  user: UserProgress = { level: 1, xpTotal: 0, levelReachedAt: new Date(0) };
  entries: XpEntryRecord[] = [];
  facts: LevelFactRecord[] = [];
  levelUps: LevelUpRecord[] = [];
  private seq = 0;

  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return work(TX);
  }
  lockUser(): Promise<UserProgress> {
    return Promise.resolve({ ...this.user });
  }
  findProgress(): Promise<UserProgress> {
    return Promise.resolve({ ...this.user });
  }
  findXpEntry(key: XpKey): Promise<XpEntryRecord | null> {
    return Promise.resolve(
      this.entries.find(
        (e) => e.source === key.source && e.refId === key.refId,
      ) ?? null,
    );
  }
  sumXpSince(_userId: string, source: string, since: Date): Promise<number> {
    return Promise.resolve(
      this.entries
        .filter((e) => e.source === source && e.createdAt >= since)
        .reduce((sum, e) => sum + e.amount, 0),
    );
  }
  async insertXpEntry(
    data: XpKey & { amount: number; createdAt: Date },
  ): Promise<XpEntryRecord | null> {
    if (await this.findXpEntry(data)) return null;
    const row = { id: `xp_${++this.seq}`, ...data };
    this.entries.push(row);
    return row;
  }
  addXp(_userId: string, amount: number): Promise<void> {
    this.user.xpTotal += amount;
    return Promise.resolve();
  }
  findFact(key: FactKey): Promise<LevelFactRecord | null> {
    return Promise.resolve(
      this.facts.find((f) => f.kind === key.kind && f.refId === key.refId) ??
        null,
    );
  }
  async insertFact(
    data: FactKey & {
      tier: string | null;
      difficulty: number | null;
      createdAt: Date;
    },
  ): Promise<LevelFactRecord | null> {
    if (await this.findFact(data)) return null;
    const row = { id: `fact_${++this.seq}`, ...data };
    this.facts.push(row);
    return row;
  }
  factCounts(): Promise<FactCounts> {
    const counts: FactCounts = {
      lessonsTotal: 0,
      lessonsByTier: {},
      checkInsByDifficulty: {},
      verifiedSpots: 0,
    };
    for (const f of this.facts) {
      if (f.kind === 'lesson') {
        counts.lessonsTotal += 1;
        if (f.tier)
          counts.lessonsByTier[f.tier] =
            (counts.lessonsByTier[f.tier] ?? 0) + 1;
      } else if (f.kind === 'check_in' && f.difficulty !== null) {
        counts.checkInsByDifficulty[f.difficulty] =
          (counts.checkInsByDifficulty[f.difficulty] ?? 0) + 1;
      } else if (f.kind === 'verified_spot') counts.verifiedSpots += 1;
    }
    return Promise.resolve(counts);
  }
  applyLevelUps(
    userId: string,
    steps: { fromLevel: number; toLevel: number }[],
    at: Date,
  ): Promise<LevelUpRecord[]> {
    const rows = steps.map((s) => ({
      id: `lu_${++this.seq}`,
      userId,
      ...s,
      createdAt: at,
      seenAt: null,
    }));
    this.levelUps.push(...rows);
    this.user.level = steps[steps.length - 1].toLevel;
    this.user.levelReachedAt = at;
    return Promise.resolve(rows);
  }
}

function setup(table: unknown = levelTable) {
  const repo = new FakeRepository();
  const config = {
    levelTable: () => Promise.resolve(levelTableSchema.parse(table)),
    dailyCaps: () => Promise.resolve(dailyCapsSchema.parse(xpDailyCaps)),
  } as unknown as GameConfigService;
  const service = new LevelsService(
    repo as unknown as LevelsRepository,
    config,
  );
  return { repo, service };
}

const NOON = new Date('2026-07-15T07:00:00Z'); // 12:00 Tashkent

describe('LevelsService.award (AC1)', () => {
  it('is idempotent: the same refId twice writes one entry and adds XP once', async () => {
    const { repo, service } = setup();
    const first = await service.award(
      { userId: USER, source: 'lesson', refId: 'lesson_1', amount: 50 },
      NOON,
    );
    const again = await service.award(
      { userId: USER, source: 'lesson', refId: 'lesson_1', amount: 50 },
      NOON,
    );

    expect(first).toMatchObject({ created: true, capped: false });
    expect(again).toMatchObject({ created: false, entry: first.entry });
    expect(repo.entries).toHaveLength(1);
    expect(repo.user.xpTotal).toBe(50);
  });

  it('trims a capped source to what is left today (28 + 5 → 2), then blocks', async () => {
    const { repo, service } = setup();
    await service.award(
      { userId: USER, source: 'game', refId: 'g1', amount: 28 },
      NOON,
    );
    const trimmed = await service.award(
      { userId: USER, source: 'game', refId: 'g2', amount: 5 },
      NOON,
    );
    const blocked = await service.award(
      { userId: USER, source: 'game', refId: 'g3', amount: 5 },
      NOON,
    );

    expect(trimmed).toMatchObject({
      created: true,
      capped: true,
      entry: { amount: 2 },
    });
    expect(blocked).toEqual({
      entry: null,
      created: false,
      capped: true,
      levelUps: [],
    });
    expect(repo.user.xpTotal).toBe(30);
  });

  it('resets the cap at 00:00 Asia/Tashkent (23:59 vs 00:01 +05:00)', async () => {
    const { repo, service } = setup();
    const lateEvening = new Date('2026-07-15T23:59:00+05:00');
    const justAfterMidnight = new Date('2026-07-16T00:01:00+05:00');
    await service.award(
      { userId: USER, source: 'game', refId: 'g1', amount: 30 },
      lateEvening,
    );
    const sameDay = await service.award(
      { userId: USER, source: 'game', refId: 'g2', amount: 5 },
      lateEvening,
    );
    const nextDay = await service.award(
      { userId: USER, source: 'game', refId: 'g3', amount: 5 },
      justAfterMidnight,
    );

    expect(sameDay.capped).toBe(true);
    expect(sameDay.entry).toBeNull();
    expect(nextDay).toMatchObject({
      created: true,
      capped: false,
      entry: { amount: 5 },
    });
    expect(repo.user.xpTotal).toBe(35);
  });

  it('rejects a non-positive amount', async () => {
    const { service } = setup();
    await expect(
      service.award(
        { userId: USER, source: 'lesson', refId: 'l', amount: 0 },
        NOON,
      ),
    ).rejects.toThrow('positive integer');
  });
});

describe('LevelsService level-ups (AC2)', () => {
  it('a multi-level jump writes one LevelUp per step and sets the level', async () => {
    const { repo, service } = setup();
    for (let i = 1; i <= 6; i += 1) {
      await service.recordFact(
        { userId: USER, kind: 'lesson', refId: `t2_${i}`, tier: '2' },
        NOON,
      );
    }
    for (let i = 1; i <= 5; i += 1) {
      await service.recordFact(
        { userId: USER, kind: 'check_in', refId: `c${i}`, difficulty: 2 },
        NOON,
      );
    }
    expect(repo.levelUps).toHaveLength(0); // XP gate not met yet

    const result = await service.award(
      { userId: USER, source: 'qa_grant', refId: 'grant_1', amount: 1_000 },
      NOON,
    );

    expect(result.levelUps.map((l) => [l.fromLevel, l.toLevel])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(repo.user).toMatchObject({ level: 3, levelReachedAt: NOON });
  });

  it('never lowers the level after a threshold rise', async () => {
    const raised = levelTable.map((r) => ({
      ...r,
      xp: r.level === 1 ? 0 : 1_000_000,
    }));
    const { repo, service } = setup(raised);
    repo.user = { level: 4, xpTotal: 2_600, levelReachedAt: new Date(0) };

    const ups = await service.evaluate(USER, NOON);

    expect(ups).toEqual([]);
    expect(repo.user.level).toBe(4);
  });

  it('recordFact is idempotent and rejects a difficulty outside 1–5', async () => {
    const { repo, service } = setup();
    await service.recordFact(
      { userId: USER, kind: 'verified_spot', refId: 'place_1' },
      NOON,
    );
    const again = await service.recordFact(
      { userId: USER, kind: 'verified_spot', refId: 'place_1' },
      NOON,
    );
    expect(again.created).toBe(false);
    expect(repo.facts).toHaveLength(1);
    await expect(
      service.recordFact(
        { userId: USER, kind: 'check_in', refId: 'c', difficulty: 6 },
        NOON,
      ),
    ).rejects.toThrow('1–5');
  });
});
