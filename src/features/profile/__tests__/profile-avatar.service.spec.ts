import sharp from 'sharp';
import type { StorageService } from '../../../lib/storage/storage.service.js';
import {
  AVATAR_MAX_BYTES,
  ProfileAvatarService,
} from '../profile-avatar.service.js';

function setup() {
  const puts: { key: string; body: Buffer; contentType: string }[] = [];
  const storage = {
    put: (key: string, body: Buffer, contentType: string) => {
      puts.push({ key, body, contentType });
      return Promise.resolve();
    },
  };
  const service = new ProfileAvatarService(
    storage as unknown as StorageService,
  );
  return { service, puts };
}

/** A wide, non-square image so the square crop is exercised. */
async function image(
  format: 'jpeg' | 'png' | 'webp',
  width = 900,
  height = 450,
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: '#336699' },
  })
    .toFormat(format)
    .toBuffer();
}

describe('ProfileAvatarService.upload (AC3)', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'accepts %s and stores a square 512 JPEG',
    async (format) => {
      const { service, puts } = setup();
      const key = await service.upload(await image(format));

      expect(key).toMatch(/^avatars\/[0-9a-f-]{36}\.jpg$/);
      expect(puts).toHaveLength(1);
      expect(puts[0].key).toBe(key);
      expect(puts[0].contentType).toBe('image/jpeg');
      const stored = await sharp(puts[0].body).metadata();
      expect(stored).toMatchObject({ format: 'jpeg', width: 512, height: 512 });
      expect(stored.exif).toBeUndefined();
    },
  );

  it('rejects bytes that are not JPEG, PNG or WebP with IMAGE_TYPE', async () => {
    const { service, puts } = setup();
    await expect(
      service.upload(Buffer.from('plain text')),
    ).rejects.toMatchObject({ code: 'IMAGE_TYPE', status: 415 });
    const gif = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#fff' },
    })
      .gif()
      .toBuffer();
    await expect(service.upload(gif)).rejects.toMatchObject({
      code: 'IMAGE_TYPE',
    });
    expect(puts).toEqual([]);
  });

  it('rejects more than 2 MB with IMAGE_TOO_LARGE', async () => {
    const { service, puts } = setup();
    await expect(
      service.upload(Buffer.alloc(AVATAR_MAX_BYTES + 1)),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE', status: 413 });
    expect(puts).toEqual([]);
  });
});
