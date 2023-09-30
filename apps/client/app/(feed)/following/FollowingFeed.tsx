import { fetchLatestFollowingPosts } from "@/app/(feed)/fetchLatestFollowingPosts";

import { FeedProvider } from "../FeedContext";
import { LoadMore } from "../LoadMore";
import { PostFeed } from "../PostFeed";

export async function FollowingFeed() {
  const posts = await fetchLatestFollowingPosts({
    page: 0,
  });

  return (
    <div className="flex h-screen w-full justify-center">
      <div className="w-full space-y-4 pb-4">
        <FeedProvider initialPosts={posts}>
          <PostFeed />
          <LoadMore />
        </FeedProvider>
      </div>
    </div>
  );
}
