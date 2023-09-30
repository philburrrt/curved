"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";

import Avatar from "@/components/Avatar";

import { CreatePost } from "./(feed)/CreatePost";
import { useAuth } from "./AuthProvider";
import { SidebarButton } from "./SidebarButton";
import { SidebarLink } from "./SidebarLink";

export function SidebarItems() {
  const { status, logout, user } = useAuth();
  const { openConnectModal } = useConnectModal();

  return (
    <ul className="flex space-x-1 md:block md:space-x-0 md:space-y-1">
      <SidebarLink href="/global" title="Home" icon="🏠" />
      <SidebarLink href="/following" title="Following" icon="👥" />

      {status === "authenticated" && user ? (
        <>
          <SidebarLink href="/rewards" title="Rewards" icon="🎁" />
          <SidebarLink
            href={`/@${user.username}`}
            title="Profile"
            icon={
              <Avatar size={24} src={user.avatar} uniqueKey={user.username} />
            }
          />

          <li className="hidden pt-4 md:block">
            <CreatePost />
          </li>

          <div className="w-full md:absolute md:inset-x-0 md:bottom-4">
            <SidebarButton onClick={logout} title="Logout" icon="🚪" />
          </div>
        </>
      ) : (
        <SidebarButton onClick={openConnectModal} title="Login" icon="🔑" />
      )}
    </ul>
  );
}
