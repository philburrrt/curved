import { FollowingFeed } from "./FollowingFeed";

export const revalidate = 5; // TODO: do we need this since the page is client exclusive?

export default function Feed() {
  return (
    <div className="fixed inset-0 bottom-16 overflow-y-scroll p-4 md:relative md:inset-auto md:overflow-y-visible md:p-0">
      <FollowingFeed />
    </div>
  );
}
