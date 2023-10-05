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
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      console.log("subscription", subscription);

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        throw new Error("Failed to subscribe to push notifications");
      }

      const data = await response.json();
      console.log("user subscribed", data);
    } catch (err) {
      console.log("failed to subscribe to push notifications", err);
    }
  }
};
