import { Quicksand } from "next/font/google";
import Link from "next/link";

import { SidebarItems } from "./SidebarItems";

const font = Quicksand({
  display: "swap",
  subsets: ["latin"],
});

export function Sidebar() {
  return (
    <nav className="md:py-4">
      <Link href="/" className="mb-4 ml-3 hidden w-fit md:block">
        <h2 className={`text-2xl font-bold ${font.className}`}>yuyu.social</h2>
      </Link>

      <SidebarItems />
    </nav>
  );
}