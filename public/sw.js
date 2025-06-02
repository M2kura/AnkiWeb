const CACHE_NAME = 'ankiweb-v1'
const urlsToCache = [
  '/AnkiWeb/',
  '/AnkiWeb/index.html',
  '/AnkiWeb/sounds/card-flip.mp3',
  '/AnkiWeb/assets/',
  '/AnkiWeb/manifest.json',
  '/AnkiWeb/anki.svg',
  '/AnkiWeb/vite.svg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(error => {
        console.error('Cache installation failed:', error)
      })
  )
})

self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Special handling for static assets
  if (event.request.url.endsWith('.svg') || 
      event.request.url.endsWith('.png') || 
      event.request.url.endsWith('.jpg') || 
      event.request.url.endsWith('.mp3')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response
          }
          return fetchAndCache(event.request)
        })
        .catch(error => {
          console.error('Static asset fetch failed:', error)
          return new Response('Asset not found', { status: 404 })
        })
    )
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Check if the cached response is stale
          const cacheTime = response.headers.get('sw-cache-time')
          if (cacheTime && Date.now() - parseInt(cacheTime) > 24 * 60 * 60 * 1000) {
            // Cache is older than 24 hours, try to fetch fresh
            return fetchAndCache(event.request)
          }
          return response
        }
        return fetchAndCache(event.request)
      })
      .catch(error => {
        console.error('Fetch failed:', error)
        return new Response('Network error', { status: 503 })
      })
  )
})

async function fetchAndCache(request) {
  try {
    const response = await fetch(request)
    if (!response || response.status !== 200 || response.type !== 'basic') {
      return response
    }

    const responseToCache = response.clone()
    const cache = await caches.open(CACHE_NAME)
    
    // Add cache timestamp
    const headers = new Headers(responseToCache.headers)
    headers.append('sw-cache-time', Date.now().toString())
    
    const cachedResponse = new Response(await responseToCache.blob(), {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers: headers
    })
    
    await cache.put(request, cachedResponse)
    return response
  } catch (error) {
    console.error('Fetch failed:', error)
    return new Response('Network error', { status: 503 })
  }
}

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
}) 