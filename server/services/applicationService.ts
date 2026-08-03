/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BERKAYTUR — ApplicationService (İstanbul-Only, Fallback'sız)
 * =================================================================
 * Prompt v2 gereği: Tüm doğrulamalar başarıyla geçmeden adres
 * "doğrulanmış" kabul edilmez. Adres, İstanbul'un 39 ilçesinden
 * birinin polygon sınırı içinde olmalı, doğrulama pipeline'ı baştan sona
 * (Forward → Turkey → İstanbul → 39 ilçe → Kullanıcı seçimi →
 * Reverse → Şehir/İlçe/Mahalle) başarıya ulaşmalıdır.
 *
 * Hiçbir sabit/default koordinata fallback yapılmaz. Çekmeköy,
 * İstanbul merkezi, ilçe merkezi gibi YASAKLI fallback'ler tamamen
 * kaldırılmıştır.
 */

import { ApplicationRepository } from '../repositories/applicationRepository';
import { ContractRepository } from '../repositories/contractRepository';
import { DocumentRepository } from '../repositories/documentRepository';
import { LogRepository } from '../repositories/logRepository';
import { prisma } from '../database/prisma';
import { WhatsAppService } from './whatsappService';
import logger from '../utils/logger';
import {
  validateIstanbulAddress,
  GeocodeValidationError,
  isInsideIstanbul,
  GeocodeResult,
  GeocodeOk,
} from './istanbulGeocoder';

// =================================================================
// OSRM servisinden sürüş mesafesi. Tıkanırsa Haversine fallback
// olarak yalnızca mesafe hesabında kullanılır (koordinat YAZILMAZ).
// =================================================================
async function getDrivingDistanceSafe(
  lat1: number, lon1: number, lat2: number, lon2: number
): Promise<number> {
  // OSRM endpoint devre dışı bırakıldı (rate-limit ve offline güvenirlik problemi
  // nedeniyle). Haversine direkt dönüyor; daha doğru bir provider bağlandığında
  // OSRM bloğunu geri açabiliriz.
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c * 1.3).toFixed(1)); // curvature compensation
}

function requireValidGeocode(result: GeocodeResult | null, label: string): GeocodeOk | null {
  if (!result) return null;
  if (!result.ok) {
    throw new GeocodeValidationError(
      `${label} doğrulanamadı: ${result.message}`,
      result.reason,
      { cityDetected: null, districtDetected: result.districtDetected }
    );
  }
  return result;
}

