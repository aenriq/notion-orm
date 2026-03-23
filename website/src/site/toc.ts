import type { TocEntry } from "./types";

export interface TocSection {
	root: TocEntry;
	children: TocEntry[];
}

export interface TocHeadingTarget {
	id: string;
	top: number;
}

export const HEADING_ACTIVATION_OFFSET = 140;
export const BOTTOM_OF_PAGE_THRESHOLD = 8;

export function groupTocIntoSections(toc: TocEntry[]): TocSection[] {
	const sections: TocSection[] = [];
	let current: TocSection | null = null;

	for (const entry of toc) {
		if (entry.depth === 2) {
			current = { root: entry, children: [] };
			sections.push(current);
		} else if (entry.depth > 2 && current) {
			current.children.push(entry);
		}
	}

	if (sections.length === 0 && toc.length > 0) {
		return toc.map((entry) => ({
			root: entry,
			children: [],
		}));
	}

	return sections;
}

export function sectionContainsActiveId(
	section: TocSection,
	activeId: string | null,
): boolean {
	if (activeId === null) {
		return false;
	}

	if (section.root.id === activeId) {
		return true;
	}

	return section.children.some((child) => child.id === activeId);
}

export function getActiveHeadingIdFromTargets(args: {
	headings: TocHeadingTarget[];
	isAtBottom: boolean;
	activationOffset?: number;
}): string | null {
	const {
		headings,
		isAtBottom,
		activationOffset = HEADING_ACTIVATION_OFFSET,
	} = args;

	if (headings.length === 0) {
		return null;
	}

	if (isAtBottom) {
		return headings.at(-1)?.id ?? null;
	}

	let activeId = headings[0]?.id ?? null;

	for (const heading of headings) {
		if (heading.top <= activationOffset) {
			activeId = heading.id;
			continue;
		}

		break;
	}

	return activeId;
}

export function getMissingTocTargetIds(args: {
	toc: TocEntry[];
	getElementById: (id: string) => unknown | null;
}): string[] {
	const { toc, getElementById } = args;
	return toc
		.filter((entry) => getElementById(entry.id) === null)
		.map((entry) => entry.id);
}
