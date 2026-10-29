const CACHE_NAME = 'proxymarker-cache-v1.3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 설치 단계: 코어 파일 캐시 저장
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// 활성화 단계: 이전 버전 캐시 삭제
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// fetch 단계: 오프라인 지원 (네트워크 요청 가로채기)
// 사용자가 선택하는 로컬 비디오 파일(blob/file protocol)은 서비스워커 범위를 벗어나므로 정상적으로 로드됨.
self.addEventListener('fetch', event => {
    // 캐시에 있는 경우 반환, 없으면 네트워크 통신 수행
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
            .catch(() => {
                // 오프라인 상태에서 찾을 수 없을 때의 방어 로직
            })
    );
});
