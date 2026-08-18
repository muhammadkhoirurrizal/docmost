import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { Insertable, Selectable, Updateable } from 'kysely';
import { PageSuggestions } from '@docmost/db/types/db';

export type SuggestionModel = Selectable<PageSuggestions>;
export type InsertSuggestion = Insertable<PageSuggestions>;
export type UpdateSuggestion = Updateable<PageSuggestions>;

@Injectable()
export class SuggestionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async create(data: InsertSuggestion): Promise<SuggestionModel> {
    const result = await this.db
      .insertInto('pageSuggestions')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async getPageSuggestions(pageId: string): Promise<SuggestionModel[]> {
    return this.db
      .selectFrom('pageSuggestions')
      .selectAll()
      .where('pageId', '=', pageId)
      .where('status', '=', 'PENDING')
      .execute();
  }

  async findById(id: string): Promise<SuggestionModel | undefined> {
    return this.db
      .selectFrom('pageSuggestions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async update(id: string, data: UpdateSuggestion): Promise<SuggestionModel> {
    data.updatedAt = new Date();
    return this.db
      .updateTable('pageSuggestions')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .deleteFrom('pageSuggestions')
      .where('id', '=', id)
      .execute();
  }
}
