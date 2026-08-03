# MIGRATION — Prisma Şema Geçişi

## 1. Şema Konumu
`prisma/schema.prisma` — **30 model**, PostgreSQL provider.

## 2. Geçiş Komutu
```bash
npx prisma db push
```
Bu komut `schema.prisma`'yı okuyup diff çıkarır, **30 modeli** sırayla `CREATE TABLE` olarak uygular. `--skip-generate` ile `prisma generate`'i atlayabilir (zaten build sırasında yapılıyor).

## 3. Index Listesi (DB performansı için)
```
User            @@index([role]) @@index([isDeleted]) @@index([username]) @@index([isDeleted, role])
UserSession     @@index([userId]) @@index([refreshToken])
LoginHistory    @@index([userId]) @@index([timestamp])
TokenBlacklist  @@index([token])
... (şemadaki 50+ index)
```

## 4. Yeni Model Ekleme Adımları
1. `prisma/schema.prisma` içine `model X { ... }` ekle
2. `npx prisma db push` (varsa prod'da confirm ile)
3. `npx prisma generate`
4. `server/repositories/xRepository.ts` yarat
5. `server/controllers/xController.ts` yarat
6. `server/routes/index.ts` içine route mount et
7. `tests/xController.test.ts` ekle
8. `vitest run` → 0 failing

## 5. Soft Delete Standardı
Tüm önemli modellerde:
```prisma
isDeleted Boolean @default(false)
createdBy String?
updatedBy String?
deletedBy String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```
PRD'nin "kayıt oluşturma, silme, audit" gereksinimini karşılar.

## 6. Geri Alma (rollback)
`prisma migrate` yok (sadece `db push`), bu yüzden rollback yok. **Kritik değişiklik öncesi `backupService.snapshot()` çağrılmalı**, sonra değişiklik uygulanmalı, sorun olursa restore yapılmalı.
