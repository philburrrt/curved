"use client";
export const sub = async () => {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/sw.js");
  }

  const permissionResult = await Notification.requestPermission();

  if (permissionResult === "granted") {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        userVisibleOnly: true,
      });

      const response = await fetch("/api/push/subscribe", {
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.status !== 200) {
        throw new Error("Failed to subscribe to push notifications");
      }
    } catch (err) {
      console.log("failed to subscribe to push notifications", err);
    }
  }
};

export const listenToChanges = async () => {
  const permissions = await navigator.permissions.query({
    name: "notifications",
  });

  permissions.onchange = async () => {
    if (permissions.state !== "granted") {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
      });
    }
  };
};
