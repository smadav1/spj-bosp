import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  customType,
  index,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const fiscalYears = pgTable("fiscal_years", {
  year: integer("year").primaryKey(),
  note: text("note").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    uid: text("uid").notNull().unique(),
    seq: integer("seq").notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    category: text("category").notNull(),
    date: text("date").notNull().default(""),
    month: integer("month").notNull().default(0),
    title: text("title").notNull().default(""),
    amount: bigint("amount", { mode: "number" }).notNull().default(0),
    receiptNo: text("receipt_no").notNull().default(""),
    isFinal: boolean("is_final").notNull().default(false),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("trx_year_idx").on(t.fiscalYear)],
);

export const files = pgTable(
  "files",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id"),
    slot: text("slot").notNull(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull().default(0),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("files_trx_idx").on(t.transactionId)],
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id"),
  trxUid: text("trx_uid").notNull().default(""),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  userName: text("user_name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
