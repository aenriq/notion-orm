"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerOrders = exports.CustomerOrdersSchema = void 0;
const notion_orm_1 = require("@haustle/notion-orm");
const zod_1 = require("zod");
const id = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
exports.CustomerOrdersSchema = zod_1.z.object({
    orderName: zod_1.z.string(),
    notes: zod_1.z.string().nullable().optional(),
    total: zod_1.z.number().nullable().optional(),
    orderDate: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string().nullable().optional()
    }).nullable().optional(),
    paid: zod_1.z.boolean().optional(),
    customerEmail: zod_1.z.string().nullable().optional(),
    customerPhone: zod_1.z.string().nullable().optional(),
    receiptUrl: zod_1.z.string().nullable().optional()
});
const columnNameToColumnProperties = {
    "orderName": {
        columnName: "Order Name",
        type: "title"
    },
    "notes": {
        columnName: "Notes",
        type: "rich_text"
    },
    "total": {
        columnName: "Total",
        type: "number"
    },
    "orderDate": {
        columnName: "Order Date",
        type: "date"
    },
    "paid": {
        columnName: "Paid",
        type: "checkbox"
    },
    "customerEmail": {
        columnName: "Customer Email",
        type: "email"
    },
    "customerPhone": {
        columnName: "Customer Phone",
        type: "phone_number"
    },
    "receiptUrl": {
        columnName: "Receipt URL",
        type: "url"
    }
};
const customerOrders = (auth) => new notion_orm_1.DatabaseClient({ id, camelPropertyNameToNameAndTypeMap: columnNameToColumnProperties, schema: exports.CustomerOrdersSchema, name: "Customer Orders", auth });
exports.customerOrders = customerOrders;
