import type { StorageService } from '../../lib/storage/storage.service.js';
import { GroupsService } from './groups.service.js';
import type {
  GroupRow,
  GroupsRepository,
  MemberRow,
} from './groups.repository.js';

const publicGroup = (
  membership: GroupRow['viewerMembership'] = null,
): GroupRow => ({
  id: '00000000-0000-0000-0000-000000000010',
  slug: 'weekend-hikers',
  name: 'Weekend Hikers',
  description: 'Walk together',
  visibility: 'public',
  avatarKey: null,
  color: '#0C807A',
  memberCount: 12,
  unreadCount: 0,
  viewerMembership: membership,
});

function setup(group: GroupRow = publicGroup()) {
  const actions: string[] = [];
  const members: MemberRow[] = [];
  const repository = {
    find: () => Promise.resolve(group),
    requestOrJoin: (_groupId: string, _userId: string, status: string) => {
      actions.push(status);
      return Promise.resolve();
    },
    members: () => Promise.resolve(members),
    transferOwnership: () => {
      actions.push('transfer');
      return Promise.resolve();
    },
    membership: () =>
      Promise.resolve({
        userId: 'target',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
        notificationsMuted: false,
      }),
  } as unknown as GroupsRepository;
  const storage = {
    publicUrl: (key: string) => `https://cdn.test/${key}`,
  } as StorageService;
  return { service: new GroupsService(repository, storage), actions };
}

describe('GroupsService', () => {
  it('joins a public group immediately', async () => {
    const { service, actions } = setup();
    await expect(service.join('viewer', 'weekend-hikers')).resolves.toEqual({
      status: 'joined',
    });
    expect(actions).toEqual(['active']);
  });

  it('turns a private-group join into a pending request', async () => {
    const { service, actions } = setup({
      ...publicGroup(),
      visibility: 'private',
    });
    await expect(service.join('viewer', 'private-group')).resolves.toEqual({
      status: 'pending',
    });
    expect(actions).toEqual(['pending']);
  });

  it('allows the owner to transfer ownership to an active member', async () => {
    const { service, actions } = setup(
      publicGroup({
        userId: 'owner',
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
        notificationsMuted: false,
      }),
    );
    await expect(
      service.transfer('owner', 'weekend-hikers', 'target'),
    ).resolves.toEqual({ status: 'transferred' });
    expect(actions).toEqual(['transfer']);
  });

  it('derives the verified-leader shield from level 5', async () => {
    const group = publicGroup({
      userId: 'owner',
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      notificationsMuted: false,
    });
    const row: MemberRow = {
      userId: 'leader',
      username: 'leader',
      displayName: 'Leader',
      avatarKey: null,
      level: 5,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
      notificationsMuted: false,
    };
    const repository = {
      find: () => Promise.resolve(group),
      members: (_id: string, status: string) =>
        Promise.resolve(status === 'active' ? [row] : []),
    } as unknown as GroupsRepository;
    const service = new GroupsService(repository, {
      publicUrl: () => '',
    } as unknown as StorageService);
    const details = await service.details(group.id, 'owner');
    expect(details.members[0]?.verifiedLeader).toBe(true);
  });
});
