import fs from "fs";
import path from "path";
import * as readline from "node:readline";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import generate from "@babel/generator";
import { AST_FS_PATHS } from "../ast/shared/constants";
import { SUPPORTED_PROPERTY_TYPES, type SupportedNotionColumnType } from "../client/database/types/schema";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function question(query: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(query, resolve);
	});
}

function parseSource(sourceCode: string): t.File {
	return parser.parse(sourceCode, {
		sourceType: "module",
		allowImportExportEverywhere: true,
		plugins: ["typescript"],
	});
}

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

function findColumnsObject(ast: t.File): t.ObjectExpression | undefined {
	let columnsObject: t.ObjectExpression | undefined;
	traverseAst(ast, (node) => {
		if (columnsObject) return;
		if (
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
	});
	return columnsObject;
}

export async function runEditDb(dbName: string) {
	const dbFilePath = path.join(AST_FS_PATHS.DATABASES_DIR, `${dbName}.ts`);
	if (!fs.existsSync(dbFilePath)) {
		console.error(`❌ Database schema file not found: ${dbFilePath}`);
		console.error(`Run \`notion sync\` first to generate local types.`);
		process.exit(1);
	}

	const sourceCode = fs.readFileSync(dbFilePath, "utf-8");
	const ast = parseSource(sourceCode);
	const columnsObj = findColumnsObject(ast);

	if (!columnsObj) {
		console.error(`❌ Could not find 'columns' object in ${dbFilePath}`);
		process.exit(1);
	}

	console.log(`\n📝 Editing schema for ${dbName}`);
	console.log(`Current properties:`);
	const currentProps = columnsObj.properties
		.filter((p): p is t.ObjectProperty => t.isObjectProperty(p))
		.map((p) => {
			const key = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : "unknown";
			let type = "unknown";
			if (t.isObjectExpression(p.value)) {
				const typeProp = p.value.properties.find(
					(cp): cp is t.ObjectProperty =>
						t.isObjectProperty(cp) && t.isIdentifier(cp.key) && cp.key.name === "type"
				);
				if (typeProp && t.isStringLiteral(typeProp.value)) {
					type = typeProp.value.value;
				}
			}
			return { key, type };
		});

	currentProps.forEach((p) => {
		console.log(`  - ${p.key}: ${p.type}`);
	});

	console.log(`\nOptions:`);
	console.log(`  1. Add a property`);
	console.log(`  2. Remove a property`);
	console.log(`  3. Exit and save`);

	while (true) {
		const choice = await question(`\nSelect an option (1-3): `);
		if (choice === "1") {
			const propName = await question(`Property name: `);
			const propType = await question(`Property type (e.g. rich_text, number, checkbox): `);
			
			if (!(propType in SUPPORTED_PROPERTY_TYPES)) {
				console.error(`❌ Unsupported property type: ${propType}`);
				continue;
			}

			// Add property to AST
			const newProp = t.objectProperty(
				t.stringLiteral(propName),
				t.objectExpression([
					t.objectProperty(t.identifier("columnName"), t.stringLiteral(propName)),
					t.objectProperty(t.identifier("type"), t.stringLiteral(propType)),
				])
			);
			columnsObj.properties.push(newProp);
			console.log(`✅ Added ${propName} (${propType})`);
		} else if (choice === "2") {
			const propName = await question(`Property name to remove: `);
			const index = columnsObj.properties.findIndex((p) => {
				if (t.isObjectProperty(p)) {
					const key = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : "";
					return key === propName;
				}
				return false;
			});

			if (index !== -1) {
				columnsObj.properties.splice(index, 1);
				console.log(`✅ Removed ${propName}`);
			} else {
				console.error(`❌ Property not found: ${propName}`);
			}
		} else if (choice === "3") {
			break;
		} else {
			console.error(`❌ Invalid choice`);
		}
	}

	rl.close();

	const output = generate(ast, { retainLines: true, concise: false });
	fs.writeFileSync(dbFilePath, output.code);
	
	// Format the file if possible
	try {
		const { spawnSync } = await import("node:child_process");
		const prettierPath = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "prettier.cmd" : "prettier");
		if (fs.existsSync(prettierPath)) {
			spawnSync(prettierPath, ["--write", dbFilePath], { stdio: "ignore" });
		}
	} catch (e) {
		// ignore formatting errors
	}

	console.log(`\n✅ Saved changes to ${dbFilePath}`);
	console.log(`Run \`notion push ${dbName}\` to apply these changes to Notion.`);
}
