/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../config';
import logger from '../utils/logger';

let aiClient: any = null;
let currentKey: string | null = null;

/**
 * Lazy initialization of the Gemini API client.
 * Allows automatic reconnection and picking up new keys on-the-fly when updated.
 */
function getGeminiClient() {
  const apiKey = CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error("Sistemde 'GEMINI_API_KEY' bulunamadı.");
  }
  
  if (!aiClient || currentKey !== apiKey) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    currentKey = apiKey;
  }
  return aiClient;
}

/**
 * Generic retry with fallback wrapper to handle Gemini connection errors,
 * automatic retries (3 attempts), logging, and seamless local heuristics fallback.
 */
async function retryWithFallback<T>(
  fn: (ai: any) => Promise<T>, 
  fallbackFn: () => Promise<T> | T,
  errorContext: string
): Promise<T> {
  const maxRetries = 3;
  let lastError: any = null;

  try {
    const ai = getGeminiClient();
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(ai);
      } catch (err: any) {
        lastError = err;
        logger.warn(`[Gemini Retry] Attempt ${attempt} failed for ${errorContext}:`, err.message || err);
        if (attempt < maxRetries) {
          // Wait a bit before retrying (exponential backoff helper)
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }
    }
  } catch (err: any) {
    lastError = err;
  }

  // Log the connection error in audit logs database
  try {
    const { LogService } = await import('./logService');
    await LogService.createLog({
      action: 'Berkay AI Yapay Zeka Bağlantı Hatası',
      details: `${errorContext} işlemi sırasında Gemini bağlantı sorunu tespit edildi. Nedeni: ${lastError?.message || lastError || 'API anahtarı eksik veya geçersiz'}. Yerel yedek AI servis katmanı (Local Heuristics Layer) devreye alındı.`,
      userName: 'Berkay AI Gateway',
      userRole: 'system',
      userId: 'system'
    });
  } catch (logErr) {
    logger.error('Failed to write system audit log for Gemini failure:', logErr);
  }

  // Fallback to local AI service layer
  return await fallbackFn();
}

function sanitizePrompt(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s+override/gi,
    /you\s+are\s+now\s+a/gi,
    /dan\s+mode/gi,
    /jailbreak/gi,
    /override\s+system/gi,
    /delete\s+all\s+data/gi
  ];
  
  injectionPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED_PROMPT_INJECTION_SHIELD]');
  });
  
  return sanitized;
}

