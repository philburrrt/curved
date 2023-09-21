import {
  bigint,
  char,
  index,
  mysqlTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import {
  AUTH_KEY_TABLE_NAME,
  AUTH_SESSION_TABLE_NAME,
  AUTH_USER_TABLE_NAME,
  ETH_ADDRESS_LENGTH,
  ETH_AUTH_ID_LENGTH,
  ETH_AUTH_NONCE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_USERNAME_LENGTH,
  USER_ID_LENGTH,
} from "./constants";

export const content = mysqlTable(
  "content",
  {
    createdAt: timestamp("created_at").defaultNow(),
    description: varchar("description", { length: MAX_DESCRIPTION_LENGTH }),
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    url: varchar("url", { length: 255 }).notNull(),
  },
  (table) => ({
    ownerIndex: index("owner").on(table.owner),
    shareIdIndex: uniqueIndex("shareId").on(table.shareId),
  }),
);

export const pendingContent = mysqlTable(
  "pending_content",
  {
    createdAt: timestamp("created_at").defaultNow(),
    description: varchar("description", { length: MAX_DESCRIPTION_LENGTH }),
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    url: varchar("url", { length: 255 }).notNull(),
  },
  (table) => ({
    ownerUrlIndex: index("ownerUrl").on(table.owner, table.url),
  }),
);

export const trades = mysqlTable(
  "trades",
  {
    amount: bigint("amount", { mode: "number" }).notNull(),
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    side: bigint("side", { mode: "number" }).notNull(),
    supply: bigint("supply", { mode: "number" }).notNull(),
    trader: varchar("trader", { length: ETH_ADDRESS_LENGTH }).notNull(),
  },
  (table) => ({
    shareIdIndex: uniqueIndex("shareId").on(table.shareId),
  }),
);

export const ethereumSession = mysqlTable(
  "auth_ethereum_session",
  {
    createdAt: timestamp("created_at").defaultNow(),
    id: serial("id").primaryKey(),
    nonce: char("nonce", { length: ETH_AUTH_NONCE_LENGTH }).notNull(),
    publicId: char("public_id", { length: ETH_AUTH_ID_LENGTH }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    publicIdIndex: uniqueIndex("publicId").on(table.publicId),
  }),
);

export const key = mysqlTable(AUTH_KEY_TABLE_NAME, {
  hashedPassword: varchar("hashed_password", { length: 225 }),
  id: varchar("id", { length: 225 }).primaryKey(),
  userId: varchar("user_id", { length: MAX_USERNAME_LENGTH }).notNull(),
});

export const session = mysqlTable(AUTH_SESSION_TABLE_NAME, {
  activeExpires: bigint("active_expires", { mode: "number" }).notNull(),
  id: varchar("id", { length: 128 }).primaryKey(),
  idleExpires: bigint("idle_expires", { mode: "number" }).notNull(),
  userId: varchar("user_id", { length: MAX_USERNAME_LENGTH }).notNull(),
});

export const user = mysqlTable(
  AUTH_USER_TABLE_NAME,
  {
    address: char("address", { length: 42 }).notNull(),
    avatar: varchar("avatar", { length: 225 }),
    id: varchar("id", { length: USER_ID_LENGTH }).primaryKey(),
    username: varchar("username", { length: MAX_USERNAME_LENGTH }).notNull(),
  },
  (table) => ({
    addressIndex: uniqueIndex("address").on(table.address),
    usernameIndex: uniqueIndex("username").on(table.username),
  }),
);