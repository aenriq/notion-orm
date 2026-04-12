const UNDASHED_NOTION_ID_PATTERN = /^[0-9a-f]{32}$/;
const DASHED_NOTION_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Normalizes arbitrary labels into stable camelCase identifiers for emitted symbols. */
export function camelize(str: string) {
	const tokens = str
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter((token) => token.length > 0)
		.map((token) => token.toLowerCase());

	if (tokens.length === 0) {
		return "";
	}

	const [firstToken, ...remainingTokens] = tokens;
	return `${firstToken}${remainingTokens
		.map((token) => token[0].toUpperCase() + token.slice(1))
		.join("")}`;
}

/**
 * Capitalizes the first character of an identifier (e.g. camelCase module key → file stem).
 * Used for generated module filenames alongside PascalCase factory exports.
 */
export function toPascalCase(value: string): string {
	if (!value) {
		return value;
	}
	return value[0].toUpperCase() + value.slice(1);
}

/** Accepts dashed or undashed Notion ids and returns the canonical undashed form. */
export function toUndashedNotionId(id: string): string {
	const normalizedId = id.replace(/-/g, "").toLowerCase();
	if (!UNDASHED_NOTION_ID_PATTERN.test(normalizedId)) {
		throw new Error(
			`Invalid Notion ID. Expected 32 hex characters after removing dashes, received '${id}'.`,
		);
	}
	return normalizedId;
}

/** Formats a canonical Notion id back into dashed UUID form for user-facing output. */
export function toDashedNotionId(id: string): string {
	const normalizedId = toUndashedNotionId(id);
	const dashedId = `${normalizedId.slice(0, 8)}-${normalizedId.slice(8, 12)}-${normalizedId.slice(12, 16)}-${normalizedId.slice(16, 20)}-${normalizedId.slice(20)}`;
	if (!DASHED_NOTION_ID_PATTERN.test(dashedId)) {
		throw new Error(
			`Failed to format Notion ID into dashed UUID shape from '${id}'.`,
		);
	}
	return dashedId;
}

export type Entries<T extends object> = {
	[K in Extract<keyof T, string>]-?: [K, T[K]];
}[Extract<keyof T, string>][];

// Typed Object.entries helper for developer ergonomics in generic utilities.
export function objectEntries<T extends object>(obj: T): Entries<T> {
	// biome-ignore lint: Object.entries loses key/value relation without a cast.
	return Object.entries(obj) as Entries<T>;
}
