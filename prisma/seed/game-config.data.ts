/**
 * GameConfig rows for levels (features/levels.md). The doc calls these numbers "decided after
 * testing": change them here (or in the table directly), never in code.
 */
type LessonGate = {
  kind: 'count' | 'tier' | 'all';
  tier: string | null;
  required: number;
};

function row(
  level: number,
  xp: number,
  lessons: LessonGate,
  checkIns: [required: number, minDifficulty: number],
  verifiedSpots: number,
  maxDifficulty: number,
) {
  return {
    level,
    xp,
    lessons,
    checkIns: { required: checkIns[0], minDifficulty: checkIns[1] },
    verifiedSpots,
    maxDifficulty,
  };
}

export const levelTable = [
  row(1, 0, { kind: 'count', tier: null, required: 0 }, [0, 1], 0, 1),
  row(2, 300, { kind: 'count', tier: null, required: 2 }, [2, 1], 0, 2),
  row(3, 1000, { kind: 'tier', tier: '2', required: 6 }, [5, 2], 0, 3),
  row(4, 2500, { kind: 'tier', tier: '3', required: 6 }, [8, 3], 0, 3),
  row(5, 5000, { kind: 'tier', tier: 'first-aid', required: 6 }, [12, 3], 0, 4),
  row(6, 9000, { kind: 'tier', tier: '5', required: 6 }, [15, 4], 0, 4),
  row(7, 15000, { kind: 'all', tier: null, required: 36 }, [25, 5], 3, 5),
];

export const xpDailyCaps = { post: 5, game: 30, campfire: 30 };

export const gameConfigRows = [
  { key: 'levels.table', value: levelTable },
  { key: 'xp.dailyCaps', value: xpDailyCaps },
];
