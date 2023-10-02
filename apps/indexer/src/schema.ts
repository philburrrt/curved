import { relations } from "drizzle-orm";
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
import { NANOID_LENGTH } from "./nanoid";

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

export const contentRelations = relations(content, ({ one }) => ({
  owner: one(user, {
    fields: [content.owner],
    references: [user.address],
  }),
}));

export const user = mysqlTable(
  AUTH_USER_TABLE_NAME,
  {
    address: char("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    avatarId: varchar("avatarId", { length: NANOID_LENGTH }),
    id: varchar("id", { length: USER_ID_LENGTH }).primaryKey(),
    username: varchar("username", { length: MAX_USERNAME_LENGTH }).notNull(),
  },
  (table) => ({
    addressIndex: uniqueIndex("address").on(table.address),
    usernameIndex: uniqueIndex("username").on(table.username),
  }),
);

export const userBalances = mysqlTable(
  "user_balances",
  {
    id: serial("id").primaryKey(),
    address: varchar("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    balance: bigint("balance", { mode: "number" }).notNull(), // share balance
  },
  (table) => ({
    addressShareIdIndex: uniqueIndex("addressShareId").on(
      table.address,
      table.shareId,
    ),
    addressIndex: index("address").on(table.address),
    shareIdIndex: index("shareId").on(table.shareId),
  }),
);

export const shareData = mysqlTable("share_data", {
  id: serial("id").primaryKey(),
  shareId: bigint("share_id", { mode: "number" }).notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  holders: bigint("holders", { mode: "number" }).notNull(),
});

export const repost = mysqlTable(
  "repost",
  {
    author: varchar("author", { length: ETH_ADDRESS_LENGTH }).notNull(),
    id: serial("id").primaryKey(),
    quote: varchar("quote", { length: 140 }),
    referenceRepost: bigint("reference_repost", { mode: "number" }), // if it's a repost of a repost
    referenceShareId: bigint("share_id", { mode: "number" }).notNull(), // all should have a shareId
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    shareIdIndex: uniqueIndex("shareId").on(table.referenceShareId),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  posts: many(content),
  reposts: many(repost),
}));

export const userFollowing = mysqlTable(
  "user_following",
  {
    address: varchar("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    following: varchar("following", { length: ETH_ADDRESS_LENGTH }).notNull(),
    id: serial("id").primaryKey(),
  },
  (table) => ({
    addressIndex: index("address").on(table.address),
    followingIndex: index("following").on(table.following),
  }),
);

export const userFollowingRelations = relations(userFollowing, ({ one }) => ({
  followedUser: one(user, {
    fields: [userFollowing.following],
    references: [user.address],
  }),
  followingUser: one(user, {
    fields: [userFollowing.address],
    references: [user.address],
  }),
}));

export const pendingContent = mysqlTable(
  "pending_content",
  {
    createdAt: timestamp("created_at").defaultNow(),
    description: varchar("description", { length: MAX_DESCRIPTION_LENGTH }),
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    publicId: char("public_id", { length: NANOID_LENGTH }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    url: varchar("url", { length: 255 }).notNull(),
  },
  (table) => ({
    ownerIndex: uniqueIndex("owner").on(table.owner),
    ownerUrlIndex: index("ownerUrl").on(table.owner, table.url),
  }),
);

export const trades = mysqlTable("trades", {
  amount: bigint("amount", { mode: "number" }).notNull(),
  hash: varchar("hash", { length: 66 }).notNull(),
  id: serial("id").primaryKey(),
  owner: varchar("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
  price: bigint("price", { mode: "number" }).notNull(),
  shareId: bigint("share_id", { mode: "number" }).notNull(),
  side: bigint("side", { mode: "number" }).notNull(),
  supply: bigint("supply", { mode: "number" }).notNull(),
  trader: varchar("trader", { length: ETH_ADDRESS_LENGTH }).notNull(),
});

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
