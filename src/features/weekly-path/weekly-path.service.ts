import { Injectable } from '@nestjs/common';
import type { InterestCode } from '../auth/auth.constants.js';
import { nextOpenMonth } from '../conditions/condition.rules.js';
import type { WeekendDayName } from '../conditions/conditions.constants.js';
import {
  tashkentDate,
  tashkentMonth,
  weekendWindow,
} from '../conditions/weekend-window.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { LevelsService } from '../levels/levels.service.js';
import { GUEST_LEVEL } from '../places/places.constants.js';
import type {
  PathChestOpenDto,
  PathDto,
  PathNodeDto,
  PathPlaceDto,
  PathSwapDto,
} from './dto/weekly-path.response.dto.js';
import {
  pickPath,
  pickSwap,
  reasonDay,
  weatherDays,
  weatherWindow,
  type PathPlace,
} from './path.picker.js';
import { WEATHER_POINT_KEY } from './weekly-path.constants.js';
import {
  PathChestLockedError,
  PathNotFoundError,
  PlaceNotOnPathError,
} from './weekly-path.errors.js';
import {
  WeeklyPathRepository,
  type StoredPathMonth,
  type StoredPathNode,
} from './weekly-path.repository.js';

interface MonthContext {
  /** YYYY-MM, Asia/Tashkent. */
  monthKey: string;
  month: number;
  level: number;
  firstWeekendDay: WeekendDayName;
  places: PathPlace[];
}

/** YYYY-MM, Asia/Tashkent. */
const monthOf = (at: Date): string => tashkentDate(at).slice(0, 7);

const isDone = (node: StoredPathNode, monthKey: string): boolean =>
  node.visitedAt !== null && monthOf(node.visitedAt) === monthKey;

const toPlaceDto = (p: PathPlace): PathPlaceDto => ({
  id: p.id,
  slug: p.slug,
  name: { uz: p.nameUz, ru: p.nameRu, en: p.nameEn },
  type: p.type,
  difficulty: p.difficulty,
  requiredLevel: p.requiredLevel,
  elevationM: p.elevationM,
});

@Injectable()
export class WeeklyPathService {
  constructor(
    private readonly repo: WeeklyPathRepository,
    private readonly levels: LevelsService,
    private readonly gameConfig: GameConfigService,
  ) {}

  /**
   * The month's path. Signed in: the stored month, picked and stored on the first call (frozen
   * afterwards). Guest: picked at level 1 from `interests`, nothing stored.
   */
  async getPath(
    userId: string | undefined,
    guestInterests: readonly InterestCode[],
    now: Date = new Date(),
  ): Promise<PathDto> {
    const [config, places, forecast, level] = await Promise.all([
      this.gameConfig.pathConfig(),
      this.repo.listPlaces(now),
      this.repo.findPointForecast(WEATHER_POINT_KEY),
      userId
        ? this.levels.getState(userId).then((s) => s.level)
        : Promise.resolve(GUEST_LEVEL),
    ]);
    const ctx: MonthContext = {
      monthKey: monthOf(now),
      month: tashkentMonth(now),
      level,
      firstWeekendDay: weekendWindow(now)[0].day,
      places,
    };
    const pick = (interests: readonly InterestCode[]) =>
      pickPath(places, {
        level,
        interests,
        month: ctx.month,
        origin: config.origin,
        nodes: config.nodes,
      });

    let stored: StoredPathMonth;
    if (userId) {
      stored = await this.storedMonth(userId, ctx, pick);
    } else {
      stored = {
        level,
        chestOpenedAt: null,
        nodes: pick(guestInterests).map((p, i) => ({
          position: i + 1,
          placeId: p.id,
          visitedAt: null,
        })),
      };
    }

    const nodes = this.buildNodes(stored, ctx);
    const done = nodes.filter((n) => n.done).length;
    return {
      month: ctx.monthKey,
      level,
      nodes,
      chest:
        nodes.length === 0
          ? null
          : {
              required: nodes.length,
              done,
              opened: stored.chestOpenedAt !== null,
              xp: config.chestXp,
            },
      weather: {
        days: forecast
          ? weatherDays(forecast, weatherWindow(tashkentDate(now)))
          : [],
      },
    };
  }