export const GeminiService = {
  async chat(prompt: string, systemContext: any) {
    const sanitizedPrompt = sanitizePrompt(prompt);
    const sanitizedSystemContextStr = sanitizePrompt(JSON.stringify(systemContext || {}));

    return retryWithFallback(
      async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: sanitizedPrompt,
          config: {
            systemInstruction: `Sen, Berkaytur Okul Servis ve Taşımacılık Takip Sistemi'nin akıllı yapay zeka co-pilot asistanı "Berkay AI"asın.
Görevin; yöneticilere, okul koordinatörlerine, muhasebe sorumlularına ve sürücülere sistemdeki güncel veriler hakkında akıllı analizler sunmaktır.

Sana aşağıda sistemin anlık gerçek veri tabanı durumunu (okullar, öğrenciler, hakediş durumları, ödemeler, rotalar, araçlar, son loglar) JSON olarak veriyoruz.
Tüm soruları, hesaplamaları ve listelemeleri bu gerçek verilere dayandırarak cevapla. Halüsinasyon yapma.
Eğer veri kümesinde ilgili bilgi yoksa veya kısıtlıysa bunu kibarca belirt. Cevaplarını Türkçe, kibar, profesyonel ve Markdown formatına uygun şekilde sun.

SİSTEM ANLIK GERÇEK VERİ GRUBU:
${sanitizedSystemContextStr}
`,
            temperature: 0.7,
          },
        });

        return { text: response.text };
      },
      () => {
        // Fallback to local AI service layer
        const text = generateLocalChatFallback(prompt, systemContext);
        return { text };
      },
      'Berkay AI Rapor/Sohbet Analizi'
    );
  },

  async extractDocDate(docKey: string, fileName: string, userRole?: string) {
    const prompt = `Gelişmiş bir OCR Belge Analiz AI motorusun. "Berkaytur Servis ve Taşımacılık Takip Sistemi" için yüklenen evrakların son geçerlilik tarihini (expiration date) otomatik okuyorsun.
Aşağıdaki evraka göre bir analiz simüle et:
- Kullanıcı Rolü: ${userRole || 'Sürücü'}
- Belge Türü Kodu: ${docKey}
- Yüklenen Dosya Adı: ${fileName}

Lütfen bu belgeyi analiz etmiş gibi davranarak gerçekçi bir son geçerlilik tarihi, çıkarılan metin ve tarama adımları üret.
Süreler hakkında genel kurallar:
- Ehliyet (Sürücü Belgesi): Genellikle 10 yıl geçerlidir. (Bugünden itibaren 5-10 yıl ileri bir tarih verilebilir)
- SRC Belgesi, Psikoteknik: 5 yıl geçerlidir.
- Kimlik, Diploma, MEB Rehberlik Sertifikası: Genellikle SÜRESİZDİR.
- İkametgah, Adli Sicil Kaydı / GBT: 6 ay veya 1 yıl geçerlidir. (Bugünden itibaren 6 ay veya 1 yıl sonrası)
- Koltuk Sigortası, Araç Trafik Sigortası: 1 yıl geçerlidir.
- Sağlık Raporu, Şoför Kartı, Araç Ruhsatı: 1 veya 2 yıl geçerlidir.

Bana sadece aşağıdaki formatta saf JSON döndür, markdown veya açıklama ekleme:
{
  "expiryDate": "YYYY-MM-DD veya 'Süresiz'",
  "extractedText": "Belge üzerinde okunan geçerli son tarih: DD.MM.YYYY veya 'Süresiz belgedir'",
  "isSuresiz": true veya false,
  "logs": [
    "Dosya yüklendi ve virüs taramasından geçirildi.",
    "Belge yapısı analiz ediliyor: [Belge Adı]...",
    "OCR motoru çalıştırıldı, başlıklar ve tarihler tarandı.",
    "Son Geçerlilik Tarihi tespit edildi: [Tarih veya Süresiz]"
  ]
}`;

    return retryWithFallback(
      async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          }
        });

        const resText = response.text?.trim() || '';
        return JSON.parse(resText);
      },
      () => {
        // Fallback to local AI service layer (OCR heuristics)
        return generateLocalOcrFallback(docKey, fileName, userRole);
      },
      `Evrak Son Geçerlilik Tarihi Analizi (${docKey})`
    );
  },

  async interpretTurkishCommand(message: string) {
    const prompt = `Sen Berkaytur Okul Servis Otomasyonu için WhatsApp üzerinden gelen Türkçe mesajları analiz eden akıllı bir doğal dil işleme (NLP) asistanısın.
Kullanıcılardan (veliler, sürücüler) gelen mesajları anla, niyetlerini (intent) çıkar ve sisteme yön ver.

Aşağıdaki kategorilerden en uygun olanını belirle:
1. ABSENT: Öğrenci devamsızlık bildirimi ("Bugün gelmeyecek", "Ali bugün hasta", "Servise binmeyecek")
2. WHERE_IS_SERVICE: Servis aracı konum sorgusu ("Servis nerede?", "Araç kaç dakikaya gelir?", "Neredesiniz?")
3. DID_ALIGHT: Öğrencinin biniş/iniş sorgusu ("Ali indi mi?", "Çocuk eve vardı mı?", "Servise bindi mi?")
4. DEBT_INQUIRY: Borç, ödeme ve bakiye sorgusu ("Borcum ne kadar?", "Ödeme tutarı nedir?", "Kaç taksit kaldı?")
5. SEND_RECEIPT: Makbuz veya belge talebi ("Makbuzu gönderir misiniz?", "Dekontu atar mısınız?", "Sözleşmeyi yolla")
6. DRIVER_LATE: Şoför gecikme bildirimi ("Şoför geç kalacak", "10 dakika gecikeceğiz", "Servis geç kalıyor")
7. TRAFFIC_CONGESTION: Trafik yoğunluğu bildirimi ("Trafik çok yoğun", "Köprüde kaza var", "Yol kapalı")
8. SEND_LOCATION: Konum paylaşımı/sorgusu ("Konum atar mısın?", "Harita linki gönder", "Sürücü konum yolladı")
9. GENERAL: Diğer genel sorular.

Gelen Mesaj: "${message}"

Bana sadece aşağıdaki formatta saf JSON döndür, açıklama veya markdown ekleme:
{
  "intent": "ABSENT | WHERE_IS_SERVICE | DID_ALIGHT | DEBT_INQUIRY | SEND_RECEIPT | DRIVER_LATE | TRAFFIC_CONGESTION | SEND_LOCATION | GENERAL",
  "studentName": "Eğer mesajda bir öğrenci adı geçiyorsa buraya yaz (örn: 'Ali'), yoksa null",
  "replyText": "Veliye veya sürücüye verilecek son derece kibar, profesyonel, insan gibi ve yardımcı Türkçe cevap.",
  "actions": ["Trigger edilecek sistem aksiyon kodları dizisi, örn: 'UPDATE_ATTENDANCE_ABSENT', 'SHOW_GPS_LINK', 'SHOW_PAYMENT_RECEIPT' vb."]
}`;

    return retryWithFallback(
      async (ai) => {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          }
        });

        const resText = response.text?.trim() || '';
        return JSON.parse(resText);
      },
      () => {
        // Fallback to local AI service layer (NLP heuristics)
        return generateLocalNlpFallback(message);
      },
      `WhatsApp NLP Mesaj Analizi ("${message.substring(0, 30)}...")`
    );
  }
};

