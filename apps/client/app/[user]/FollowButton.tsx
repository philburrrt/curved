"use client";

interface FollowButtonProps {
  isFollowing: boolean;
  clientAddress: string;
  userAddress: string;
}

export const FollowButton = async (props: FollowButtonProps) => {
  const { isFollowing, clientAddress, userAddress } = props;

  const followUser = async () => {
    const success = await follow(userAddress);
    if (success) {
      window.location.reload();
    }
  };

  const unfollowUser = async () => {
    const success = await unfollow(userAddress);
    if (success) {
      window.location.reload();
    }
  };

  return (
    <button
      className={`${
        isFollowing ? "bg-gray-300" : "bg-blue-500"
      } hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}
      onClick={isFollowing ? unfollowUser : followUser}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
};

const follow = async (userAddress: string) => {
  try {
    const res = await fetch(`/api/user/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addrToFollow: userAddress }),
    });
    if (res.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
};

const unfollow = async (userAddress: string) => {
  try {
    const rest = await fetch(`/api/user/unfollow/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addrToUnfollow: userAddress }),
    });
    if (rest.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
};
