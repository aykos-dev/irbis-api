import type { PhoneCipher } from '../auth/phone-cipher.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import type {
  NewTrip,
  StoredContact,
  TripPlanRepository,
} from './trip-plan.repository.js';
import { TripPlanService } from './trip-plan.service.js';

const CONFIG = {
  alertDelayMin: 60,
  maxDurationH: 72,
  planAheadDays: 14,
  startGraceMin: 15,
  gear: {
    waterLPerHour: 0.5,
    waterMinL: 1,
    frostMaxC: 0,
    sunMinC: 20,
    headlampWithinMinOfSunset: 60,
  },
};
const CONTACT: StoredContact = {
  name: 'guest_2',
  relation: 'friend',
  phone: 'ciphertext',
  phoneLast2: '41',
};
const NOW = new Date('2026-10-10T03:00:00Z');

describe('TripPlanService.create (AC6 one active trip)', () => {
  it('rejects start: true with TRIP_ALREADY_ACTIVE when an active trip exists; nothing is written', async () => {
    const created: NewTrip[] = [];
    const repo = {
      placeExists: () => Promise.resolve(true),
      findContact: () => Promise.resolve(CONTACT),
      hasActiveTrip: () => Promise.resolve(true),
      createTrip: (t: NewTrip) => {
        created.push(t);
        return Promise.reject(new Error('not expected'));
      },
    };
    const service = new TripPlanService(
      repo as unknown as TripPlanRepository,
      {
        tripConfig: () => Promise.resolve(CONFIG),
      } as unknown as GameConfigService,
      {} as PhoneCipher,
    );
    await expect(
      service.create(
        'user_1',
        {
          placeId: 'place_1',
          startAt: '2026-10-10T03:00:00Z',
          backBy: '2026-10-10T12:00:00Z',
          alertEnabled: true,
          start: true,
        },
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'TRIP_ALREADY_ACTIVE', status: 409 });
    expect(created).toHaveLength(0);
  });
});
