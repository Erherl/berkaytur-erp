# Berkaytur Okul Servis Otomasyonu - Production Refactor

Bu paket, **Berkaytur Okul Servisi 11** tabanının korunup production odaklı olarak düzenlenmiş sürümüdür.

## Bu refactor içinde yapılan ana dönüşümler

- Yetki zirvesi **Admin** rolüne indirildi; eski Super Admin referansları temizlendi.
- Veritabanı hedefi tamamen **Neon PostgreSQL + Prisma** olacak şekilde düzenlendi.
- SQLite referansları deployment ve uygulama katmanından temizlendi.
- Tarayıcıdaki `localStorage` kullanımı, birincil veri kaynağı olmaktan çıkarılıp **PostgreSQL senkronize önbellek** modeline yaklaştırıldı.
- JWT + Refresh Token yaklaşımı korundu ve session/cookie öncelikli çalışma güçlendirildi.
- Docker Compose production ortamı PostgreSQL dış bağlantısı ile çalışacak hale getirildi.
- Backup kapsamına tarayıcı cache senkron kayıtları da eklendi.

## Gerekli ortam değişkenleri

`.env` dosyasını `.env.example` üzerinden oluşturun:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.example
ALLOWED_ORIGINS=https://your-domain.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
JWT_REFRESH_SECRET=CHANGE_ME_LONG_RANDOM_REFRESH_SECRET
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_ADMIN_PASSWORD
GEMINI_API_KEY=
GOOGLE_APPS_SCRIPT_URL=
APPS_SCRIPT_SECRET=
WHATSAPP_GATEWAY_URL=
WHATSAPP_API_KEY=
```

## Kurulum

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm start
```

## Render / Docker notları

- Uygulama kendi içinde SQLite dosyası tutmaz.
- Production verisi yalnızca `DATABASE_URL` ile verilen PostgreSQL veritabanında saklanır.
- `docker-compose.yml` artık harici PostgreSQL bağlantısını esas alır.
- Yedekler JSON export olarak `backups/` klasörüne alınır.

## Önemli not

Bu paket production refactor başlangıcını içerir; yine de gerçek canlıya almadan önce aşağıdakilerin ayrıca doğrulanması önerilir:

- Neon üzerinde gerçek migration akışı
- Tüm ekranlarda uçtan uca CRUD testi
- Role bazlı görünürlük ve buton kontrolleri
- Dosya yükleme / indirme akışları
- Mobil görünüm ve yoğun veri senaryoları

## Komutlar

```bash
npm run dev
npm run test
npm run build
npm run quality-gate
```
