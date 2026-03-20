import { AgentClient } from "../../src/client/AgentClient";
import type { Query } from "../../src/client/queryTypes";
import type { Expect } from "./helpers/assert";

type _queryExportContract = Expect<
	Query<Record<string, unknown>, Record<string, never>> extends object
		? true
		: false
>;

type _agentClientValueExport = Expect<
	(typeof AgentClient)["prototype"] extends object ? true : false
>;
