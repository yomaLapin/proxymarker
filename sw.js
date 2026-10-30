const CACHE_PREFIX = 'proxymarker-cache-';
const CACHE_VERSION = 'v1.4.2';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

// 캐시할 기본 파일 목록
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 1. 설치(Install) 단계: 새로운 버전의 파일들을 캐시에 저장
self.addEventListener('install', event => {
    // 자동 활성화(skipWaiting)를 제거하여 사용자의 현재 작업을 방해하지 않음
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] 캐시 준비 완료:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. 메시지 수신: 사용자가 업데이트 알림을 클릭하여 수동 업데이트할 때 활성화
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// 3. 활성화(Activate) 단계: 기존 앱 캐시 정리
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // ProxyMarker 앱의 구버전 캐시만 삭제하고, 다른 브라우저 데이터는 보호
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] 구버전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 4. 요청 가로채기(Fetch) 단계: Network First 전략 + 안정적 캐시 저장
self.addEventListener('fetch', event => {
    // GET 요청과 내부 리소스(http/https)만 캐싱 대상으로 제한
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        (async () => {
            try {
                // 온라인인 경우 네트워크에서 최신 리소스 가져오기 시도
                const response = await fetch(event.request);
                
                // 요청이 성공했다면 비동기로 캐시에 저장 (이때 브라우저가 워커를 종료하지 않도록 waitUntil로 대기)
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    event.waitUntil(
                        caches.open(CACHE_NAME).then(cache => {
                            // 반드시 Promise를 return 하여 저장 완료를 보장
                            return cache.put(event.request, responseToCache);
                        })
                    );
                }
                return response;
            } catch (error) {
                // 네트워크 에러이거나 오프라인 상태인 경우 기존 캐시 반환
                return await caches.match(event.request);
            }
        })()
    );
});