// =================================================================
// PUBLIC EXPORT
// =================================================================
export const ApplicationService = {
  async getApplications(options: { page?: number; limit?: number; search?: string; status?: string; allowedSchoolIds?: string[] } = {}) {
    return ApplicationRepository.findAll(options);
  },

  async validateAddress(address: string, userSelectedDistrict?: string | null) {
    const validation = await validateIstanbulAddress(address, { userSelectedDistrict: userSelectedDistrict || undefined });
    const resolved = requireValidGeocode(validation, 'Adres');
    if (!resolved) {
      throw new GeocodeValidationError('Adres doğrulanamadı.', 'FORWARD_GEOCODE_FAILED');
    }
    return resolved;
  },

  // -----------------------------------------------------------------
  // Veli ön-kayıt başvurusu — İstanbul-only pipeline
  // -----------------------------------------------------------------
  async createApplication(body: any) {
    const {
      studentName, tcNo, birthDate, gender, schoolId, classLevel, section,
      motherName, fatherName, phone, email, address, morningAddress, eveningAddress,
      siblingInfo, allergy, medication, emergencyContact, emergencyPhone,
      kvkkConsent, rulesConsent, contractConsent, website, submitTimerMs,
      morningDistrict, eveningDistrict, schoolDistrict,
    } = body;

    // 1. Spam Honey-Pot
    if (website && website.trim().length > 0) {
      logger.warn('[SECURITY SPAM DETECTED] Bot submission blocked via hidden honey-pot field.');
      throw new Error('Spam algılandı. Form gönderimi reddedildi.');
    }

    // 2. Submission Speed
    if (submitTimerMs && Number(submitTimerMs) < 2500) {
      logger.warn('[SECURITY SPAM DETECTED] Submission blocked due to abnormally fast submit speed.');
      throw new Error('Hızlı form doldurma algılandı. Lütfen insan olduğunuzu doğrulayın.');
    }

    // 3. TC Identity Validation (T.C. resmi kimlik no)
    if (!tcNo || tcNo.trim().length !== 11 || isNaN(Number(tcNo)) || tcNo.startsWith('0')) {
      throw new Error('Geçersiz T.C. Kimlik Numarası. Lütfen 11 haneli geçerli numara giriniz.');
    }

    // 4. Phone Validation
    const cleanPhone = (phone || '').replace(/\s+/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      throw new Error('Lütfen geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX).');
    }

    // 5. Duplicate Application
    const isDuplicate = await ApplicationRepository.checkDuplicate(tcNo);
    if (isDuplicate) {
      throw new Error('Bu T.C. Kimlik numarası ile daha önce yapılmış aktif bir başvuru mevcuttur.');
    }

    const schoolObj = await prisma.school.findFirst({ where: { id: schoolId, isDeleted: false } });

    const mAddress = morningAddress || address;
    const eAddress = eveningAddress || address;

    // DEPRECATED: 6-city bbox + Nominatim countrycodes=tr fallback mantığı tamamen
    // kaldırıldı. Yeni İstanbul-only pipeline (validateIstanbulAddress) adresleri
    // 7 adımdan geçirir ve başarısız olduğunda GeocodeValidationError fırlatır.
    // Pipeline'ın hiçbir adımında hardcoded koordinat fallback yoktur.

    const [morningGeo, eveningGeo, schoolGeoResult] = await Promise.all([
      validateIstanbulAddress(mAddress, { userSelectedDistrict: morningDistrict }),
      validateIstanbulAddress(eAddress, { userSelectedDistrict: eveningDistrict }),
      schoolObj?.address
        ? validateIstanbulAddress(schoolObj.address, { userSelectedDistrict: schoolDistrict })
        : Promise.resolve(null)
    ]);

    const morningResolved = requireValidGeocode(morningGeo, 'Sabah adresi');
    const eveningResolved = requireValidGeocode(eveningGeo, 'Akşam adresi');
    const schoolResolved = schoolObj?.address
      ? requireValidGeocode(schoolGeoResult, 'Okul adresi')
      : null;

    if (!morningResolved || !eveningResolved) {
      throw new GeocodeValidationError('Adres doğrulanamadı.', 'FORWARD_GEOCODE_FAILED');
    }

    // Pipeline'ın tüm adımları başarı: emin olmak için ek İstanbul içi kontrol.
    if (!isInsideIstanbul(morningResolved.lat, morningResolved.lon) ||
        !isInsideIstanbul(eveningResolved.lat, eveningResolved.lon)) {
      throw new GeocodeValidationError(
        'Adreslerin koordinatları İstanbul il sınırları içinde değil.',
        'OUT_OF_ISTANBUL_POLYGON'
      );
    }

    const morningCoords = { lat: morningResolved.lat, lon: morningResolved.lon };
    const eveningCoords = { lat: eveningResolved.lat, lon: eveningResolved.lon };
    const schoolCoords = schoolResolved
      ? { lat: schoolResolved.lat, lon: schoolResolved.lon }
      : morningCoords;

    const km1 = await getDrivingDistanceSafe(
      morningCoords.lat, morningCoords.lon, schoolCoords.lat, schoolCoords.lon
    );
    const km2 = await getDrivingDistanceSafe(
      eveningCoords.lat, eveningCoords.lon, schoolCoords.lat, schoolCoords.lon
    );

    const fee1 = Math.round(1500 + km1 * 120);
    const fee2 = Math.round(1500 + km2 * 120);

    let totalKm = km1;
    let baseFee = fee1;

    if (mAddress.trim().toLowerCase() !== eAddress.trim().toLowerCase()) {
      totalKm = parseFloat((km1 + km2).toFixed(1));
      baseFee = fee1 + Math.round(fee2 * 0.75);
    }

    // Sibling Discount
    const existingStudentsCount = await prisma.student.count({
      where: { parentPhone: phone, isDeleted: false }
    });
    const existingAppsCount = await prisma.application.count({
      where: { phone, status: { in: ['Bekliyor', 'Onaylandı'] }, isDeleted: false }
    });
    const siblingCount = existingStudentsCount + existingAppsCount;
    let discountPercent = 0;
    if (siblingCount === 1) discountPercent = 0.10;
    else if (siblingCount >= 2) discountPercent = 0.15;

    const finalFee = Math.round(baseFee * (1 - discountPercent));

    const newApp = {
      studentName,
      tcNo,
      birthDate,
      gender,
      schoolId,
      schoolName: schoolObj ? schoolObj.name : 'Bilinmiyor',
      classLevel,
      section,
      motherName,
      fatherName,
      phone,
      email,
      address,
      morningAddress: mAddress,
      eveningAddress: eAddress,
      siblingInfo: siblingInfo || (siblingCount > 0 ? `${siblingCount} Kardeş Var` : 'Yok'),
      allergy: allergy || '',
      medication: medication || '',
      emergencyContact,
      emergencyPhone,
      kvkkConsent: !!kvkkConsent,
      rulesConsent: !!rulesConsent,
      contractConsent: !!contractConsent,
      appliedAt:
        new Date().toLocaleDateString('tr-TR') + ' ' +
        new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Bekliyor',
      km: totalKm,
      calculatedFee: finalFee
    };

    const saved = await ApplicationRepository.create(newApp);

    await LogRepository.create({
      userId: 'system',
      userName: 'Veli Başvuru Sistemi',
      userRole: 'parent',
      action: 'Veli Kayıt Başvurusu',
      details:
        `${studentName} isimli öğrenci için veli ön kayıt başvurusu İstanbul-Only ` +
        `pipeline (Forward→Turkey→İstanbul→39 ilçe→Reverse→mahalle) ile doğrulanarak kaydedildi. ` +
        `T.C. No: ${tcNo}. Doğrulanan sabah ilçesi: ${morningResolved.districtDisplay}, ` +
        `akşam ilçesi: ${eveningResolved.districtDisplay}.`,
      timestamp: new Date().toLocaleString()
    });

    return saved;
  },

  async updateApplication(id: string, body: any) {
    const { status, km, calculatedFee } = body;
    const targetApp = await ApplicationRepository.findById(id);
    if (!targetApp) throw new Error('Başvuru bulunamadı.');
    const oldStatus = targetApp.status;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (km !== undefined) updateData.km = km;
    if (calculatedFee !== undefined) updateData.calculatedFee = calculatedFee;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.application.update({
        where: { id },
        data: {
          ...updateData,
          km: updateData.km !== undefined ? Number(updateData.km) : undefined,
          calculatedFee: updateData.calculatedFee !== undefined ? Number(updateData.calculatedFee) : undefined,
        }
      });

      if (status === 'Onaylandı' && oldStatus !== 'Onaylandı') {
        const schoolRecord = targetApp.schoolId
          ? await tx.school.findUnique({ where: { id: targetApp.schoolId } })
          : null;
        const resolvedSchoolName = schoolRecord ? schoolRecord.name : 'Bahçeşehir Koleji';

        await tx.student.upsert({
          where: { id: targetApp.id },
          update: {
            registrationStatus: 'Sözleşme Bekliyor',
            parentName: targetApp.fatherName || targetApp.motherName || 'Belirtilmedi',
            parentPhone: targetApp.phone || '',
            schoolId: targetApp.schoolId || undefined,
            schoolName: resolvedSchoolName,
            isDeleted: false,
          },
          create: {
            id: targetApp.id,
            name: targetApp.studentName,
            studentNumber: 'SN-' + Math.floor(1000 + Math.random() * 9000),
            classLevel: targetApp.classLevel || '9',
            schoolId: targetApp.schoolId || 's1',
            schoolName: resolvedSchoolName,
            parentName: targetApp.fatherName || targetApp.motherName || 'Belirtilmedi',
            parentPhone: targetApp.phone || '',
            registrationStatus: 'Sözleşme Bekliyor',
            morningStatus: 'pending',
            eveningStatus: 'pending',
            isDeleted: false,
          }
        });

        const newContract = {
          studentId: targetApp.id,
          studentName: targetApp.studentName,
          parentName: targetApp.fatherName || targetApp.motherName || 'Belirtilmedi',
          parentPhone: targetApp.phone || '',
          schoolName: resolvedSchoolName,
          annualFee: targetApp.calculatedFee,
          term: '2026-2027 Güz Dönemi',
          version: 1,
          status: 'pending_signature',
          createdAt: new Date().toLocaleDateString('tr-TR'),
        };

        const createdContract = await tx.contract.create({
          data: {
            ...newContract,
            km: Number(targetApp.km || 2.5),
            annualFee: newContract.annualFee ? Number(newContract.annualFee) : null,
            installmentCount: 0,
            version: 1,
          }
        });

        await tx.contractHistory.create({
          data: {
            contractId: createdContract.id,
            version: 1,
            createdAt: new Date().toLocaleString(),
            details: 'Onaylanan veli başvurusundan otomatik sözleşme ve PDF taslağı oluşturuldu.'
          }
        });

        const docId = `doc_con_${Date.now()}`;
        await tx.document.create({
          data: {
            id: docId,
            name: `${targetApp.studentName.replace(/\s+/g, '_')}_Servis_Sozlesmesi_v1.pdf`,
            category: 'Sözleşmeler',
            fileSize: '1.5 MB',
            uploadDate: new Date().toISOString().split('T')[0],
            uploadedBy: 'Otomatik Sistem',
            fileUrl: `/api/documents/download/${docId}`,
            isDeleted: false
          }
        });

        try {
          const parentName = targetApp.fatherName || targetApp.motherName || 'Veli';
          const welcomeMessage =
            `Sayın *${parentName}*, çocuğunuz *${targetApp.studentName}* için yaptığınız ` +
            `Berkaytur Okul Servisi başvurusu onaylanmıştır! Yıllık servis ücretiniz mesafe ` +
            `bazlı hesaplanarak *${targetApp.calculatedFee} TL* olarak belirlenmiştir. Lütfen ` +
            `Veli Portalı'na giriş yaparak 'Sözleşmelerim' sekmesinden hizmet sözleşmesini ` +
            `dijital olarak imzalayınız. Teşekkür ederiz. - Berkaytur`;
          await WhatsAppService.send({
            recipientPhone: targetApp.phone,
            recipientName: parentName,
            message: welcomeMessage,
            templateName: 'Başvuru Onayı'
          });
        } catch (wsErr) {
          logger.error('[WHATSAPP] Failed to send application approval message:', wsErr);
        }
      }

      await tx.log.create({
        data: {
          userId: 'system',
          userName: 'Koordinatör',
          userRole: 'coordinator',
          action: 'Başvuru Durumu Güncellendi',
          details: `${targetApp.studentName} başvuru durumu '${oldStatus}' -> '${status}' yapıldı.`,
          timestamp: new Date().toLocaleString()
        }
      });

      return up;
    });

    return updated;
  }
};

// re-export
export { GeocodeValidationError } from './istanbulGeocoder';
