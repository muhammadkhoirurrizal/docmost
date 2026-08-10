import { Injectable } from '@nestjs/common';
import {
  FavoriteRepo,
  FavoriteType,
} from '@docmost/db/repos/favorite/favorite.repo';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { InsertableFavorite } from '@docmost/db/types/entity.types';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';

@Injectable()
export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
  ) {}

  async getFavoriteIds(
    userId: string,
    workspaceId: string,
    type: FavoriteType,
    spaceId?: string,
  ) {
    const result = await this.favoriteRepo.getFavoriteIds(
      userId,
      workspaceId,
      type,
      spaceId,
    );

    if (result.items.length === 0) {
      return result;
    }

    if (type === FavoriteType.PAGE) {
      // MVP: Skipping complex page permissions check
      // result.items is unchanged
    }

    if (type === FavoriteType.SPACE) {
      const userSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(userId);
      const spaceSet = new Set(userSpaceIds);
      result.items = result.items.filter((id) => spaceSet.has(id));
    }

    return result;
  }

  async addFavorite(
    userId: string,
    workspaceId: string,
    opts: {
      type: FavoriteType;
      pageId?: string;
      spaceId?: string;
    },
  ): Promise<void> {
    const favorite: InsertableFavorite = {
      userId,
      pageId: opts.pageId ?? null,
      spaceId: opts.spaceId ?? null,
      type: opts.type,
      workspaceId,
    };

    await this.favoriteRepo.insert(favorite);
  }

  async removeFavorite(
    userId: string,
    opts: {
      type: FavoriteType;
      pageId?: string;
      spaceId?: string;
    },
  ): Promise<void> {
    if (opts.type === FavoriteType.PAGE && opts.pageId) {
      await this.favoriteRepo.deleteByUserAndPage(userId, opts.pageId);
    } else if (opts.type === FavoriteType.SPACE && opts.spaceId) {
      await this.favoriteRepo.deleteByUserAndSpace(userId, opts.spaceId);
    }
  }

  async getUserFavorites(
    userId: string,
    workspaceId: string,
    pagination: PaginationOptions,
    type?: FavoriteType,
    spaceId?: string,
  ) {
    const result = await this.favoriteRepo.findUserFavorites(
      userId,
      workspaceId,
      pagination,
      type,
      spaceId,
    );

    if (result.items.length === 0) {
      return result;
    }

    const userSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(userId);
    const spaceSet = new Set(userSpaceIds);

    const pageFavorites = result.items.filter(
      (f) => f.type === FavoriteType.PAGE && f.pageId,
    );

    let accessiblePageSet: Set<string> | undefined;
    if (pageFavorites.length > 0) {
      const pageIds = pageFavorites.map((f) => f.pageId as string);
      // MVP: Skipping complex page permissions check, all favorites are accessible
      accessiblePageSet = new Set(pageIds);
    }

    result.items = result.items.filter((f) => {
      if (f.type === FavoriteType.PAGE) {
        return f.pageId && accessiblePageSet?.has(f.pageId);
      }
      if (f.type === FavoriteType.SPACE) {
        return f.spaceId && spaceSet.has(f.spaceId);
      }
      if (f.type === FavoriteType.TEMPLATE) {
        const templateSpaceId = (f as any).template?.spaceId;
        return !templateSpaceId || spaceSet.has(templateSpaceId);
      }
      return true;
    });

    return result;
  }
}
