// Install service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("notification-assets").then((cache) => {
      return cache.addAll(["apple-touch-icon.png"]);
    }),
  );
});

// Activate service worker
self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
});

// Fetch event
self.addEventListener("fetch", (event) => {
  console.log("Fetching:", event.request.url);
});
