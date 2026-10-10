const CACHE_NAME = 'student-portal-v2';

// جميع الصور والموارد الخارجية التي سيتم تخزينها فوراً عند أول زيارة
const EXTERNAL_ASSETS_TO_PRECACHE = [
  'https://i.ibb.co/MrcC510/image.jpg',           // بطاقة الطالب
  'https://i.ibb.co/d4qYrK52/image.jpg',           // بطاقة الإقامة
  'https://i.ibb.co/4ZgdywFC/IMG-3557.jpg',        // الأفاتار
  'https://i.postimg.cc/52zCNLxV/unnamed.webp',    // أيقونة التطبيق
  'https://i.ibb.co/4gTfs7pz/IMG-3567.jpg',        // صورة البانر 1
  'https://i.ibb.co/KpbyXPgL/IMG-3545.jpg',        // صورة البانر 2
  'https://i.ibb.co/LXv6wX3z/image.png',           // شعار PROGRES (splash)
];

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // أولاً خزّن الملفات المحلية
      await cache.addAll(LOCAL_ASSETS);
      
      // ثانياً خزّن الصور الخارجية بشكل فردي (مع التعامل مع الأخطاء)
      const externalCachePromises = EXTERNAL_ASSETS_TO_PRECACHE.map(async (url) => {
        try {
          const response = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, response);
          console.log('✅ تم تخزين:', url);
        } catch (err) {
          console.warn('⚠️ تعذر تخزين:', url, err);
        }
      });
      
      await Promise.allSettled(externalCachePromises);
    })
  );
  self.skipWaiting();
});

// تنظيف الـ Cache القديم عند تفعيل نسخة جديدة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// اعتراض طلبات الشبكة: Cache First ثم Network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // تجاهل طلبات Vite HMR في بيئة التطوير
  if (event.request.url.includes('/@vite/') || 
      event.request.url.includes('/__vite') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // موجود في الـ Cache - نرجعه فوراً
        // نقوم بتحديثه في الخلفية للزيارات القادمة
        event.waitUntil(
          fetch(event.request).then(async (networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
            }
          }).catch(() => {}) // تجاهل الخطأ في الخلفية
        );
        return cachedResponse;
      }

      // غير موجود في الـ Cache - جلب من الشبكة وتخزينه
      return fetch(event.request).then(async (networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(async () => {
        // إذا انقطع الإنترنت ولم نجد الملف في الكاش
        // إذا كان الطلب لصفحة ويب، نرجع الصفحة الرئيسية
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('./index.html');
        }
        // خلاف ذلك نرجع استجابة فارغة (مثل للصور)
        return new Response('', { status: 404, statusText: 'Offline' });
      });
    })
  );
});
