# SEED — Veritabanı Tohumlama

## 1. Konum
`prisma/seed.ts` (48 satır). `package.json`'da `seed = tsx prisma/seed.ts`.

## 2. Çalıştırma
```bash
npm run seed
```
Komut internal olarak:
1. `ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL` env'den okunur.
2. `prisma.user.findFirst({ where:{ username: ADMIN_USERNAME } })`.
3. Yoksa argon2 ile hash'lenip `User` tablosuna INSERT edilir (`role:"admin"`, `mustChangePassword:true`).
4. Varsa password update edilir, `mustChangePassword` resetlenir.

## 3. Çıktı
```
prisma:info  Upserted admin user (id=...)
prisma:info  Database seeded.
```

## 4. Hata Durumları
- `DATABASE_URL` yok → "⚠️ [DATABASE] DATABASE_URL ortam değişkeni tanımlanmamış" → Render dashboard'dan set et.
- Argon2 native binding hatası → `crypto.ts` otomatik olarak basic hash'e fallback eder (DEV-only; production'da bunu loglamaz çünkü sıkılaştırılmış argona2 build vardır).

## 5. Diğer Seedler
Production'da tek seed admin kullanıcısıdır. Diğer roller (manager / coordinator / driver / hostess / accounting / parent) Admin Dashboard → Personel modülünden admin tarafından eklenir ve rol atamaları `assignedSchools / assignedAreas / assignedVehicles` JSON array'leri üzerinden yapılır. Şu an için ek bir örnek veri seed'i eklenmemiştir — PRD'de "production'da salt admin yeterli" kararı korunmuştur.
