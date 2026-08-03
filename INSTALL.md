# INSTALL — Sıfırdan Kurulum

## 1. Önkoşullar
- Node.js **22.x** (Render'da zaten sağlanır; lokal için `nvm install 22`).
- npm 10+.
- (Üretim) Neon veya Render Managed **PostgreSQL** instance.
- (Üretim) `psql` veya Neon SQL Editor erişimi (migration doğrulaması için).

## 2. Adımlar

```bash
git clone <repo-url> berkaytur
cd berkaytur
cp .env.example .env             # .env'i kendi değerlerinle doldur
npm install                      # ~415 paket, ~30 sn
npx prisma generate              # Prisma Client üretildi
npx prisma db push               # 30 model → PostgreSQL'e uygulandı
npm run seed                     # admin seed (ADMIN_USERNAME / ADMIN_PASSWORD)
npm run build                    # vite build + esbuild server.ts
npm start                        # node --max-old-space-size=450 dist/server.cjs
```

## 3. .env sırası

Aşağıdaki sırayla doldurun; `JWT_SECRET` ve `JWT_REFRESH_SECRET` en az 32 rastgele karakter:

```
NODE_ENV=production
PORT=10000                           # Render free plan 10000
APP_URL=https://berkaytur.onrender.com
ALLOWED_ORIGINS=https://berkaytur.onrender.com
DATABASE_URL=postgresql://USER:PASS@HOST/neondb?sslmode=require
JWT_SECRET=<render-generatedValue>
JWT_REFRESH_SECRET=<render-generatedValue>
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<güçlü benzersiz şifre>
# Opsiyonel:
GEMINI_API_KEY=
GOOGLE_APPS_SCRIPT_URL=
APPS_SCRIPT_SECRET=
WHATSAPP_GATEWAY_URL=
WHATSAPP_API_KEY=
```

## 4. Doğrulama

```bash
curl https://berkaytur.onrender.com/health
# 200 + { "status":"UP", "services": { "database":"UP", "server":"UP" } }

curl -X POST https://berkaytur.onrender.com/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'
# 200 + access/refresh token
```

## 5. Sık Yapılan Hatalar
- `DATABASE_URL` boş → server log: "⚠️ [DATABASE] DATABASE_URL ortam değişkeni tanımlanmamış". Render'da Secret olarak girilmeli.
- `ALLOWED_ORIGINS` eksik → CORS preflight başarısız, frontend cookie alamaz.
- `JWT_SECRET` < 32 char → token imza reddedilir; tüm `/api/v1/*` çağrıları 401 döner.
