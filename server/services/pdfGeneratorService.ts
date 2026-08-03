/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';

export const PdfGeneratorService = {
  /**
   * Helper to format current date
   */
  getFormattedDate(): string {
    return new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Safe string normalization to replace non-ASCII characters in filename
   */
  normalizeFilename(name: string): string {
    return name
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\.-]/g, '');
  },

  /**
   * Generate an exquisite PDF using jsPDF drawing commands
   */
  generatePDF(docType: string, recipientName: string, recipientPhone: string, textContext: string): { filename: string; base64: string } {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const docDate = this.getFormattedDate();
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '') || '905320000000';

    // 1. Draw Elegant Navy Outer Border (30, 41, 59)
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.rect(5, 5, 200, 287);

    // 2. Draw Subtle Inner Frame
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 196, 283);

    // 3. Corporate Header Banner (Berkaytur Anteti)
    doc.setFillColor(30, 41, 59);
    doc.rect(8, 8, 194, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BERKAYTUR SERVIS TASIMACILIK A.S.', 105, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Guvendiginiz Yolculuk, Akilli Rotalama ve Cift Yonlu Servis Entegrasyonu', 105, 22, { align: 'center' });
    doc.text('Tel: +90 (312) 444 0 555 | E-posta: destek@berkaytur.com | www.berkaytur.com', 105, 27, { align: 'center' });

    // 4. Reset Text Color & draw divider
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);

    // Meta Info Block
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(8, 36, 194, 20, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('BELGE DETAYLARI:', 12, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${docDate}`, 12, 47);
    doc.text(`Alıcı: ${recipientName}`, 12, 52);
    doc.text(`Telefon: +${cleanPhone}`, 110, 47);
    doc.text(`Guvenli Sistem Belge ID: BKT-RES-${Math.floor(Math.random() * 900000 + 100000)}`, 110, 52);

    // 5. Generate content specific to document types
    let filename = '';
    let displayTitle = '';

    const lowerMsg = textContext.toLowerCase();

    if (lowerMsg.includes('hakediş detay') || lowerMsg.includes('hakedis detay')) {
      // Hakediş Detayı
      filename = `Hakedis_Detayi_Temmuz_2026_06BKT123.pdf`;
      displayTitle = 'HAKEDIS DETAY RAPORU';
      this.drawHakedisDetay(doc, recipientName);
    } else if (lowerMsg.includes('hakediş') || lowerMsg.includes('hakedis') || lowerMsg.includes('tedarikçi') || lowerMsg.includes('tedarikci')) {
      // Hakediş Özeti
      filename = `Hakedis_Temmuz_2026_06BKT123.pdf`;
      displayTitle = 'HAKEDIS OZET RAPORU';
      this.drawHakedisOzet(doc, recipientName);
    } else if (lowerMsg.includes('sözleşme') || lowerMsg.includes('sozlesme') || lowerMsg.includes('mukavele')) {
      // Servis Sözleşmesi
      const normalizedName = this.normalizeFilename(recipientName);
      filename = `Sozlesme_${normalizedName || 'Veli'}_2026.pdf`;
      displayTitle = 'OKUL SERVISI TASIMACILIK SOZLESMESI';
      this.drawSozlesme(doc, recipientName);
    } else if (lowerMsg.includes('ödeme planı') || lowerMsg.includes('odeme plani') || lowerMsg.includes('taksit')) {
      // Ödeme Planı
      const normalizedName = this.normalizeFilename(recipientName);
      filename = `Odeme_Plani_${normalizedName || 'Veli'}_2026.pdf`;
      displayTitle = 'TAKSITLI ODEME PLANI';
      this.drawOdemePlani(doc, recipientName);
    } else if (lowerMsg.includes('makbuz') || lowerMsg.includes('tahsilat') || lowerMsg.includes('ödeme alındı') || lowerMsg.includes('odeme alindi')) {
      // Tahsilat Makbuzu
      filename = `Makbuz_Odeme_${docDate.replace(/\./g, '_')}.pdf`;
      displayTitle = 'RESMI TAHSILAT MAKBUZU';
      this.drawTahsilatMakbuzu(doc, recipientName);
    } else if (lowerMsg.includes('iade') || lowerMsg.includes('geri ödeme') || lowerMsg.includes('kesinti iadesi')) {
      // İade Hesaplaması
      const normalizedName = this.normalizeFilename(recipientName);
      filename = `Iade_Hesaplamasi_${normalizedName || 'Veli'}_2026.pdf`;
      displayTitle = 'IADE VE KESINTI HESAPLAMA DOKUMANI';
      this.drawIadeHesaplamasi(doc, recipientName);
    } else if (lowerMsg.includes('ceza') || lowerMsg.includes('kesinti') || lowerMsg.includes('ihlal')) {
      // Ceza Bildirimi
      filename = `Ceza_Bildirimi_06BKT123_${docDate.replace(/\./g, '_')}.pdf`;
      displayTitle = 'SOZLESME IHLALI CEZA BILDIRIMI';
      this.drawCezaBildirimi(doc, recipientName);
    } else if (lowerMsg.includes('fatura') || lowerMsg.includes('kdv') || lowerMsg.includes('e-arşiv')) {
      // Fatura
      const normalizedName = this.normalizeFilename(recipientName);
      filename = `Fatura_${normalizedName || 'Veli'}_2026.pdf`;
      displayTitle = 'E-ARSIV RESMI FATURA';
      this.drawFatura(doc, recipientName);
    } else {
      // Diğer resmi evraklar
      filename = `Resmi_Evrak_${docDate.replace(/\./g, '_')}.pdf`;
      displayTitle = 'RESMI EVRAK BILGILENDIRME FORMU';
      this.drawGenericDocument(doc, recipientName, textContext);
    }

    // Draw Title Header inside the document
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(displayTitle, 105, 66, { align: 'center' });

    // Footer Info
    doc.setDrawColor(226, 232, 240);
    doc.line(8, 275, 202, 275);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Bu PDF evragi Berkaytur Servis Tasimacilik A.S. sistemi tarafindan otomatik olarak tanzim edilmistir.', 12, 280);
    doc.text('Resmi kase ve e-imza tescili ile korunmaktadir. Evrak gecersizligi iddiasi icin merkez ofis ile iletisime geciniz.', 12, 284);
    doc.text(`Tarih Damgasi: ${new Date().toLocaleString()}`, 155, 284);

    const base64Content = doc.output('datauristring').split(',')[1];
    return { filename, base64: base64Content };
  },

  /**
   * PDF Draw Helper - Hakediş Özeti
   */
  drawHakedisOzet(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'HAKEDIS ODEME KALEMLERI & DETAYI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const items = [
      { label: 'Aylik Sozlesmeli Sabit Bedel:', value: '45,000.00 TL' },
      { label: 'Fiili Puantaj Orani (22 gun / 22 gun %100):', value: '45,000.00 TL' },
      { label: 'Ekstra Yakit ve Amortisman Destegi:', value: '3,500.00 TL' },
      { label: 'Cift Rota / Ek Sefer Bonusu (Veli Cift Yon Yardimi):', value: '1,200.00 TL' },
      { label: 'Gecikme Cezasi Kesintisi (Sözlesme md. 4.2):', value: '-500.00 TL' },
    ];

    items.forEach((item) => {
      doc.setFont('helvetica', item.label.startsWith('Gecikme') ? 'bold' : 'normal');
      doc.text(item.label, 15, y);
      doc.text(item.value, 150, y, { align: 'right' });
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOPLAM BRUT HAKEDIS TUTARI:', 15, y);
    doc.text('49,200.00 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Aylik baz sozlesme bedeli olan 45.000 TL puantaj doluluk oranina gore %100 hesaplandi.',
      '2. Sektor yakit dalgalanma endeksi baz alinarak yakit destegi 3.500 TL olarak eklendi.',
      '3. Velilerin cift adres taleplerine gore %75 ek fiyat motoru katilimiyla tedarikciye 1.200 TL bonus yansitildi.',
      '4. Hizmet kalitesi tescil raporundaki 1 adet rorlar kalkis nedeni ile 500 TL cezai kesinti uygulandi.'
    ]);

    this.drawSignatures(doc, 'Tedarikci Sorumlusu', 'Yonetim Kurulu Baskani');
  },

  /**
   * PDF Draw Helper - Hakediş Detayı
   */
  drawHakedisDetay(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'YOLCULUK VE KM BAZLI DETAYLI TABLO', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = 84;

    const logs = [
      { gun: '01.07.2026', sefer: 'Sabah - Aksam', km: '38.4 Km', yakit: 'Yakit Normal', toll: 'FSM Koprusu', tutar: '2,200 TL' },
      { gun: '02.07.2026', sefer: 'Sabah - Aksam', km: '38.4 Km', yakit: 'Yakit Normal', toll: 'HGS Gecis', tutar: '2,200 TL' },
      { gun: '03.07.2026', sefer: 'Sabah - Aksam', km: '41.2 Km', yakit: 'Yakit Sapma', toll: 'Avrasya Tuneli', tutar: '2,350 TL' },
      { gun: '04.07.2026', sefer: 'Sabah - Aksam', km: '38.4 Km', yakit: 'Yakit Normal', toll: 'FSM Koprusu', tutar: '2,200 TL' },
    ];

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Tarih', 15, y);
    doc.text('Rota Seferi', 40, y);
    doc.text('Olculen KM', 75, y);
    doc.text('Yakit Endeksi', 105, y);
    doc.text('Kopru/Otoyol', 135, y);
    doc.text('Gunluk Tutar', 175, y, { align: 'right' });
    y += 5;

    doc.line(12, y, 198, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    logs.forEach((log) => {
      doc.text(log.gun, 15, y);
      doc.text(log.sefer, 40, y);
      doc.text(log.km, 75, y);
      doc.text(log.yakit, 105, y);
      doc.text(log.toll, 135, y);
      doc.text(log.tutar, 175, y, { align: 'right' });
      y += 6;
    });

    y += 12;
    this.drawCalculationSteps(doc, y, [
      '1. Tedarikci detayli KM raporu, araç ici aktif telemetri verilerine gore milisaniyelik uretilmistir.',
      '2. Rota sapmalari ve otoyol ucretleri otomatik bakiye entegrasyonu ile hakedise dogrudan yansitilir.',
      '3. Detayli hakedisler her ay sonu otomatik tescil edilip Berkaytur muhasebe onayina gonderilir.'
    ]);

    this.drawSignatures(doc, 'Operasyon Yoneticisi', 'Muhasebe Sefi');
  },

  /**
   * PDF Draw Helper - Servis Sözleşmesi
   */
  drawSozlesme(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'HIZMET ALIMI SOZLESME VE MALI DETAYLARI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const fields = [
      { label: 'Hizmet Alan Veli Adi:', value: recipient },
      { label: 'Ulasim Saglayacak Ogrenci:', value: 'Merve ' + (recipient.split(' ')[1] || 'Ogrenci') },
      { label: 'Olcumlenen Net Rota KM Araligi:', value: '15.4 KM' },
      { label: 'Baz Yillik Egitim Servis Bedeli:', value: '25,200.00 TL' },
      { label: 'Cift Farkli Rota %75 Muafiyet Katilimi:', value: '18,900.00 TL (Uygulandi)' },
      { label: 'Aktif Kardes Indirimi (%10):', value: '-1,890.00 TL' },
    ];

    fields.forEach((f) => {
      doc.text(f.label, 15, y);
      doc.text(f.value, 150, y, { align: 'right' });
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NET ODENECEK SOZLESME BEDELI:', 15, y);
    doc.text('17,010.00 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Ukome standartlarina uygun baz ucret tarifesi ogrencinin sabah okul rotasina gore belirlendi.',
      '2. Aksem biletinde cift rotasyon uygulandigi icin ek yolculuk bedeline %75 avantaj indirimi uygulandi.',
      '3. Berkaytur kurumsal sadakat kurali kapsaminda kardes basvurusu icin ek %10 indirim saglandi.'
    ]);

    this.drawSignatures(doc, 'Veli Islak/E-Imza Onayi', 'Berkaytur Hizmet Sorumlusu');
  },

  /**
   * PDF Draw Helper - Ödeme Planı
   */
  drawOdemePlani(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'TAKSIT ODEME PLAN TABLOSU', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 84;

    const plan = [
      { taksit: '1. Taksit (Pesinat)', vade: '15.09.2026', tutar: '5,040.00 TL', durum: 'ODENDI' },
      { taksit: '2. Taksit', vade: '15.10.2026', tutar: '5,040.00 TL', durum: 'BEKLIYOR' },
      { taksit: '3. Taksit', vade: '15.11.2026', tutar: '5,040.00 TL', durum: 'BEKLIYOR' },
      { taksit: '4. Taksit', vade: '15.12.2026', tutar: '5,040.00 TL', durum: 'BEKLIYOR' },
      { taksit: '5. Taksit', vade: '15.01.2027', tutar: '5,040.00 TL', durum: 'BEKLIYOR' },
    ];

    doc.setFont('helvetica', 'bold');
    doc.text('Taksit Sirasi', 15, y);
    doc.text('Son Odeme Vadesi', 60, y);
    doc.text('Taksit Bedeli', 110, y);
    doc.text('Guncel Durum', 155, y, { align: 'right' });
    y += 5;

    doc.line(12, y, 198, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    plan.forEach((p) => {
      doc.text(p.taksit, 15, y);
      doc.text(p.vade, 60, y);
      doc.text(p.tutar, 110, y);
      doc.text(p.durum, 155, y, { align: 'right' });
      y += 6;
    });

    y += 12;
    this.drawCalculationSteps(doc, y, [
      '1. Toplam bedel olan 25.200 TL velinin talebi dogrultusunda 5 esit taksite bolunmustur.',
      '2. Geciken taksit vadelerinde aylik %2.5 yasal gecikme faizi uygulanma hakki saklidir.',
      '3. Odemelerinizi Berkaytur akilli veli paneli veya resmi banka hesaplarimiz uzerinden yapabilirsiniz.'
    ]);

    this.drawSignatures(doc, 'Veli Islak Onayi', 'Finans Mudurlugu');
  },

  /**
   * PDF Draw Helper - Tahsilat Makbuzu
   */
  drawTahsilatMakbuzu(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'ODEME ALINDI VE TAHSILAT BELGESI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const receipt = [
      { label: 'Tahsilat Tarihi:', value: this.getFormattedDate() },
      { label: 'Islem ID No:', value: 'TXN-' + Math.floor(Math.random() * 89999 + 10000) },
      { label: 'Odemeyi Yapan (Veli):', value: recipient },
      { label: 'Kabul Edilen Odeme Tipi:', value: 'Kredi Karti (Online POS)' },
      { label: 'Odeme Kalemi Aciklama:', value: 'Temmuz Servis Donem Taksit Tahsilati' },
    ];

    receipt.forEach((r) => {
      doc.text(r.label, 15, y);
      doc.text(r.value, 150, y, { align: 'right' });
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TAHSIL EDILEN TOPLAM TUTAR:', 15, y);
    doc.text('5,040.00 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Online kredi karti odeme kanali uzerinden tescilli sanal POS ile anlik tahsilat yapilmistir.',
      '2. Yapilan odeme aninda velinin finansal cari ekstresine islenmis ve kalan taksit borcu guncellenmistir.',
      '3. Bu makbuz yasal KDV faturasi yerine gecmez. Resmi faturaniz donem sonunda ayrica kesilecektir.'
    ]);

    this.drawSignatures(doc, 'Vezne Gorevlisi / Kase', 'Muhasebe Mudurlugu');
  },

  /**
   * PDF Draw Helper - İade Hesaplaması
   */
  drawIadeHesaplamasi(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'SOZLESME IPTALI VE IADE DETAYLARI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const iade = [
      { label: 'Veli Tarafindan Odenen Toplam:', value: '15,000.00 TL' },
      { label: 'Fiili Kullanilan Gun Sayisi (45 Gun):', value: '-3,750.00 TL' },
      { label: 'Kalan Hak Edilmeyen Bakiye:', value: '11,250.00 TL' },
      { label: 'Sozlesme Fesih Yonetim Kesintisi (%15):', value: '-1,687.50 TL' },
    ];

    iade.forEach((i) => {
      doc.text(i.label, 15, y);
      doc.text(i.value, 150, y, { align: 'right' });
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GERI ODENECEK NET IADE TUTARI:', 15, y);
    doc.text('9,562.50 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Ukome ve MEB okul servis yonetmeligi sozlesme feshi maddeleri dogrultusunda iade hesaplandi.',
      '2. Kullanilan aktif gunlerin ucreti aylik baz ucret uzerinden bolunerek kesinti uygulandi.',
      '3. Firma operasyonel hazırlık ve bos koltuk tazminati kapsaminda %15 idari fesih kesintisi yapilmistir.',
      '4. Net iade tutari 7 is gunu icerisinde velinin odeme yaptıgı kredi kartina iade edilecektir.'
    ]);

    this.drawSignatures(doc, 'Veli / Hak Sahibi', 'Genel Mudurluk Onayi');
  },

  /**
   * PDF Draw Helper - Ceza Bildirimi
   */
  drawCezaBildirimi(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'SOZLESME IHLAL VE CEZA TUTANAGI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const ceza = [
      { label: 'Ihlal Yapan Servis Plakasi:', value: '06 BKT 123' },
      { label: 'Ihlal Gerceklesme Tarihi:', value: this.getFormattedDate() },
      { label: 'Yasal Dayanak Clause:', value: 'Section 9.2 (Hiz Kalite ve Guvenlik Standardi)' },
      { label: 'Ihlal Aciklamasi:', value: 'Okul Bolgesinde Hiz Limitinin Asilmasi (82 km/s)' },
    ];

    ceza.forEach((c) => {
      doc.text(c.label, 15, y);
      doc.setFontSize(8.5);
      doc.text(c.value, 150, y, { align: 'right' });
      doc.setFontSize(9.5);
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('UYGULANAN CEZAI KESINTI TUTARI:', 15, y);
    doc.text('-500.00 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Okul servis araclarinin hiz limitleri ve guvenlik kurallari mukavele ile teminat altina alinmistir.',
      '2. Hiz ihlali anlik GPS telemetri verileri ve okul koordinatorlerince tespit edilerek tutanak altina alinmistir.',
      '3. Belirlenen ceza tutari bir sonraki hakedis donemindeki tedarikci payindan dogrudan mahsup edilecektir.'
    ]);

    this.drawSignatures(doc, 'Tutanak Hazirlayan Ekip', 'Operasyon Muduru');
  },

  /**
   * PDF Draw Helper - Fatura
   */
  drawFatura(doc: jsPDF, recipient: string) {
    this.drawBox(doc, 'MALI FATURA DETAY TABLOSU', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let y = 85;

    const fatura = [
      { label: 'Vergi Matrahi (Hizmet Bedeli):', value: '2,333.33 TL' },
      { label: 'Hesaplanan Katma Deger Vergisi (KDV %20):', value: '466.67 TL' },
      { label: 'Genel Toplam Matrah:', value: '2,800.00 TL' },
    ];

    fatura.forEach((f) => {
      doc.text(f.label, 15, y);
      doc.text(f.value, 150, y, { align: 'right' });
      y += 6.5;
    });

    doc.setDrawColor(148, 163, 184);
    doc.line(12, y, 198, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ODENECEK TOPLAM TUTAR:', 15, y);
    doc.text('2,800.00 TL', 150, y, { align: 'right' });

    y += 15;
    this.drawCalculationSteps(doc, y, [
      '1. Isbu fatura e-arsiv fatura formatinda tanzim edilerek Gelir Idaresi Baskanligi veritabanına iletilmistir.',
      '2. Faturadaki KDV orani egitim ve tasimacilik mevzuatına gore %20 olarak tescil edilmistir.',
      '3. Fatura bedeli cari donem servis hizmeti bittikten sonra mukaveleye gore tahsil edilmistir.'
    ]);

    this.drawSignatures(doc, 'Mali Hizmetler Sorumlusu', 'Vergi Denetim Onayi');
  },

  /**
   * PDF Draw Helper - Fallback/Generic Documents
   */
  drawGenericDocument(doc: jsPDF, recipient: string, textContext: string) {
    this.drawBox(doc, 'RESMI BILGILENDIRME ICERIGI', 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Split long messages to fit within line spacing
    const splitText = doc.splitTextToSize(textContext, 175);
    let y = 85;
    splitText.forEach((line: string) => {
      if (y < 160) {
        doc.text(line, 15, y);
        y += 5.5;
      }
    });

    y += 10;
    this.drawCalculationSteps(doc, y, [
      '1. Isbu evrak Berkaytur akilli otomasyon platformunca guvenli hat uzerinden tescil edilmistir.',
      '2. Belgenin gecerlilik suresi ve revizyon hakki saklidir.',
      '3. Detayli bilgi talepleriniz icin kisisel asistaniniz veya Berkaytur koordinatorune basvurunuz.'
    ]);

    this.drawSignatures(doc, 'Tanzim Eden Yetkili', 'Onaylayan Makam');
  },

  /**
   * Layout utilities
   */
  drawBox(doc: jsPDF, title: string, y: number) {
    doc.setDrawColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 190, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 12, y + 5.5);
  },

  drawCalculationSteps(doc: jsPDF, y: number, steps: string[]) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('ADIM ADIM YAPILANDIRILMIS HESAPLAMA DETAYLARI:', 12, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    steps.forEach((step) => {
      // Split single step line if it exceeds paper width
      const splitStep = doc.splitTextToSize(step, 180);
      splitStep.forEach((line: string) => {
        doc.text(line, 12, y);
        y += 4.5;
      });
    });
  },

  drawSignatures(doc: jsPDF, leftTitle: string, rightTitle: string) {
    const y = 240;
    doc.setDrawColor(203, 213, 225);
    doc.line(10, y, 90, y);
    doc.line(120, y, 200, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(leftTitle, 50, y + 5, { align: 'center' });
    doc.text(rightTitle, 160, y + 5, { align: 'center' });

    // Draw Digital Stamps
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald Green
    doc.setFontSize(8);
    doc.text('[ RESMI ELEKTRONIK KASE / E-ONAY ]', 50, y + 15, { align: 'center' });
    doc.text('[ GUVENLI BERKAYTUR IMZASI ]', 160, y + 15, { align: 'center' });
  }
};
