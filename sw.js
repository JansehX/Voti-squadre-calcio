// Service worker: prima la rete (così gli aggiornamenti arrivano subito), la copia salvata solo se sei offline.
// In più gestisce le notifiche push (risultato della partita).
const CACHE = 'squadre-v2';
const FILES = ['./', './index.html', './vota.html', './manifest.json', './manifest-vota.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, font ecc. restano gestiti dal browser
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Squadre', {
    body: d.body || '',
    icon: 'icon-192.png',
    tag: d.tag || 'squadre',
    renotify: true,
    data: { url: d.url || './vota.html?tab=vota' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('navigate' in c && 'focus' in c) return c.navigate(target).then(x => (x || c).focus()).catch(() => self.clients.openWindow(target));
    }
    return self.clients.openWindow(target);
  }));
});
