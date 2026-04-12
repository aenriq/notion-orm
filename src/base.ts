/**
 * Base exports for @haustle/notion-orm
 * This file contains the stable base classes that generated code extends.
 * The main index.ts is generated and re-exports from here plus adds generated types.
 */

import type { NotionORMConfig } from "./config/resolveNotionAuth";
import { resolveNotionAuth } from "./config/resolveNotionAuth";

export { AgentClient } from "./client/AgentClient";
export { DatabaseClient } from "./client/DatabaseClient";
export type {
	ColumnTypeMap,
	CountArgs,
	CreateArgs,
	CreateManyArgs,
	DatabasePropertyType,
	DatabasePropertyValue,
	DeleteArgs,
	DeleteManyArgs,
	FindFirstArgs,
	FindManyArgs,
	FindUniqueArgs,
	PaginateResult,
	ProjectedFromArgs,
	ProjectedRow,
	ProjectionArgs,
	ProjectionPropertyList,
	Query,
	SchemaRecord,
	UpdateArgs,
	UpdateManyArgs,
	UpsertArgs,
} from "./client/queryTypes";
export type { NotionConfigType } from "./config/helpers";
export type { NotionORMConfig } from "./config/resolveNotionAuth";
export { resolveNotionAuth } from "./config/resolveNotionAuth";

export class NotionORMBase {
	protected readonly notionAuth: string;

	constructor(config: NotionORMConfig) {
		this.notionAuth = resolveNotionAuth(config);
		// Database and agent properties are added by the generated NotionORM class
	}
}
