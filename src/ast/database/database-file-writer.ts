/**
 * Database file writer - orchestrates the generation of TypeScript files for Notion databases.
 * This module coordinates property generation, AST building, and file writing.
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
import { camelize } from "../../helpers";
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
import { AST_IMPORT_PATHS, DATABASES_DIR } from "../shared/constants";
import { emitTsAndJsArtifacts } from "../shared/emit/ts-emit-core";
import { TS_EMIT_OPTIONS_GENERATED } from "../shared/emit/ts-emit-options";
import {
	propertyASTGenerators,
	type SupportedNotionProperty,
} from "./notion-column-generators";
import { createZodSchema, type ZodMetadata } from "./zod-schema";

type camelPropertyNameToNameAndTypeMapType = Record<
	string,
	{ columnName: string; type: DatabasePropertyType }
>;

type NotionDataSourceProperty = DataSourceObjectResponse["properties"][string];

/**
 * Narrows Notion property payloads to the subset supported by our generators.
 * Unsupported property types are skipped with a warning during emit.
 */
function isSupportedNotionProperty(
	property: NotionDataSourceProperty,
): property is SupportedNotionProperty {
	return isSupportedPropertyType(property.type);
}

/**
 * Creates TypeScript files for a single Notion database.
 * Generates both .ts and .js files with the database schema, types, and client.
 */
export async function createTypescriptFileForDatabase(
	dataSourceResponse: GetDataSourceResponse,
) {
	const { id: dataSourceId, properties } = dataSourceResponse;

	const camelPropertyNameToNameAndTypeMap: camelPropertyNameToNameAndTypeMapType =
		{};
	const enumConstStatements: ts.Statement[] = [];
	const zodColumns: ZodMetadata[] = [];

	// Due to the type not being a discriminated union, we need to check if the
	// title is in the response. I don't like this pattern, but we'll have to
	// settle for now
	const databaseName: string =
		"title" in dataSourceResponse
			? dataSourceResponse.title[0].plain_text
			: "DEFAULT_DATABASE_NAME";

	const databaseModuleName = camelize(databaseName);

	const databaseColumnTypeProps: ts.TypeElement[] = [];

	// Walk each Notion property and build coordinated AST outputs:
	// 1) TS schema property type
	// 2) optional enum value array const
	// 3) Zod metadata used to build runtime schema validators
	Object.entries(properties).forEach(([propertyName, value], index) => {
		const unsupportedPropertyType = value.type;
		if (!isSupportedNotionProperty(value)) {
			console.error(`${index === 0 ? "\n" : ""}
				[${databaseModuleName}] Property '${propertyName}' with type '${unsupportedPropertyType}' is not supported and will be skipped.`);
			return;
		}

		const propertyType: SupportedNotionColumnType = value.type;

		// Taking the column name and camelizing it for typescript use
		const camelizedColumnName = camelize(propertyName);

		// Creating map of column name to the column's name in the database's typescript type
		camelPropertyNameToNameAndTypeMap[camelizedColumnName] = {
			columnName: propertyName,
			type: propertyType,
		};

		// Get handler for this column type (propertyType is now narrowed to SupportedNotionColumnType)
		const handler = propertyASTGenerators[propertyType];
		if (!handler) {
			console.warn(`No handler found for column type '${propertyType}'`);
			return;
		}

		// Execute handler to get all data at once
		const result = handler({
			columnName: propertyName,
			camelizedName: camelizedColumnName,
			columnValue: value,
		});
		if (!result) {
			return;
		}

		// Destructure the complete result
		const { tsPropertySignature, zodMeta, enumConstStatement } = result;

		// Add to appropriate collections
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

	// Object type that represents the database schema
	const DatabaseSchemaType = ts.factory.createTypeAliasDeclaration(
		[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier("DatabaseSchemaType"),
		undefined,
		ts.factory.createTypeLiteralNode(databaseColumnTypeProps),
	);

	// Top level non-nested variable, functions, types for database files
	const TsNodesForDatabaseFile = ts.factory.createNodeArray([
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
		createDatabaseIdVariable(dataSourceId),
		...enumConstStatements,
		zodSchemaStatement,
		DatabaseSchemaType,
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
		// Export class-specific type aliases for the custom NotionORM class
		...createClassSpecificTypeExports({
			databaseName: databaseModuleName,
			schemaIdentifier,
		}),
	]);

	// Create databases output folder
	if (!fs.existsSync(DATABASES_DIR)) {
		fs.mkdirSync(DATABASES_DIR, { recursive: true });
	}

	emitTsAndJsArtifacts({
		nodes: TsNodesForDatabaseFile,
		tsPath: path.resolve(DATABASES_DIR, `${databaseModuleName}.ts`),
		jsPath: path.resolve(DATABASES_DIR, `${databaseModuleName}.js`),
		module: TS_EMIT_OPTIONS_GENERATED.module,
		target: TS_EMIT_OPTIONS_GENERATED.target,
	});

	// Metadata returns drive metadata cache + top-level registry/index emission.
	return { databaseName, databaseModuleName, databaseId: dataSourceId };
}
