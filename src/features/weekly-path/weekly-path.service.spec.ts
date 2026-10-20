import type { GameConfigService } from '../levels/game-config.service.js';
import type { LevelsService } from '../levels/levels.service.js';
import type { WeeklyPathRepository } from './weekly-path.repository.js';
import { WeeklyPathService } from './weekly-path.service.js';

interface FakeNode {
  id: string;
  userId: string;
  month: string;
  placeId: string;
  visitedAt: Date | null;
}

/** WeeklyPathRepository faked at the two methods recordVisit uses. */
function setup(nodes: FakeNode[]) {
  const repo = {
    findPathNode: (userId: string, month: string, placeId: string) => {
      const n = nodes.find(
        (x) =>
          x.userId === userId && x.month === month && x.placeId === placeId,
      );
      return Promise.resolve(n ? { id: n.id, visitedAt: n.visitedAt } : null);
    },
    markNodeVisited: (id: string, at: Date) => {
      const n = nodes.find((x) => x.id === id && x.visitedAt === null);
      if (n) n.visitedAt = at;
      return Promise.resolve(n !== undefined);
    },
  };
  const service = new WeeklyPathService(
    repo as unknown as WeeklyPathRepository,
    {} as LevelsService,
    {} as GameConfigService,
  );
  return { service, nodes };
}

// 2026-10-31 20:00Z is already 2026-11-01 in Asia/Tashkent (UTC+5).
const OCT = new Date('2026-10-20T08:00:00Z');
const NOV_IN_TASHKENT = new Date('2026-10-31T20:00:00Z');

const node = (over: Partial<FakeNode> = {}): FakeNode => ({
  id: 'node_1',
  userId: 'user_1',
  month: '2026-10',
  placeId: 'place_1',
  visitedAt: null,
  ...over,
});

describe('WeeklyPathService.recordVisit (AC4)', () => {
  it('sets visitedAt once; a second visit is a no-op', async () => {
    const { service, nodes } = setup([node()]);
    await expect(
      service.recordVisit('user_1', 'place_1', OCT),
    ).resolves.toEqual({ recorded: true });
    const later = new Date('2026-10-25T08:00:00Z');
    await expect(
      service.recordVisit('user_1', 'place_1', later),
    ).resolves.toEqual({ recorded: false });
    expect(nodes[0].visitedAt).toEqual(OCT);
  });

  it('is a no-op for a place off the path and when the user has no path', async () => {
    const { service, nodes } = setup([node()]);
    await expect(
      service.recordVisit('user_1', 'place_other', OCT),
    ).resolves.toEqual({ recorded: false });
    await expect(
      service.recordVisit('user_2', 'place_1', OCT),
    ).resolves.toEqual({ recorded: false });
    expect(nodes[0].visitedAt).toBeNull();
  });

  it("uses the Tashkent month of `at`: another month's path is untouched", async () => {
    const { service, nodes } = setup([node()]);
    await expect(
      service.recordVisit('user_1', 'place_1', NOV_IN_TASHKENT),
    ).resolves.toEqual({ recorded: false });
    expect(nodes[0].visitedAt).toBeNull();
  });
});
