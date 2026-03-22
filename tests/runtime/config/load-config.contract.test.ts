import { afterEach, describe, expect, test } from "bun:test";
import {
	clearConfigCache,
	getNotionConfig,
	loadConfig,
} from "../../../src/config/loadConfig";
import { CODEGEN_EMIT_PATHS } from "../../helpers/codegen-file-names";
import {
	cleanupTempWorkspaces,
	createTempWorkspace,
	writeWorkspaceFile,
} from "../../helpers/temp-workspace";

const ORIGINAL_CWD = process.cwd();
const ORIGINAL_NOTION_AUTH = process.env.NOTION_AUTH;
const ORIGINAL_NOTION_KEY = process.env.NOTION_KEY;

afterEach(() => {
	process.chdir(ORIGINAL_CWD);
	if (ORIGINAL_NOTION_AUTH === undefined) {
		delete process.env.NOTION_AUTH;
	} else {
		process.env.NOTION_AUTH = ORIGINAL_NOTION_AUTH;
	}
	if (ORIGINAL_NOTION_KEY === undefined) {
		delete process.env.NOTION_KEY;
	} else {
		process.env.NOTION_KEY = ORIGINAL_NOTION_KEY;
	}
	clearConfigCache();
	cleanupTempWorkspaces();
});

describe("config loading contracts", () => {
	test("loadConfig parses a valid user config module", async () => {
		const workspacePath = createTempWorkspace("config-load-valid-");
		const configPath = writeWorkspaceFile({
			workspacePath,
			relativePath: CODEGEN_EMIT_PATHS.notionConfigMjs,
			content: [
				"export default {",
				"  auth: 'token-123',",
				"  databases: ['db-1'],",
				"  agents: ['agent-1'],",
				"};",
			].join("\n"),
		});

		const config = await loadConfig(configPath);
		expect(config).toEqual({
			auth: "token-123",
			databases: ["db-1"],
			agents: ["agent-1"],
		});
	});

	test("loadConfig rejects invalid config shapes with stable messages", async () => {
		const workspacePath = createTempWorkspace("config-load-invalid-");
		const configPath = writeWorkspaceFile({
			workspacePath,
			relativePath: CODEGEN_EMIT_PATHS.notionConfigMjs,
			content: [
				"export default {",
				"  auth: '',",
				"  databases: 'not-an-array',",
				"  agents: [],",
				"};",
			].join("\n"),
		});

		await expect(loadConfig(configPath)).rejects.toThrow(
			"Invalid notion config shape",
		);
		await expect(loadConfig(configPath)).rejects.toThrow("auth");
	});

	test("getNotionConfig falls back to NOTION_AUTH when no config file exists", async () => {
		const workspacePath = createTempWorkspace("config-env-fallback-");
		process.chdir(workspacePath);
		process.env.NOTION_AUTH = "env-auth-token";
		delete process.env.NOTION_KEY;

		const config = await getNotionConfig();
		expect(config).toEqual({
			auth: "env-auth-token",
			databases: [],
			agents: [],
		});
	});

	test("getNotionConfig honors cache until clearConfigCache is called", async () => {
		const workspacePath = createTempWorkspace("config-cache-");
		process.chdir(workspacePath);

		process.env.NOTION_AUTH = "cached-token";
		delete process.env.NOTION_KEY;
		const first = await getNotionConfig();

		process.env.NOTION_AUTH = "new-token";
		const second = await getNotionConfig();

		expect(first.auth).toBe("cached-token");
		expect(second.auth).toBe("cached-token");

		clearConfigCache();
		const third = await getNotionConfig();
		expect(third.auth).toBe("new-token");
	});

	test("getNotionConfig prefers project config file in cwd", async () => {
		const workspacePath = createTempWorkspace("config-cwd-file-");
		writeWorkspaceFile({
			workspacePath,
			relativePath: CODEGEN_EMIT_PATHS.notionConfigMjs,
			content: [
				"export default {",
				"  auth: 'config-auth-token',",
				"  databases: ['db-1', 'db-2'],",
				"  agents: ['agent-1'],",
				"};",
			].join("\n"),
		});
		process.chdir(workspacePath);
		process.env.NOTION_AUTH = "env-fallback-should-not-win";

		const config = await getNotionConfig();
		expect(config.auth).toBe("config-auth-token");
		expect(config.databases).toEqual(["db-1", "db-2"]);
		expect(config.agents).toEqual(["agent-1"]);
	});
});
