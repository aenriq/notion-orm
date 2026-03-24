/**
 * Database file writer for generated Notion data sources.
 * Converts a Notion schema response into emitted TS/JS modules, runtime Zod
 * validation, and metadata used by the generated client layer.
 */
import type {
	DataSourceObjectResponse,
	GetDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import fs from "fs";
import path from "path";
import * as ts from "typescript";
import {
	type DatabasePropertyType,
	isSupportedPropertyType,
	type SupportedNotionColumnType,
} from "../../client/queryTypes";
import { camelize, toUndashedNotionId } from "../../helpers";
import {
	createClassSpecificTypeExports,
	createColumnNameToColumnProperties,
	createColumnNameToColumnType,
	createDatabaseClassExport,
	createDatabaseIdVariable,
	createNameImport,
	createQueryTypeExport,
	toPascalCase,
} from "../shared/ast-builders";
import { AST_FS_PATHS, AST_IMPORT_PATHS } from "../shared/constants";
import {
	emitTsAndJsArtifacts,
	printTsNodes,
	transpileTsToJs,
} from "../shared/emit/ts-emit-core";
import { TS_EMIT_OPTIONS_GENERATED } from "../shared/emit/ts-emit-options";
import {
	propertyASTGenerators,
	type SupportedNotionProperty,
} from "./notion-column-generators";
import { createZodSchema, type ZodMetadata } from "./zod-schema";

type PropertyNameToColumnMetadataMap = Record<
	string,
	{ columnName: string; type: DatabasePropertyType }
>;

type NotionDataSourceProperty = DataSourceObjectResponse["properties"][string];

/** Narrows Notion properties to the subset supported by our emitters. */
function isSupportedNotionProperty(
	property: NotionDataSourceProperty,
): property is SupportedNotionProperty {
	return isSupportedPropertyType(property.type);
}

/**
 * Prefer the live Notion title when present, but fall back to a stable label so
 * generation can still succeed for sparse payloads.
 */
function getDataSourceDisplayName(args: {
	dataSourceResponse: GetDataSourceResponse;
	normalizedDataSourceId: string;
}): string {
	if ("title" in args.dataSourceResponse) {
		const title = args.dataSourceResponse.title?.[0]?.plain_text?.trim();
		if (title) {
			return title;
		}
	}
	return `Database ${args.normalizedDataSourceId.slice(0, 8)}`;
}

export interface DatabaseModuleBuildResult {
	nodes: ts.Statement[];
	databaseName: string;
	databaseModuleName: string;
	databaseId: string;
}

/**
 * Pure AST builder for a single database module.
 * Returns statement nodes and metadata without any filesystem side effects,
 * making it the primary seam for golden/snapshot tests.
 */
export function buildDatabaseModuleNodes(
		dataSourceResponse: GetDataSourceResponse,
	): DatabaseModuleBuildResult {
		const { id: dataSourceId, properties } = dataSourceResponse;
		const normalizedDataSourceId = toUndashedNotionId(dataSourceId);

		const camelPropertyNameToNameAndTypeMap: PropertyNameToColumnMetadataMap =
			{};
		const enumConstStatements: ts.Statement[] = [];
		const zodColumns: ZodMetadata[] = [];

		const databaseName = getDataSourceDisplayName({
			dataSourceResponse,
			normalizedDataSourceId,
		});

		const databaseModuleName = camelize(databaseName);

		const databaseColumnTypeProps: ts.TypeElement[] = [];

		Object.entries(properties).forEach(([propertyName, value], index) => {
			const unsupportedPropertyType = value.type;
			if (!isSupportedNotionProperty(value)) {
				console.error(`${index === 0 ? "\n" : ""}
				[${databaseModuleName}] Property '${propertyName}' with type '${unsupportedPropertyType}' is not supported and will be skipped.`);
				return;
			}

			const propertyType: SupportedNotionColumnType = value.type;

			const camelizedColumnName = camelize(propertyName);

			camelPropertyNameToNameAndTypeMap[camelizedColumnName] = {
				columnName: propertyName,
				type: propertyType,
			};

			const handler = propertyASTGenerators[propertyType];
			if (!handler) {
				console.warn(`No handler found for column type '${propertyType}'`);
				return;
			}

			const result = handler({
				columnName: propertyName,
				camelizedName: camelizedColumnName,
				columnValue: value,
			});
			if (!result) {
				return;
			}

			const { tsPropertySignature, zodMeta, enumConstStatement } = result;

			databaseColumnTypeProps.push(tsPropertySignature);

			if (enumConstStatement) {
				enumConstStatements.push(enumConstStatement);
			}

			zodColumns.push({
				propName: camelizedColumnName,
				columnName: propertyName,
				type: propertyType,
				...zodMeta,
			});
		});

		const schemaIdentifier = `${toPascalCase(databaseModuleName)}Schema`;
		const zodSchemaStatement = createZodSchema({
			identifier: schemaIdentifier,
			columns: zodColumns,
		});

		const databaseSchemaTypeAlias = ts.factory.createTypeAliasDeclaration(
			[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createIdentifier("DatabaseSchemaType"),
			undefined,
			ts.factory.createTypeLiteralNode(databaseColumnTypeProps),
		);

		const nodes: ts.Statement[] = [
			createNameImport({
				namedImport: "DatabaseClient",
				path: AST_IMPORT_PATHS.DATABASE_CLIENT,
			}),
			createNameImport({
				namedImport: "z",
				path: AST_IMPORT_PATHS.ZOD,
			}),
			createNameImport({
				namedImport: "Query",
				path: AST_IMPORT_PATHS.QUERY_TYPES,
				typeOnly: true,
			}),
			createDatabaseIdVariable(normalizedDataSourceId),
			...enumConstStatements,
			zodSchemaStatement,
			databaseSchemaTypeAlias,
			ts.factory.createVariableStatement(
				undefined,
				createColumnNameToColumnProperties(camelPropertyNameToNameAndTypeMap),
			),
			createColumnNameToColumnType(),
			createQueryTypeExport(),
			createDatabaseClassExport({
				databaseName: databaseModuleName,
				schemaIdentifier,
				schemaTitle: databaseName,
			}),
			...createClassSpecificTypeExports({
				databaseName: databaseModuleName,
				schemaIdentifier,
			}),
		];

		return {
			nodes,
			databaseName,
			databaseModuleName,
			databaseId: normalizedDataSourceId,
		};
	}

/**
 * Renders the generated database module to TS and JS source text without
 * writing to disk. Used by golden tests and any caller that needs the
 * emitted code as strings.
 */
export function renderDatabaseModule(
	dataSourceResponse: GetDataSourceResponse,
): {
	tsCode: string;
	jsCode: string;
	databaseName: string;
	databaseModuleName: string;
	databaseId: string;
} {
	const { nodes, databaseName, databaseModuleName, databaseId } =
		buildDatabaseModuleNodes(dataSourceResponse);
	const tsCode = printTsNodes({ nodes });
	const jsCode = transpileTsToJs({
		typescriptCode: tsCode,
		module: TS_EMIT_OPTIONS_GENERATED.module,
		target: TS_EMIT_OPTIONS_GENERATED.target,
	});
	return { tsCode, jsCode, databaseName, databaseModuleName, databaseId };
}

/**
 * Creates the generated module for a single database and writes it to disk.
 * Thin wrapper over the pure builders that adds filesystem I/O.
 */
export async function createTypescriptFileForDatabase(
	dataSourceResponse: GetDataSourceResponse,
) {
	const { nodes, databaseName, databaseModuleName, databaseId } =
		buildDatabaseModuleNodes(dataSourceResponse);

	const databasesDir = AST_FS_PATHS.DATABASES_DIR;
	if (!fs.existsSync(databasesDir)) {
		fs.mkdirSync(databasesDir, { recursive: true });
	}

	emitTsAndJsArtifacts({
		nodes,
		tsPath: path.resolve(databasesDir, `${databaseModuleName}.ts`),
		jsPath: path.resolve(databasesDir, `${databaseModuleName}.js`),
		module: TS_EMIT_OPTIONS_GENERATED.module,
		target: TS_EMIT_OPTIONS_GENERATED.target,
	});

	return {
		databaseName,
		databaseModuleName,
		databaseId,
	};
}
