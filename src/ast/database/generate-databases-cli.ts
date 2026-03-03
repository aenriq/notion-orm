/**
 * CLI orchestration for database type generation.
 * Handles metadata management, file generation coordination, and CLI entry point.
 */

import { Client } from "@notionhq/client";
import fs from "fs";
import path from "path";
import { getNotionConfig } from "../../config/loadConfig";
import {
	type CachedEntityMetadata,
	readAgentMetadataFromDisk,
	readDatabaseMetadata,
} from "../shared/cached-metadata";
import {
	AST_FS_PATHS,
	AST_RUNTIME_CONSTANTS,
	DATABASES_DIR,
} from "../shared/constants";
import { updateSourceIndexFile } from "../shared/emit/orm-index-emitter";
import { emitRegistryModuleArtifacts } from "../shared/emit/registry-emitter";
import { createTypescriptFileForDatabase } from "./database-file-writer";

/**
 * Persists database metadata snapshot after generation completes.
 */
function writeDatabaseMetadata(metadata: CachedEntityMetadata[]): void {
	if (!fs.existsSync(DATABASES_DIR)) {
		fs.mkdirSync(DATABASES_DIR, { recursive: true });
	}
	fs.writeFileSync(
		AST_FS_PATHS.metadataFile,
		JSON.stringify(metadata, null, 2),
	);
}

type CreateDatabaseTypesOptions =
	| { type: "all" }
	| { type: "incremental"; id: string };

/**
 * Main database generation entrypoint used by CLI commands.
 * Flow: resolve target IDs -> generate db files -> write metadata -> emit
 * database registry + root NotionORM index artifacts.
 */
export const createDatabaseTypes = async (
	options: CreateDatabaseTypesOptions,
): Promise<{ databaseNames: string[] }> => {
	const config = await getNotionConfig();
	if (!config.auth) {
		console.error(
			"⚠️ Integration key not found. Inside 'notion.config.js/ts' file, please pass a valid Notion Integration Key",
		);
		process.exit(1);
	}

	const client = new Client({
		auth: config.auth,
		notionVersion: AST_RUNTIME_CONSTANTS.NOTION_API_VERSION,
	});

	// Determine target database IDs and generation mode
	const isFullGenerate = options.type === "all";
	const targetIds = isFullGenerate ? config.databases : [options.id];

	// Prepare for full or incremental generation
	let metadataMap: Map<string, CachedEntityMetadata>;

	if (isFullGenerate) {
		if (fs.existsSync(DATABASES_DIR)) {
			const files = fs.readdirSync(DATABASES_DIR);
			for (const file of files) {
				const filePath = path.join(DATABASES_DIR, file);
				try {
					if (fs.statSync(filePath).isFile()) {
						fs.unlinkSync(filePath);
					}
				} catch {
					// Ignore errors
				}
			}
		}
		console.log("🔄 Updating all database schemas...");
		metadataMap = new Map();
	} else {
		if (targetIds.length === 0) {
			console.error("Please pass some database Ids");
			process.exit(1);
		}
		metadataMap = prepareIncrementalMetadata(config.databases);
	}

	if (targetIds.length === 0) {
		console.log(
			"⚠️  No database IDs found in config. Skipping database generation.",
		);
		writeDatabaseMetadata([]);
		createDatabaseBarrelFile({ databaseInfo: [] });
		const agentsMetadata = readAgentMetadataFromDisk();
		updateSourceIndexFile([], agentsMetadata);
		return { databaseNames: [] };
	}

	const databaseNames: string[] = [];

	for (const databaseId of targetIds) {
		try {
			const dbMetaData = await generateDatabaseTypes(client, databaseId);
			metadataMap.set(dbMetaData.id, dbMetaData);
			databaseNames.push(dbMetaData.displayName);
		} catch (error) {
			console.error(`❌ Error generating types for: ${databaseId}`);
			console.error(error);
			return { databaseNames: [] };
		}
	}

	// Convert map to array and persist metadata
	const databasesMetadata = Array.from(metadataMap.values());
	writeDatabaseMetadata(databasesMetadata);

	// Update barrel file and source index
	createDatabaseBarrelFile({
		databaseInfo: databasesMetadata.map((db) => ({
			name: db.name,
			displayName: db.displayName,
		})),
	});

	const agentsMetadata = readAgentMetadataFromDisk();
	updateSourceIndexFile(databasesMetadata, agentsMetadata);

	return { databaseNames };
};

/**
 * Emits `db/index.ts|js` registry used by generated NotionORM constructor.
 */
function createDatabaseBarrelFile(args: {
	databaseInfo: Array<{ name: string; displayName: string }>;
}) {
	const { databaseInfo } = args;

	emitRegistryModuleArtifacts({
		registryName: "databases",
		entries: databaseInfo.map(({ name }) => ({
			importName: name,
			importPath: `./${name}`,
		})),
		tsPath: AST_FS_PATHS.databaseBarrelTs,
		jsPath: AST_FS_PATHS.databaseBarrelJs,
	});
}

/**
 * Normalizes metadata shape used across registry and index emitters.
 */
function createMetadata(
	id: string,
	name: string,
	displayName: string,
): CachedEntityMetadata {
	return {
		id,
		name,
		displayName,
	};
}

/**
 * Generates one database module and returns metadata for cache/index emission.
 */
async function generateDatabaseTypes(
	client: Client,
	databaseId: string,
): Promise<CachedEntityMetadata> {
	const databaseObject = await client.dataSources.retrieve({
		data_source_id: databaseId,
	});

	const {
		databaseModuleName,
		databaseName,
		databaseId: id,
	} = await createTypescriptFileForDatabase(databaseObject);

	const databaseMetaData = createMetadata(id, databaseModuleName, databaseName);
	return databaseMetaData;
}

/**
 * For incremental runs, keep only cached entries that still exist in config.
 * This avoids emitting stale database references in generated indexes.
 */
function prepareIncrementalMetadata(
	configDatabaseIds: string[],
): Map<string, CachedEntityMetadata> {
	const cachedDatabaseMetadata = readDatabaseMetadata();
	const metadataMap = new Map<string, CachedEntityMetadata>();

	const configIdsSet = new Set(configDatabaseIds);
	for (const dbMetadata of cachedDatabaseMetadata) {
		if (configIdsSet.has(dbMetadata.id)) {
			metadataMap.set(dbMetadata.id, dbMetadata);
		}
	}

	return metadataMap;
}
