import { describe, expect, test } from "bun:test";
import { join } from "path";

const cliEntryPath = join(import.meta.dir, "../../src/cli/index.ts");
const repoRoot = join(import.meta.dir, "../..");

function runCli(args: string[]) {
	return Bun.spawnSync({
		cmd: ["bun", cliEntryPath, ...args],
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
}

describe("CLI index integration", () => {
	test("prints help output for help command", () => {
		const output = runCli(["help"]);
		expect(output.exitCode).toBe(0);
		expect(output.stdout.toString()).toContain("Notion ORM CLI");
	});

	test("help output includes setup-agents-sdk command", () => {
		const output = runCli(["help"]);
		expect(output.exitCode).toBe(0);
		expect(output.stdout.toString()).toContain("setup-agents-sdk");
	});

	test("fails for invalid add type", () => {
		const output = runCli([
			"add",
			"12345678-1234-1234-1234-123456789abc",
			"--type",
			"agent",
		]);
		expect(output.exitCode).toBe(1);
		expect(output.stderr.toString()).toContain(
			"Invalid --type value. Must be 'database'",
		);
	});

	test("fails when both --ts and --js are provided for init", () => {
		const output = runCli(["init", "--ts", "--js"]);
		expect(output.exitCode).toBe(1);
		expect(output.stderr.toString()).toContain(
			"Cannot use both --ts and --js flags together",
		);
	});
});
