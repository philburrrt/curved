"use client";
import { useEffect } from "react";
import { useState } from "react";

import { listenToChanges, sub } from "@/lib/push";

import { useAuth } from "./AuthProvider";

interface Props {
  children: React.ReactNode;
}

export const NotificationWrapper = ({ children }: Props) => {
  const { status } = useAuth();
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (status !== "authenticated") return;
    if (asked) return;
    setAsked(true);
    sub();
    listenToChanges();
  }, [status]);
  return <>{children}</>;
};
