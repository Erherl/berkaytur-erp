# DEPLOYMENT — Render + Manuel

## 1. Render Blueprint (tercih edilen)

1. https://dashboard.render.com → New + → Blueprint
2. GitHub repo bağla
3. `render.yaml` otomatik okunur:
   - `buildCommand`: `npm run render-build`
   - `startCommand`: `npm start`
   - `healthCheckPath`: `/health`
4. Apply

## 2. Render Manuel

| Key | Value (örnek) |
|---|---|
| Region | Frankfurt |
| Plan | Starter+ (spin-down yok) |
| Build Command | `npm run render-build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

`render-build` zinciri:
```
prisma generate
prisma db push --skip-generate
vite build
esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
```

## 3. Health Check

```bash
curl -i https://berkaytur.onrender.com/health
```
Beklenen: `200 OK` + `{ status:"UP", services:{ database:"UP", server:"UP" } }`
DB düşerse: `503` + `services.database:"DOWN"` (graceful degrade yapar).

## 4. Admin Login Smoke

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'
```
200 + `data.user`, `data.accessToken`, `data.refreshToken`.
Sonra `POST /api/v1/auth/change-password` → yeni şifre.

## 5. İlk Deploy Smoke Sırası

1. `/health` → 200 (database UP)
2. Login admin → 200 token
3. `GET /api/v1/schools` → 200 []
4. `POST /api/v1/schools` → 201
5. `GET /api/v1/audit-logs` → 200 [log entries]
6. `POST /api/v1/auth/refresh` → yeni access+refresh
7. `POST /api/v1/auth/logout` → 200 (refresh iptal)

## 6. Opsiyonel Entegrasyonlar

### Google Sheets
Apps Script `doPost()` → URL'i `GOOGLE_APPS_SCRIPT_URL`'e gir → Manager → SheetsSync paneli ile tetikle → hedef Sheet'e satır düşer.

### WhatsApp
`WHATSAPP_GATEWAY_URL` env → Coordinator → VeliyeMesaj → QR olmadan direkt gateway'e gider; yoksa WhatsApp Web Manual UI devreye girer.

### Gemini
`GEMINI_API_KEY` env → Admin → AI paneli OCR/chat çalışır; aksi halde UI "feature disabled" der (tasarım gereği).
