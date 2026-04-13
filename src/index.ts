import { NotionORMBase } from "./base";

export type {
	DatabaseColumns,
	DatabaseColumnTypes,
	DatabaseDefinition,
	DatabasePropertyType,
	DatabaseSchema,
	InferDatabaseSchema,
	NotionConfigType,
	NotionORMConfig,
	Query,
} from "./base";
export {
	AgentClient,
	buildZodFromColumns,
	DatabaseClient,
	NotionORMBase,
	resolveNotionAuth,
} from "./base";
export type { ObjectEntry, Simplify } from "./typeUtils";
export { objectEntries, objectKeys } from "./typeUtils";

class NotionORM extends NotionORMBase {
	public databases: Record<string, never>;
	public agents: Record<string, never>;
	constructor(config: {
		auth?: string;
	}) {
		super(config);
		this.databases = {};
		this.agents = {};
	}
}
export default NotionORM;
