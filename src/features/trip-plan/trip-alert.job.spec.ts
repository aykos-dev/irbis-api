import type { PhoneCipher } from '../auth/phone-cipher.js';
import type { SmsSender, SmsTextMessage } from '../auth/sms-sender.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import { TripAlertJob } from './trip-alert.job.js';
import { tripAlertText } from './trip-alert.sms.js';
import type { DueAlert, TripPlanRepository } from './trip-plan.repository.js';

const MINUTE_MS = 60_000;
const BACK_BY = new Date('2026-10-10T12:30:00Z'); // 17:30 Tashkent
const DUE = new Date(BACK_BY.getTime() + 60 * MINUTE_MS);

interface Row extends DueAlert {
  status: 'active' | 'alerted';
  alertSentAt: Date | null;
}

const alert = (over: Partial<DueAlert> = {}): DueAlert => ({
  id: 'trip_1',
  userId: 'user_1',
  backBy: BACK_BY,
  contactPhone: 'ciphertext',
  alertAttempts: 0,
  startLat: 41.123456,
  startLng: 69.987654,
  user: { username: 'guest_1', displayName: null, locale: 'en' },
  place: {
    nameUz: 'Chorvoq',
    nameRu: 'Чарвак',
    nameEn: null,
    latitude: 41.6,
    longitude: 70.0,
  },
  ...over,
});

/** In-memory repository with the same conditional-update semantics as the SQL one. */
function fakeRepo(
  row: Row,
): Pick<
  TripPlanRepository,
  'listDueAlerts' | 'claimAlert' | 'markAlerted' | 'releaseAlert'
> {
  return {
    listDueAlerts: (dueBefore) =>
      Promise.resolve(
        row.status === 'active' &&
          row.alertSentAt === null &&
          row.alertAttempts < 5 &&
          row.backBy <= dueBefore
          ? [{ ...row }]
          : [],
      ),
    claimAlert: (_id, at) => {
      if (row.status !== 'active' || row.alertSentAt || row.alertAttempts >= 5)
        return Promise.resolve(false);
      row.alertSentAt = at;
      return Promise.resolve(true);
    },
    markAlerted: () => {
      row.status = 'alerted';
      return Promise.resolve();
    },
    releaseAlert: (_id, claimedAt) => {
      if (row.alertSentAt?.getTime() === claimedAt.getTime()) {
        row.alertSentAt = null;
        row.alertAttempts += 1;
      }
      return Promise.resolve();
    },
  };
}

function setup(fail = false) {
  const row: Row = { ...alert(), status: 'active', alertSentAt: null };
  const sent: SmsTextMessage[] = [];
  const sms = {
    sendText: (m: SmsTextMessage) => {
      if (fail) return Promise.reject(new Error('provider down'));
      sent.push(m);
      return Promise.resolve();
    },
  };
  const job = new TripAlertJob(
    fakeRepo(row) as TripPlanRepository,
    {
      tripConfig: () => Promise.resolve({ alertDelayMin: 60 }),
    } as unknown as GameConfigService,
    { decrypt: () => '+998XXXXXXXXX' } as unknown as PhoneCipher,
    sms as unknown as SmsSender,
  );
  return { row, sent, job };
}

describe('TripAlertJob (AC8)', () => {
  it('sends nothing before backBy + alertDelayMin and exactly one SMS at the threshold', async () => {
    const { row, sent, job } = setup();
    await job.runNow(new Date(DUE.getTime() - 1));
    expect(sent).toHaveLength(0);
    await job.runNow(DUE);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.phone).toBe('+998XXXXXXXXX');
    expect(row).toMatchObject({ status: 'alerted', alertSentAt: DUE });
  });

  it('never sends twice across overlapping runs or later ticks', async () => {
    const { sent, job } = setup();
    const [a, b] = await Promise.all([job.runNow(DUE), job.runNow(DUE)]);
    expect([a, b]).toContainEqual(null);
    await job.runNow(new Date(DUE.getTime() + MINUTE_MS));
    await job.runNow(new Date(DUE.getTime() + 2 * MINUTE_MS));
    expect(sent).toHaveLength(1);
  });

  it('retries a failed send each tick and stops after 5 failures', async () => {
    const { row, job } = setup(true);
    for (let tick = 0; tick < 7; tick++) {
      await job.runNow(new Date(DUE.getTime() + tick * MINUTE_MS));
    }
    expect(row).toMatchObject({
      status: 'active',
      alertSentAt: null,
      alertAttempts: 5,
    });
  });
});

describe('tripAlertText (AC8)', () => {
  it('uses the locale, place-name fallback to uz, Tashkent time and the link fallback', () => {
    expect(tripAlertText(alert())).toBe(
      "guest_1 planned to be back from Chorvoq by 17:30 and hasn't checked out. Last location: https://maps.google.com/?q=41.12346,69.98765 — Irbis",
    );
    const ru = tripAlertText(
      alert({
        startLat: null,
        startLng: null,
        user: { username: 'guest_1', displayName: 'Guest One', locale: 'ru' },
      }),
    );
    expect(ru).toBe(
      'Guest One планировал(а) вернуться с Чарвак к 17:30 и не отметился(ась). Последнее место: https://maps.google.com/?q=41.60000,70.00000 — Irbis',
    );
  });
});
