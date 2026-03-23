import { describe, expect, test } from "bun:test";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { collectHeadingsFromMdast } from "../src/site/headings.js";

function parseMdx(source: string) {
	return unified().use(remarkParse).use(remarkMdx).parse(source);
}

function getHeadingIds(tree: ReturnType<typeof parseMdx>): string[] {
	const headingIds: string[] = [];

	visit(
		tree,
		"heading",
		(node: { data?: { hProperties?: { id?: unknown } } }) => {
			const id = node.data?.hProperties?.id;
			if (typeof id === "string") {
				headingIds.push(id);
			}
		},
	);

	return headingIds;
}

describe("collectHeadingsFromMdast", () => {
	test("assigns rendered heading ids and TOC entries from one pass", () => {
		const tree = parseMdx(`
# Overview

## Intro

### Using \`sortBy\`

## Intro

#### Deep dive
`);

		const toc = collectHeadingsFromMdast(tree);

		expect(getHeadingIds(tree)).toEqual([
			"overview",
			"intro",
			"using-sortby",
			"intro-1",
			"deep-dive",
		]);
		expect(toc).toEqual([
			{ id: "intro", label: "Intro", depth: 2 },
			{ id: "using-sortby", label: "Using sortBy", depth: 3 },
			{ id: "intro-1", label: "Intro", depth: 2 },
			{ id: "deep-dive", label: "Deep dive", depth: 4 },
		]);
	});

	test("ignores heading-like lines inside fenced code blocks", () => {
		const tree = parseMdx(`
## Real section

\`\`\`md
## Not a section
### Also not a section
\`\`\`

### Real child
`);

		const toc = collectHeadingsFromMdast(tree);

		expect(toc).toEqual([
			{ id: "real-section", label: "Real section", depth: 2 },
			{ id: "real-child", label: "Real child", depth: 3 },
		]);
	});
});