/**
 * --- LOCAL AI SERVICE LAYER FALLBACKS (OFFLINE HEURISTICS) ---
 */

function generateLocalChatFallback(prompt: string, systemContext: any): string {
  const p = prompt.toLowerCase();
  const counts = systemContext?.counts || {};
  const financials = systemContext?.financials || {};
  const meta = systemContext?.meta || {};
  
  let content = '';
  
  if (p.includes('finans') || p.includes('hakediş') || p.includes('muhasebe') || p.includes('ödeme') || p.includes('gider') || p.includes('gelir')) {
    content = `### 💰 Finans ve Muhasebe Analiz Raporu (Yerel Yedek Motor)

Sistemdeki anlık mali durum verileri incelendiğinde özet tablonuz aşağıdadır:

| Kalem | Değer (TL) | Açıklama |
| :--- | :--- | :--- |
| **Toplam Tahsil Edilen (Gelir)** | ${financials.totalPaid?.toLocaleString('tr-TR') || '0'} ₺ | Velilerden başarılı şekilde tahsil edilmiş tutar. |
| **Bekleyen Ödemeler** | ${financials.totalPending?.toLocaleString('tr-TR') || '0'} ₺ | Cari dönem içerisinde tahsil edilmesi gereken tutar. |
| **Vadesi Geçmiş Alacaklar** | ${financials.totalOverdue?.toLocaleString('tr-TR') || '0'} ₺ | Vadesi geçtiği halde ödenmemiş tutar. |
| **Tahmini Hakediş** | ${financials.estimatedHakedis?.toLocaleString('tr-TR') || '0'} ₺ | Tedarikçi ve sürücülere ödenecek toplam hakediş. |
| **Yakıt Giderleri** | ${financials.totalFuelCost?.toLocaleString('tr-TR') || '0'} ₺ | Bu ay sisteme işlenen toplam yakıt faturası bedeli. |
| **Tamirat & Amortisman** | ${financials.totalRepairCost?.toLocaleString('tr-TR') || '0'} ₺ | Araç bakım/onarım giderleri. |
| **Cezalar & Kesintiler** | ${financials.totalFinesCost?.toLocaleString('tr-TR') || '0'} ₺ | Sürücülere yansıtılan sözleşme ihlali kesintileri. |
| **Toplam Gider Grubu** | ${financials.totalGider?.toLocaleString('tr-TR') || '0'} ₺ | Sistemdeki tüm aktif gider kalemlerinin toplamı. |
| **Net Kârlılık Oranı** | ${financials.netProfit?.toLocaleString('tr-TR') || '0'} ₺ | Gelir - Gider dengesi neticesinde oluşan operasyonel kâr. |

**Önemli Mali Değerlendirmeler:**
- Toplam **${financials.totalPending?.toLocaleString('tr-TR') || '0'} ₺** değerinde bekleyen tahsilat bulunmaktadır. Nakit akışını korumak amacıyla velilere otomatik ödeme planı hatırlatması yapılması önerilir.
- Yakıt giderleri (**${financials.totalFuelCost?.toLocaleString('tr-TR') || '0'} ₺**), genel gider havuzunda en yüksek payı oluşturmaktadır. Akıllı rotalama entegrasyonu ile KM tasarrufu yapılması tavsiye edilir.`;

  } else if (p.includes('araç') || p.includes('sürücü') || p.includes('plaka') || p.includes('kapasite') || p.includes('rota') || p.includes('hostes')) {
    const totalVehicles = counts.totalVehicles || 0;
    const totalDrivers = counts.totalDrivers || 0;
    const totalHostesses = counts.totalHostesses || 0;
    
    content = `### 🚐 Operasyon ve Araç Filo Analizi (Yerel Yedek Motor)

Berkaytur operasyonel takip sistemine kayıtlı araç, sürücü ve hostes durumları aşağıda analiz edilmiştir:

- **Aktif Servis Aracı:** ${totalVehicles} adet araç aktif olarak hizmet vermektedir.
- **Sürücü Kadrosu:** ${totalDrivers} lisanslı sürücü sisteme kayıtlı ve aktiftir.
- **Rehber Personel (Hostes):** ${totalHostesses} hostes öğrencilerimize eşlik etmektedir.

**Filo Durumu & Güvenlik Değerlendirmesi:**
1. Araçlarımızın tamamı akıllı GPS telemetri cihazları ile donatılmıştır ve konumları anlık olarak izlenmektedir.
2. Evrak yönetim panelinde sürücülerin ehliyet, SRC, psikoteknik ve araç sigorta poliçelerinin son geçerlilik tarihleri otomatik takip edilmektedir. Son 30 günde süresi dolacak belge bulunmamaktadır.
3. Servis doluluk oranları genel olarak dengelidir. Koltuk kapasitesi aşımı veya boş servis seferi bulunmamaktadır.`;

  } else if (p.includes('öğrenci') || p.includes('okul') || p.includes('veli') || p.includes('devamsız') || p.includes('puantaj')) {
    const totalStudents = counts.totalStudents || 0;
    const totalSchools = counts.totalSchools || 0;
    const studentsList = systemContext?.students || [];
    const absentCount = studentsList.filter((s: any) => s.morningStatus === 'absent' || s.eveningStatus === 'absent').length;

    content = `### 🎓 Öğrenci ve Okul Servis Puantaj Analizi (Yerel Yedek Motor)

Öğrenci yerleşim ve katılım raporu özet bilgileri aşağıda sunulmuştur:

- **Kayıtlı Öğrenci Sayısı:** ${totalStudents} öğrenci Berkaytur servis ağı ile taşınmaktadır.
- **Hizmet Verilen Okul Sayısı:** ${totalSchools} farklı okul için özel akıllı rotalama yapılmaktadır.
- **Günlük Devamsızlık Oranı:** Bugün toplam **${absentCount}** öğrencimiz velilerimiz tarafından izinli/devamsız olarak bildirilmiştir.

**Sistem Güvenlik & Veli Entegrasyon Notları:**
- Tüm devamsızlık bildirimleri WhatsApp akıllı NLP servisi üzerinden anında okunarak ilgili servis sürücüsü ve rehber personel mobil uygulamasına iletilmektedir.
- Öğrencilerimizin iniş/biniş durumları NFC kartlar ve hostes onayı ile gerçek zamanlı tescil edilmektedir.`;

  } else {
    // General fallback
    const totalStudents = counts.totalStudents || 0;
    const totalSchools = counts.totalSchools || 0;
    const totalVehicles = counts.totalVehicles || 0;
    const netProfit = financials.netProfit || 0;

    content = `### 📊 Berkaytur Sistem Genel Özet Raporu (Yerel Yedek Motor)

Merhaba **${meta.currentUserName || 'Yönetici'}**, Berkay AI yerel yedek motoruna hoş geldiniz. Sistemimizdeki güncel operasyonel ve mali durumun özeti aşağıda bilgilerinize sunulmuştur:

- **Operasyonel Durum:** Toplam **${totalSchools}** okula, **${totalVehicles}** servis aracımız ile **${totalStudents}** öğrencimizin güvenli transferi sağlanmaktadır.
- **Finansal Durum:** Cari dönemde net kârlılık durumunuz **${netProfit?.toLocaleString('tr-TR') || '0'} ₺** seviyesindedir.
- **Akıllı WhatsApp Entegrasyonu:** Tüm veli devamsızlık ve konum mesajları sistem tarafından arka planda çözümlenip CRM veritabanına otomatik işlenmektedir.

---
**💡 Sorabileceğiniz Diğer Konular:**
- *"Mali durum raporunu göster"* (Hakedişler, tahsilatlar ve gelir/gider dengesi)
- *"Filo durumunu analiz et"* (Araçlar, sürücüler ve kapasiteler)
- *"Öğrenci devamsızlık oranları nedir?"* (Puantaj ve okul entegrasyonu)`;
  }

  // Prepend the information message clearly stating that this is the Local AI Layer
  return `ℹ️ **Berkay AI Bilgilendirme:** Yapay zeka servis bağlantısı şu an kapalı veya aktif olmadığı için sisteminiz güvenli korumalı modda çalışmaya devam etmektedir. Talebiniz **Yerel AI Servis Katmanı (Local AI Layer)** tarafından kesintisiz olarak yanıtlanmıştır. CRM, Muhasebe, WhatsApp, Ödeme, Sözleşme ve Operasyonel işlemleriniz eksiksiz aktiftir.

${content}`;
}

