import { DatabaseClient } from "@haustle/notion-orm";
import { z } from "zod";
import type { Query } from "@haustle/notion-orm";
const id = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
export const CustomerOrdersSchema = z.object({
    orderName: z.string(),
    notes: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    orderDate: z.object({
        start: z.string(),
        end: z.string().nullable().optional()
    }).nullable().optional(),
    paid: z.boolean().optional(),
    customerEmail: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    receiptUrl: z.string().nullable().optional()
});
export type DatabaseSchemaType = {
    orderName: string;
    notes?: string;
    total?: number;
    orderDate?: {
        start: string;
        end?: string;
    };
    paid?: boolean;
    customerEmail?: string;
    customerPhone?: string;
    receiptUrl?: string;
};
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
} as const;
type ColumnNameToColumnType = {
    [Property in keyof typeof columnNameToColumnProperties]: (typeof columnNameToColumnProperties)[Property]["type"];
};
export type QuerySchemaType = Query<DatabaseSchemaType, ColumnNameToColumnType>;
export const customerOrders = (auth: string) => new DatabaseClient<DatabaseSchemaType, ColumnNameToColumnType>({ id, camelPropertyNameToNameAndTypeMap: columnNameToColumnProperties, schema: CustomerOrdersSchema, name: "Customer Orders", auth });
export type customerOrdersSchema = DatabaseSchemaType;
export type customerOrdersColumnTypes = ColumnNameToColumnType;
export type CustomerOrdersSchemaType = z.infer<typeof CustomerOrdersSchema>;
