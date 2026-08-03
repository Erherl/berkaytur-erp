# BACKUP_RESTORE

## 1. Konum
`server/services/backupService.ts`.

## 2. Otomatik Günlük Yedek
Sunucu başlangıcında scheduler kurulur (log: "⏰ [SCHEDULER] Günlük otomatik veritabanı yedekleme sistemi başlatıldı."):
```ts
cron.schedule('0 2 * * *', () => snapshotAllTables())
```
Her gece 02:00 UTC'de tüm modellerden JSON dump alır.

## 3. Manuel Snapshot
```bash
curl -X POST https://berkaytur.onrender.com/api/v1/admin/backup \
  -H 'Authorization: Bearer <admin-token>'
```
`backups/snapshot-<UTC-timestamp>.json` oluşur; tüm tablolar JSON array olarak yazılır.

## 4. Restore
```bash
# Lokal psql
psql $DATABASE_URL < backups/schema.sql
psql $DATABASE_URL -c "INSERT INTO \"User\" SELECT * FROM jsonb_populate_recordset(null::\"User\", $$<JSON>$$);"
```
veya `restoreService.ts` (Admin → Backup → Restore UI) otomatik olarak JSON'dan INSERT seti oluşturur.

## 5. Ne Yedeklenir
- Tüm `User`, `UserSession`, `LoginHistory`, `TokenBlacklist`
- `School`, `Vehicle`, `Route`, `Student`, `Application`, `Attendance`
- `Payment`, `Contract`, `Document`, `AuditLog`
- `Region`, `District`, `KlimaRate`, `RateTable`

## 6. Ne Yedeklenmez
- Yandex/Google maps gelen geocode cache (gerekmez, istemciden tekrar çekilir)
- WhatsApp mesaj geçmişi (auditlog'da kısa özeti var)
