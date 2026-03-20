import type { taskDb } from "../db/taskDb";
import type { mealAgent } from "../agents/mealAgent";
import NotionORMBase, { AgentClient, DatabaseClient } from "./base";

export type { NotionConfigType, Query } from "./base";
export { AgentClient, DatabaseClient } from "./base";
export default class NotionORM extends NotionORMBase {
	public databases: {
		taskDb: ReturnType<typeof taskDb>;
	};
	public agents: {
		mealAgent: ReturnType<typeof mealAgent>;
	};
	constructor(config: {
		auth: string;
	});
}
