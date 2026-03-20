/**
 * CLI orchestration for agent type generation.
 * Syncs agent metadata into config, emits agent modules, and refreshes the
 * generated source index when requested.
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
import { camelize, toUndashedNotionId } from "../../helpers";
import { createNameImport } from "../shared/ast-builders";
import {
	type CachedEntityMetadata,
	readDatabaseMetadata,
} from "../shared/cached-metadata";
import {
	AGENTS_DIR,
	AST_FS_PATHS,
	AST_IMPORT_PATHS,
} from "../shared/constants";
import { emitValueAsExpression } from "../shared/emit/emit-value-as-expression";
import { updateSourceIndexFile } from "../shared/emit/orm-index-emitter";
import { emitRegistryModuleArtifacts } from "../shared/emit/registry-emitter";
import { emitTsAndJsArtifacts } from "../shared/emit/ts-emit-core";
import { TS_EMIT_OPTIONS_GENERATED } from "../shared/emit/ts-emit-options";

function writeAgentMetadata(metadata: CachedAgentMetadata[]): void {
	if (!fs.existsSync(AGENTS_DIR)) {
		fs.mkdirSync(AGENTS_DIR, { recursive: true });
	}
	fs.writeFileSync(
		AST_FS_PATHS.agentMetadataFile,
		JSON.stringify(metadata, null, 2),
	);
}

type CachedAgentMetadata = CachedEntityMetadata;
type GenerationProgress = { completed: number; total: number };
type CreateAgentTypesOptions = {
	onProgress?: (progress: GenerationProgress) => void;
	skipSourceIndexUpdate?: boolean;
};

/**
 * Main entrypoint for agent generation used by the CLI.
 * Fetches all shared agents, keeps config in sync, emits per-agent modules,
 * then updates registry metadata used by the root ORM index.
 */
export const createAgentTypes = async (
	options?: CreateAgentTypesOptions,
): Promise<{ agentNames: string[] }> => {
	const config = await getNotionConfig();

	const client = new NotionAgentsClient({
		auth: config.auth,
	});

	const agentsList = await client.agents.list({
		page_size: 100,
	});
	options?.onProgress?.({ completed: 0, total: agentsList.results.length });

	const configFile = findConfigFile();
	if (configFile) {
		const agentsToSync = agentsList.results.map(({ id, name }) => ({
			id,
			name,
		}));
		await syncAgentsInConfigWithAST(
			configFile.path,
			agentsToSync,
			configFile.isTS,
		);
	}

	const metadataMap = new Map<string, CachedAgentMetadata>();
	const agentNames: string[] = [];
	let completedCount = 0;

	for (const agent of agentsList.results) {
		try {
			const normalizedIdForStorage = toUndashedNotionId(agent.id);
			const agentMetadata = await generateAgentTypes(
				normalizedIdForStorage,
				agent.name,
				parseAgentIcon(agent.icon),
			);
			metadataMap.set(agentMetadata.id, agentMetadata);
			agentNames.push(agentMetadata.displayName);
			completedCount += 1;
			options?.onProgress?.({
				completed: completedCount,
				total: agentsList.results.length,
			});
		} catch (error) {
			console.error(`❌ Error generating types for agent: ${agent.id}`);
			console.error(error);
		}
	}

	const agentsMetadata = Array.from(metadataMap.values());
	writeAgentMetadata(agentsMetadata);

	createAgentBarrelFile({
		agentInfo: agentsMetadata.map((agent) => ({ name: agent.name })),
	});

	if (!options?.skipSourceIndexUpdate) {
		const databasesMetadata = readDatabaseMetadata();
		updateSourceIndexFile(databasesMetadata, agentsMetadata);
	}

	return { agentNames };
};

/** Emits `agents/index.ts|js` so generated clients can be imported as a registry. */
function createAgentBarrelFile(args: { agentInfo: Array<{ name: string }> }) {
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
 * Trust boundary for icon payloads returned by the Notion Agents API.
 * Parsing here preserves the literal discriminants used by generated output.
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

/** Converts unknown icon payloads into the canonical `AgentIcon` shape. */
function parseAgentIcon(input: unknown): AgentIcon {
	const parseResult = agentIconSchema.safeParse(input);
	return parseResult.success ? parseResult.data : null;
}

/** Generates one agent module and returns the metadata used by registries. */
async function generateAgentTypes(
	agentId: string,
	agentName: string,
	agentIcon: AgentIcon,
): Promise<CachedAgentMetadata> {
	const agentModuleName = camelize(agentName);

	await createTypescriptFileForAgent(
		agentId,
		agentName,
		agentModuleName,
		agentIcon,
	);

	const agentMetadata = createMetadata(agentId, agentModuleName, agentName);
	return agentMetadata;
}

/**
 * Emits the concrete TypeScript and JavaScript module for one agent.
 * Each generated module exports a factory that builds an `AgentClient`.
 */
async function createTypescriptFileForAgent(
	agentId: string,
	agentName: string,
	agentModuleName: string,
	agentIcon: AgentIcon,
) {
	const agentClientImport = createNameImport({
		namedImport: "AgentClient",
		path: AST_IMPORT_PATHS.AGENT_CLIENT,
	});

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

	const iconValue = emitValueAsExpression(agentIcon);

	const agentClientFunction = ts.factory.createVariableStatement(
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier(agentModuleName),
					undefined,
					undefined,
					ts.factory.createArrowFunction(
						undefined,
						undefined,
						[
							ts.factory.createParameterDeclaration(
								undefined,
								undefined,
								ts.factory.createIdentifier("auth"),
								undefined,
								ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
								undefined,
							),
						],
						undefined,
						undefined,
						ts.factory.createNewExpression(
							ts.factory.createIdentifier("AgentClient"),
							undefined,
							[
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
											iconValue,
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
