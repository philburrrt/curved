"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import logo from "@/public/images/android-chrome-192x192.png";

export function InstallPWA() {
  const [hide, setHide] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowContinue(true);
    }, 8000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const { isMobile, isPWA } = usePwaStatus();

  if (hide || !isMobile || isPWA) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] space-y-4 bg-slate-800 px-8">
      <div className="flex justify-center pt-8">
        <Image src={logo} alt="yuyu.social logo" />
      </div>

      <h1 className="text-center text-xl font-bold text-slate-400">
        Welcome to <span className="text-amber-400">yuyu</span>
        <span className="text-red-400">.</span>
        <span className="text-sky-400">social</span>!
      </h1>

      <p className="text-center text-slate-400">
        To have the best experience, please install this site as a progressive
        web app.
        <br />
        <br />
        You can learn more about PWAs{" "}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-200 underline"
        >
          here
        </a>
        .
      </p>

      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        <button
          onClick={() => {
            setHide(true);
          }}
          className={`w-fit rounded-full border border-slate-600 px-4 py-1 text-slate-500 transition active:border-white active:bg-slate-700 active:text-white ${showContinue ? "" : "opacity-0"
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function usePwaStatus() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const ios = navigator.userAgent.match(/iPhone|iPad|iPod/);
    const android = navigator.userAgent.match(/Android/);

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const installed = Boolean(
      standalone || (ios && !navigator.userAgent.match(/Safari/)),
    );

    setIsMobile(Boolean(ios || android));
    setIsPWA(installed);
  }, []);

  return { isMobile, isPWA };
}
