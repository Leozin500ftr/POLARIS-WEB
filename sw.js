/* ============================================================
   Polaris Softwares — Service Worker
   Estratégia: Cache First (offline-ready)
   ============================================================ */

const CACHE_NAME    = 'polaris-v1';
const CACHE_STATIC  = [
    './',
    './index.html',
    './home.html',
    './cadastro.html',
    './style.css',
    './logo.png',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    /* Fonte do Google Fonts (será cacheada na primeira visita) */
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

/* ── INSTALL: pré-cacheia todos os assets estáticos ── */
self.addEventListener('install', function(event) {
    console.log('[SW] Instalando e pré-cacheando assets...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            /* addAll falha se qualquer recurso não carregar —
               usamos add individual para não travar em fontes externas */
            return Promise.allSettled(
                CACHE_STATIC.map(function(url) {
                    return cache.add(url).catch(function(err) {
                        console.warn('[SW] Não cacheou:', url, err.message);
                    });
                })
            );
        }).then(function() {
            console.log('[SW] Instalação concluída.');
            return self.skipWaiting(); /* ativa imediatamente */
        })
    );
});

/* ── ACTIVATE: remove caches antigos ── */
self.addEventListener('activate', function(event) {
    console.log('[SW] Ativando e limpando caches antigos...');
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) {
                        console.log('[SW] Removendo cache antigo:', key);
                        return caches.delete(key);
                    })
            );
        }).then(function() {
            return self.clients.claim(); /* controla todas as abas abertas */
        })
    );
});

/* ── FETCH: Cache First → Network Fallback ── */
self.addEventListener('fetch', function(event) {
    /* Ignora requisições que não são GET ou são extensões do browser */
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) {
                /* Retorna do cache e atualiza em background (stale-while-revalidate) */
                var fetchPromise = fetch(event.request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        var clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return networkResponse;
                }).catch(function() { /* sem internet — sem problema, já temos o cache */ });

                return cached; /* entrega imediato do cache */
            }

            /* Não está no cache → busca na rede e cacheia */
            return fetch(event.request).then(function(networkResponse) {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                    return networkResponse;
                }
                var clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
                return networkResponse;
            }).catch(function() {
                /* Completamente offline e não cacheado → página de fallback */
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

/* ── MESSAGE: força atualização manual ── */
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});