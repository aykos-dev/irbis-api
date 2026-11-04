import { gearList, type GearInput } from './gear.rules.js';

const GEAR = {
  waterLPerHour: 0.5,
  waterMinL: 1,
  frostMaxC: 0,
  sunMinC: 20,
  headlampWithinMinOfSunset: 60,
};
const SUNSET = new Date('2026-10-10T12:50:00Z');

const input = (over: Partial<GearInput> = {}): GearInput => ({
  placeType: 'peak',
  hours: 5,
  forecast: { minC: 5, maxC: 15 },
  sunsetAt: SUNSET,
  backBy: new Date('2026-10-10T10:00:00Z'),
  gear: GEAR,
  ...over,
});

describe('gearList (AC5)', () => {
  it('a mild day trip: water rounded up to 0.5 L, the four basics, nothing else', () => {
    expect(gearList(input({ hours: 5.2 }))).toEqual([
      { key: 'water', litres: 3 },
      { key: 'warmLayer' },
      { key: 'firstAid' },
      { key: 'offlineMap' },
    ]);
    expect(gearList(input({ hours: 1 }))[0]).toEqual({
      key: 'water',
      litres: 1,
    });
  });

  it('frost, hot day, back near sunset at a lake: every conditional item in order', () => {
    const backBy = new Date(SUNSET.getTime() - 30 * 60_000);
    expect(
      gearList(
        input({ placeType: 'lake', forecast: { minC: -2, maxC: 24 }, backBy }),
      ),
    ).toEqual([
      { key: 'water', litres: 2.5 },
      { key: 'warmLayer', note: 'frost' },
      { key: 'firstAid' },
      { key: 'offlineMap' },
      { key: 'sun' },
      { key: 'headlamp', note: 'sunset', noteTime: SUNSET },
      { key: 'waterFilter', note: 'streams' },
    ]);
  });

  it('no forecast: no sun and no frost note, headlamp and water filter still apply', () => {
    const keys = gearList(
      input({ placeType: 'trail', forecast: null, backBy: SUNSET }),
    ).map((i) => [i.key, i.note]);
    expect(keys).toEqual([
      ['water', undefined],
      ['warmLayer', undefined],
      ['firstAid', undefined],
      ['offlineMap', undefined],
      ['headlamp', 'sunset'],
      ['waterFilter', 'streams'],
    ]);
  });
});
