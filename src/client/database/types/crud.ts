/**
 * Parameter types for create / update / delete database operations.
 */

import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import type { QueryFilter } from "./query-filter";
import type {
	DatabaseDefinition,
	DatabaseSchema,
	SchemaRecord,
} from "./schema";
import type { QuerySort } from "./sort";

export type Create<Y extends SchemaRecord> = {
	properties: Y;
	icon?: CreatePageParameters["icon"];
	cover?: CreatePageParameters["cover"];
	markdown?: CreatePageParameters["markdown"];
};

export type CreateMany<Y extends SchemaRecord> = {
	properties: Y[];
};

export type Update<Y extends SchemaRecord> = {
	where: { id: string };
	properties: Partial<Y>;
};

export type UpdateMany<Definition extends DatabaseDefinition> = {
	where: QueryFilter<Definition>;
	properties: Partial<DatabaseSchema<Definition>>;
};

export type Upsert<Definition extends DatabaseDefinition> = {
	where: QueryFilter<Definition>;
	create: DatabaseSchema<Definition>;
	update: Partial<DatabaseSchema<Definition>>;
	/** When multiple rows match `where`, which row to update (default: oldest by `created_time`). */
	sortBy?: QuerySort<Definition>;
};

export type Delete = {
	where: { id: string };
};

export type DeleteMany<Definition extends DatabaseDefinition> = {
	where: QueryFilter<Definition>;
};
