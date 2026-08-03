/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { School, Vehicle, User } from '../../../types';
import { ParentApplication } from './VeliBasvurulari';
import { jsPDF } from 'jspdf';
import { ApiClient } from '../../../infrastructure/api/apiClient';
import { 
  FileText, Shield, FileCheck, Share2, Download, 
  ExternalLink, CheckSquare, Plus, Save, Trash2, Calendar, 
  Edit3, Trash, Check, Eye, CloudLightning, CloudCheck, Link, ArrowRight, X, Clock, FileUp
} from 'lucide-react';

interface SozlesmelerProps {
  schools: School[];
  vehicles: Vehicle[];
  drivers: User[];
  hostesses: User[];
  applications: ParentApplication[];
  onAddLog: (action: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function Sozlesmeler({
  schools, vehicles, drivers, hostesses, applications, onAddLog, onAddNotification
}: SozlesmelerProps) {
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [paymentType, setPaymentType] = useState('Taksitli');
  const [installmentCount, setInstallmentCount] = useState('5');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2027-06-15');
  const [activeContract, setActiveContract] = useState<any | null>(null);

  // Contracts list loaded from backend
  const [allContracts, setAllContracts] = useState<any[]>([]);

  useEffect(() => {
    const loadContracts = async () => {
      const res = await ApiClient.fetchContracts();
      if (res.success && res.data) {
        setAllContracts(res.data);
      }
    };
    loadContracts();
  }, []);

  // E-Signature Drawing Canvas States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Google Drive Simulation States
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveShareableLink, setDriveShareableLink] = useState<string | null>(null);

  // Filter approved applications that can have a contract
  const approvedApps = applications.filter(app => app.status === 'Onaylandı');

  // Handle Canvas Drawing for E-signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e3a8a'; // Deep ink blue
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault(); // Stop scrolling on touch
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw a subtle placeholder grid/text if empty
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();
  };

