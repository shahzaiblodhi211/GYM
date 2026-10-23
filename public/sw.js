const CACHE = "gym-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const cacheable =
    request.mode === "navigate" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/form/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-touch-icon") ||
    url.pathname.endsWith(".png") ||
    url.pathname.includes("manifest")

  if (!cacheable) return
  event.respondWith(networkFirst(request))
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === "navigate") {
      const home = await caches.match("/")
      if (home) return home
    }
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
  }
}
