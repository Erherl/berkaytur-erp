# ENVIRONMENT_VARIABLES.md

## 1. Zorunlu (Üretim)

| Key | Tip | Örnek | Açıklama |
|---|---|---|---|
| `NODE_ENV` | enum | `production` | Sıkılaştırılmış mod |
| `PORT` | int | `10000` | Render varsayılanı |
| `APP_URL` | URL | `https://berkaytur.onrender.com` | SPA kök URL |
| `ALLOWED_ORIGINS` | CSV | `https://berkaytur.onrender.com` | CORS whitelist |
| `DATABASE_URL` | conn string | `postgresql://user:pwd@host/db?sslmode=require` | Prisma bağlantısı |
| `JWT_SECRET` | string ≥32 | (gizli) | Access token imzalama |
| `JWT_REFRESH_SECRET` | string ≥32 | (gizli) | Refresh token imzalama |
| `ADMIN_USERNAME` | string | `admin` | İlk admin adı |
| `ADMIN_EMAIL` | email | `admin@example.com` | İlk admin e-posta |
| `ADMIN_PASSWORD` | string | (güçlü) | İlk deploy şifresi |

## 2. Opsiyonel (Dış Servisler)

| Key | Açıklama | Boşsa Davranış |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key | "feature disabled" UI |
| `GOOGLE_APPS_SCRIPT_URL` | Apps Script webhook | Sheets sync 503 UI |
| `APPS_SCRIPT_SECRET` | Apps Script shared secret | sync reddedilir |
| `WHATSAPP_GATEWAY_URL` | Resmi gateway base URL | "Standby/Çevrimdışı Manual" |
| `WHATSAPP_API_KEY` | Gateway API key | anonim user 401 |

## 3. Test Değerleri
Bu sandbox `.env`'inde kullanılan test değerleri (PRD'de "güvenli test değerleri" gereksinimi):
- `DATABASE_URL=postgresql://user:password@ep-cool-db-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require` (placeholder)
- `JWT_SECRET=dev-only-test-secret-do-not-use-in-prod-32+chars`
- `ADMIN_PASSWORD=TestAdmin!2026`

## 4. Doğrulama
`node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL?.length>10?'OK':'MISSING')"`
