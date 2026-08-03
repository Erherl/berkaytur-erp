# Kapsam (Scope) Güvenliği Raporu (v2)

Bu rapor IDOR_Report.md ile yakından ilişkilidir; IDOR raporu "ID değiştirerek erişim" senaryosuna,
bu rapor ise merkezi kapsam (scope) hesaplama motorunun kendisinin doğruluğuna odaklanır.

## `getResourceScope` (server/utils/scopeFilter.ts) — Doğrulama

- **admin** → `isGlobal: true`, tüm kısıtlar bypass edilir (satır 91-98) — beklenen davranış.
- **parent** → kullanıcı ID'si `parent_<studentId>` formatından çözülüyor, öğrenci DB'den
  `isDeleted: false` şartıyla yeniden doğrulanıyor (satır 36-68) — istemci tarafından gönderilen
  hiçbir veriye güvenilmiyor, ID token içinden geliyor.
- **diğer roller (manager/coordinator/driver/hostess/operation)** → kullanıcının atanmış okul/araç/
  sürücü/hostes listelerinden yola çıkarak `Route` tablosu üzerinden izin verilen `route/school/
  vehicle/student` ID kümeleri DB sorgusuyla hesaplanıyor (satır 100-152) — istemciden gelen scope
  bilgisi yok, tamamı sunucu tarafında ve DB'den türetiliyor. Bu, scope sahteciliğini
  (client-supplied scope spoofing) mimari olarak imkansız kılıyor. **PASS**

## Belge (Document) Kapsamı — Ayrı Model

`buildDocumentAccessWhere` (documentAccess.ts) driver/hostess için `ownerUserId` bazlı katı
sahiplik uyguluyor (sadece kendi yüklediği evrak), diğer roller için okul/araç/öğrenci kapsamına
göre OR koşulu kuruyor. Kapsam boşsa (`orClauses.length === 0`) sorgu bilerek imkansız bir ID
(`__NO_DOCUMENT_ACCESS__`) ile filtreleniyor — "kapsam yoksa varsayılan olarak her şeyi göster"
gibi tehlikeli bir varsayılan davranış yok. **PASS**

## Sonuç

Kapsam hesaplama motoru istemci girdisine güvenmiyor, tüm kritik ID kümelerini sunucu tarafında
DB'den türetiyor ve boş kapsam durumunda "kapalı liste" (deny-by-default) yaklaşımını kullanıyor.
Statik incelemede kritik/yüksek risk bulunmadı.
