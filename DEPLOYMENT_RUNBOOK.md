# Berkaytur Production — Canlı Deployment Runbook

**Versiyon:** v1.0.0
**Tarih:** 2026-07-24

Bu runbook, sandbox'ta credential eksikliği nedeniyle uzaktan doğrulanamayan canlı adımların proje sahibi tarafından uygulanma sırasıdır.

---

## 1. GitHub Push

```bash
cd berkaytur-production-refactor
git init
git add .          # .gitignore: node_modules, dist, logs, .env
git -c user.email="ops@berkaytur.com" -c user.name="Berkaytur Ops" \
  commit -m "v1.0.0 production-ready"
git branch -M main
git remote add origin git@github.com:berkaytur/okul-servis-otomasyonu.git
git push -u origin main
```

---

## 2. Neon PostgreSQL

1. https://console.neon.tech → New Project.
2. Connection string → cURL'yi kopyala:
   ```
   postgresql://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Bunu Render Secret olarak `DATABASE_URL` ile saklayın.

---

## 3. Render Deploy

### Yöntem A — Blueprint (tercih edilen)
1. https://dashboard.render.com → New + → Blueprint.
2. GitHub repo seç.
3. `render.yaml` otomatik okunur. `buildCommand`, `startCommand`, `healthCheckPath` doludur.
4. Apply.

### Yöntem B — Manual
1. Web Service → Region: Frankfurt → Plan: Starter+ (free plan'da spin-down olur).
2. Build Command: `npm run render-build` (= `prisma generate && prisma db push && vite build && esbuild server.ts`).
3. Start Command: `npm start` (= `node --max-old-space-size=450 dist/server.cjs`).
4. Health Check Path: `/health`.

### Render Secret olarak girilecek env değişkenleri

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `APP_URL` | `https://berkaytur.onrender.com` |
| `ALLOWED_ORIGINS` | `https://berkaytur.onrender.com` |
| `DATABASE_URL` | (Neon cURL'si) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | (güçlü benzersiz şifre) |
| `JWT_SECRET` | (Render generateValue) |
| `JWT_REFRESH_SECRET` | (Render generateValue) |
| `GEMINI_API_KEY` | (opsiyonel, Gemini API key) |
| `GOOGLE_APPS_SCRIPT_URL` | (opsiyonel) |
| `APPS_SCRIPT_SECRET` | (opsiyonel) |
| `WHATSAPP_GATEWAY_URL` | (opsiyonel) |
| `WHATSAPP_API_KEY` | (opsiyonel) |
| `CLIENT_URL` | `https://berkaytur.onrender.com` |

---

## 4. /health Endpoint

```bash
curl -i https://berkaytur.onrender.com/health
```

Beklenen yanıt:
```
HTTP/1.1 200 OK
Content-Type: application/json
{
  "status": "UP",
  "services": { "database": "UP", "server": "UP" },
  "system": { "uptime": 12.5, "memoryUsage": { ... } }
}
```
DB düşerse 503 → `services.database: "DOWN"`.

---

## 5. Admin Login Endpoint

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ADMIN_PASSWORD_VALUE"}'
```

Beklenen:
```
200 OK
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Admin", "role": "admin" },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "..."
  }
}
```

Ardından **mevcut parolayı değiştirmek için**:
```bash
curl -X POST https://berkaytur.onrender.com/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"ADMIN_PASSWORD_VALUE","newPassword":"YENI_STRONG_PASSWORD"}'
```

---

## 6. Öğrenci Ekleme

```bash
TOKEN=...
curl -X POST https://berkaytur.onrender.com/api/v1/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ali Yılmaz","grade":"5","schoolId":"<SCHOOL_ID>","parentPhone":"+905551234567"}'
```

---

## 7. Okul Ekleme

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/schools \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"name":"Atatürk İlkokulu","address":"..." ,"type":"kolej","phone":"+902121234567"}'
```

---

