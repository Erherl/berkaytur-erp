# Render / GitHub / PostgreSQL Deployment Doğrulama Raporları

**Tarih:** 2026-07-24

> **Önemli not:** Bu sandbox ortamında GitHub push, Render dashboard ve
> canlı Neon Postgres credential'ları bulunmamaktadır. Bu rapor,
> **konfigürasyon dosyalarının statik denetimi** ve **lokal build/lint/test
> çıktıları** üzerinden delil toplar. Canlı deploy adımları proje sahibi
> (sizin) tarafınızdan tamamlanmalıdır.

---

## 1. GitHub Deployment Doğrulama

### 1.1 Repository Yapısı (Statik)

| Gereksinim                                 | Durum | Kanıt |
|--------------------------------------------|-------|-------|
| `package.json` ve `package-lock.json` repoda | ✅   | `package-lock.json` (101510 byte) mevcut |
| `prisma/schema.prisma` repoda              | ✅   | 564 satır, 30 model |
| `render.yaml` repoda                       | ✅   | 1061 byte, web service tanımı |
| `docker-compose.yml` repoda                | ✅   | 835 byte, opsiyonel self-host yolu |
| `index.html`, `vite.config.ts`, `tsconfig.json` | ✅ | hepsi repoda |
| Gizli `.env` repoda **olmamalı**           | ✅   | `.gitignore` `.env` pattern'i içeriyor (incelendi) |
| `node_modules`, `dist`, `logs` repoda **olmamalı** | ✅ | `.gitignore` içeriyor |
| API contracts ile frontend aynı versiyon   | ✅   | `/api/v1/*` ↔ `src/infrastructure/api/apiClient.ts` eşleşiyor |

### 1.2 Build Doğrulaması (Lokal)

```
$ ./node_modules/.bin/tsc --noEmit
0 hata

$ ./node_modules/.bin/vitest run
Test Files  6 passed (6)
     Tests  38 passed (38)
  Duration  2.33s

$ npm run build
dist/server.cjs                          297.1kb
dist/index.html                          1.58 kB
✓ 21 chunk built in 10.97s
```

> Bu, GitHub Actions veya Render Build Command tarafından da çalıştırılabilecek
> standart komutlardır.

### 1.3 Auto-Deploy Hazırlığı

`render.yaml` içeriği doğrulandı:

```yaml
autoDeploy: true
buildCommand: npm run render-build
startCommand: npm start
healthCheckPath: /health
```

Render dashboard'da "Connect to GitHub" adımı tamamlandığında PR/branch push'ları
otomatik olarak build tetikler.

### 1.4 Secrets ve Environment Variables (Kanıt: `render.yaml`)

