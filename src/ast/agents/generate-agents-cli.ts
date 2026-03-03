/**
 * CLI orchestration for agent type generation.
 * Handles metadata management, file generation coordination, and CLI entry point.
 */

import { NotionAgentsClient } from "@notionhq/agents-client";
import fs from "fs";
import path from "path";
import * as ts from "typescript";
import { z } from "zod";
import { syncAgentsInConfigWithAST } from "../../cli/helpers";
import type { AgentIcon } from "../../client/AgentClient";
import { findConfigFile } from "../../config/helpers";
import { getNotionConfig } from "../../config/loadConfig";
import { camelize } from "../../helpers";
import { createNameImport } from "../shared/ast-builders";
import {
	type CachedEntityMetadata,
	readDatabaseMetadata,
} from "../shared/cached-metadata";
import { AGENTS_DIR, AST_IMPORT_PATHS } from "../shared/constants";
import { emitValueAsExpression } from "../shared/emit/emit-value-as-expression";
import { updateSourceIndexFile } from "../shared/emit/orm-index-emitter";
import { emitRegistryModuleArtifacts } from "../shared/emit/registry-emitter";
import { emitTsAndJsArtifacts } from "../shared/emit/ts-emit-core";
import { TS_EMIT_OPTIONS_GENERATED } from "../shared/emit/ts-emit-options";

/**
 * Returns the file path where agent metadata is stored.
 * Metadata contains cached information about generated agents (id, name, displayName).
 */
function getAgentsMetadataFilePath(): string {
	return path.resolve(AGENTS_DIR, "metadata.json");
}

/**
 * Writes agent metadata to disk as JSON.
 * Creates the agents directory if it doesn't exist.
 * This metadata is used to track which agents have been generated and their properties.
 */
function writeAgentMetadata(metadata: CachedAgentMetadata[]): void {
	if (!fs.existsSync(AGENTS_DIR)) {
		fs.mkdirSync(AGENTS_DIR, { recursive: true });
	}
	const metadataFile = getAgentsMetadataFilePath();
	fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
}

type CachedAgentMetadata = CachedEntityMetadata;

/**
 * Main entry point for generating agent TypeScript files.
 *
 * Orchestrates the entire agent generation process:
 * 1. Fetches all agents from Notion API (agents shared with the integration)
 * 2. Syncs agents array in config file (adds new ones, removes stale ones)
 * 3. Generates TypeScript files for each agent
 * 4. Creates barrel file (index.ts/js) for agent exports
 * 5. Updates the main source index file with agent imports
 *
 * @returns Array of generated agent display names
 */
export const createAgentTypes = async (): Promise<{ agentNames: string[] }> => {
	const config = await getNotionConfig();

	if (!config.auth) {
		console.error(
			"⚠️ Integration key not found. Inside 'notion.config.js/ts' file, please pass a valid Notion Integration Key",
		);
		process.exit(1);
	}

	const client = new NotionAgentsClient({
		auth: config.auth,
	});

	const agentsList = await client.agents.list({
		page_size: 100,
	});

	// Sync agents in config file
	const configFile = findConfigFile();
	if (configFile) {
		const agentsToSync = agentsList.results.map(
			(a: { id: string; name: string }) => ({
				id: a.id,
				name: a.name,
			}),
		);
		await syncAgentsInConfigWithAST(
			configFile.path,
			agentsToSync,
			configFile.isTS,
		);
	}

	// Generate types for all agents from API
	const metadataMap = new Map<string, CachedAgentMetadata>();
	const agentNames: string[] = [];

	for (const agent of agentsList.results) {
		try {
			const normalizedIdForStorage = agent.id.replace(/-/g, "");
			const agentMetaData = await generateAgentTypes(
				normalizedIdForStorage,
				agent.name,
				parseAgentIcon(agent.icon),
			);
			metadataMap.set(agentMetaData.id, agentMetaData);
			agentNames.push(agentMetaData.displayName);
		} catch (error) {
			console.error(`❌ Error generating types for agent: ${agent.id}`);
			console.error(error);
		}
	}

	const agentsMetadata = Array.from(metadataMap.values());
	writeAgentMetadata(agentsMetadata);

	createAgentBarrelFile({
		agentInfo: agentsMetadata.map((agent) => ({
			name: agent.name,
			displayName: agent.displayName,
		})),
	});

	const databasesMetadata = readDatabaseMetadata();
	updateSourceIndexFile(databasesMetadata, agentsMetadata);

	return { agentNames };
};

