# Performans Doğrulama Raporu (v2)

**Yöntem:** Statik kod taraması (profiler ile canlı ölçüm bu ortamda mümkün değil — çalışan
sunucu/DB yok, bkz. Production_Verification_Report.md).

## Bulgular

### [ORTA RİSK] N+1 yazma deseni — `server/services/sheetsService.ts`

`syncFromSheets` fonksiyonu, Google Sheets'ten gelen her satır için ayrı ayrı `await prisma.X.upsert()`
çağırıyor (satır 41, 83, 117, 169, 255, 297 — Users/Schools/Students/Vehicles/Payments/Contracts).
Yüzlerce/binlerce satırlık bir senkronizasyonda bu, sıralı (sequential) veritabanı round-trip'i anlamına
gelir ve senkronizasyon süresini satır sayısıyla doğrusal olarak uzatır.

**Not:** Bu, klasik N+1 SELECT sorunundan farklı olarak bir *webhook senkronizasyon* akışıdır ve
sıralı yazım bilinçli bir tercih olabilir (bağlantı havuzunu taşırmamak için). Yine de büyük
senkronizasyonlarda gözle görülür yavaşlığa yol açacağından iyileştirme öneriyoruz.

**Öneri:** Satırları örn. 25'erli gruplara bölüp her grubu `Promise.all` ile paralel işlemek, ya da
Prisma'nın `$transaction([...])` toplu işlem API'sini kullanmak.

### Diğer İncelenen Alanlar

| Konu | Durum | Not |
|---|---|---|
| Memory Leak (rate limiter Map) | **PASS** | `rateLimiter.ts` kodunda süresi dolan kayıtları temizleyen bir `sweep()` mekanizması zaten mevcut ve kod içi yorumda önceki bir bellek sızıntısının kasıtlı olarak düzeltildiği belirtiliyor |
| Memory Leak (CSRF token Map) | **PASS** | `security.ts` içinde `sweepExpiredCsrfTokens()` benzer şekilde süresi dolan CSRF token'ları temizliyor |
| Blocking I/O | PASS | Dosya işlemleri `fs.promises` (async) API'si ile yapılıyor (documentService.ts) |
| Circular Dependency | DOĞRULANAMADI | Statik analiz aracı (madge vb.) bağımlılık kurulamadığı için çalıştırılamadı |
| Unused Dependency | DOĞRULANAMADI | `npm ci` çalıştırılamadığı için `depcheck` gibi araçlar kullanılamadı |
| Duplicate Code | KISMEN | Çok sayıda controller'da tekrar eden "if role !== admin → scope al → assertScopedAccess" bloğu var; işlevsel olarak doğru ama bir middleware/decorator'a çıkarılabilir (kod tekrarı, güvenlik açığı değil) |
| Gereksiz await/transaction | PASS | İncelenen dosyalarda gereksiz `await` veya sarmalayıcı transaction tespit edilmedi |

## Sonuç

Kritik veya yüksek seviye performans açığı bulunmadı. Bir orta seviye iyileştirme fırsatı
(sheetsService.ts toplu senkronizasyon) belirlendi ancak mevcut kodu bozma riski nedeniyle (görev
talimatı: "mevcut çalışan yapıyı bozma") bu ortamda otomatik olarak değiştirilmedi — kod incelemesi
sonrası ekibinizin bilinçli bir kararla uygulaması önerilir.
