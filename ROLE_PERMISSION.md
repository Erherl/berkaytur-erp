# ROLE_PERMISSION — Rol Matrisi

## 1. Roller (User.role)
- **admin** — en yüksek yetki
- **manager** — proje müdürü
- **coordinator** — okul sorumlusu
- **accounting** — muhasebe
- **parent** — veli
- **driver** — şoför
- **hostess** — hostes
- **operation** — operasyon yardımcısı

## 2. Endpoint Matrisi

| Endpoint (prefix) | admin | manager | coordinator | accounting | parent | driver | hostess | operation |
|---|---|---|---|---|---|---|---|---|
| `GET /api/v1/admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/v1/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET/POST /api/v1/schools` | ✅ | ✅ (sadece assigned) | ✅ (assigned) | ❌ | ❌ | ❌ | ❌ | ✅ (read) |
| `GET/POST /api/v1/vehicles` | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ | ✅ (assigned) | ❌ | ✅ |
| `GET/POST /api/v1/payments` | ✅ | ✅ (read) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/v1/contracts` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/v1/documents` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /api/v1/parent/students` | ❌ | ❌ | ❌ | ❌ | ✅ (sadece kendi) | ❌ | ❌ | ❌ |
| `POST /api/v1/attendance` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (kendi) | ✅ (kendi) | ❌ |
| `POST /api/v1/whatsapp/send` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 3. Field-Level Scoping (`scopeFilter.ts`)
`assignedSchools`, `assignedAreas`, `assignedVehicles` JSON array'leri ile "user-scope" filtresi yapılır:
```ts
if (user.role === 'coordinator') {
  where.schoolId = { in: user.assignedSchools }
}
```

## 4. Yetkisiz Erişim Yanıtı
`POST /api/v1/admin/users` admin değilse → **403** + `{ error:'Insufficient permissions' }`.

## 5. Testler
`tests/api.test.ts` 5 senaryoda RBAC'yi doğrular:
1. admin GET /admin → 200
2. manager GET /admin → 403
3. driver GET /admin → 403
4. invalid JWT → 401
5. refresh reuse → 401 (rotation iptal)
