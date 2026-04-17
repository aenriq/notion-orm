import fs from "fs";
import path from "path";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import { Client } from "@notionhq/client";
import { AST_FS_PATHS } from "../ast/shared/constants";
import { getNotionConfig } from "../config/loadConfig";
import { createDatabaseTypes } from "../ast/database/generate-databases-cli";

function isNode(value: unknown): value is t.Node {
	if (typeof value !== "object" || value === null || !("type" in value)) {
		return false;
	}
	const nodeType: unknown = Reflect.get(value, "type");
	return typeof nodeType === "string";
}

function traverseAst(node: t.Node, visitor: (node: t.Node) => void): void {
	visitor(node);
	const visitorKeys = t.VISITOR_KEYS[node.type] ?? [];
	for (const key of visitorKeys) {
		const value: unknown = Reflect.get(node, key);
		if (Array.isArray(value)) {
			for (const childNode of value) {
				if (isNode(childNode)) {
					traverseAst(childNode, visitor);
				}
			}
			continue;
		}
		if (isNode(value)) {
			traverseAst(value, visitor);
		}
	}
}

function extractDatabaseInfo(sourceCode: string): { columns: Record<string, string>; databaseId: string } {
	const ast = parser.parse(sourceCode, {
		sourceType: "module",
		allowImportExportEverywhere: true,
		plugins: ["typescript"],
	});

	let columnsObject: t.ObjectExpression | undefined;
	let databaseId = "";

	traverseAst(ast, (node) => {
		if (
			!columnsObject &&
			t.isVariableDeclarator(node) &&
			t.isIdentifier(node.id) &&
			node.id.name === "columns"
		) {
			let currentExpression = node.init;
			while (currentExpression) {
				if (t.isObjectExpression(currentExpression)) {
					columnsObject = currentExpression;
					break;
				}
				if (
					t.isTSSatisfiesExpression(currentExpression) ||
					t.isTSAsExpression(currentExpression) ||
					t.isTSNonNullExpression(currentExpression)
				) {
					currentExpression = currentExpression.expression;
					continue;
				}
				break;
			}
		}

		if (
			!databaseId &&
			t.isObjectProperty(node) &&
			t.isIdentifier(node.key) &&
			node.key.name === "id" &&
			t.isStringLiteral(node.value)
		) {
			databaseId = node.value.value;
		}
	});

	const columns: Record<string, string> = {};
	if (columnsObject) {
		for (const prop of columnsObject.properties) {
			if (t.isObjectProperty(prop)) {
				let type = "unknown";
				let columnName = "";

				if (t.isObjectExpression(prop.value)) {
					const typeProp = prop.value.properties.find(
						(cp): cp is t.ObjectProperty =>
							t.isObjectProperty(cp) && t.isIdentifier(cp.key) && cp.key.name === "type"
					);
					if (typeProp && t.isStringLiteral(typeProp.value)) {
						type = typeProp.value.value;
					}

					const nameProp = prop.value.properties.find(
						(cp): cp is t.ObjectProperty =>
							t.isObjectProperty(cp) && t.isIdentifier(cp.key) && cp.key.name === "columnName"
					);
					if (nameProp && t.isStringLiteral(nameProp.value)) {
						columnName = nameProp.value.value;
					}
				}

				if (columnName) {
					columns[columnName] = type;
				}
			}
		}
	}

	return { columns, databaseId };
}

export async function runPushDb(dbName: string) {
	const dbFilePath = path.join(AST_FS_PATHS.DATABASES_DIR, `${dbName}.ts`);
	if (!fs.existsSync(dbFilePath)) {
		console.error(`❌ Database schema file not found: ${dbFilePath}`);
		console.error(`Run \`notion sync\` first to generate local types.`);
		process.exit(1);
	}

	const sourceCode = fs.readFileSync(dbFilePath, "utf-8");
	const { columns: localColumns, databaseId } = extractDatabaseInfo(sourceCode);

	if (!databaseId) {
		console.error(`❌ Could not extract database ID from ${dbFilePath}`);
		process.exit(1);
	}

	const config = await getNotionConfig();
	const client = new Client({ auth: config.auth });

	console.log(`🔍 Fetching remote schema for database ${databaseId}...`);
	const remoteDb = await client.dataSources.retrieve({ data_source_id: databaseId });
	const remoteColumns = remoteDb.properties;

	const propertiesToUpdate: Record<string, any> = {};

	// Find additions and modifications
	for (const [localName, localType] of Object.entries(localColumns)) {
		// Title cannot be removed or have its type changed in Notion
		if (localType === "title") continue;

		const remoteProp = remoteColumns[localName];
		if (!remoteProp) {
			// Addition
			console.log(`➕ Adding property: ${localName} (${localType})`);
			propertiesToUpdate[localName] = { [localType]: {} };
		} else if (remoteProp.type !== localType) {
			// Modification (type change)
			console.log(`🔄 Modifying property: ${localName} (${remoteProp.type} -> ${localType})`);
			propertiesToUpdate[localName] = { [localType]: {} };
		}
	}

	// Find deletions
	for (const [remoteName, remoteProp] of Object.entries(remoteColumns)) {
		if (remoteProp.type === "title") continue;
		
		if (!(remoteName in localColumns)) {
			// Deletion
			console.log(`➖ Removing property: ${remoteName}`);
			propertiesToUpdate[remoteName] = null;
		}
	}

	if (Object.keys(propertiesToUpdate).length === 0) {
		console.log(`✅ Local schema is already in sync with remote.`);
		return;
	}

	console.log(`\n🚀 Pushing changes to Notion...`);
	try {
		await client.dataSources.update({
			data_source_id: databaseId,
			properties: propertiesToUpdate,
		} as any);
		console.log(`✅ Successfully updated database schema in Notion.`);
		
		console.log(`\n🔄 Running incremental sync to regenerate local types...`);
		await createDatabaseTypes({
			type: "incremental",
			id: databaseId,
		});
		console.log(`✅ Sync complete.`);
	} catch (error) {
		console.error(`❌ Failed to update database schema in Notion:`);
		console.error(error);
		process.exit(1);
	}
}
