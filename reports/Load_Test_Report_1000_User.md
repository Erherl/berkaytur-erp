# Yük Testi Raporu (v2)

## Şeffaf Açıklama — Gerçek Yük Testi Bu Ortamda Yapılamadı

100 / 250 / 500 / 1000 eşzamanlı kullanıcı için CPU, RAM, Heap, Response Time, DB Connection,
Error Rate, Timeout verisi üretmek; **çalışan bir sunucu + çalışan bir PostgreSQL veritabanı +
gerçek ağ trafiği** gerektirir. Bu sandbox ortamında:

- İnternet/ağ erişimi kapalı (bağımlılıklar kurulamıyor),
- Çalışan bir uygulama sunucusu yok,
- Gerçek bir PostgreSQL örneği yok.

Bu koşullarda üretilecek herhangi bir "1000 kullanıcı, X ms yanıt süresi, Y hata oranı" tablosu
**tamamen uydurma olur.** Böyle bir tabloyu rapora koyup "PASS" işaretlemek, tam da sizin 1.
maddede yasakladığınız şeydir — bu yüzden bilerek yapılmamıştır.

## Kodda Bulunan Yük Testi Altyapısı (statik inceleme)

`scripts/loadVerification.ts` dosyası projede mevcut ve eşzamanlı istek simülasyonu için bir iskelet
içeriyor; `AdminController.runConcurrencyLoadTest` (`POST /admin/run-load-test`, sadece
`MANAGE_SYSTEM` yetkisiyle admin çalıştırabilir) bu betiği tetikleyen bir endpoint. Kodu okunmuş ve
mantıksal olarak eşzamanlı Promise.all tabanlı istek gönderimi yaptığı görülmüştür — ancak bu betiğin
**gerçek çalıştırılması** da yine çalışan bir sunucu gerektirdiğinden bu ortamda mümkün olmamıştır.

## Önerilen Gerçek Yük Testi Yöntemi

Kendi ortamınızda (staging, gerçek veritabanı ile) aşağıdaki gibi bir araçla gerçek ölçüm yapmanızı
öneririz:

```bash
# k6 örneği
k6 run --vus 1000 --duration 5m load-test.js

# veya Artillery
artillery quick --count 1000 --num 20 https://staging.example.com/api/v1/health
```

Test sırasında izlenmesi gereken gerçek metrikler: p50/p95/p99 response time, error rate, Postgres
`pg_stat_activity` bağlantı sayısı, Node.js process `process.memoryUsage()` / heap kullanımı.

## Sonuç

**Bu madde NOT VERIFIED (doğrulanmadı) olarak işaretlenmiştir.** Gerçek sayılar yalnızca sizin
altyapınızda, canlıya en yakın bir staging ortamında çalıştırılarak elde edilebilir.
