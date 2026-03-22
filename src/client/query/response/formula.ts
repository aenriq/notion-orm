import type { NotionPropertyValue } from "../types";
import { resolveFormulaValue } from "./shared";

export function resolveFormula(property: NotionPropertyValue) {
	if (property.type !== "formula") {
		return null;
	}

	return resolveFormulaValue(property.formula);
}
