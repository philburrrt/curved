"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BiCog, BiEnvelope, BiHomeAlt, BiLogIn, BiUser } from "react-icons/bi";

import { CreatePost } from "./(feed)/CreatePost";
import { AppTitle } from "./AppTitle";
import { useAuth } from "./AuthProvider";
import { SidebarButton } from "./SidebarButton";
import { SidebarLink } from "./SidebarLink";

export function Sidebar() {
  const { status, user } = useAuth();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="md:fixed md:inset-0 md:mx-4">
      <div className="max-w-content fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-0 md:mx-auto md:grid md:grid-cols-7 md:gap-4">
        <ul className="relative flex rounded-t-xl bg-slate-800 pb-1.5 shadow-top md:col-span-2 md:block md:h-full md:space-x-0 md:space-y-1 md:p-0 md:shadow-none">
          <div className="mt-1 hidden h-14 items-center pl-3 md:flex">
            <AppTitle />
          </div>

          <SidebarLink
            href="/"
            activeRoutes={["/", "/following"]}
            title="Home"
            icon={<BiHomeAlt />}
          />

          {status === "authenticated" && user ? (
            <>
              <span className="flex w-full items-center justify-center md:hidden">
                <CreatePost />
              </span>

              <SidebarLink
                href={`/@${user.username}`}
                title="Profile"
                icon={<BiUser />}
              />

              <span className="hidden md:block">
                <SidebarButton text="Messages" icon={<BiEnvelope />} disabled>
                  <span className="pl-2">(Coming Soon)</span>
                </SidebarButton>
              </span>

              <span className="hidden pt-4 md:block">
                <CreatePost />
              </span>

              <div className="hidden w-full md:absolute md:inset-x-0 md:bottom-4 md:block">
                <SidebarLink
                  href="/settings"
                  title="Settings"
                  icon={<BiCog />}
                />
              </div>
            </>
          ) : (
            <>
              <SidebarButton
                onClick={openConnectModal}
                text="Log in"
                icon={<BiLogIn />}
              />
              {/* // message saying sign ups are turned off until indexer is upgraded. not on mobile */}
              <div className="hidden text-center text-sm text-gray-400 md:block">
                Sign ups closed for upgrades
              </div>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
