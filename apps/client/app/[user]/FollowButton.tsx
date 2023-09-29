"use client";
interface FollowButtonProps {
  following: boolean;
  clientAddress: string;
  userAddress: string;
}

export const FollowButton = async (params: FollowButtonProps) => {
  return (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => {
        if (params.following) {
          unfollow(params.clientAddress);
        } else {
          follow(params.clientAddress);
        }
      }}
    >
      {params.following ? "Unfollow" : "Follow"}
    </button>
  );
};

export async function follow(userAddress: string) {
  const res = await fetch("/api/user/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userAddress,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to follow");
  }
}

export async function unfollow(userAddress: string) {
  const res = await fetch("/api/user/unfollow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userAddress,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to unfollow");
  }
}
