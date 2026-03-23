import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
	collectHeadingsFromMdast,
	remarkStableHeadingIds,
} from "./headings.js";

export const siteMdxRemarkPlugins = [remarkGfm, remarkStableHeadingIds];

function createSiteMdxProcessor() {
	return unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
}

export function parseSiteMdx(source) {
	const processor = createSiteMdxProcessor();
	const tree = processor.parse(source);
	return processor.runSync(tree);
}

/** @returns {import("./types").TocEntry[]} */
export function extractTocFromSiteMdx(source) {
	return collectHeadingsFromMdast(parseSiteMdx(source));
}
