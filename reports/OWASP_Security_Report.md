# OWASP Top 10 Doğrulama Raporu (v2 - Kod Üzerinden Yeniden Doğrulanmış)

**Yöntem:** Kaynak kod (server/app.ts, server/middlewares/security.ts, server/middlewares/auth.ts,
server/utils/crypto.ts, server/validators/schemas.ts) satır satır incelendi. Dinamik tarama
(gerçek HTTP saldırı denemesi) sandbox ağ kısıtı nedeniyle yapılamadı; bu rapor statik kod
kanıtına dayanır.

| Başlık | Durum | Kanıt (Dosya:Satır) |
|---|---|---|
| Broken Access Control | PASS | Bkz. RBAC_Report.md ve IDOR_Report.md — 1 düşük risk bulgusu düzeltildi |
| CSRF | PASS | `csrfTokenProtection`: signed double-submit cookie + origin/referer doğrulaması (security.ts:293-337) |
| SQL Injection | PASS | Tüm veri erişimi Prisma ORM parametreli sorgularıyla yapılıyor; `queryRawUnsafe` kullanımı kod tabanında bulunamadı; ayrıca girişte ek SQLi imza tespiti var (security.ts detectSqlInjection) |
| XSS | PASS | `recursiveSanitizeAndVerify` tüm body/query/params için HTML-escape uyguluyor + `javascript:`, `onload`, `onerror` gibi payload'ları temizliyor (security.ts:246-283) |
| SSRF | KISMEN DOĞRULANAMADI | googleSheetsAndDriveService.ts ve whatsappService.ts dış URL'lere istek atıyor; URL'ler ortam değişkeninden geliyor (kullanıcı girdisi değil) — düşük risk, ama dış servis URL'lerinin kullanıcı girdisinden türetilmediği her çağrı noktası için ayrı ayrı doğrulanmadı (zaman kısıtı) |
| XXE | PASS (N/A) | Kod tabanında XML parser kullanımı tespit edilmedi (JSON tabanlı API) |
| Open Redirect | PASS (N/A) | Kod tabanında `res.redirect` kullanımı bulunamadı |
| Security Headers | PASS | `helmet()` ile CSP, X-Content-Type-Options, frameAncestors, referrerPolicy: no-referrer aktif; `app.disable('x-powered-by')` (app.ts:88-127) |
| Rate Limit | PASS (genel) / DÜŞÜK RİSK (login'e özel değil) | `customRateLimiter` tüm `/api/` uçlarına IP başına dakikada 100 istek sınırı koyuyor (rateLimiter.ts); login için ayrıca kullanıcı bazlı brute-force kilidi var (authService.ts, 5 deneme/15dk) — ancak login ucu için IP bazlı daha sıkı bir limit yok |
| JWT | PASS | Access/refresh token ayrımı, imzalama `crypto.ts` üzerinden yapılıyor; JWT_SECRET yoksa production'da servis reddediliyor (initAdmin.ts:38) |
| Cookie Security | PASS | CSRF cookie'leri `HttpOnly`, `Secure` (production), `SameSite=Strict` (production) ile ayarlanıyor; production'da `__Host-` prefix kullanılıyor (security.ts:106-119) |
| Session | PASS | Stateless JWT + sunucu tarafı CSRF token eşleştirme; oturum sabitleme (fixation) riski düşük |
| Input Validation | PASS | Zod şemaları (`validators/schemas.ts`) her mutasyon endpoint'inde `validateRequest` ile zorunlu kılınıyor |
| Output Encoding | PASS | Giriş katmanında HTML-escape uygulanıyor (bkz. XSS satırı) |
| Mass Assignment | PASS | Controller'lar `req.body`'yi doğrudan Prisma `data`'ya geçirmiyor; `pickStudentPayload`, whitelist'li `updateData` objeleri (örn. adminController.ts:750-781) kullanılıyor |
| Path Traversal | PASS | `detectDirectoryTraversal` girdi denetimi (security.ts) + dosya yolları `docId` üzerinden sabit template ile oluşturuluyor (`getStoragePath`), kullanıcı girdisinden doğrudan path oluşturulmuyor |
| Clickjacking | PASS | Helmet `frameAncestors: ["'self'"]` (app.ts:118) |
| CORS | PASS | Whitelist tabanlı origin kontrolü, `credentials: true` ile birlikte açık origin listesi (app.ts:95-112) — `*` kullanılmıyor |
| Brute Force | PASS | Kullanıcı bazlı 5 deneme/15 dakika kilidi (authService.ts:48-64) |
| Broken Authentication | PASS | Argon2id parola hash'leme (adminController.ts:684, authService), JWT tabanlı stateless auth |

## Düzeltilen Bulgu

- **`/whatsapp/interpret` ucunda eksik yetkilendirme** → `requirePermission(['READ_WHATSAPP'])` eklendi
  (server/routes/index.ts). Bkz. RBAC_Report.md madde 2.
- **Teslim edilen `.env` dosyasında zayıf/tahmin edilebilir admin şifresi ve statik JWT secret'ları**
  (`Admin12345!` ve sabit metin JWT secret) → rastgele üretilmiş güçlü değerlerle değiştirildi ve
  dosyanın başına production'da asla kullanılmaması gerektiğine dair uyarı eklendi.

## Doğrulanamayan / Ek İnceleme Gereken Alanlar

- SSRF: Dış servis entegrasyonlarının (Google Sheets/Drive, WhatsApp Gateway) tüm kod yollarında
  URL'lerin yalnızca ortam değişkeninden geldiği tam kapsamlı olarak doğrulanmadı.
- Gerçek saldırı trafiği ile dinamik doğrulama (bu ortamda ağ erişimi yok).

**Genel Sonuç:** Kritik veya yüksek seviye OWASP Top 10 açığı statik incelemede tespit edilmedi.
Bir düşük seviye eksik yetkilendirme bulgusu düzeltildi.
