import { withGroupGear } from './gear.rules.js';

describe('withGroupGear (trip-events AC6)', () => {
  it('adds group keys once after the rule items, then numbered custom items', () => {
    const merged = withGroupGear(
      [{ key: 'water', litres: 2 }, { key: 'firstAid' }],
      { gearKeys: ['firstAid', 'headlamp'], customGear: ['Crampons', 'Tea'] },
    );
    expect(merged).toEqual([
      { key: 'water', litres: 2 },
      { key: 'firstAid' },
      { key: 'headlamp' },
      { key: 'custom-1', label: 'Crampons', custom: true },
      { key: 'custom-2', label: 'Tea', custom: true },
    ]);
  });
});
