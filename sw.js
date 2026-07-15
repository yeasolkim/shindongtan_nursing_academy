// 신동탄간호학원 Service Worker
// 캐시 버전 — CSS/JS/공통 HTML 변경 시 숫자를 올려주세요
const CACHE_VER = 'sdn-sw-v12';

// 설치 시 즉시 캐시할 핵심 파일
const PRECACHE = [
  './style.css',
  './common-pages.css',
  './script.js',
  './supabase-config.js',
  './header.html',
  './footer.html',
  './page-hero.html',
  './shindongtan/resource/logo.png',
];

// ── 설치: 핵심 파일 사전 캐시 ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 구버전 캐시 정리 ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── fetch: 요청 유형별 캐시 전략 ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 외부 API / CDN은 서비스 워커 통과 (브라우저 기본 처리)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('openstreetmap.org')
  ) return;

  // GET 요청만 처리
  if (request.method !== 'GET') return;

  const pathname = url.pathname;

  // ① CSS / JS → Cache-First (캐시에 있으면 즉시, 없으면 네트워크 후 저장)
  if (pathname.match(/\.(css|js)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ② 이미지 → Cache-First
  if (pathname.match(/\.(png|jpe?g|gif|svg|webp|ico|avif)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ③ HTML / 공통 컴포넌트 → Stale-While-Revalidate
  //    (캐시를 즉시 보여주고 백그라운드에서 최신 버전으로 업데이트)
  if (pathname.match(/\.html$/) || pathname.endsWith('/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ── 전략 함수 ────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VER);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VER);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch;
}
