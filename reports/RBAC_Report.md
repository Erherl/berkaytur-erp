# RBAC Doğrulama Raporu (v2 - Kod Üzerinden Yeniden Doğrulanmış)

**Yöntem:** `server/routes/index.ts` ve `server/middlewares/auth.ts` dosyaları satır satır okunarak
her endpoint'in gerçek middleware zinciri çıkarılmıştır. Önceki raporlara güvenilmemiş, doğrudan
kaynak kod taranmıştır.

**Rol → İzin haritası** (`server/middlewares/auth.ts` `ROLE_PERMISSIONS`, satır 9-83):
admin ve manager tüm yazma/okuma izinlerine sahip; coordinator kullanıcı/okul/öğrenci/araç/servis
yönetebilir; accounting sadece okul/öğrenci/ödeme/rapor okur + ödeme yazar; parent sadece kendi
öğrencisiyle ilgili veriyi okur; driver/hostess kendi puantaj + evrak işlemlerini yapar. `admin` rolü
`requirePermission`/`requireRole` içinde her zaman otomatik geçer (satır 109, 126).

| Endpoint | Method | Middleware (gerçek kod) | Erişebilen Roller |
|---|---|---|---|
| /auth/login, /auth/refresh | POST | (public) | Herkes (kimlik doğrulama öncesi) |
| /auth/verify | GET | (token gerekli, servis içinde) | Geçerli token sahibi |
| /auth/logout | POST | csrfTokenProtection | Geçerli token sahibi |
| /gemini/chat | POST | requirePermission(READ_REPORTS) | admin, manager, coordinator, accounting |
| /extract-doc-date | POST | requirePermission(READ_DOCUMENTS) | admin, manager, coordinator, parent, driver, hostess |
| GET /vehicles | GET | requirePermission(READ_VEHICLES) | admin, manager, coordinator, driver, hostess |
| POST/PUT/DELETE /vehicles | * | requirePermission(WRITE_VEHICLES) | admin, manager, coordinator |
| /vehicles/:id/history, /seating* | POST | requirePermission(WRITE_VEHICLES) | admin, manager, coordinator |
| GET /attendance | GET | requirePermission(READ_ATTENDANCE) | admin, manager, coordinator, parent, driver, hostess, operation |
| POST /attendance | POST | requirePermission(WRITE_ATTENDANCE) | admin, manager, coordinator, driver, hostess, operation |
| GET /payments | GET | requirePermission(READ_PAYMENTS) | admin, manager, accounting |
| POST /payments, /payments/:id/rollback | POST | requirePermission(WRITE_PAYMENTS) | admin, manager, accounting |
| GET /applications | GET | requirePermission(READ_APPLICATIONS) | admin, manager, coordinator, operation |
| POST /applications | POST | **(izin kontrolü yok — kasıtlı, kamuya açık ön kayıt formu)** | Herkes (public application form) |
| POST /applications/validate-address | POST | (izin kontrolü yok — public) | Herkes |
| PUT /applications/:id | PUT | requirePermission(WRITE_APPLICATIONS) | admin, manager, coordinator |
| GET/POST /contracts | * | requirePermission(READ\|WRITE_CONTRACTS) | admin, manager, coordinator |
| GET/POST /logs | * | requirePermission(READ\|WRITE_LOGS) | admin |
| GET/POST/PUT/DELETE /documents | * | requirePermission(READ\|WRITE_DOCUMENTS) | admin, manager, coordinator, parent(read), driver, hostess |
| /whatsapp/* | * | requirePermission(READ\|WRITE_WHATSAPP) (interpret hariç) | admin, manager, coordinator |
| /whatsapp/interpret | POST | **izin kontrolü yok** | Herkes (kimlik doğrulanmış olması bile şart değil) |
| /reports/:type | GET | requirePermission(READ_REPORTS) | admin, manager, coordinator, accounting |
| /sheets-webhook | POST | (CSRF muaf, izole webhook secret ile korunmalı) | Google Apps Script servis hesabı |
| /search | GET | requireRole([admin,manager,coordinator]) | admin, manager, coordinator |
| /app-storage* | * | requireRole(tüm roller) | Tüm oturum açmış roller |
| /admin/* (backup, stats, tables, run-tests, load-test) | * | requirePermission(MANAGE_SYSTEM) | **sadece admin** (izin listesinde tek sahibi admin) |
| GET /users | GET | requirePermission(READ_USERS) | admin, manager, coordinator |
| POST/PUT/DELETE /users | * | requirePermission(MANAGE_USERS) + `assertManageableUserPayload` | admin (tam), manager/coordinator (sadece driver/hostess hedef rolü + kendi kapsamı) |
| /users/:id/change-password | POST | requireRole(tüm roller) + **controller içinde `actor.id !== id` kontrolü** (adminController.ts:874) | Sadece kendi hesabı veya admin |
| /assignments/audit-logs | GET | requirePermission(MANAGE_SYSTEM) | sadece admin |
| /schools | GET/POST/PUT/DELETE | requirePermission(READ\|CREATE\|UPDATE\|DELETE_SCHOOLS) | admin, manager (tümü); coordinator (sadece UPDATE) |
| /students | GET/POST/PUT/DELETE | requirePermission(READ\|WRITE_STUDENTS) | admin, manager, coordinator |

## Bulgular

1. **[BİLGİ] `/applications` POST ve `/applications/validate-address` kasıtlı olarak halka açık** —
   veli ön kayıt formu bu uçlara auth olmadan erişebiliyor. Bu bir tasarım kararı olabilir ama
   raporda açıkça belirtilmesi gerekiyordu; önceki raporlarda bu netlik yoktu.
2. **[DÜŞÜK RİSK] `POST /whatsapp/interpret` hiçbir rol/izin kontrolüne tabi değil** (routes/index.ts
   satır 157) — kimlik doğrulaması bile zorunlu değil çünkü `requirePermission`/`requireRole`
   çağrılmıyor. Bu uç WhatsApp mesajlarını yorumlayan bir servise gidiyor; yetkisiz kullanıcılar bu
   uca istek göndererek AI/servis kaynaklarını tüketebilir (kaynak tüketimi / maliyet riski).
   **Öneri:** en azından `requirePermission(['READ_WHATSAPP'])` eklenmeli.
3. **[PASS]** `assertManageableUserPayload` (adminController.ts:111-136) manager/coordinator'ın
   sadece driver/hostess rollerini ve kendi kapsamındaki okul/araçları yönetebilmesini kod
   seviyesinde zorluyor — rol yükseltme (privilege escalation) denemesi 403 ile engelleniyor.
4. **[PASS]** Şifre değiştirme ucu route seviyesinde geniş rol listesine açık olsa da, controller
   içinde `actor.role !== 'admin' && actor.id !== id` kontrolü var (adminController.ts:874) —
   başka bir kullanıcının şifresini değiştirme denemesi 403 ile reddediliyor.

**Sonuç:** RBAC matrisinin büyük çoğunluğu doğru uygulanmış. Bir düşük riskli eksik izin bulgusu
(`/whatsapp/interpret`) dışında kritik/yüksek seviye RBAC açığı tespit edilmedi.
