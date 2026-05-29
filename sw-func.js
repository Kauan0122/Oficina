const CACHE = 'oficina-func-v1';
const SHELL = [
  './funcionario.html',
  './manifest-func.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if(url.includes('firebase') || url.includes('googleapis.com') ||
     url.includes('gstatic.com') || url.includes('firebaseio.com') ||
     e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        if(!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    }).catch(() => new Response(
      '<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d0f14;color:#f0f2f8">' +
      '<h2>📶 Sem conexão</h2><p>Recarregue quando tiver internet.</p>' +
      '<button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">Tentar novamente</button>' +
      '</body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    ))
  );
});
