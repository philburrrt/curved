export enum PostType {
  Post = "post",
  Repost = "repost",
}

interface BasePost {
  type: PostType;
  id: string;
  owner: {
    address: string;
    username: string | null;
    avatar: string | null;
  };
  createdAt: string;
}

export interface NftPost extends BasePost {
  type: PostType.Post;
  data: {
    shareId: number;
    url: string;
    caption: string | null;
  };
}

export interface Repost extends BasePost {
  type: PostType.Repost;
  data: {
    caption: string | null;
    referencePostId: string;
    repost: Post | null;
  };
}

export type Post = NftPost | Repost;
