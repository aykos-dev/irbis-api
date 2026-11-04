export interface GroupSeed {
  slug: string;
  name: string;
  description: string;
  color: string;
  visibility: 'public' | 'private';
}

/** Launch groups mirrored from the Groups canvas. Membership remains honest and starts empty. */
export const groupSeeds: readonly GroupSeed[] = [
  {
    slug: 'tashkent-weekend-hikers',
    name: 'Tashkent Weekend Hikers',
    description: 'Weekend trails, ridge walks and shared plans around Tashkent.',
    color: '#1CB0A8',
    visibility: 'public',
  },
  {
    slug: 'charvak-campers',
    name: 'Charvak Campers',
    description: 'Camping nights, lake mornings and practical gear advice.',
    color: '#3DAA5C',
    visibility: 'public',
  },
  {
    slug: 'caving-uzbekistan',
    name: 'Caving Uzbekistan',
    description: 'Cave explorers sharing safe routes, skills and conditions.',
    color: '#7B61FF',
    visibility: 'public',
  },
  {
    slug: 'first-trails-beginners',
    name: 'First Trails — beginners',
    description: 'A welcoming group for first hikes, questions and mentors.',
    color: '#58B368',
    visibility: 'public',
  },
  {
    slug: 'camping-and-stars',
    name: 'Camping & Stars',
    description: 'Campsites, night skies and quiet weekends outdoors.',
    color: '#3DAA5C',
    visibility: 'public',
  },
] as const;

