import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password_hash: text("password_hash").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_username_idx").on(table.username),
  ]
);

export const gameRecords = pgTable(
  "game_records",
  {
    id: serial().primaryKey(),
    user_id: integer("user_id").notNull(),
    scenario: varchar("scenario", { length: 200 }).notNull(),
    final_score: integer("final_score").notNull(),
    result: varchar("result", { length: 20 }).notNull(),
    played_at: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("game_records_user_id_idx").on(table.user_id),
  ]
);

export const articles = pgTable(
  "articles",
  {
    id: serial().primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    icon: varchar("icon", { length: 10 }).notNull(),
    content: text("content").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("articles_slug_idx").on(table.slug),
    index("articles_sort_order_idx").on(table.sort_order),
  ]
);