  /**
   * Marks `placeId` done on the user's path for the Tashkent month of `at`, once. A no-op when
   * there is no path that month, the place is not on it, or it is already done. Gives no XP.
   */
  async recordVisit(
    userId: string,
    placeId: string,
    at: Date = new Date(),
  ): Promise<{ recorded: boolean }> {
    const node = await this.repo.findPathNode(userId, monthOf(at), placeId);
    if (!node || node.visitedAt !== null) return { recorded: false };
    return { recorded: await this.repo.markNodeVisited(node.id, at) };
  }

  /** QA: builds the month's path if missing, records a visit to `placeId`, returns the path. */
  async visitForQa(
    userId: string,
    placeId: string,
    now: Date = new Date(),
  ): Promise<PathDto> {
    await this.getPath(userId, [], now);
    const node = await this.repo.findPathNode(userId, monthOf(now), placeId);
    if (!node) throw new PlaceNotOnPathError();
    await this.recordVisit(userId, placeId, now);
    return this.getPath(userId, [], now);
  }

  /**
   * Opens this month's chest once every node is done. The ledger key (user, path_chest, month)
   * awards once; a repeat or a losing concurrent call gets 0 XP.
   */
  async openChest(
    userId: string,
    now: Date = new Date(),
  ): Promise<PathChestOpenDto> {
    const monthKey = monthOf(now);
    const stored = await this.repo.findPathMonth(userId, monthKey);
    if (!stored) throw new PathNotFoundError();
    if (stored.chestOpenedAt !== null) {
      return { opened: true, xp: 0, levelUps: [] };
    }
    const allDone =
      stored.nodes.length > 0 &&
      stored.nodes.every((node) => isDone(node, monthKey));
    if (!allDone) throw new PathChestLockedError();

    const config = await this.gameConfig.pathConfig();
    const award = await this.levels.award(
      {
        userId,
        source: 'path_chest',
        refId: monthKey,
        amount: config.chestXp,
      },
      now,
    );
    await this.repo.markChestOpened(userId, monthKey, now);
    return {
      opened: true,
      xp: award.created ? (award.entry?.amount ?? 0) : 0,
      levelUps: award.levelUps.map(({ id, fromLevel, toLevel }) => ({
        id,
        fromLevel,
        toLevel,
      })),
    };
  }

  private async storedMonth(
    userId: string,
    ctx: MonthContext,
    pick: (interests: readonly InterestCode[]) => PathPlace[],
  ): Promise<StoredPathMonth> {
    const existing = await this.repo.findPathMonth(userId, ctx.monthKey);
    if (existing) return existing;
    const interests = await this.repo.findInterests(userId);
    const created = await this.repo.createPathMonth({
      userId,
      month: ctx.monthKey,
      level: ctx.level,
      placeIds: pick(interests).map((p) => p.id),
    });
    if (created) return created;
    // A parallel request stored the month first: theirs wins.
    const raced = await this.repo.findPathMonth(userId, ctx.monthKey);
    if (!raced) {
      throw new Error(`Path month ${ctx.monthKey} missing after a conflict`);
    }
    return raced;
  }

  private buildNodes(
    stored: StoredPathMonth,
    ctx: MonthContext,
  ): PathNodeDto[] {
    const byId = new Map(ctx.places.map((p) => [p.id, p]));
    const onPath = new Set(stored.nodes.map((n) => n.placeId));
    return stored.nodes.flatMap((node): PathNodeDto[] => {
      const place = byId.get(node.placeId);
      if (!place) return [];
      return [
        {
          position: node.position,
          place: toPlaceDto(place),
          status: place.status,
          reasons: place.reasons,
          weekendDay: reasonDay(place.reasons, ctx.firstWeekendDay),
          opensMonth:
            place.status === 'seasonal_lock'
              ? nextOpenMonth(place.season, ctx.month)
              : null,
          done: isDone(node, ctx.monthKey),
          swap:
            place.status === 'not_now'
              ? this.swapFor(place, onPath, ctx)
              : null,
        },
      ];
    });
  }

  private swapFor(
    original: PathPlace,
    onPath: ReadonlySet<string>,
    ctx: MonthContext,
  ): PathSwapDto | null {
    const swap = pickSwap(original, ctx.places, onPath, ctx.level);
    if (!swap) return null;
    return {
      place: toPlaceDto(swap.place),
      status: 'go',
      day: reasonDay(swap.place.reasons, ctx.firstWeekendDay),
      distanceFromOriginalKm: Math.round(swap.distanceM / 1000),
      elevationDiffM: swap.place.elevationM - original.elevationM,
    };
  }
}
