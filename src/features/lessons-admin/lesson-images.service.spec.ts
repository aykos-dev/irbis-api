import sharp from 'sharp';
import type { StorageService } from '../../lib/storage/storage.service.js';
import type { QuestionContent } from './lesson.rules.js';
import { IMAGE_KEY_PATTERN } from './lessons-admin.constants.js';
import { LessonImagesService } from './lesson-images.service.js';

/** In-memory StorageService: same interface, objects kept by key. */
class FakeStorage {
  objects = new Map<string, { body: Buffer; contentType: string }>();
  put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
    return Promise.resolve();
  }
  exists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }
  publicUrl(key: string): string {
    return `https://cdn.example.test/${key}`;
  }
}

function setup() {
  const storage = new FakeStorage();
  const images = new LessonImagesService(storage as unknown as StorageService);
  return { storage, images };
}

const gpsPng = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: '#336699' },
  })
    .withExif({
      IFD0: { Copyright: 'synthetic' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 17/1 58/1' },
    })
    .png()
    .toBuffer();

const withImage = (imageKey: string | null): QuestionContent => ({
  prompt: { uz: 'p', ru: 'p', en: 'p' },
  hint: null,
  options: [],
  correctIndex: 0,
  explanation: { uz: 'e', ru: 'e', en: 'e' },
  wrongExplanation: null,
  imageKey,
});

describe('LessonImagesService.upload (AC4)', () => {
  it('stores a PNG with EXIF GPS re-encoded: no metadata, longest side 1600', async () => {
    const input = await gpsPng(3200, 2000);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const { storage, images } = setup();

    const result = await images.upload(input);

    expect(result.key).toMatch(IMAGE_KEY_PATTERN);
    expect(result.key).toMatch(/\.png$/);
    expect(result).toMatchObject({ width: 1600, height: 1000 });
    expect(result.url).toBe(`https://cdn.example.test/${result.key}`);
    const stored = storage.objects.get(result.key);
    expect(stored?.contentType).toBe('image/png');
    const meta = await sharp(stored?.body).metadata();
    expect(meta).toMatchObject({ format: 'png', width: 1600, height: 1000 });
    expect(meta.exif).toBeUndefined();
  });

  it('415 IMAGE_TYPE for bytes that are not JPEG/PNG/WebP, whatever the name says', async () => {
    const gif = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#000' },
    })
      .gif()
      .toBuffer();
    const { images, storage } = setup();
    for (const bytes of [Buffer.from('not an image'), gif]) {
      await expect(images.upload(bytes)).rejects.toMatchObject({
        code: 'IMAGE_TYPE',
        status: 415,
      });
    }
    expect(storage.objects.size).toBe(0);
  });

  it('413 IMAGE_TOO_LARGE above 2 MB', async () => {
    const { images } = setup();
    await expect(
      images.upload(Buffer.alloc(2 * 1024 * 1024 + 1)),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE', status: 413 });
  });
});

describe('LessonImagesService.checkKeys (AC4)', () => {
  it('400 at questions.N.image for a malformed or missing key; uploaded keys pass', async () => {
    const { images } = setup();
    const uploaded = await images.upload(await gpsPng(10, 10));
    await expect(
      images.checkKeys([withImage(null), withImage(uploaded.key)]),
    ).resolves.toBeUndefined();

    await expect(
      images.checkKeys([
        withImage('lessons/example.webp'),
        withImage(uploaded.key),
        withImage('lessons/00000000-0000-0000-0000-000000000000.jpg'),
      ]),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: {
        'questions.0.image': ['invalidKey'],
        'questions.2.image': ['notFound'],
      },
    });
  });
});