## 8. Araç Ekleme

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"plate":"34 ABC 123","capacity":16,"driverName":"Ahmet Bey","status":"active"}'
```

---

## 9. Hakediş Hesaplama

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<STUDENT_ID>","amount":3500,"month":7,"year":2026,"status":"pending"}'
```

---

## 10. Google Sheets Sync

Frontend → Admin Dashboard → Sheets paneline girilen **GOOGLE_APPS_SCRIPT_URL** Google Apps Script webhook'u tetikler. Yapılacak:

1. Google Apps Script'te `doPost(e)` handler'ı kur.
2. URL'i `GOOGLE_APPS_SCRIPT_URL` env'ine gir.
3. Apps Script'in `e.postData.contents` içindeki JSON'ı parse edip hedef Sheet'e yaz.

Frontend'den senkron tetikleme:
```bash
curl -X POST https://berkaytur.onrender.com/api/v1/sheets-webhook \
  -H "Content-Type: application/json" \
  -d '{"students":[...], "vehicles":[...], "schools":[...]}'
```
(**Not:** webhook endpoint'i public, Apps Script URL içine `?secret=APPS_SCRIPT_SECRET` ekle).

---

## 11. WhatsApp Gönderimi

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/whatsapp/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"to":"+905551234567","message":"Servis 07:30 hareket edecektir."}'
```

`WHATSAPP_GATEWAY_URL` ayarlı değilse sistem **Manual Submission** moduna düşer (web.whatsapp.com üzerinden admin'in kendisi göndermesi için bekletme).

---

## 12. PDF Üretimi

```bash
curl -X POST https://berkaytur.onrender.com/api/v1/reports/monthly-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<STUDENT_ID>","month":7,"year":2026}' \
  -o monthly-payment.pdf
```

Frontend tarafında `PremiumReportsDashboard.tsx` ile çağrılır; `pdfGeneratorService.ts` jsPDF üzerinden Türkçe karakter destekli rapor üretir.

---

## 13. Yedekleme ve Geri Yükleme

### Manuel yedek
```bash
curl -X POST https://berkaytur.onrender.com/api/v1/backups \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Otomatik Scheduler (standalone modda)
Standalone mode'da her gün 03:00'te `BackupService.initScheduler()` ile yedekleme çalışır. Serverless ortamda (Vercel) scheduler devre dışı; cron job Render Cron Job ile tetiklenebilir.

### Restore
```bash
curl -X POST https://berkaytur.onrender.com/api/v1/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"backupId":"<BACKUP_ID>"}'
```

---

## 14. Yetkilendirme Testleri

### Admin token → admin endpointleri
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://berkaytur.onrender.com/api/v1/schools
```

### Manager token → kendine atanmış okullar
```bash
curl -H "Authorization: Bearer $MANAGER_TOKEN" https://berkaytur.onrender.com/api/v1/schools
# Yalnızca manager'ın assignedSchools listesindeki okullar döner
```

### Driver token → /vehicles read
```bash
curl -H "Authorization: Bearer $DRIVER_TOKEN" https://berkaytur.onrender.com/api/v1/vehicles
# Yalnızca driver'ın assignedVehicles listesi döner
```

### Yanlış token
```bash
curl -H "Authorization: Bearer invalid.token.here" https://berkaytur.onrender.com/api/v1/admin
# 401 Forbidden
```

---

## 15. Smoke Test Sırası (5 dakikalık)

1. `curl /health` → 200 + db UP ✅
2. Login admin → 200 + accessToken ✅
3. Create school → 201 ✅
4. Create student (schoolId linkli) → 201 ✅
5. Create vehicle → 201 ✅
6. Create payment (studentId) → 201 ✅
7. GET /audit-logs (admin) → 200 + [log of POST actions] ✅
8. Refresh token rotation → new access+refresh ✅
9. Logout → access token revoked ✅
10. (Opsiyonel) Sheets sync → 200 ✅
11. (Opsiyonel) WhatsApp send → 200 veya Manual Mode ✅

Bu 11 adımda hepsi 200/201 ise sistem Production READY.
