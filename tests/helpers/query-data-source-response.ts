import type {
	PartialPageObjectResponse,
	QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type QueryDataSourceResultRow =
	QueryDataSourceResponse["results"][number];

export type QueryDataSourceResults = QueryDataSourceResponse["results"];

export type QueryDataSourceListOptions = {
	next_cursor?: QueryDataSourceResponse["next_cursor"];
	has_more?: QueryDataSourceResponse["has_more"];
};

/** Empty `dataSources.query` list response for tests. */
export function emptyQueryDataSourceResponse(): QueryDataSourceResponse {
	return {
		object: "list",
		results: [],
		next_cursor: null,
		has_more: false,
		type: "page_or_data_source",
		page_or_data_source: {},
	};
}

/** List envelope with explicit `results` (and optional cursor / has_more). */
export function queryDataSourceListResponse(
	results: QueryDataSourceResponse["results"],
	options?: QueryDataSourceListOptions,
): QueryDataSourceResponse {
	const base = emptyQueryDataSourceResponse();
	return {
		...base,
		results,
		next_cursor: options?.next_cursor ?? base.next_cursor,
		has_more: options?.has_more ?? base.has_more,
	};
}

/** Minimal page row when only `id` (or counts) matters. */
export function stubQueryPageResult(id: string): QueryDataSourceResultRow {
	const row: PartialPageObjectResponse = { object: "page", id };
	return row;
}
