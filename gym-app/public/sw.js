/* Service worker: powłoka aplikacji z cache, żeby słaby zasięg na siłowni
   nie blokował trwającego treningu. Dane treningowe i tak żyją w localStorage
   po stronie klienta i synchronizują się, gdy sieć wróci. */
const CACHE = "trening-v1";
const SHELL = ["/", "/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Mutacje (server actions) nigdy nie idą z cache - to zapisy, nie odczyty.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/offline")) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

/* Przygotowane pod powiadomienia (trening, suplementy, posiłki) - wysyłkę
   dołoży backend, obsługa kliknięcia jest już tutaj. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const open = clients.find((client) => client.url.includes(target));
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
