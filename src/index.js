import { customerOrders } from "../db/customerOrders";
import { edgeCases } from "../db/edgeCases";
import NotionORMBase from "./base";
export { AgentClient, DatabaseClient } from "./base";
class NotionORM extends NotionORMBase {
    constructor(config) {
        super(config);
        this.databases = {
            customerOrders: customerOrders(config.auth),
            edgeCases: edgeCases(config.auth)
        };
        this.agents = {};
    }
}
export default NotionORM;
