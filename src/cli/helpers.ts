import fs from "fs";
import path from "path";
import {
	renderConfigTemplateModule,
	updateConfigListInConfigModule,
} from "../ast/shared/emit/config-emitter";

export function shouldUseTypeScript(): boolean {
	const cwd = process.cwd();
	const tsConfigCandidates = [
		"tsconfig.json",
		"tsconfig.app.json",
		"tsconfig.base.json",
		"tsconfig.build.json",
	];

	for (const candidate of tsConfigCandidates) {
		if (fs.existsSync(path.join(cwd, candidate))) {
			return true;
		}
	}

	return false;
}

export function createConfigTemplate(isTS: boolean): string {
	const renderedTemplate = renderConfigTemplateModule({ isTS });
	return renderedTemplate.endsWith("\n")
		? renderedTemplate
		: `${renderedTemplate}\n`;
}

export function showSetupInstructions(): void {
	console.log("\n📚 Setup Instructions:");
	console.log(
		"1. Run: notion init [--ts|--js] (defaults to TypeScript when tsconfig.json is present)",
	);
	console.log("2. Add your Notion integration token and database IDs");
	console.log("3. Run: notion sync (agents are auto-discovered)");

	console.log("\n📝 Example JavaScript config (notion.config.js):");
	console.log(`
// Be sure to create a .env.local file and add your NOTION_KEY

// If you don't have an API key, sign up for free 
// [here](https://developers.notion.com)

const auth = process.env.NOTION_KEY || "your-notion-api-key-here";
const NotionConfig = {
	auth,
	databases: [
		"database-id-1",
		"database-id-2",
	],
	agents: [
		// Auto-populated by: notion sync
	],
};

module.exports = NotionConfig;
	`);

	console.log("📝 Example TypeScript config (notion.config.ts):");
	console.log(`
// Be sure to create a .env.local file and add your NOTION_KEY

// If you don't have an API key, sign up for free 
// [here](https://developers.notion.com)

const auth = process.env.NOTION_KEY || "your-notion-api-key-here";
const NotionConfig = {
	auth,
	databases: [
		"database-id-1",
		"database-id-2",
	],
	agents: [
		// Auto-populated by: notion sync
	],
};

export default NotionConfig;
	`);

	console.log("\n🔗 Need help getting your integration token?");
	console.log(
		"   Visit: https://developers.notion.com/docs/create-a-notion-integration",
	);
}

export function validateAndGetUndashedUuid(id: string): string | undefined {
	const uuidPattern =
		/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
	const undashedUuid = id.replace(/-/g, "");
	const isValidUndashedUuid = uuidPattern.test(undashedUuid);

	if (!isValidUndashedUuid) {
		return undefined;
	}

	return undashedUuid;
}

export async function writeConfigFileWithAST(
	configPath: string,
	newDatabaseId: string,
	isTS: boolean,
	name?: string,
): Promise<boolean> {
	try {
		const originalContent = fs.readFileSync(configPath, "utf-8");
		const output = updateConfigListInConfigModule({
			sourceCode: originalContent,
			isTS,
			key: "databases",
			items: [{ value: newDatabaseId, comment: name }],
			strategy: "appendUnique",
		});
		if (!output.modified) {
			return false;
		}
		fs.writeFileSync(configPath, output.code);
		return true;
	} catch (error: unknown) {
		console.error("❌ Error updating config file with AST:");
		console.error(error);
		process.exit(1);
	}
}

export async function syncAgentsInConfigWithAST(
	configPath: string,
	agents: Array<{ id: string; name: string }>,
	isTS: boolean,
): Promise<boolean> {
	try {
		const originalContent = fs.readFileSync(configPath, "utf-8");
		const output = updateConfigListInConfigModule({
			sourceCode: originalContent,
			isTS,
			key: "agents",
			items: agents.map((agent) => ({
				value: agent.id.replace(/-/g, ""),
				comment: agent.name,
			})),
			strategy: "replaceAll",
		});
		if (!output.modified) {
			return false;
		}
		fs.writeFileSync(configPath, output.code);
		return true;
	} catch (error: unknown) {
		console.error("❌ Error updating config file with AST:");
		console.error(error);
		process.exit(1);
	}
}

export function isHelpCommand(args: string[]): boolean {
	const possibleArgument = args.length >= 1 ? args[0] : null;
	if (!possibleArgument) {
		return false;
	}
	switch (possibleArgument) {
		case "help":
		case "--help":
		case "-h":
			return true;
		default:
			return false;
	}
}
