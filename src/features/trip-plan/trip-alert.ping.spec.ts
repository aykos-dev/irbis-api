import { tripAlertText } from './trip-alert.sms.js';
import type { DueAlert } from './trip-plan.repository.js';

describe('tripAlertText link (active-trip AC3)', () => {
  it('links the last ping before the start fix', () => {
    const alert: DueAlert = {
      id: 'trip_1',
      userId: 'user_1',
      backBy: new Date('2026-10-10T12:30:00Z'),
      contactPhone: 'ciphertext',
      alertAttempts: 0,
      startLat: 41.1,
      startLng: 69.9,
      lastLat: 41.654321,
      lastLng: 70.123456,
      user: { username: 'guest_1', displayName: null, locale: 'en' },
      place: {
        nameUz: 'Chorvoq',
        nameRu: null,
        nameEn: null,
        latitude: 41.6,
        longitude: 70.0,
      },
    };
    expect(tripAlertText(alert)).toContain(
      'https://maps.google.com/?q=41.65432,70.12346 — Irbis',
    );
  });
});