  // Pre-draw baseline inside modal canvas on mount
  useEffect(() => {
    if (showSignatureModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 25);
        ctx.lineTo(canvas.width, canvas.height - 25);
        ctx.stroke();
      }
    }
  }, [showSignatureModal]);

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeContract) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);

    // Persistently sign the contract on the backend
    const res = await ApiClient.signContract(activeContract.id, dataUrl, activeContract.parentName);
    if (res.success) {
      const updatedContract = res.data.contract;
      setActiveContract(updatedContract);
      setIsSigned(true);
      setShowSignatureModal(false);

      // Refresh in local list
      setAllContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));

      // Simulated cloud backup to Google Drive
      setIsUploadingToDrive(true);
      setTimeout(() => {
        setIsUploadingToDrive(false);
        const simulatedId = `bkt-folder-${Math.floor(Math.random() * 90000 + 10000)}`;
        setDriveShareableLink(`https://drive.google.com/file/d/${simulatedId}/view?usp=sharing`);
        
        onAddLog('Sözleşme İmzalandı', `Velisi tarafından ${updatedContract.studentName} için üretilen CTR-${updatedContract.id.slice(-6)} nolu sözleşme e-imza ile imzalandı.`);
        onAddNotification(
          'Sözleşme Yürürlükte',
          `${updatedContract.studentName} sözleşmesi e-imza ile onaylanıp Google Drive arşivine tescillendi!`,
          'success'
        );
      }, 2200);
    } else {
      alert(`❌ Sözleşme imzalanamadı: ${res.error}`);
    }
  };

  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      alert("Lütfen sözleşme oluşturulacak onaylı bir veli başvurusu seçiniz!");
      return;
    }

    const app = applications.find(a => a.id === selectedAppId);
    if (!app) return;

    const vehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
    const driver = drivers.find(d => d.id === vehicle?.driverId) || { name: 'Ahmet Yılmaz', phone: '0555 444 55 66' };
    const hostess = hostesses.find(h => h.id === vehicle?.hostessId) || { name: 'Ayşe Yıldız', phone: '0555 555 66 77' };
    const school = schools.find(s => s.id === app.schoolId) || schools[0];

    const contractPayload = {
      studentId: app.id,
      studentName: app.studentName,
      parentName: `${app.motherName || 'Meryem'} / ${app.fatherName || 'Kamil'}`,
      parentPhone: app.phone,
      schoolName: school?.name || app.schoolName,
      driverName: driver?.name,
      driverPhone: driver?.phone,
      hostessName: hostess?.name,
      hostessPhone: hostess?.phone,
      vehiclePlate: vehicle?.plate || '06 BKT 123',
      vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Mercedes Sprinter',
      km: app.km,
      annualFee: app.calculatedFee,
      paymentType,
      installmentCount: paymentType === 'Peşin' ? 0 : parseInt(installmentCount),
      startDate,
      endDate,
      term: '2026-2027 Güz Dönemi',
      companyName: 'Berkaytur Servis Taşımacılık A.Ş.',
      companyTaxNo: 'BKT-TAX-9876543210',
      companyAddress: 'Çankaya Cad. No: 120/A, Ankara'
    };

    const res = await ApiClient.createContract(contractPayload);
    if (res.success) {
      const createdContract = res.data;
      setActiveContract(createdContract);
      setIsSigned(false);
      setSignatureDataUrl(null);
      setDriveShareableLink(null);

      // Add to local state list
      setAllContracts(prev => [createdContract, ...prev]);

      onAddLog('Sözleşme Şablonu Hazırlandı', `${app.studentName} için sözleşme taslağı tanzim edildi. E-İmza onayı bekleniyor.`);
    } else {
      alert(`❌ Sözleşme taslağı sunucuda oluşturulamadı: ${res.error}`);
    }
  };

  // jsPDF File Downloader
  const handleDownloadPDF = () => {
    if (!activeContract) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer Frame
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);

    // Title / Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('BERKAYTUR SERVIS TASIMACILIK A.S.', 105, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`SOZLESME ID: CTR-${activeContract.contractId || activeContract.id?.slice(-6)}  |  TARIH: ${new Date().toLocaleDateString('tr-TR')}`, 105, 24, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 28, 200, 28);

    // Section 1: Parties
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. SÖZLESME TARAFLARI VE BILGILERI', 12, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Hizmet Alıcı (Veli): ${activeContract.parentName}`, 12, 43);
    doc.text(`Telefon Numarası: ${activeContract.parentPhone}`, 12, 49);
    doc.text(`Ögrenci Adı: ${activeContract.studentName}`, 12, 55);
    doc.text(`Kayitli Okul: ${activeContract.schoolName}`, 12, 61);

    doc.text(`Tasıyıcı Firma: ${activeContract.companyName}`, 110, 43);
    doc.text(`Firma Vergi No: ${activeContract.companyTaxNo}`, 110, 49);
    doc.text(`Firma Telefon: +90 312 444 0 555`, 110, 55);
    doc.text(`Firma Adres: ${activeContract.companyAddress}`, 110, 61);

    doc.line(10, 67, 200, 67);

    // Section 2: Route & Crew Info
    doc.setFont('helvetica', 'bold');
    doc.text('2. TASIMA ROUTE VE GOREVLI EKIP BILGILERI', 12, 75);

    doc.setFont('helvetica', 'normal');
    doc.text(`Servis Plakasi: ${activeContract.vehiclePlate}`, 12, 82);
    doc.text(`Servis Modeli: ${activeContract.vehicleModel}`, 12, 88);
    doc.text(`Gorevli Sürücü: ${activeContract.driverName}`, 110, 82);
    doc.text(`Rehber Personel: ${activeContract.hostessName}`, 110, 88);

    doc.line(10, 94, 200, 94);

    // Section 3: Financial Details
    doc.setFont('helvetica', 'bold');
    doc.text('3. MALI SARTLAR VE ODEME PLANI', 12, 102);

    doc.setFont('helvetica', 'normal');
    doc.text(`Mesafe Araligi (KM): ${activeContract.km} KM`, 12, 109);
    doc.text(`Yıllık Toplam Bedel: ${activeContract.annualFee} TL`, 12, 115);
    doc.text(`Odeme Tipi: ${activeContract.paymentType}`, 110, 109);
    doc.text(`Taksit Secenegi: ${activeContract.installmentCount || 'Pesin (Tek Sefer)'}`, 110, 115);

    doc.line(10, 122, 200, 122);

    // Section 4: Legal Clauses
    doc.setFont('helvetica', 'bold');
    doc.text('4. GENEL SÖZLESME MADDELERI', 12, 130);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitClause1 = doc.splitTextToSize('MADDE 1 - KONU: Isbu tasımacılık taahhutnamesi, yukarda kayitli ogrencinin belirtilen ikametgah adresi ile okul kurumu arasında guvenli, konforlu ve hijyenik kurallara uygun sekilde tasınmasını yasal yonetmelikler cercevesinde karsılıklı olarak garanti altına alır.', 180);
    doc.text(splitClause1, 12, 137);

    const splitClause2 = doc.splitTextToSize('MADDE 2 - UCRET VE ODEME: Hizmet alıcı, belirlenen odeme planına sadık kalacaktır. Aylık odemeler her ayın en gec 5. gunune kadar sırkete ait resmi banka hesabına havale edilecektir. Zamanında odenmeyen bedeller icin yasal gecikme faizi isletilir.', 180);
    doc.text(splitClause2, 12, 149);

    const splitClause3 = doc.splitTextToSize('MADDE 3 - IPTAL KOSULLARI: Ogrenci velisi, adrese tasınma ihtiyacı ortadan kalktıgında en az 15 gun onceden sirkete yazılı bildirim yapmak sartıyla sozlesmeyi tek taraflı feshedebilir. Bu durumda kullanılmayan donemlerin iadesi 30 is gunu icinde karsılıklı mahsup edilir.', 180);
    doc.text(splitClause3, 12, 161);

    doc.line(10, 175, 200, 175);

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TAAHHUT EDEN YUKLENICI', 40, 185, { align: 'center' });
    doc.text('HIZMET ALICI (VELI) E-IMZASI', 150, 185, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text('Berkaytur Servis Yonetimi', 40, 192, { align: 'center' });
    doc.text(activeContract.parentName, 150, 192, { align: 'center' });

    // Embed E-Signature image if present
    if (signatureDataUrl) {
      doc.addImage(signatureDataUrl, 'PNG', 125, 195, 50, 20);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('(E-IMZA EKSIK - TASLAK)', 150, 205, { align: 'center' });
    }

    doc.save(`Sözleşme_CTR-${activeContract.contractId}_${activeContract.studentName.replace(/\s+/g, '_')}.pdf`);
    onAddLog('Sözleşme PDF İndirildi', `${activeContract.studentName} sözleşmesi resmi A4 PDF formatında indirildi.`);
  };

  const handleSendWhatsApp = () => {
    if (!activeContract) return;

    const signatureStatus = isSigned ? '✅ E-İMZA İLE İMZALANMIŞTIR' : '⚠️ TASLAK (İMZA BEKLENİYOR)';
    const driveLinkText = driveShareableLink ? `\n\n*Resmi Bulut Arşiv Linki (Google Drive):*\n${driveShareableLink}` : '';

    const messageText = `Sayın Velimiz *${activeContract.parentName}*,\n\nÖğrencimiz *${activeContract.studentName}* için *${activeContract.companyName}* tarafından tanzim edilen *${activeContract.contractId}* nolu Yıllık Öğrenci Servis Sözleşmesi başarıyla tescil edilmiştir.\n\n*Sözleşme Durumu:* ${signatureStatus}\n\n*Sözleşme Özet Detayları:*\n- Okul: ${activeContract.schoolName}\n- Araç Plaka: ${activeContract.vehiclePlate}\n- Şoför: ${activeContract.driverName} (${activeContract.driverPhone})\n- Hostes: ${activeContract.hostessName} (${activeContract.hostessPhone})\n- Mesafe: ${activeContract.km} KM\n- Yıllık Servis Bedeli: ${activeContract.annualFee} TL\n- Ödeme Şekli: ${activeContract.paymentType} (${activeContract.installmentCount} Taksit)\n- Başlangıç/Bitiş: ${activeContract.startDate} - ${activeContract.endDate}${driveLinkText}\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n- Berkaytur Servis Taşımacılık A.Ş.`;

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${activeContract.parentPhone.replace(/\s+/g, '')}&text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
    onAddLog('Sözleşme WhatsApp İletildi', `${activeContract.studentName} sözleşmesi ve Google Drive bağlantısı veli WhatsApp hattına gönderildi.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* CONTRACT CONFIGURATOR FORM */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <FileText className="w-5 h-5 text-blue-600" /> Otomatik Sözleşme Sistemi (PDF)
          </h4>
          <p className="text-[10px] text-slate-400">Onaylı veli başvuruları için anında yasal taşıma sözleşmesi üretin.</p>
        </div>

        {approvedApps.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs leading-relaxed space-y-1.5">
            <p className="font-bold">⚠️ Onaylanmış Başvuru Bulunmamaktadır</p>
            <p>
              Sözleşme oluşturabilmek için öncelikle <b>Veli Başvuruları</b> sekmesinden gelen bir başvuruyu inceleyip <b>"Onaylandı"</b> durumuna getirmelisiniz.
            </p>
          </div>
        ) : (
          <form onSubmit={handleGenerateContract} className="space-y-3 text-xs">
            
            <div className="space-y-1">
              <label className="font-bold text-slate-500">Onaylanmış Veli Başvurusu</label>
              <select
                required
                value={selectedAppId}
                onChange={e => setSelectedAppId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="">Seçiniz...</option>
                {approvedApps.map(app => (
                  <option key={app.id} value={app.id}>👤 {app.studentName} ({app.schoolName}) - {app.km} KM</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Tahsis Edilecek Servis Aracı / Plaka</label>
              <select
                required
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="">Seçiniz...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>🚌 {v.plate} ({v.brand} {v.model})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ödeme Şekli</label>
                <select
                  value={paymentType}
                  onChange={e => setPaymentType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="Taksitli">Taksitli</option>
                  <option value="Peşin">Peşin (Tek Sefer)</option>
                </select>
              </div>

              {paymentType === 'Taksitli' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Taksit Sayısı</label>
                  <select
                    value={installmentCount}
                    onChange={e => setInstallmentCount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="9">9 (Devlet Okulu)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-2 border-slate-100 mt-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Sözleşme Başlangıç</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Sözleşme Bitiş</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-100"
            >
              <FileCheck className="w-4 h-4" /> Yasal Sözleşme PDF Oluştur
            </button>
          </form>
        )}
      </div>

      {/* CONTRACT PDF PREVIEW PANEL */}
      <div className="lg:col-span-7">
        {activeContract ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 relative">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h5 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                  🛡️ RESMİ TAŞIMACILIK SÖZLEŞMESİ
                </h5>
                <p className="text-[9px] text-slate-400 mt-0.5">Sözleşme Kodu: CTR-{activeContract.contractId || activeContract.id?.slice(-6)} • İstanbul Barosu Tescilli</p>
              </div>

              <span className={`font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wider border ${
                isSigned 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              }`}>
                {isSigned ? 'İMZALANDI & YÜRÜRLÜKTE' : 'E-İMZA BEKLENİYOR'}
              </span>
            </div>

            {/* Google Drive upload status block */}
            {isUploadingToDrive && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between text-xs text-blue-800 font-bold animate-pulse">
                <span className="flex items-center gap-1.5"><CloudLightning className="w-4 h-4 text-blue-600 animate-bounce" /> Sözleşme PDF belgesi Google Drive bulut arşivine yükleniyor...</span>
              </div>
            )}

            {driveShareableLink && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-semibold shadow-inner">
                <span className="flex items-center gap-1.5"><CloudCheck className="w-4.5 h-4.5 text-emerald-600" /> Google Drive bulut tescili başarıyla tamamlandı.</span>
                <a 
                  href={driveShareableLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" /> Klasörü Aç
                </a>
              </div>
            )}

            {/* Real Contract Content */}
            <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-6 space-y-4 max-h-96 overflow-y-auto text-[11px] text-slate-600 leading-relaxed font-sans shadow-inner">
              <div className="text-center space-y-1 border-b pb-3 border-dashed">
                <h6 className="font-black text-slate-800 text-xs uppercase">{activeContract.companyName}</h6>
                <p className="text-[10px] text-slate-400">Vergi No: {activeContract.companyTaxNo} • Adres: {activeContract.companyAddress}</p>
              </div>

              {/* Parties Grid */}
              <div className="grid grid-cols-2 gap-4 border-b pb-3 border-dashed">
                <div>
                  <p className="font-bold text-slate-800 text-xs uppercase border-b pb-0.5 mb-1.5">1. Hizmet Alıcı (Veli)</p>
                  <p><b>Veli İsim:</b> {activeContract.parentName}</p>
                  <p><b>Öğrenci Adı:</b> {activeContract.studentName}</p>
                  <p><b>Telefon:</b> {activeContract.parentPhone}</p>
                  <p><b>Okul:</b> {activeContract.schoolName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs uppercase border-b pb-0.5 mb-1.5">2. Taşıma Ekibi & Araç</p>
                  <p><b>Plaka / Model:</b> {activeContract.vehiclePlate} ({activeContract.vehicleModel})</p>
                  <p><b>Görevli Sürücü:</b> {activeContract.driverName}</p>
                  <p><b>Sürücü Tel:</b> {activeContract.driverPhone}</p>
                  <p><b>Rehber Personel:</b> {activeContract.hostessName}</p>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-1 border-b pb-3 border-dashed">
                <p className="font-bold text-slate-800 text-xs border-b pb-0.5 mb-1.5 uppercase">3. Hizmet ve Mali Şartlar</p>
                <div className="grid grid-cols-2 gap-x-4">
                  <p><b>Taşıma Mesafesi (KM):</b> {activeContract.km} KM</p>
                  <p><b>Yıllık Hizmet Bedeli:</b> {activeContract.annualFee} TL</p>
                  <p><b>Ödeme Şekli:</b> {activeContract.paymentType}</p>
                  <p><b>Taksit Sayısı:</b> {activeContract.installmentCount || 'Peşin'} Taksit</p>
                  <p><b>Yürürlük Tarihi:</b> {activeContract.startDate}</p>
                  <p><b>Bitiş Tarihi:</b> {activeContract.endDate}</p>
                </div>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 border border-slate-200/60 rounded-xl bg-white">
                  <span className="font-bold text-slate-700 text-[10px] uppercase block mb-2 border-b pb-1">TAŞIYICI FİRMA ONAYI</span>
                  <div className="text-[10px] text-slate-400 font-extrabold italic py-3">Berkaytur Servis A.Ş.</div>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">Yetkili İmza & Kaşe</span>
                </div>
                <div className="text-center p-3 border border-slate-200/60 rounded-xl bg-white relative">
                  <span className="font-bold text-slate-700 text-[10px] uppercase block mb-2 border-b pb-1">VELİ (HİZMET ALICI) İMZASI</span>
                  {signatureDataUrl ? (
                    <img src={signatureDataUrl} alt="Veli E-İmza" className="h-10 mx-auto object-contain" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSignatureModal(true)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-extrabold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> E-İmza At
                    </button>
                  )}
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">{activeContract.parentName}</span>
                </div>
              </div>

              {/* Legal Clauses */}
              <div className="space-y-1 text-[9px] text-slate-400 pt-3 border-t">
                <p className="font-bold text-slate-500 text-[10px]">MADDE 1: SÖZLEŞMENİN KONUSU</p>
                <p>İşbu sözleşme, yukarıda detayları belirtilen öğrencinin ikametgahı ile okulu arasındaki sabah-akşam servis taşımacılığını, yasal yönetmelik çerçevesinde düzenler.</p>
                <p className="font-bold text-slate-500 text-[10px] pt-1">MADDE 2: ÖDEMELER VE SÜRE</p>
                <p>Hizmet alıcı, belirlenen taksitleri vadesinde ödemekle yükümlüdür. Zamanında yapılmayan ödemeler için ticari faiz oranları uygulanacaktır.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-end text-xs">
              
              {!isSigned && (
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Edit3 className="w-4 h-4" /> Veliden E-İmza Topla
                </button>
              )}

              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-200"
              >
                <Share2 className="w-4 h-4" /> WhatsApp ile Gönder
              </button>

              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" /> PDF Olarak İndir
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-xs border">
              <FileText className="w-6 h-6" />
            </div>
            <div className="max-w-xs mx-auto text-xs text-slate-400 leading-normal">
              Sol panelde bilgileri yapılandırıp <b>Sözleşme PDF Oluştur</b> dediğinizde, tüm tarafları, KM ve fiyat tarifesini içeren yasal taşıma taahhütnamesi burada görüntülenecektir.
            </div>
          </div>
        )}
      </div>

      {/* PERSISTENT CONTRACTS ARCHIVE & REVISION HISTORY */}
      <div className="col-span-12 lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 mt-2">
        <div className="border-b border-slate-100 pb-2.5">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <Shield className="w-5 h-5 text-blue-600" /> Sözleşme Arşivi ve Sürüm Kontrolü (Version History)
          </h4>
          <p className="text-[10px] text-slate-400">Tüm tanzim edilmiş taşıma sözleşmeleri, e-imza tescilleri, revizyon ve sürüm geçmişleriyle birlikte sunucu üzerinde kalıcı olarak tescillenmektedir.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Contracts List Table */}
          <div className="md:col-span-7 overflow-x-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wide">
                  <th className="p-2.5">Sözleşme Kodu</th>
                  <th className="p-2.5">Öğrenci Adı</th>
                  <th className="p-2.5">Tarih</th>
                  <th className="p-2.5 text-right font-bold">Mesafe / Ücret</th>
                  <th className="p-2.5 text-center">Sürüm (v)</th>
                  <th className="p-2.5 text-center">Durum</th>
                  <th className="p-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-white transition-all">
                    <td className="p-2.5 font-mono font-bold text-slate-800">CTR-{c.id.slice(-6)}</td>
                    <td className="p-2.5 font-bold text-slate-700">{c.studentName}</td>
                    <td className="p-2.5 text-slate-500">{c.createdAt}</td>
                    <td className="p-2.5 text-right font-mono text-slate-600 font-semibold">{c.km} KM / {c.annualFee} TL</td>
                    <td className="p-2.5 text-center"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">v{c.version}</span></td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                        c.status === 'signed'
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-600 border-amber-500/20 animate-pulse'
                      }`}>
                        {c.status === 'signed' ? 'İMZALANDI' : 'İMZA BEKLENİYOR'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => {
                          setActiveContract(c);
                          setIsSigned(c.status === 'signed');
                          setSignatureDataUrl(c.signaturePreview || null);
                          setDriveShareableLink(null);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200/80 rounded-lg text-slate-600 text-[10px] font-black cursor-pointer flex items-center gap-1 ml-auto transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> GÖRÜNTÜLE
                      </button>
                    </td>
                  </tr>
                ))}

                {allContracts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Sistemde henüz kayıtlı taşıma sözleşmesi bulunmamaktadır.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Version History Log of Active/Selected Contract */}
          <div className="md:col-span-5 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 uppercase">
              <Clock className="w-4 h-4 text-blue-500" /> Sürüm ve Değişiklik Geçmişi
            </h5>
            {activeContract ? (
              <div className="space-y-3">
                <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1 text-[11px]">
                  <p className="text-slate-500">Seçili Sözleşme:</p>
                  <p className="font-bold text-blue-900 font-mono">CTR-{activeContract.id.slice(-6)} ({activeContract.studentName})</p>
                  <p className="text-slate-400 text-[10px]">Toplam Revizyon Sürümü: v{activeContract.version}</p>
                </div>

                <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-4">
                  {(activeContract.history || []).map((hist: any, index: number) => (
                    <div key={index} className="relative space-y-1">
                      {/* Timeline node */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-700 text-[10px]">Sürüm v{hist.version}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{hist.createdAt}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic leading-relaxed">{hist.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Sürüm değişiklik ve revizyon tarihçesini görüntülemek için lütfen soldan bir sözleşmeyi tescil edin veya seçin.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E-SIGNATURE CAPTURE MODAL OVERLAY */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[3000] animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            
            <div className="border-b pb-2 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-blue-600" /> Veliden E-İmza Toplama
                </h4>
                <p className="text-[10px] text-slate-400">Lütfen farenizle veya dokunmatik ekranınızla imzalayın.</p>
              </div>
              <button 
                onClick={() => setShowSignatureModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Canvas Sign Box */}
            <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-white block cursor-crosshair touch-none"
              />
              <span className="absolute bottom-1 right-2 text-[8px] text-slate-300 pointer-events-none select-none font-bold uppercase tracking-wider">
                Dokunmatik İmza Alanı
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Temizle
              </button>
              
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> İmzayı Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
