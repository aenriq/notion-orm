import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const contentDir = join(rootDir, "content");
const generatedMdxDir = join(rootDir, "src/generated/mdx");
const MDX_PROVIDER_IMPORT = "../../site/mdx-components";

async function discoverMdxBases(): Promise<string[]> {
	const entries = await readdir(contentDir, { withFileTypes: true });
	const files = entries
		.filter((e) => e.isFile() && e.name.endsWith(".mdx"))
		.map((e) => e.name.replace(/\.mdx$/, ""));
	const indexPages = files.filter((name) => name === "index");
	const nonIndexPages = files
		.filter((name) => name !== "index")
		.sort((left, right) => left.localeCompare(right));
	return [...indexPages, ...nonIndexPages];
}

async function main(): Promise<void> {
	const bases = await discoverMdxBases();
	let failed = false;

	for (const base of bases) {
		const name = `${base}.tsx`;
		let text: string;
		try {
			text = await readFile(join(generatedMdxDir, name), "utf8");
		} catch {
			// biome-ignore lint/suspicious/noConsole: CLI script
			console.error(
				`[verify-mdx] missing generated/mdx/${name} for content/${base}.mdx — run: bun run build:mdx-content`,
			);
			failed = true;
			continue;
		}
		if (text.includes("site/ui")) {
			// biome-ignore lint/suspicious/noConsole: CLI script
			console.error(
				`[verify-mdx] ${name}: stale import "../../site/ui" (expected mdx-components).`,
			);
			failed = true;
		}
		if (!text.includes(MDX_PROVIDER_IMPORT)) {
			// biome-ignore lint/suspicious/noConsole: CLI script
			console.error(
				`[verify-mdx] ${name}: missing mdx-components provider import.`,
			);
			failed = true;
		}
	}

	if (failed) {
		// biome-ignore lint/suspicious/noConsole: CLI script
		console.error(
			"\n[verify-mdx] Fix: bun run build:mdx-content && git add src/generated/",
		);
		process.exit(1);
	}

	// biome-ignore lint/suspicious/noConsole: CLI script
	console.log(`[verify-mdx] ok (${bases.length} page(s))`);
}

await main();
