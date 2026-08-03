# IDOR Doğrulama Raporu (v2 - Kod Üzerinden Yeniden Doğrulanmış)

**Yöntem:** Sınırlı sandbox ortamında canlı HTTP isteği ile ID değiştirerek dinamik test
**çalıştırılamadı** (bkz. Production_Verification_Report.md — ağ/DB erişimi yok). Bunun yerine her
kaynak için ID bazlı erişimi kontrol eden kod yolu satır satır izlenerek statik doğrulama yapıldı.
`server/utils/scopeFilter.ts` ve `server/utils/documentAccess.ts` merkezi kapsam (scope) motorunu
oluşturuyor; her controller bunu çağırıp çağırmadığı tek tek kontrol edildi.

| Kaynak | Liste (GET) | Tekil ID (GET/PUT/DELETE) | Kod Kanıtı |
|---|---|---|---|
| Vehicle | scope.allowedVehicleIds ile filtreli | `assertScopedAccess` her update/delete/history/seating çağrısında | vehicleController.ts:9-90 |
| Student | scope.allowedStudentIds ile filtreli | `assertScopedAccess` update/delete öncesi + school/route de ayrıca kontrol ediliyor | adminController.ts:1064-1148 |
| School | scope.allowedSchoolIds | `assertScopedAccess` update/delete öncesi | adminController.ts:992-1059 |
| User | manuel filtre fonksiyonu (satır 640-652) | `assertManageableUserPayload` (rol + kapsam) | adminController.ts:621-859 |
| Payment | scope.allowedStudentIds ile filtreli liste | rollback öncesi ödemenin studentId'si scope'a karşı kontrol ediliyor | paymentController.ts |
| Contract | scope.allowedStudentIds ile filtreli | sign öncesi contract.studentId scope kontrolü | contractController.ts |
| Attendance | scope.allowedStudentIds ile filtreli | saveAttendance içinde body.studentId kontrolü | attendanceController.ts |
| Application | scope.allowedSchoolIds ile filtreli | update öncesi application.schoolId kontrolü | applicationController.ts |
| Document | `buildDocumentAccessWhere` ile DB sorgusuna gömülü filtre (WHERE seviyesinde, uygulama katmanında değil) | `assertDocumentScopeAccess` / getDocumentById scope'suz kayıt bulamaz | documentAccess.ts, documentService.ts |
| Route (servis güzergahı) | scope.allowedRouteIds öğrenci/araç ataması üzerinden hesaplanıyor | ayrı bir CRUD ucu yok, öğrenci/araç uçları üzerinden dolaylı korunuyor | scopeFilter.ts |
| Notification / Announcement | Bu isimlerde ayrı bir REST route bulunamadı (routes/index.ts'de yok) | — | — |
| Address | Ayrı bir kaynak değil, `applications/validate-address` genel adres doğrulama ucu (veri sahiplik kavramı yok, IDOR uygulanamaz) | — | — |

## Kritik Gözlem: Parent (Veli) Kapsamı

`getParentScope` (scopeFilter.ts:36-68), veli kullanıcı ID'sinin `parent_<studentId>` formatında
olduğunu varsayıyor ve doğrudan bu ID'den öğrenciyi çekiyor. Bu tasarımda veli hesabı ID'si zaten
öğrenci ID'sine bağlı olduğundan, yetkisiz bir kullanıcı token'ı manipüle etse bile scope hesaplama
DB'den bağımsız çalışmıyor — her istekte öğrenci gerçekten var mı ve silinmemiş mi (`isDeleted:
false`) diye tekrar sorgulanıyor. **[PASS]** — statik kod incelemesinde IDOR açığı bulunamadı.

## Document erişiminde önemli iyi pratik

`buildDocumentAccessWhere` erişim filtresini SQL WHERE koşuluna gömüyor (uygulama katmanında sonradan
filtrelemek yerine). Bu, "önce tüm kayıtları çek, sonra filtrele" antipattern'ini önlüyor ve toplu veri
sızıntısı riskini azaltıyor. **[PASS]**

## Sonuç

İncelenen 8 kaynak tipinde (Vehicle, Student, School, User, Payment, Contract, Attendance,
Document, Application) ID değiştirme yoluyla yetkisiz erişimi engelleyen merkezi ve tutarlı bir
kapsam kontrolü mevcut. Kritik/yüksek seviye IDOR açığı **statik incelemede tespit edilmedi.**
Ancak bu sonuç gerçek HTTP trafiği ile doğrulanmamıştır — bkz. Production_Verification_Report.md'deki
kısıt notu. Gerçek dinamik penetrasyon testi önerilir.
