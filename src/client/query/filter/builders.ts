import type {
	FilterLeafBuilder,
	FilterLeafBuilderRegistry,
	FilterValueByType,
	FilterValueGuard,
	FilterValueGuardRegistry,
} from "../types";

function isFilterOperatorObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

const isTextFilterValue: FilterValueGuard<"rich_text"> = (
	value,
): value is FilterValueByType["rich_text"] => isFilterOperatorObject(value);

const isTitleFilterValue: FilterValueGuard<"title"> = (
	value,
): value is FilterValueByType["title"] => isFilterOperatorObject(value);

const isNumberFilterValue: FilterValueGuard<"number"> = (
	value,
): value is FilterValueByType["number"] => isFilterOperatorObject(value);

const isCheckboxFilterValue: FilterValueGuard<"checkbox"> = (
	value,
): value is FilterValueByType["checkbox"] => isFilterOperatorObject(value);

const isSelectFilterValue: FilterValueGuard<"select"> = (
	value,
): value is FilterValueByType["select"] => isFilterOperatorObject(value);

const isMultiSelectFilterValue: FilterValueGuard<"multi_select"> = (
	value,
): value is FilterValueByType["multi_select"] => isFilterOperatorObject(value);

const isUrlFilterValue: FilterValueGuard<"url"> = (
	value,
): value is FilterValueByType["url"] => isFilterOperatorObject(value);

const isDateFilterValue: FilterValueGuard<"date"> = (
	value,
): value is FilterValueByType["date"] => isFilterOperatorObject(value);

const isStatusFilterValue: FilterValueGuard<"status"> = (
	value,
): value is FilterValueByType["status"] => isFilterOperatorObject(value);

const isEmailFilterValue: FilterValueGuard<"email"> = (
	value,
): value is FilterValueByType["email"] => isFilterOperatorObject(value);

const isPhoneNumberFilterValue: FilterValueGuard<"phone_number"> = (
	value,
): value is FilterValueByType["phone_number"] => isFilterOperatorObject(value);

const buildRichTextFilter: FilterLeafBuilder<"rich_text"> = (args) => ({
	property: args.columnName,
	rich_text: args.columnFilterValue,
});

const buildTitleFilter: FilterLeafBuilder<"title"> = (args) => ({
	property: args.columnName,
	title: args.columnFilterValue,
});

const buildNumberFilter: FilterLeafBuilder<"number"> = (args) => ({
	property: args.columnName,
	number: args.columnFilterValue,
});

const buildCheckboxFilter: FilterLeafBuilder<"checkbox"> = (args) => ({
	property: args.columnName,
	checkbox: args.columnFilterValue,
});

const buildSelectFilter: FilterLeafBuilder<"select"> = (args) => ({
	property: args.columnName,
	select: args.columnFilterValue,
});

const buildMultiSelectFilter: FilterLeafBuilder<"multi_select"> = (args) => ({
	property: args.columnName,
	multi_select: args.columnFilterValue,
});

const buildUrlFilter: FilterLeafBuilder<"url"> = (args) => ({
	property: args.columnName,
	url: args.columnFilterValue,
});

const buildDateFilter: FilterLeafBuilder<"date"> = (args) => ({
	property: args.columnName,
	date: args.columnFilterValue,
});

const buildStatusFilter: FilterLeafBuilder<"status"> = (args) => ({
	property: args.columnName,
	status: args.columnFilterValue,
});

const buildEmailFilter: FilterLeafBuilder<"email"> = (args) => ({
	property: args.columnName,
	email: args.columnFilterValue,
});

const buildPhoneNumberFilter: FilterLeafBuilder<"phone_number"> = (args) => ({
	property: args.columnName,
	phone_number: args.columnFilterValue,
});

export const filterLeafBuilders: FilterLeafBuilderRegistry = {
	rich_text: buildRichTextFilter,
	title: buildTitleFilter,
	number: buildNumberFilter,
	checkbox: buildCheckboxFilter,
	select: buildSelectFilter,
	multi_select: buildMultiSelectFilter,
	url: buildUrlFilter,
	date: buildDateFilter,
	status: buildStatusFilter,
	email: buildEmailFilter,
	phone_number: buildPhoneNumberFilter,
};

export const filterValueGuards: FilterValueGuardRegistry = {
	rich_text: isTextFilterValue,
	title: isTitleFilterValue,
	number: isNumberFilterValue,
	checkbox: isCheckboxFilterValue,
	select: isSelectFilterValue,
	multi_select: isMultiSelectFilterValue,
	url: isUrlFilterValue,
	date: isDateFilterValue,
	status: isStatusFilterValue,
	email: isEmailFilterValue,
	phone_number: isPhoneNumberFilterValue,
};
