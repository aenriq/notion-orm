import { NotionORMBase } from "./base";

export type {
	DatabasePropertyType,
	NotionConfigType,
	NotionORMConfig,
	Query,
} from "./base";
export {
	AgentClient,
	DatabaseClient,
	NotionORMBase,
	resolveNotionAuth,
} from "./base";
export type { ObjectEntry } from "./typeUtils";
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
