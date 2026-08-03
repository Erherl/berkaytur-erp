# Changelog

## [1.0.0-audit] - 2026-07-27

### Üretim Denetimi (Production Audit — gerçek Bash loglu)
- Workspace doğrulama: package.json, .env, node_modules, 6 binary mevcut.
- `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀" (gerçek terminal çıktısı).
- `npx prisma generate` → "✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client" (gerçek).
- `tsc --noEmit` → EXIT=0 (gerçek).
- `vitest run` → **7 dosya / 98 test / 100% PASS / 2.77 s** (gerçek terminal çıktısı).
- `vite build` → 22 client chunk + 9.73 s, 0 hata (gerçek).
- `esbuild server.ts ...` → dist/server.cjs 556 kB (gerçek).
- Server `node --max-old-space-size=450 dist/server.cjs` prod modunda: log "Fullstack Server running on http://localhost:3000" (gerçek süreç 50 sn uptime).
- HTTP probe (curl): `/health`→503 DB DOWN (graceful), `/`→200 SPA, `/favicon.svg`→200, `/manifest.json`→200, `/api/v1/csrf`→200 + CSRF cookie, `POST /api/v1/auth/login {}`→400 Zod validasyon mesajı.
- Helmet header'ları (CSP/HSTS/X-Frame/X-Content-Type-Options/Cross-Origin-Opener-Policy/Referrer-Policy) HTTP response'da görüldü.

### Eklenenler (denetim çıktısı)
- `AUDIT_REPORT.md` — PASS listesi, UNVERIFIED listesi, üretimde nasıl doğrulanır.
- `INSTALL.md` / `DEPLOYMENT.md` / `MIGRATION.md` / `SEED.md` / `BACKUP_RESTORE.md` / `ROLE_PERMISSION.md` / `ENVIRONMENT_VARIABLES.md`.

### Ücretli Harita Doğrulaması
- `GOOGLE_MAPS_KEY|YANDEX_API|MAPBOX_TOKEN` → **yok**.
- Sadece `leaflet` + `tile.openstreetmap.org` + `nominatim` (ücretsiz) kullanılıyor.

### Doğrulanamayan (UNVERIFIED)
- Postgres live migration & seed → Render+Neon ortamında 2 dakikalık smoke testi ile doğrulanır.
- WhatsApp Gateway, Google Sheets, Gemini live → credential gerekiyor; `AUDIT_REPORT.md` "Dış Servisler" bölümünde gerekçeyle yazıldı.

### Hiçbir özellik "kod var" diye çalışıyor işaretlenmedi
PRD'nin temel ilkesine uygun olarak, gerçek koşturma kanıtı olmayan her şey UNVERIFIED loglandı.

## [1.0.0] - 2026-07-24

Release Notes içindeki v1.0.0 PAT süreci tamamlandı.
