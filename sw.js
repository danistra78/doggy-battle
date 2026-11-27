const CACHE = 'doggy-v3';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/board.js',
  './js/generator.js',
  './js/geometry.js',
  './js/main.js',
  './js/menu.js',
  './js/palette.js',
  './js/progress.js',
  './js/restore.js',
  './js/rules.js',
  './js/solver.js',
  './js/sound.js',
  './js/state.js',
  './js/tutorial.js',
  './puzzles/10.json',
  './puzzles/5.json',
  './puzzles/6.json',
  './puzzles/7.json',
  './puzzles/8.json',
  './puzzles/9.json',
  './puzzles/tutorial.json',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
