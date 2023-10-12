import { relations, sql } from "drizzle-orm";
import {
  bigint,
  char,
  datetime,
  index,
  mysqlEnum,
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
  ETH_AUTH_NONCE_LENGTH,
  MAX_CAPTION_LENGTH,
  MAX_USERNAME_LENGTH,
  PUBLIC_ID_LENGTH,
  USER_ID_LENGTH,
} from "./constants";

export const post = mysqlTable(
  "post",
  {
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial("id").primaryKey(),
    owner: char("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    publicId: char("public_id", { length: PUBLIC_ID_LENGTH }).notNull(),
    type: mysqlEnum("type", ["post", "repost"]).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  (table) => ({
    ownerIndex: index("owner").on(table.owner),
  }),
);

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.owner],
    references: [user.address],
  }),
}));

export const nftPost = mysqlTable(
  "nft_post",
  {
    caption: varchar("caption", { length: MAX_CAPTION_LENGTH }),
    id: serial("id").primaryKey(),
    postId: char("post_id", { length: PUBLIC_ID_LENGTH }).notNull(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    url: varchar("url", { length: 255 }).notNull(),
  },
  (table) => ({
    postIdIndex: index("postId").on(table.postId),
    shareIdIndex: uniqueIndex("shareId").on(table.shareId),
  }),
);

export const nftPostRelations = relations(nftPost, ({ one, many }) => ({
  post: one(post, {
    fields: [nftPost.postId],
    references: [post.id],
  }),
  shares: many(userBalances),
}));

export const pendingPost = mysqlTable(
  "pending_post",
  {
    caption: varchar("caption", { length: MAX_CAPTION_LENGTH }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial("id").primaryKey(),
    owner: char("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
    publicId: char("public_id", { length: PUBLIC_ID_LENGTH }).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
    url: varchar("url", { length: 255 }).notNull(),
  },
  (table) => ({
    ownerIndex: index("owner").on(table.owner),
  }),
);

export const repost = mysqlTable(
  "repost",
  {
    caption: varchar("caption", { length: MAX_CAPTION_LENGTH }),
    id: serial("id").primaryKey(),
    postId: char("post_id", { length: PUBLIC_ID_LENGTH }).notNull(),
    referencePostId: char("reference_post_id", { length: PUBLIC_ID_LENGTH }),
    referenceShareId: bigint("reference_share_id", { mode: "number" }),
  },
  (table) => ({
    postIdIndex: index("postId").on(table.postId),
    referenceShareIdIndex: index("referenceShareId").on(table.referenceShareId),
  }),
);

export const repostRelations = relations(repost, ({ one }) => ({
  post: one(post, {
    fields: [repost.postId],
    references: [post.publicId],
  }),
  referencePost: one(post, {
    fields: [repost.referencePostId],
    references: [post.publicId],
  }),
  referenceShare: one(nftPost, {
    fields: [repost.referenceShareId],
    references: [nftPost.shareId],
  }),
}));

export const trade = mysqlTable("trade", {
  amount: bigint("amount", { mode: "number" }).notNull(),
  hash: varchar("hash", { length: 66 }).notNull().unique(),
  id: serial("id").primaryKey(),
  owner: char("owner", { length: ETH_ADDRESS_LENGTH }).notNull(),
  price: bigint("price", { mode: "bigint" }).notNull(),
  shareId: bigint("share_id", { mode: "number" }).notNull(),
  side: bigint("side", { mode: "number" }).notNull(),
  supply: bigint("supply", { mode: "number" }).notNull(),
  trader: char("trader", { length: ETH_ADDRESS_LENGTH }).notNull(),
});

export const follow = mysqlTable(
  "follow",
  {
    following: char("following", { length: ETH_ADDRESS_LENGTH }).notNull(),
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: USER_ID_LENGTH }).notNull(),
  },
  (table) => ({
    followingIndex: index("following").on(table.following),
    userIdIndex: index("userId").on(table.userId),
  }),
);

export const followRelations = relations(follow, ({ one }) => ({
  following: one(user, {
    fields: [follow.following],
    references: [user.address],
  }),
  user: one(user, {
    fields: [follow.userId],
    references: [user.id],
  }),
}));

export const user = mysqlTable(
  AUTH_USER_TABLE_NAME,
  {
    address: char("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    avatarId: varchar("avatarId", { length: PUBLIC_ID_LENGTH }),
    id: varchar("id", { length: USER_ID_LENGTH }).primaryKey(),
    twitterUsername: varchar("twitterUsername", {
      length: 15,
    }).unique(),
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
    address: char("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    balance: bigint("balance", { mode: "number" }).notNull(),
    id: serial("id").primaryKey(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    addressShareIdIndex: uniqueIndex("addressShareId").on(
      table.address,
      table.shareId,
    ),
    sharedIdIndex: index("shareId").on(table.shareId),
  }),
);

export const shareData = mysqlTable(
  "share_data",
  {
    id: serial("id").primaryKey(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    volume: bigint("volume", { mode: "bigint" }).notNull(),
  },
  (table) => ({
    shareIdIndex: uniqueIndex("shareId").on(table.shareId),
  }),
);

export const sharesDataRelations = relations(shareData, ({ one }) => ({
  share: one(nftPost, {
    fields: [shareData.shareId],
    references: [nftPost.shareId],
  }),
}));

export const userBalancesRelations = relations(userBalances, ({ one }) => ({
  nftPost: one(nftPost, {
    fields: [userBalances.shareId],
    references: [nftPost.shareId],
  }),
  user: one(user, {
    fields: [userBalances.address],
    references: [user.address],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  posts: many(nftPost),
  reposts: many(repost),
  shares: many(userBalances),
}));

export const ethereumSession = mysqlTable(
  "auth_ethereum_session",
  {
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    id: serial("id").primaryKey(),
    nonce: char("nonce", { length: ETH_AUTH_NONCE_LENGTH }).notNull(),
    publicId: char("public_id", { length: 21 }).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
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

export const pushNotifications = mysqlTable(
  "push_notifications",
  {
    address: char("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    auth: varchar("auth", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deviceId: varchar("device_id", { length: PUBLIC_ID_LENGTH }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    expirationTime: datetime("expiration_time"),
    id: serial("id").primaryKey(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  (table) => ({
    uniqueIndex: uniqueIndex("deviceId").on(table.deviceId),
  }),
);

export const pushNotificationsRelations = relations(
  pushNotifications,
  ({ one }) => ({
    user: one(user, {
      fields: [pushNotifications.address],
      references: [user.address],
    }),
  }),
);
