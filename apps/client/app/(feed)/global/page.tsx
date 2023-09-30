import { LatestFeed } from "./LatestFeed";

export const revalidate = 5;

export default function Feed() {
  return (
    <div className="fixed inset-0 bottom-16 overflow-y-scroll p-4 md:relative md:inset-auto md:overflow-y-visible md:p-0">
      <LatestFeed />
    </div>
  );
}
