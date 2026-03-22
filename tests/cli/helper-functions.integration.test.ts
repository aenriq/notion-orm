import { describe, expect, test } from "bun:test";
import {
	createConfigTemplate,
	isHelpCommand,
	validateAndGetUndashedNotionId,
} from "../../src/cli/helpers";

describe("CLI helpers integration", () => {
	// Checks UUID helper normalizes valid IDs and rejects invalid input.
	test("validates and normalizes UUID values", () => {
		expect(
			validateAndGetUndashedNotionId("12345678-1234-1234-1234-123456789abc"),
		).toBe("12345678123412341234123456789abc");
		expect(
			validateAndGetUndashedNotionId("12345678-1234-1234-1234-123456789ABC"),
		).toBe("12345678123412341234123456789abc");
		expect(
			validateAndGetUndashedNotionId("12345678123412341234123456789abc"),
		).toBe("12345678123412341234123456789abc");
		expect(validateAndGetUndashedNotionId("invalid-id")).toBeUndefined();
	});

	// Checks help alias helper returns true only for supported help commands.
	test("identifies help command aliases", () => {
		expect(isHelpCommand(["help"])).toBe(true);
		expect(isHelpCommand(["--help"])).toBe(true);
		expect(isHelpCommand(["-h"])).toBe(true);
		expect(isHelpCommand(["sync"])).toBe(false);
		expect(isHelpCommand([])).toBe(false);
	});

	// Checks generated JS/TS config templates include required auth and list fields.
	test("creates TypeScript and JavaScript config templates", () => {
		const tsTemplate = createConfigTemplate(true);
		expect(tsTemplate).toContain("export default NotionConfig;");
		expect(tsTemplate).toContain("databases: []");
		expect(tsTemplate).toContain("agents: []");

		const jsTemplate = createConfigTemplate(false);
		expect(jsTemplate).toContain("module.exports = NotionConfig;");
		expect(jsTemplate).toContain("databases: []");
		expect(jsTemplate).toContain("agents: []");
	});
});
