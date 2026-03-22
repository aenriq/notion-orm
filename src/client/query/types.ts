import type {
	QueryDataSourceParameters,
	QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type {
	FilterableNotionColumnType,
	QueryFilter,
	SupportedNotionColumnType,
} from "../queryTypes";

export type QueryDataSourcePageResultWithProperties = Extract<
	QueryDataSourceResponse["results"][number],
	{ object: "page"; properties: Record<string, unknown> }
>;

export type NotionPropertyValue =
	QueryDataSourcePageResultWithProperties["properties"][string];

export type ResponseResolver = (property: NotionPropertyValue) => unknown;

export type ResponseResolverRegistry = Record<
	SupportedNotionColumnType,
	ResponseResolver
>;

export type FilterableColumnType = FilterableNotionColumnType;

type NotionApiFilter = NonNullable<QueryDataSourceParameters["filter"]>;
type ApiSingleFilter = Extract<NotionApiFilter, { property: string }>;

export type FilterValueByType = {
	[K in FilterableColumnType]: Extract<ApiSingleFilter, Record<K, unknown>>[K];
};

export type SingleApiFilterByType = {
	[K in FilterableColumnType]: Extract<ApiSingleFilter, Record<K, unknown>>;
};

export interface FilterLeafBuilderArgs<K extends FilterableColumnType> {
	columnName: string;
	columnFilterValue: FilterValueByType[K];
}

export type FilterLeafBuilder<K extends FilterableColumnType> = (
	args: FilterLeafBuilderArgs<K>,
) => SingleApiFilterByType[K];

export type FilterLeafBuilderRegistry = {
	[K in FilterableColumnType]: FilterLeafBuilder<K>;
};

export type FilterValueGuard<K extends FilterableColumnType> = (
	value: unknown,
) => value is FilterValueByType[K];

export type FilterValueGuardRegistry = {
	[K in FilterableColumnType]: FilterValueGuard<K>;
};

export type QueryFilterInput<
	DatabaseSchemaType extends Record<string, unknown>,
	ColumnNameToColumnType extends Record<
		keyof DatabaseSchemaType,
		SupportedNotionColumnType
	>,
> = QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>;

export type QuerySortInput = QueryDataSourceParameters["sorts"];
