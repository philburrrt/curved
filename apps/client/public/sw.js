// Install service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("notification-assets").then((cache) => {
      return cache.addAll(["apple-touch-icon.png"]);
    }),
  );
});

// Fetch event
self.addEventListener("push", (event) => {
  const data = event.data.json();
  console.log("Push received...");
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "apple-touch-icon.png",
  });
});
