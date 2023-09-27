"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

export function SidebarLink({ title, href, icon }: Props) {
  const path = usePathname();

  const isActive = path === href;

  return (
    <li className="w-full">
      <Link
        href={href}
        draggable={false}
        className={`flex h-full w-full select-none items-center justify-center rounded-xl px-4 py-2 text-xl font-bold transition active:scale-95 md:justify-start ${isActive ? "bg-slate-700 hover:bg-slate-600" : "hover:bg-slate-700 "
          }`}
      >
        <span className="md:w-8">{icon}</span>
        <span className="hidden md:block">{title}</span>
      </Link>
    </li>
  );
}
