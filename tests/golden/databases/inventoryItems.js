"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryItems = exports.InventoryItemsSchema = exports.TagsPropertyValues = exports.AvailabilityPropertyValues = exports.CategoryPropertyValues = void 0;
const notion_orm_1 = require("@haustle/notion-orm");
const zod_1 = require("zod");
const id = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";
exports.CategoryPropertyValues = [
    "Electronics",
    "Clothing",
    "Food"
];
exports.AvailabilityPropertyValues = [
    "In Stock",
    "Out of Stock",
    "Backordered"
];
exports.TagsPropertyValues = [
    "New",
    "Sale",
    "Featured"
];
exports.InventoryItemsSchema = zod_1.z.object({
    itemName: zod_1.z.string(),
    category: zod_1.z.enum(exports.CategoryPropertyValues).nullable().optional(),
    availability: zod_1.z.enum(exports.AvailabilityPropertyValues).nullable().optional(),
    tags: zod_1.z.array(zod_1.z.enum(exports.TagsPropertyValues)).nullable().optional(),
    sku: zod_1.z.string().nullable().optional(),
    price: zod_1.z.number().nullable().optional()
});
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
};
const inventoryItems = (auth) => new notion_orm_1.DatabaseClient({ id, camelPropertyNameToNameAndTypeMap: columnNameToColumnProperties, schema: exports.InventoryItemsSchema, name: "Inventory Items", auth });
exports.inventoryItems = inventoryItems;
