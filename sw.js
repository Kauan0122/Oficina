// OficinaControl — Service Worker
const CACHE = 'oficina-v27';

// Recursos do app shell para cache offline
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Instala e faz cache do app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // addAll falha se algum recurso não carregar — usamos add individual com try/catch
      Promise.allSettled(SHELL.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Remove caches antigos ao ativar nova versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache-first para assets estáticos, network-first para Firebase
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Deixa Firebase, Google Identity e APIs externas sem interceptar
  if (
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebaseio.com') ||
    e.request.method !== 'GET'
  ) {
    return; // passa direto para a rede
  }

  // Cache-first para todo o resto (app shell, fontes, chart.js)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Só faz cache de respostas válidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    }).catch(() => {
      // Se offline e não tem cache, retorna página offline mínima
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d0f14;color:#f0f2f8">' +
        '<h2>📶 Sem conexão</h2><p>O OficinaControl precisa de internet para sincronizar dados.</p>' +
        '<button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">Tentar novamente</button>' +
        '</body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