/**
 * Creates a barrel file (index.ts/js) that exports all generated agent factories.
 *
 * The barrel file contains:
 * - Import statements for each generated agent module
 * - An exported "agents" object mapping generated names to their implementations
 *
 * This allows consumers to access agents via: `import { agents } from './agents'`
 *
 * Example generated barrel file (index.ts):
 * ```ts
 * import { foodManager } from "./foodManager";
 * import { bookAssistant } from "./bookAssistant";
 * export const agents = {
 *   foodManager: foodManager,
 *   bookAssistant: bookAssistant,
 * };
 * ```
 *
 * @param args - Object containing agent info (name and displayName for each agent)
 */
function createAgentBarrelFile(args: {
	agentInfo: Array<{ name: string; displayName: string }>;
}) {
	const { agentInfo } = args;

	emitRegistryModuleArtifacts({
		registryName: "agents",
		entries: agentInfo.map(({ name }) => ({
			importName: name,
			importPath: `./${name}`,
		})),
		tsPath: path.resolve(AGENTS_DIR, "index.ts"),
		jsPath: path.resolve(AGENTS_DIR, "index.js"),
	});
}

/**
 * Creates a metadata object for an agent.
 *
 * Metadata is used to track agent information across generation cycles:
 * - id: Normalized agent ID (without dashes)
 * - name: Generated identifier/file name (e.g., "foodManager")
 * - displayName: Human-readable agent name
 *
 * @param id - Normalized agent ID
 * @param name - Generated identifier/file name
 * @param displayName - Human-readable display name
 * @returns CachedAgentMetadata object
 */
function createMetadata(
	id: string,
	name: string,
	displayName: string,
): CachedAgentMetadata {
	return {
		id,
		name,
		displayName,
	};
}

/**
 * Runtime trust boundary for icon payloads returned by Notion Agents API.
 * Parsing here preserves literal discriminants used by generated AST output.
 */
const agentIconSchema: z.ZodType<AgentIcon> = z.union([
	z.object({
		type: z.literal("emoji"),
		emoji: z.string(),
	}),
	z.object({
		type: z.literal("file"),
		file: z.object({
			url: z.string(),
			expiry_time: z.string(),
		}),
	}),
	z.object({
		type: z.literal("external"),
		external: z.object({
			url: z.string(),
		}),
	}),
	z.object({
		type: z.literal("custom_emoji"),
		custom_emoji: z.object({
			id: z.string(),
			name: z.string(),
			url: z.string(),
		}),
	}),
	z.object({
		type: z.literal("custom_agent_avatar"),
		custom_agent_avatar: z.object({
			static_url: z.string(),
			animated_url: z.string(),
		}),
	}),
	z.null(),
]);

/**
 * Converts unknown icon payloads to canonical `AgentIcon`; falls back to null
 * for unsupported or malformed data to keep generation resilient.
 */
function parseAgentIcon(input: unknown): AgentIcon {
	const parseResult = agentIconSchema.safeParse(input);
	return parseResult.success ? parseResult.data : null;
}

/**
 * Generates TypeScript files for a single agent and returns its metadata.
 *
 * This function:
 * 1. Converts the agent name to a generated identifier
 * 2. Creates the TypeScript/JavaScript files for the agent
 * 3. Returns metadata used by source index emission
 *
 * @param agentId - Normalized agent ID (without dashes)
 * @param agentName - Human-readable agent name from Notion
 * @param agentIcon - Icon data from Notion API (can be null)
 * @returns CachedAgentMetadata for the generated agent
 */
async function generateAgentTypes(
	agentId: string,
	agentName: string,
	agentIcon: AgentIcon,
): Promise<CachedAgentMetadata> {
	const agentModuleName = camelize(agentName);
	const agentDisplayName = agentName;

	await createTypescriptFileForAgent(
		agentId,
		agentName,
		agentModuleName,
		agentIcon,
	);

	const agentMetaData = createMetadata(
		agentId,
		agentModuleName,
		agentDisplayName,
	);
	return agentMetaData;
}