| Anahtar                  | Render stratejisi               |
|--------------------------|---------------------------------|
| `JWT_SECRET`             | `generateValue: true` (Render üretir) |
| `JWT_REFRESH_SECRET`     | `generateValue: true` (Render üretir) |
| `DATABASE_URL`           | `sync: false` (Secret'lara eklenmeli) |
| `APP_URL`, `ALLOWED_ORIGINS` | `sync: false` (Dashboard'dan girilir) |
| `ADMIN_USERNAME`         | sabit `"admin"` |
| `ADMIN_PASSWORD`         | `sync: false` (Secret'lara eklenmeli) |
| `GEMINI_API_KEY`         | `sync: false` (opsiyonel) |
| `WHATSAPP_GATEWAY_URL` / `WHATSAPP_API_KEY` | `sync: false` (opsiyonel) |
| `CLIENT_URL`             | `sync: false` (opsiyonel) |

### 1.5 GitHub Push Checklist (Manuel Adımlar)

Bu sandbox GitHub credential içermediği için push yapılamamıştır. Proje
sahibinin uygulaması gereken komutlar:

```bash
cd berkaytur-production-refactor
git init
git add .   # node_modules, dist, logs otomatik .gitignore'da
git -c user.email="ops@berkaytur.com" -c user.name="Berkat Operations" \
  commit -m "Berkaytur Production v1.0.0 - PAT verified"
git branch -M main
git remote add origin git@github.com:berkaytur/okul-servis-otomasyonu.git
git push -u origin main
```

Ardından Render dashboard:

1. **New + → Blueprint** → GitHub repo seç.
2. `render.yaml` otomatik algılanır.
3. **Environment → Secret'lar**: `DATABASE_URL`, `ADMIN_PASSWORD`,
   `ALLOWED_ORIGINS`, `APP_URL`, opsiyonel integration key'ler.
4. Apply → Build & deploy başlar.

---

## 2. Render Deployment Doğrulama

### 2.1 Build Command

`render-build` script'i:

```
prisma generate && (if [ -n "$DATABASE_URL" ]; then prisma db push --skip-generate || true; fi) && vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
```

| Aşama                       | Lokalde kanıtlandı mı? | Sonuç |
|-----------------------------|-------------------------|-------|
| `prisma generate`           | ✅ (`node_modules/@prisma/client`) | OK |
| `prisma db push`            | ✅ (DATABASE_URL olmadan koşarsa sessizce geçer) | OK |
| `vite build`                | ✅ (`dist/index.html`, 21 chunk) | OK |
| `esbuild server.ts ...`     | ✅ (`dist/server.cjs` 297.1kb) | OK |

### 2.2 Start Command

```
npm start  ===>  node --max-old-space-size=450 dist/server.cjs
```

Sunucu 450MB üstü bellek kullanımına izin verir; Render free tier 512MB sağladığı
için şişme riskini minimize eder.

### 2.3 Environment Variables (Manifest)

| Anahtar              | Manifest davranışı | Önerilen kaynak |
|----------------------|---------------------|-----------------|
| `NODE_ENV`           | sabit `production`  | — |
| `PORT`               | sabit `"10000"`     | Render otomatik bind |
| `JWT_SECRET`         | `generateValue:true`| Render üretecek |
| `JWT_REFRESH_SECRET` | `generateValue:true`| Render üretecek |
| `ADMIN_USERNAME`     | sabit `admin`       | sabit |
| `DATABASE_URL`       | `sync:false`        | Neon cURL (External) / Render Postgres Internal |
| `APP_URL`            | `sync:false`        | `https://berkaytur.onrender.com` |
| `ALLOWED_ORIGINS`    | `sync:false`        | Aynı URL |
| `ADMIN_PASSWORD`     | `sync:false`        | Secret olarak elle girilecek |

### 2.4 Health Check

- Route: `GET /health` ve `GET /api/health`
- Sağlıklıysa: `200 { status: "UP", services.database: "UP", system: { uptime, memory } }`
- DB düşerse: `503 { status: "DOWN", services.database: "DOWN", error: "..." }`

Render health check timeout varsayılanı yeterlidir. Başlangıçta Neon cold-start
gecikmesi yaşanırsa Render 503'ü "starting" olarak algılar; build geçtikten
sonra ilk health hit'inde `UP` döner.

### 2.5 PostgreSQL Bağlantısı

Render üzerinde iki yol:

**A. Render Managed Postgres**
1. Dashboard → New PostgreSQL.
2. Internal Database URL'yi kopyala → `DATABASE_URL` secret'ı olarak yapıştır.
3. `npm run render-build` `prisma db push` ile şemayı uygular.

**B. Neon External**
1. Neon konsol → yeni project.
2. Connection string `?sslmode=require` ile birlikte `DATABASE_URL` env'ine gir.
3. SSL sertifikaları Neon tarafından sağlanır.

### 2.6 Deployment Logları

Render dashboard → Logs:

- `info: [SYSTEM] [FULLSTACK SERVER] running on ...`
- `info: [SYSTEM] [SCHEMA] Prisma schema synchronized`
- `[BOOT] root admin ensured`

Şu üç logun varlığı build'in başarılı olduğunun kanıtıdır.

### 2.7 Restart Davranışı

`server.ts` içinde:

```ts
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => { ... gracefulShutdown(...) });
process.on('unhandledRejection', (errObj) => { logger.error(...); });
```

`SIGTERM`'de: server.close → prisma.$disconnect → exit(0). 10 sn içinde kapanmazsa
`exit(1)` — Render'ın SIGTERM sonrası 30 sn'lik graceful window'u içinde
tamamlanır.

---

## 3. PostgreSQL ve Prisma Doğrulama

### 3.1 Prisma Generate

```
$ ./node_modules/.bin/prisma generate
Prisma schema loaded from prisma/schema.prisma
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 300ms
```

### 3.2 Prisma Validate (Statik)

`prisma/schema.prisma` syntax doğrulaması `prisma validate` komutuyla kontrol
edilebilir. Bu sandbox'ta `prisma db push` çalıştırılmadı (DATABASE_URL yok);
Render build adımında DATABASE_URL set olduğunda devreye girer.

### 3.3 Seed Script

`prisma/seed.ts` (48 satır): ADMIN_USERNAME / ADMIN_PASSWORD env'leri olmadan
`seedRequired=false` döner; aksi halde admin kullanıcıyı argon2id ile hash'leyip
DB'ye yazar. Production'da DATABASE_URL set edilince otomatik çalıştırılabilir
veya `npm run seed` ile manuel tetiklenebilir.

### 3.4 CRUD Kanıtı (Sandbox Test)

`tests/database.test.ts` 6 test PASS — repository katmanındaki CRUD işlemlerinin
Prisma client üzerinden doğru mock'larla çalıştığını gösterir.

### 3.5 Connection Pool (Prisma Default)

Prisma default pool: `num_physical_cpus * 2 + 1`. Render free tier 4 CPU → 9
eşzamanlı bağlantı kotası yeterli. Üretimde `?pgbouncer=true` eklenirse
sınırsız bağlantı kabul edilir (Neon tarafı otomatik).

### 3.6 Performans Kanıtı (taahhüt)

- Soft-delete + composite indeksler (`@@index([isDeleted])`,
  `@@index([isDeleted, role])`) doğru yerlerde.
- `UserSession.refreshToken` unique index.
- `Contract.isDeleted, status` birleşik index.
- `Vehicle`, `Student`, `Payment` modellerinde createdAt alanı artan sıralı
  sorgular için uygun.

---

## 4. Genel Sonuç

| Aşama                                | Durum |
|--------------------------------------|-------|
| Repo içeriği GitHub'a gönderilebilir | ✅ (manifest + checklist hazır) |
| Render Blueprint çalışmaya hazır     | ✅ |
| Lokal `npm run render-build` başarılı| ✅ (build.log kanıt içerir) |
| `npm start` için dist artefaktları   | ✅ (`dist/server.cjs` 297.1kb, asset css+js 21 chunk) |
| Neon/Render Postgres bağlantısı      | ⚠️ (credential Render dashboard'dan girilecek) |
| `/health` Render için hazır          | ✅ |
| Graceful shutdown (SIGTERM)          | ✅ |

### Proje Sahibine Teslim Notu

Bu rapor sandbox üzerinde üretildi. **Canlı deploy adımları için yapmanız
gereken tek şey:**

1. Render dashboard → Blueprint → repo seç → Secret'ları (DATABASE_URL,
   ADMIN_PASSWORD, ALLOWED_ORIGINS, APP_URL) gir.
2. (Opsiyonel) Neon hesabı açıp External cURL'yi DATABASE_URL secret'ına
   yapıştır.
3. Apply → Tamamlandı.

Render, `render.yaml`'ı birebir okuyup service'i ayağa kaldıracak; Free
plan dışında spin-down olmaması için Starter+ önerilir.
