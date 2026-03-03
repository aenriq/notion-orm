/**
 * Shared metadata schema and read helpers for database and agent caches.
 * Keeps a single shape so index emission can treat both uniformly.
 */

import fs from "fs";
import path from "path";
import { z } from "zod";
import { AGENTS_DIR, AST_FS_PATHS } from "./constants";

const cachedEntityMetadataSchema = z.object({
	id: z.string(),
	name: z.string(),
	displayName: z.string(),
});
const legacyCachedEntityMetadataSchema = z.object({
	id: z.string(),
	className: z.string(),
	displayName: z.string(),
	camelCaseName: z.string(),
});
const cachedEntityMetadataArraySchema = z.array(
	z.union([cachedEntityMetadataSchema, legacyCachedEntityMetadataSchema]),
);

export type CachedEntityMetadata = z.infer<typeof cachedEntityMetadataSchema>;

/** Parses cached metadata defensively and normalizes legacy shape. Invalid payloads yield []. */
export function parseMetadataArray(content: string): CachedEntityMetadata[] {
	const parsedContent: unknown = JSON.parse(content);
	const parseResult = cachedEntityMetadataArraySchema.safeParse(parsedContent);
	if (!parseResult.success) {
		return [];
	}
	return parseResult.data.map((entry) =>
		"name" in entry
			? entry
			: {
					id: entry.id,
					name: entry.camelCaseName,
					displayName: entry.displayName,
				},
	);
}

/** Reads metadata from disk; returns [] if file missing or unparseable. */
export function readMetadataFromDisk(filePath: string): CachedEntityMetadata[] {
	try {
		if (!fs.existsSync(filePath)) {
			return [];
		}
		const content = fs.readFileSync(filePath, "utf-8");
		return parseMetadataArray(content);
	} catch {
		return [];
	}
}

/** Loads cached database metadata used for incremental generation and index emit. */
export function readDatabaseMetadata(): CachedEntityMetadata[] {
	return readMetadataFromDisk(AST_FS_PATHS.metadataFile);
}

/** Loads cached agent metadata so source index emission can include both databases and agents. */
export function readAgentMetadataFromDisk(): CachedEntityMetadata[] {
	return readMetadataFromDisk(path.resolve(AGENTS_DIR, "metadata.json"));
}
