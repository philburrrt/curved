import { Metadata } from "next";
import { notFound } from "next/navigation";

import Avatar from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { db } from "@/lib/db";
import { fetchProfileFromUsername } from "@/lib/fetchProfile";

export const revalidate = 10;

interface Props {
  params: {
    user: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Strip @ from username
  const username = params.user.replace("%40", "");

  const profile = await fetchProfileFromUsername(username);
  if (!profile) return {};

  const title = `@${profile.username}`;
  const images = profile.avatar ? [{ url: profile.avatar }] : [];

  return {
    description: "",
    openGraph: {
      description: "",
      images,
      title,
      type: "profile",
    },
    title,
    twitter: {
      card: "summary",
      description: "",
      images,
      title,
    },
  };
}

export default async function User({ params }: Props) {
  // Strip @ from username
  const username = params.user.replace("%40", "");

  const profile = await fetchProfileFromUsername(username);
  if (!profile) notFound();

  const posts = await db.query.content.findMany({
    columns: {
      description: true,
      shareId: true,
      url: true,
    },
    limit: 40,
    orderBy: (row, { desc }) => desc(row.shareId),
    where: (row, { eq }) => eq(row.owner, profile.address),
  });

  return (
    <div className="flex flex-col items-center space-y-6 py-4 md:pt-0">
      <div className="space-y-2">
        <Avatar size={128} src={profile.avatar} uniqueKey={username} />
        <h1 className="text-xl font-bold">@{profile.username}</h1>
      </div>

      {posts.map(({ description, ...post }) => (
        <PostCard
          key={post.shareId}
          {...post}
          owner={profile.address}
          description={description ?? ""}
          avatar={profile.avatar}
          username={profile.username}
        />
      ))}
    </div>
  );
}
