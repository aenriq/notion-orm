import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
	emptyQueryDataSourceResponse,
	queryDataSourceListResponse,
} from "../../helpers/query-data-source-response";
import { databasePropertyValue } from "../../helpers/query-transform-fixtures";

const pagesCreateMock = mock(async () => ({
	object: "page" as const,
	id: "new-page",
}));
const pagesUpdateMock = mock(async () => ({ id: "updated-page" }));
const dataSourceQueryMock = mock(async () => emptyQueryDataSourceResponse());

mock.module("@notionhq/client", () => ({
	Client: class {
		public pages = {
			create: pagesCreateMock,
			update: pagesUpdateMock,
			retrieve: mock(async () => ({})),
		};
		public dataSources = { query: dataSourceQueryMock };
		constructor(_args: unknown) {}
	},
}));

const { DatabaseClient } = await import("../../../src/client/database/DatabaseClient");

type TestSchema = { shopName: string; rating: number };
type TestColumnTypes = { shopName: "title"; rating: "number" };

function createClient() {
	return new DatabaseClient({
		id: "db-1",
		auth: "token",
		name: "Coffee Shops",
		columns: {
			shopName: { columnName: "Shop Name", type: "title" },
			rating: { columnName: "Rating", type: "number" },
		},
	});
}

describe("upsert", () => {
	beforeEach(() => {
		pagesCreateMock.mockReset();
		pagesCreateMock.mockResolvedValue({ object: "page", id: "new-page" });
		pagesUpdateMock.mockReset();
		pagesUpdateMock.mockResolvedValue({ id: "updated-page" });
		dataSourceQueryMock.mockReset();
	});

	test("creates when no match found", async () => {
		dataSourceQueryMock.mockResolvedValueOnce(emptyQueryDataSourceResponse());

		const client = createClient();
		const result = await client.upsert({
			where: { shopName: { equals: "New Shop" } },
			create: { shopName: "New Shop", rating: 5 },
			update: { rating: 5 },
		});

		expect(pagesCreateMock).toHaveBeenCalledTimes(1);
		expect(pagesUpdateMock).not.toHaveBeenCalled();
		expect(dataSourceQueryMock).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ object: "page", id: "new-page" });
	});

	test("updates when match found", async () => {
		dataSourceQueryMock.mockResolvedValueOnce(
			queryDataSourceListResponse([
				{
					object: "page",
					id: "existing-page",
					properties: {
						"Shop Name": databasePropertyValue.title("Existing"),
						Rating: databasePropertyValue.number(3),
					},
				},
			]),
		);

		const client = createClient();
		await client.upsert({
			where: { shopName: { equals: "Existing" } },
			create: { shopName: "Existing", rating: 5 },
			update: { rating: 5 },
		});

		expect(pagesUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({ page_id: "existing-page" }),
		);
		expect(pagesCreateMock).not.toHaveBeenCalled();
	});

	test("throws when a row matches and update is empty", async () => {
		dataSourceQueryMock.mockResolvedValueOnce(
			queryDataSourceListResponse([
				{
					object: "page",
					id: "existing-page",
					properties: {
						"Shop Name": databasePropertyValue.title("Existing"),
						Rating: databasePropertyValue.number(3),
					},
				},
			]),
		);

		const client = createClient();
		await expect(
			client.upsert({
				where: { shopName: { equals: "Existing" } },
				create: { shopName: "Existing", rating: 5 },
				update: {},
			}),
		).rejects.toThrow(
			"[@haustle/notion-orm] upsert(): when a matching row exists, pass at least one key in update.",
		);
	});

	test("throws when more than one row matches before mutating", async () => {
		dataSourceQueryMock.mockResolvedValueOnce(
			queryDataSourceListResponse([
				{
					object: "page",
					id: "a",
					properties: {
						"Shop Name": databasePropertyValue.title("Dup"),
						Rating: databasePropertyValue.number(1),
					},
				},
				{
					object: "page",
					id: "b",
					properties: {
						"Shop Name": databasePropertyValue.title("Dup"),
						Rating: databasePropertyValue.number(2),
					},
				},
			]),
		);

		const client = createClient();
		await expect(
			client.upsert({
				where: { shopName: { equals: "Dup" } },
				create: { shopName: "Dup", rating: 1 },
				update: { rating: 2 },
			}),
		).rejects.toThrow(
			"[@haustle/notion-orm] upsert(): more than one row matches where. Tighten where, delete duplicates, or use updateMany/create explicitly.",
		);
		expect(pagesCreateMock).not.toHaveBeenCalled();
		expect(pagesUpdateMock).not.toHaveBeenCalled();
	});

	test("uses default created_time sort on the existence query", async () => {
		dataSourceQueryMock.mockResolvedValueOnce(emptyQueryDataSourceResponse());

		const client = createClient();
		await client.upsert({
			where: { shopName: { equals: "New Shop" } },
			create: { shopName: "New Shop", rating: 5 },
			update: { rating: 5 },
		});

		const firstQueryArg = dataSourceQueryMock.mock.calls[0]?.[0] as {
			sorts?: unknown;
		};
		expect(firstQueryArg.sorts).toEqual([
			{ timestamp: "created_time", direction: "ascending" },
		]);
	});
});
