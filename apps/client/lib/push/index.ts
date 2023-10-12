"use client";
import { nanoidLowercase } from "../db/nanoid";

export const sub = async () => {
  if ("serviceWorker" in navigator) {
    if (!navigator.serviceWorker.controller) {
      await navigator.serviceWorker.register("/sw.js");
    } else {
      console.log("Service worker already registered");
    }
  }

  let subscription;
  if (Notification.permission !== "granted") {
    if (!localStorage.getItem("device_id")) {
      localStorage.setItem("device_id", nanoidLowercase());
    }
    try {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== "granted") {
        throw new Error("Permission not granted for Notification");
      }

      const registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.subscribe({
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        userVisibleOnly: true,
      });
    } catch (error) {
      console.log(error);
      return;
    }

    const msg = {
      deviceId: localStorage.getItem("device_id"),
      subscription,
    };

    let response;
    try {
      response = await fetch("/api/push/subscribe", {
        body: JSON.stringify(msg),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.status !== 200) {
        throw new Error("Failed to subscribe to push notifications");
      }
    } catch (error) {
      console.log(error);
    }
  }
};

export const listenToChanges = async () => {
  const permissions = await navigator.permissions.query({
    name: "notifications",
  });

  permissions.onchange = async () => {
    if (permissions.state !== "granted") {
      const deviceId = localStorage.getItem("device_id");
      await fetch("/api/push/unsubscribe", {
        body: JSON.stringify({ deviceId }),
        method: "POST",
      });
    }
  };
};
