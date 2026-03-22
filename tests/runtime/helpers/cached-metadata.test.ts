import { describe, expect, test } from "bun:test";
import { parseMetadataArray } from "../../../src/ast/shared/cached-metadata";

describe("parseMetadataArray", () => {
	test("normalizes IDs for current metadata shape", () => {
		const metadata = JSON.stringify([
			{
				id: "12345678-1234-1234-1234-123456789ABC",
				name: "menuRecipes",
				displayName: "Menu & Recipes",
			},
		]);

		expect(parseMetadataArray(metadata)).toEqual([
			{
				id: "12345678123412341234123456789abc",
				name: "menuRecipes",
				displayName: "Menu & Recipes",
			},
		]);
	});

	test("normalizes IDs when converting legacy metadata shape", () => {
		const legacyMetadata = JSON.stringify([
			{
				id: "12345678-1234-1234-1234-123456789ABC",
				className: "menuRecipes",
				camelCaseName: "menuRecipes",
				displayName: "Menu & Recipes",
			},
		]);

		expect(parseMetadataArray(legacyMetadata)).toEqual([
			{
				id: "12345678123412341234123456789abc",
				name: "menuRecipes",
				displayName: "Menu & Recipes",
			},
		]);
	});
});
