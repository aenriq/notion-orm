import type { QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import { camelize } from "../helpers";
import type { camelPropertyNameToNameAndTypeMapType } from "./DatabaseClient";
import type {
	apiFilterType,
	QueryFilter,
	SimpleQueryResponse,
	SupportedNotionColumnType,
} from "./queryTypes";

type QueryDataSourcePageResultWithProperties = Extract<
	QueryDataSourceResponse["results"][number],
	{ object: "page"; properties: Record<string, unknown> }
>;
type NotionPropertyValue =
	QueryDataSourcePageResultWithProperties["properties"][string];

/**
 * Transforms Notion API query response into simplified format
 */
export function buildQueryResponse<
		DatabaseSchemaType extends Record<string, unknown>,
	>(
		res: QueryDataSourceResponse,
		camelPropertyNameToNameAndTypeMap: camelPropertyNameToNameAndTypeMapType,
		validateSchema: (result: Partial<DatabaseSchemaType>) => void,
	): SimpleQueryResponse<DatabaseSchemaType> {
		const rawResults = res.results;
		const rawResponse = res;

		const results: Array<Partial<DatabaseSchemaType>> = rawResults
			.map((result, index) => {
				if (result.object === "page" && !("properties" in result)) {
					// biome-ignore lint/suspicious/noConsole: surfaced for debugging unexpected Notion payloads
					console.log("Skipping this page: ", { result });
					return undefined;
				}

				const simpleResult: Partial<DatabaseSchemaType> = {};
				const properties = Object.entries(result.properties);

				for (const [columnName, propertyValue] of properties) {
					const camelizeColumnName = camelize(columnName);
					const columnType =
						camelPropertyNameToNameAndTypeMap[camelizeColumnName]?.type;

					if (columnType) {
						Object.defineProperty(simpleResult, camelizeColumnName, {
							value: getResponseValue(columnType, propertyValue),
							enumerable: true,
							configurable: true,
							writable: true,
						});
					}
				}

				if (index === 0) {
					validateSchema(simpleResult);
				}
				return simpleResult;
			})
			.filter((result) => result !== undefined);

		return {
			results,
			rawResponse,
		};
	}

/**
 * Extracts value from Notion property object based on column type
 */
export function getResponseValue(
		prop: SupportedNotionColumnType,
		x: NotionPropertyValue,
	) {
		switch (prop) {
			case "select": {
				if (x.type !== "select") {
					return null;
				}
				if (x.select) {
					return x.select.name;
				}
				return null;
			}
			case "title": {
				if (x.type !== "title") {
					return null;
				}
				if (x.title) {
					const combinedText = x.title.map(
						({ plain_text }: { plain_text: string }) => plain_text,
					);
					return combinedText.join("");
				}
				return null;
			}
			case "url": {
				if (x.type !== "url") {
					return null;
				}
				return x.url;
			}
			case "email": {
				if (x.type !== "email") {
					return null;
				}
				return x.email;
			}
			case "phone_number": {
				if (x.type !== "phone_number") {
					return null;
				}
				return x.phone_number;
			}
			case "multi_select": {
				if (x.type !== "multi_select") {
					return null;
				}
				if (x.multi_select) {
					return x.multi_select.map(({ name }: { name: string }) => name);
				}
				return null;
			}
			case "checkbox": {
				if (x.type !== "checkbox") {
					return null;
				}
				return Boolean(x.checkbox);
			}
			case "status": {
				if (x.type !== "status") {
					return null;
				}
				if (x.status) {
					return x.status.name;
				}
				return null;
			}
			case "rich_text": {
				if (x.type !== "rich_text") {
					return null;
				}
				if (x.rich_text && Array.isArray(x.rich_text)) {
					const combinedText = x.rich_text.map(
						({ plain_text }: { plain_text: string }) => plain_text,
					);
					return combinedText.join("");
				}
				return null;
			}
			case "number": {
				if (x.type !== "number") {
					return null;
				}
				return x.number;
			}
			case "date": {
				if (x.type !== "date") {
					return null;
				}
				if (x.date && typeof x.date.start === "string") {
					return {
						start: x.date.start,
						end: x.date.end ?? undefined,
					};
				}
				return null;
			}
			case "unique_id": {
				if (x.type !== "unique_id") {
					return null;
				}
				if (x.unique_id && typeof x.unique_id.number === "number") {
					if (
						typeof x.unique_id.prefix === "string" &&
						x.unique_id.prefix.length > 0
					) {
						return `${x.unique_id.prefix}-${x.unique_id.number}`;
					}
					return `${x.unique_id.number}`;
				}
				return null;
			}
			case "formula": {
				if (x.type !== "formula") {
					return null;
				}
				return getFormulaValue(x.formula);
			}
			case "created_time": {
				if (x.type !== "created_time") {
					return null;
				}
				return x.created_time ?? null;
			}
			case "last_edited_time": {
				if (x.type !== "last_edited_time") {
					return null;
				}
				return x.last_edited_time ?? null;
			}
			case "created_by": {
				if (x.type !== "created_by") {
					return null;
				}
				if (x.created_by) {
					if (
						"name" in x.created_by &&
						typeof x.created_by.name === "string" &&
						x.created_by.name.length > 0
					) {
						return x.created_by.name;
					}
					return x.created_by.id ?? null;
				}
				return null;
			}
			case "last_edited_by": {
				if (x.type !== "last_edited_by") {
					return null;
				}
				if (x.last_edited_by) {
					if (
						"name" in x.last_edited_by &&
						typeof x.last_edited_by.name === "string" &&
						x.last_edited_by.name.length > 0
					) {
						return x.last_edited_by.name;
					}
					return x.last_edited_by.id ?? null;
				}
				return null;
			}
			case "people": {
				if (x.type !== "people") {
					return null;
				}
				if (!Array.isArray(x.people)) {
					return [];
				}
				return x.people
					.map((person) => {
						if (
							"name" in person &&
							typeof person.name === "string" &&
							person.name.length > 0
						) {
							return person.name;
						}
						return person.id;
					})
					.filter((value): value is string => typeof value === "string");
			}
			case "relation": {
				if (x.type !== "relation") {
					return null;
				}
				if (!Array.isArray(x.relation)) {
					return [];
				}
				return x.relation
					.map((item: { id?: string }) => item.id)
					.filter((value): value is string => typeof value === "string");
			}
			case "files": {
				if (x.type !== "files") {
					return null;
				}
				if (!Array.isArray(x.files)) {
					return [];
				}
				return x.files
					.map(
						(file: {
							name?: string;
							type?: string;
							external?: { url?: string };
							file?: { url?: string };
						}) => {
							let url: string | undefined;
							if (file.type === "external") {
								url = file.external?.url;
							} else if (file.type === "file") {
								url = file.file?.url;
							}

							if (typeof file.name !== "string" || typeof url !== "string") {
								return undefined;
							}

							return {
								name: file.name,
								url,
							};
						},
					)
					.filter(
						(value): value is { name: string; url: string } =>
							value !== undefined,
					);
			}
			default: {
				return null;
			}
		}
	}

function getFormulaValue(formula: unknown) {
	if (!isObject(formula)) {
		return null;
	}

	switch (formula.type) {
		case "string":
			return typeof formula.string === "string" ? formula.string : null;
		case "number":
			return typeof formula.number === "number" ? formula.number : null;
		case "boolean":
			return typeof formula.boolean === "boolean" ? formula.boolean : null;
		case "date": {
			const date = formula.date;
			if (isObject(date) && typeof date.start === "string") {
				return {
					start: date.start,
					end: typeof date.end === "string" ? date.end : undefined,
				};
			}
			return null;
		}
		default:
			return null;
	}
}

function isFilterableColumnType(
	columnType: SupportedNotionColumnType,
): boolean {
	switch (columnType) {
		case "rich_text":
		case "title":
		case "number":
		case "checkbox":
		case "select":
		case "multi_select":
		case "url":
		case "date":
		case "status":
		case "email":
		case "phone_number":
			return true;
		default:
			return false;
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isApiFilter(value: unknown): value is NonNullable<apiFilterType> {
	if (!isObject(value)) {
		return false;
	}

	if ("and" in value) {
		return Array.isArray(value.and);
	}

	if ("or" in value) {
		return Array.isArray(value.or);
	}

	return typeof value.property === "string";
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

/**
 * Recursively converts user query filters to Notion API filter format
 */
export function recursivelyBuildFilter<
		DatabaseSchemaType extends Record<string, unknown>,
		ColumnNameToColumnType extends Record<
			keyof DatabaseSchemaType,
			SupportedNotionColumnType
		>,
	>(
		queryFilter: QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>,
		camelPropertyNameToNameAndTypeMap: camelPropertyNameToNameAndTypeMapType,
	): apiFilterType {
		if ("and" in queryFilter) {
			const andFilters = queryFilter.and;
			if (Array.isArray(andFilters)) {
				const compoundFilter = {
					and: andFilters
						.map(
							(
								filter: QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>,
							) =>
								recursivelyBuildFilter(
									filter,
									camelPropertyNameToNameAndTypeMap,
								),
						)
						.filter(isDefined),
				};
				if (isApiFilter(compoundFilter)) {
					return compoundFilter;
				}
				return undefined;
			}
		}

		if ("or" in queryFilter) {
			const orFilters = queryFilter.or;
			if (Array.isArray(orFilters)) {
				const compoundFilter = {
					or: orFilters
						.map(
							(
								filter: QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>,
							) =>
								recursivelyBuildFilter(
									filter,
									camelPropertyNameToNameAndTypeMap,
								),
						)
						.filter(isDefined),
				};
				if (isApiFilter(compoundFilter)) {
					return compoundFilter;
				}
				return undefined;
			}
		}

		const firstEntry = Object.entries(queryFilter)[0];
		if (!firstEntry) {
			return undefined;
		}
		const [prop, columnFilterValue] = firstEntry;

		const mappedColumn = camelPropertyNameToNameAndTypeMap[prop];
		if (!mappedColumn) {
			return undefined;
		}
		if (!isFilterableColumnType(mappedColumn.type)) {
			return undefined;
		}
		if (!columnFilterValue) {
			return undefined;
		}

		const filterObject: Record<string, unknown> = {
			property: mappedColumn.columnName,
			[mappedColumn.type]: columnFilterValue,
		};
		if (isApiFilter(filterObject)) {
			return filterObject;
		}
		return undefined;
	}
