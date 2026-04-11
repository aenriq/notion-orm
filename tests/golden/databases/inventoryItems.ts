import { DatabaseClient } from "@haustle/notion-orm";
import { z } from "zod";
import type { Query } from "@haustle/notion-orm";
const id = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
export const CategoryPropertyValues = [
    "Electronics",
    "Clothing",
    "Food"
] as const;
export const AvailabilityPropertyValues = [
    "In Stock",
    "Out of Stock",
    "Backordered"
] as const;
export const TagsPropertyValues = [
    "New",
    "Sale",
    "Featured"
] as const;
export const InventoryItemsSchema = z.object({
    itemName: z.string(),
    category: z.enum(CategoryPropertyValues).nullable().optional(),
    availability: z.enum(AvailabilityPropertyValues).nullable().optional(),
    tags: z.array(z.enum(TagsPropertyValues)).nullable().optional(),
    sku: z.string().nullable().optional(),
    price: z.number().nullable().optional()
});
export type DatabaseSchemaType = {
    itemName: string;
    category?: (typeof CategoryPropertyValues)[number] | (string & {});
    availability?: (typeof AvailabilityPropertyValues)[number] | (string & {});
    tags?: ((typeof TagsPropertyValues)[number] | (string & {}))[];
    sku?: string;
    price?: number;
};
const columnNameToColumnProperties = {
    "itemName": {
        columnName: "Item Name",
        type: "title"
    },
    "category": {
        columnName: "Category",
        type: "select"
    },
    "availability": {
        columnName: "Availability",
        type: "status"
    },
    "tags": {
        columnName: "Tags",
        type: "multi_select"
    },
    "sku": {
        columnName: "SKU",
        type: "unique_id"
    },
    "price": {
        columnName: "Price",
        type: "number"
    }
} as const;
type ColumnNameToColumnType = {
    [Property in keyof typeof columnNameToColumnProperties]: (typeof columnNameToColumnProperties)[Property]["type"];
};
export type QuerySchemaType = Query<DatabaseSchemaType, ColumnNameToColumnType>;
export const inventoryItems = (auth: string) => new DatabaseClient<DatabaseSchemaType, ColumnNameToColumnType>({ id, camelPropertyNameToNameAndTypeMap: columnNameToColumnProperties, schema: InventoryItemsSchema, name: "Inventory Items", auth });
export type inventoryItemsSchema = DatabaseSchemaType;
export type inventoryItemsColumnTypes = ColumnNameToColumnType;
export type InventoryItemsSchemaType = z.infer<typeof InventoryItemsSchema>;
