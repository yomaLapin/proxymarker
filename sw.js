const CACHE_NAME = 'proxymarker-cache-v1.4.1';

// 캐시할 기본 파일 목록
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 설치(Install) 단계: 새로운 버전의 파일들을 캐시에 저장
self.addEventListener('install', event => {
    // 새 서비스 워커가 즉시 대기 상태를 건너뛰고 활성화되도록 함
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
    );
});

// 활성화(Activate) 단계: 구버전 캐시 삭제
self.addEventListener('activate', event => {
    // 설치 즉시 페이지를 제어하도록 설정 (여러 탭이 열려 있어도 즉시 적용)
    event.waitUntil(self.clients.claim());
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 요청 가로채기(Fetch) 단계: Network First 전략 (HTML 중심)
self.addEventListener('fetch', event => {
    // 온라인 상태일 때는 네트워크에서 최신 버전을 먼저 가져오고, 
    // 실패(오프라인)할 경우 캐시에서 가져오는 전략 (Network First)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 네트워크 요청이 성공하면 캐시도 업데이트
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // 오프라인 상태이거나 네트워크 에러 발생 시 캐시에서 파일 반환
                return caches.match(event.request);
            })
    );
});