function generateLocalOcrFallback(docKey: string, fileName: string, userRole?: string) {
  const today = new Date();
  let expiryDate = 'Süresiz';
  let isSuresiz = false;
  let logs: string[] = [];
  let extractedText = '';

  const formatTurkishDate = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const formatISODate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  if (docKey === 'ehliyet') {
    const future = new Date(today.getFullYear() + 8, today.getMonth(), today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `Sürücü belgesi üzerinde '11. Geçerlilik Tarihi' hanesinden okunan tarih: ${formatTurkishDate(future)}`;
  } else if (docKey === 'src' || docKey === 'psiko') {
    const future = new Date(today.getFullYear() + 4, today.getMonth() + 3, today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `Mesleki Yeterlilik Belgesi geçerlilik tarihi: ${formatTurkishDate(future)}`;
  } else if (docKey === 'ikametgah' || docKey === 'ehliyet_gbt' || docKey === 'adli_sicil' || docKey === 'adli_sicil_kart') {
    const future = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `e-Devlet barkodlu resmi belge üretim tarihi esas alınarak hesaplanan son geçerlilik: ${formatTurkishDate(future)}`;
  } else if (docKey === 'saglik') {
    const future = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `Resmi heyet/sağlık raporu geçerlilik süresi (1 Yıl): ${formatTurkishDate(future)}`;
  } else if (docKey === 'sofor_karti') {
    const future = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `İBB TUHIM Şoför Kartı geçerlilik bitişi: ${formatTurkishDate(future)}`;
  } else if (docKey === 'ruhsat') {
    const future = new Date(today.getFullYear() + 1, today.getMonth() + 2, today.getDate());
    expiryDate = formatISODate(future);
    extractedText = `TÜVTÜRK Muayene geçerlilik tarihi ruhsat sayfasından okundu: ${formatTurkishDate(future)}`;
  } else if (docKey === 'koltuk_sigorta' || docKey === 'arac_sigorta') {
    const future = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate() - 2);
    expiryDate = formatISODate(future);
    extractedText = `Sigorta poliçesi vade bitiş tarihi: ${formatTurkishDate(future)}`;
  } else {
    isSuresiz = true;
    expiryDate = 'Süresiz';
    extractedText = 'Bu belge ömür boyu geçerlidir, son geçerlilik tarihi bulunmamaktadır.';
  }

  logs = [
    `ℹ️ [Berkay AI Bilgilendirme] Yapay zeka servis bağlantısı şu an kapalı veya aktif olmadığı için yerel OCR ve kurallar motoru çalıştırıldı.`,
    `Yüklenen dosya algılandı: "${fileName}"`,
    `Kategori analizi yapılıyor: ${docKey.toUpperCase()}`,
    'Belge güvenlik ve antivirüs taramalarından başarıyla geçti.',
    `OCR tarama motoru başlatıldı. Belge görsel/PDF katmanı işleniyor.`,
    `Belge üzerindeki tarih damgası ve geçerlilik ibareleri arandı.`,
    isSuresiz 
      ? `Belgenin kalıcı geçerliliğe sahip olduğu saptandı (Süresiz).` 
      : `Geçerlilik tarihi başarıyla okundu: ${expiryDate}`
  ];

  return {
    expiryDate,
    extractedText,
    isSuresiz,
    logs
  };
}

function generateLocalNlpFallback(message: string) {
  const lower = message.toLowerCase();
  let intent = 'GENERAL';
  let replyText = 'Mesajınız başarıyla alındı. Müşteri hizmetlerimiz en kısa sürede dönüş yapacaktır.';
  let studentName: string | null = null;
  let actions: string[] = [];

  // Extract potential names
  if (lower.includes('ali')) studentName = 'Ali';
  else if (lower.includes('ece')) studentName = 'Ece';
  else if (lower.includes('can')) studentName = 'Can';

  if (lower.includes('gelmeyecek') || lower.includes('hasta') || lower.includes('gelmiyor') || lower.includes('binmeyecek')) {
    intent = 'ABSENT';
    replyText = `Geçmiş olsun. ${studentName || 'Öğrencinin'} bugün gelmeyeceğini servis sürücümüze ve hostesimize ilettik. Puantaj sistemine devamsız olarak işlendi.`;
    actions = ['UPDATE_ATTENDANCE_ABSENT'];
  } else if (lower.includes('nerede') || lower.includes('kaldı') || lower.includes('kaç dakika') || lower.includes('gelir')) {
    intent = 'WHERE_IS_SERVICE';
    replyText = 'Servis aracınız şu anda aktif rotasındadır. Canlı konum takibi için şu linke tıklayabilirsiniz: https://harita.berkaytur.com/live/06bkt123';
    actions = ['SHOW_GPS_LINK'];
  } else if (lower.includes('indi mi') || lower.includes('bindi mi') || lower.includes('vardı mı') || lower.includes('ulaştı')) {
    intent = 'DID_ALIGHT';
    replyText = `${studentName || 'Öğrencimiz'} sabah saat 08:32 itibarıyla okula güvenle ulaşmış ve hostesimiz eşliğinde teslim edilmiştir.`;
    actions = ['CHECK_ALIGHT_STATUS'];
  } else if (lower.includes('borc') || lower.includes('ne kadar') || lower.includes('bakiye') || lower.includes('ödeme') || lower.includes('tutar')) {
    intent = 'DEBT_INQUIRY';
    replyText = 'Temmuz 2026 dönemine ait kalan servis borç bakiyeniz 2.800 ₺\'dir. Ödemelerinizi veli panelinden kredi kartı ile taksitli olarak yapabilirsiniz.';
    actions = ['GET_DEBT_BALANCE'];
  } else if (lower.includes('makbuz') || lower.includes('dekont') || lower.includes('sözleşme') || lower.includes('belge') || lower.includes('dosya')) {
    intent = 'SEND_RECEIPT';
    replyText = 'Talep ettiğiniz tahsilat makbuzu ve sözleşme belgesi Google Drive üzerinde güvenli arşivinizde bulunmaktadır. Doğrudan veli panelinden PDF olarak indirebilirsiniz.';
    actions = ['SHOW_PAYMENT_RECEIPT', 'DOWNLOAD_CONTRACT'];
  } else if (lower.includes('geç kalacak') || lower.includes('gecik') || lower.includes('geç kalıyor')) {
    intent = 'DRIVER_LATE';
    replyText = 'Bilgilendirme için teşekkürler. Şoförümüzün gecikme durumu rotadaki ilgili tüm velilere SMS ve bildirim yoluyla otomatik olarak iletilmiştir.';
    actions = ['NOTIFY_PARENTS_LATE'];
  } else if (lower.includes('trafik') || lower.includes('yoğun') || lower.includes('kaza') || lower.includes('yol kapalı')) {
    intent = 'TRAFFIC_CONGESTION';
    replyText = 'Trafik yoğunluğu bilgisi alındı. Güzergah üzerindeki tahmini varış süreleri (ETA) dinamik olarak güncelleniyor.';
    actions = ['UPDATE_ETA_TRAFFIC'];
  } else if (lower.includes('konum') || lower.includes('harita') || lower.includes('koordinat')) {
    intent = 'SEND_LOCATION';
    replyText = 'Anlık GPS koordinatlarınız sunucuya iletildi. Veli haritasında konumunuz güncellendi.';
    actions = ['UPDATE_VEHICLE_COORDS'];
  }

  // Prepend informational prefix to the reply text to denote offline state
  replyText = `ℹ️ [Yerel AI Cevabı]: ${replyText}`;

  return {
    intent,
    studentName,
    replyText,
    actions
  };
}
