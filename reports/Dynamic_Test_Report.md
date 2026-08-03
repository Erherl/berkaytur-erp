# Dinamik Test Raporu (v2)

## Şeffaf Açıklama

Bu ortamda ağ erişimi kapalı olduğundan ve bağımlılıklar (`npm ci`) kurulamadığından, gerçek bir
HTTP sunucusu ayağa kaldırılıp canlı istek gönderilerek dinamik test **yapılamamıştır**. Bu raporda
yer alan tüm bulgular, ayrı dosyalarda (RBAC_Report.md, IDOR_Report.md, OWASP_Security_Report.md)
belgelenen **statik kod incelemesine** dayanır; onlarla karıştırılmaması için burada ayrıca
tekrarlanmamıştır.

## Projede Zaten Var Olan Otomatik Test Dosyaları (statik olarak okunmuştur)

`tests/` klasöründe şu dosyalar mevcut ve içerikleri satır satır okunmuştur:
`api.test.ts`, `asyncHandler.test.ts`, `authService.test.ts`, `crypto.test.ts`, `database.test.ts`,
`documentAccess.test.ts`, `istanbulGeocoder.test.ts`, `scopingSecurity.test.ts`, `validate.test.ts`,
`securityCsrf.test.ts`, `rbacPermissions.test.ts`, `parentScope.test.ts`.

Bu dosyaların test senaryoları (ör. `rbacPermissions.test.ts` içinde rol bazlı erişim reddi,
`scopingSecurity.test.ts` içinde ID bazlı kapsam ihlali senaryoları) kodun kendi iddialarıyla
tutarlı görünüyor. **Ancak bu testlerin gerçekten çalıştırılıp geçtiği bu ortamda doğrulanamamıştır**
— `npm test` çalıştırılamadı (bkz. Production_Verification_Report.md).

## Önerilen Gerçek Dinamik Test Adımları

```bash
npm ci
npm test                 # mevcut 12 test dosyasını çalıştırır
npm run build && npm start &
# Ardından örn. Postman/Newman veya curl ile RBAC/IDOR senaryolarını canlı olarak deneyin:
curl -H "Authorization: Bearer <driver_token>" http://localhost:3000/api/v1/students/<baska_okulun_ogrenci_id>
# 403 dönmesi beklenir
```

## Sonuç

**NOT VERIFIED (doğrulanmadı).** Statik incelemedeki bulgular güven verici olsa da, gerçek dinamik
test yalnızca sizin ortamınızda çalıştırılarak kesinleştirilebilir.