/**
 * Creates the actual TypeScript and JavaScript files for an agent.
 *
 * Generates a file that exports a factory function which creates an AgentClient instance.
 * These factories are later wired into the generated root NotionORM class.
 * The generated file structure:
 * - Imports AgentClient from the package
 * - Defines constants for agent id, name, and icon
 * - Exports a function that takes `auth` and returns a new AgentClient instance
 *
 * Example generated code:
 * ```ts
 * import { AgentClient } from "@haustle/notion-orm/build/src/client/AgentClient";
 * const id = "agent-id-here";
 * const name = "Agent Name";
 * const icon = { type: "emoji", emoji: "🤖" };
 * export const foodManager = (auth: string) => new AgentClient({ auth, id, name, icon });
 * ```
 *
 * @param agentId - Normalized agent ID (without dashes)
 * @param agentName - Human-readable agent name
 * @param agentModuleName - Generated identifier/file name (e.g., "foodManager")
 * @param agentIcon - Icon data from Notion API (can be null)
 */
async function createTypescriptFileForAgent(
	agentId: string,
	agentName: string,
	agentModuleName: string,
	agentIcon: AgentIcon,
) {
	// Creates: import { AgentClient } from "@haustle/notion-orm/build/src/client/AgentClient";
	const agentClientImport = createNameImport({
		namedImport: "AgentClient",
		path: AST_IMPORT_PATHS.AGENT_CLIENT,
	});

	// Creates: const id = "2c3c495da03c8078b95500927f02d213";
	const idVariable = ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier("id"),
					undefined,
					undefined,
					ts.factory.createStringLiteral(agentId),
				),
			],
			ts.NodeFlags.Const,
		),
	);

	// Creates: const name = "Food Manager";
	const nameVariable = ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier("name"),
					undefined,
					undefined,
					ts.factory.createStringLiteral(agentName),
				),
			],
			ts.NodeFlags.Const,
		),
	);

	// Creates: const icon = { type: "emoji", emoji: "🤖" } | null;
	const iconValue = emitValueAsExpression(agentIcon);

	const iconVariable = ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier("icon"),
					undefined,
					undefined,
					iconValue,
				),
			],
			ts.NodeFlags.Const,
		),
	);

	// Creates: export const foodManager = (auth: string) => new AgentClient({ auth, id, name, icon });
	const agentClientFunction = ts.factory.createVariableStatement(
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					// Creates: foodManager (variable name)
					ts.factory.createIdentifier(agentModuleName),
					undefined,
					undefined,
					// Creates: (auth: string) => new AgentClient({ auth, id, name })
					ts.factory.createArrowFunction(
						undefined,
						undefined,
						[
							// Creates: auth: string (parameter)
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								ts.factory.createIdentifier("auth"),
								undefined,
								// Creates: string (type annotation)
								ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
								undefined,
							),
						],
						undefined,
						undefined,
						// Creates: new AgentClient({ auth, id, name })
						ts.factory.createNewExpression(
							ts.factory.createIdentifier("AgentClient"),
							undefined,
							[
								// Creates: { auth, id, name, icon } (object literal argument)
								ts.factory.createObjectLiteralExpression(
									[
										ts.factory.createPropertyAssignment(
											ts.factory.createIdentifier("auth"),
											ts.factory.createIdentifier("auth"),
										),
										ts.factory.createPropertyAssignment(
											ts.factory.createIdentifier("id"),
											ts.factory.createIdentifier("id"),
										),
										ts.factory.createPropertyAssignment(
											ts.factory.createIdentifier("name"),
											ts.factory.createIdentifier("name"),
										),
										ts.factory.createPropertyAssignment(
											ts.factory.createIdentifier("icon"),
											ts.factory.createIdentifier("icon"),
										),
									],
									false,
								),
							],
						),
					),
				),
			],
			ts.NodeFlags.Const,
		),
	);

	const allNodes = ts.factory.createNodeArray([
		agentClientImport,
		idVariable,
		nameVariable,
		iconVariable,
		agentClientFunction,
	]);

	if (!fs.existsSync(AGENTS_DIR)) {
		fs.mkdirSync(AGENTS_DIR, { recursive: true });
	}

	const tsFilePath = path.resolve(AGENTS_DIR, `${agentModuleName}.ts`);
	const jsFilePath = path.resolve(AGENTS_DIR, `${agentModuleName}.js`);
	emitTsAndJsArtifacts({
		nodes: allNodes,
		tsPath: tsFilePath,
		jsPath: jsFilePath,
		module: TS_EMIT_OPTIONS_GENERATED.module,
		target: TS_EMIT_OPTIONS_GENERATED.target,
	});
}
