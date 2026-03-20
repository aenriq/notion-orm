import type { customerOrders } from "../db/customerOrders";
import type { edgeCases } from "../db/edgeCases";
import NotionORMBase, { AgentClient, DatabaseClient } from "./base";
export type { NotionConfigType, Query } from "./base";
export { AgentClient, DatabaseClient } from "./base";
export default class NotionORM extends NotionORMBase {
    public databases: {
        customerOrders: ReturnType<typeof customerOrders>;
        edgeCases: ReturnType<typeof edgeCases>;
    };
    public agents: {};
    constructor(config: {
        auth: string;
    });
}
