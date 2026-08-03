/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from './googleSheetsAndDriveService';
import logger from '../utils/logger';

export const SheetsService = {
  /**
   * Run a full bidirectional synchronization between PostgreSQL (Prisma) and Google Sheets
   */
  async sync(body?: any) {
    logger.info('[Google Sheets Sync] Sync process started...');

    if (!GoogleSheetsAndDriveService.isConfigured()) {
      logger.warn('[Google Sheets Sync] Entegrasyon yapılandırılmamış (GOOGLE_APPS_SCRIPT_URL eksik).');
      return {
        success: false,
        message: 'Google Sheets / Drive entegrasyonu aktif değil (GOOGLE_APPS_SCRIPT_URL tanımlanmamış). Entegrasyon ayarlarını kontrol edin.',
        syncedCount: 0,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // 1. Fetch all data from Google Sheets
      const allSheetsData = await GoogleSheetsAndDriveService.getAllData();
      let syncedCount = 0;

      // Helper function to safe-parse numbers
      const safeFloat = (val: any) => (val && !isNaN(Number(val)) ? Number(val) : null);
      const safeInt = (val: any) => (val && !isNaN(Number(val)) ? Number(val) : 0);
      const safeBool = (val: any) => val === 'true' || val === true || val === 1 || val === '1';

      // 2. Sync "Users" Table
      if (allSheetsData['Users']) {
        for (const row of allSheetsData['Users']) {
          if (!row.id || !row.username) continue;
          await prisma.user.upsert({
            where: { id: String(row.id) },
            update: {
              name: String(row.name || ''),
              username: String(row.username),
              passwordHash: String(row.passwordHash || ''),
              role: String(row.role || 'coordinator'),
              email: row.email ? String(row.email) : null,
              phone: row.phone ? String(row.phone) : null,
              status: String(row.status || 'active'),
              schoolId: row.schoolId ? String(row.schoolId) : null,
              vehicleId: row.vehicleId ? String(row.vehicleId) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              name: String(row.name || ''),
              username: String(row.username),
              passwordHash: String(row.passwordHash || ''),
              role: String(row.role || 'coordinator'),
              email: row.email ? String(row.email) : null,
              phone: row.phone ? String(row.phone) : null,
              status: String(row.status || 'active'),
              schoolId: row.schoolId ? String(row.schoolId) : null,
              vehicleId: row.vehicleId ? String(row.vehicleId) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      // 3. Sync "Schools" Table
      if (allSheetsData['Schools']) {
        for (const row of allSheetsData['Schools']) {
          if (!row.id || !row.name) continue;
          await prisma.school.upsert({
            where: { id: String(row.id) },
            update: {
              name: String(row.name),
              address: row.address ? String(row.address) : null,
              type: row.type ? String(row.type) : undefined,
              phone: row.phone ? String(row.phone) : null,
              email: row.email ? String(row.email) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              name: String(row.name),
              address: row.address ? String(row.address) : null,
              type: row.type ? String(row.type) : undefined,
              phone: row.phone ? String(row.phone) : null,
              email: row.email ? String(row.email) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      // 4. Sync "Students" Table
      if (allSheetsData['Students']) {
        for (const row of allSheetsData['Students']) {
          if (!row.id || !row.name) continue;
          await prisma.student.upsert({
            where: { id: String(row.id) },
            update: {
              name: String(row.name),
              studentNumber: row.studentNumber ? String(row.studentNumber) : null,
              classLevel: row.classLevel ? String(row.classLevel) : null,
              schoolId: row.schoolId ? String(row.schoolId) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              parentName: row.parentName ? String(row.parentName) : null,
              parentPhone: row.parentPhone ? String(row.parentPhone) : null,
              routeId: row.routeId ? String(row.routeId) : null,
              routeName: row.routeName ? String(row.routeName) : null,
              morningStatus: String(row.morningStatus || 'pending'),
              eveningStatus: String(row.eveningStatus || 'pending'),
              registrationStatus: String(row.registrationStatus || 'Aktif'),
              latitude: safeFloat(row.latitude),
              longitude: safeFloat(row.longitude),
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              name: String(row.name),
              studentNumber: row.studentNumber ? String(row.studentNumber) : null,
              classLevel: row.classLevel ? String(row.classLevel) : null,
              schoolId: row.schoolId ? String(row.schoolId) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              parentName: row.parentName ? String(row.parentName) : null,
              parentPhone: row.parentPhone ? String(row.parentPhone) : null,
              routeId: row.routeId ? String(row.routeId) : null,
              routeName: row.routeName ? String(row.routeName) : null,
              morningStatus: String(row.morningStatus || 'pending'),
              eveningStatus: String(row.eveningStatus || 'pending'),
              registrationStatus: String(row.registrationStatus || 'Aktif'),
              latitude: safeFloat(row.latitude),
              longitude: safeFloat(row.longitude),
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      // 5. Sync "Vehicles" Table
      if (allSheetsData['Vehicles']) {
        for (const row of allSheetsData['Vehicles']) {
          if (!row.id || !row.plate) continue;
          await prisma.vehicle.upsert({
            where: { id: String(row.id) },
            update: {
              plate: String(row.plate),
              brand: row.brand ? String(row.brand) : null,
              model: row.model ? String(row.model) : null,
              year: row.year ? String(row.year) : null,
              capacity: safeInt(row.capacity),
              driverId: row.driverId ? String(row.driverId) : null,
              driverName: row.driverName ? String(row.driverName) : null,
              hostessId: row.hostessId ? String(row.hostessId) : null,
              hostessName: row.hostessName ? String(row.hostessName) : null,
              status: String(row.status || 'active'),
              schoolId: row.schoolId ? String(row.schoolId) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              projectName: row.projectName ? String(row.projectName) : null,
              vehicleType: row.vehicleType ? String(row.vehicleType) : null,
              fuelType: row.fuelType ? String(row.fuelType) : null,
              phone: row.phone ? String(row.phone) : null,
              gpsEnabled: safeBool(row.gpsEnabled),
              acEnabled: safeBool(row.acEnabled),
              cameraSystemEnabled: safeBool(row.cameraSystemEnabled),
              registrationNumber: row.registrationNumber ? String(row.registrationNumber) : null,
              inspectionDate: row.inspectionDate ? String(row.inspectionDate) : null,
              insuranceDate: row.insuranceDate ? String(row.insuranceDate) : null,
              compInsuranceDate: row.compInsuranceDate ? String(row.compInsuranceDate) : null,
              tyreReplaceDate: row.tyreReplaceDate ? String(row.tyreReplaceDate) : null,
              maintenanceDate: row.maintenanceDate ? String(row.maintenanceDate) : null,
              fireExtinguisherDate: row.fireExtinguisherDate ? String(row.fireExtinguisherDate) : null,
              firstAidKit: safeBool(row.firstAidKit),
              seating: String(row.seating || '{}'),
              photo: row.photo ? String(row.photo) : null,
              supplierCompany: row.supplierCompany ? String(row.supplierCompany) : null,
              supplierManager: row.supplierManager ? String(row.supplierManager) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              plate: String(row.plate),
              brand: row.brand ? String(row.brand) : null,
              model: row.model ? String(row.model) : null,
              year: row.year ? String(row.year) : null,
              capacity: safeInt(row.capacity),
              driverId: row.driverId ? String(row.driverId) : null,
              driverName: row.driverName ? String(row.driverName) : null,
              hostessId: row.hostessId ? String(row.hostessId) : null,
              hostessName: row.hostessName ? String(row.hostessName) : null,
              status: String(row.status || 'active'),
              schoolId: row.schoolId ? String(row.schoolId) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              projectName: row.projectName ? String(row.projectName) : null,
              vehicleType: row.vehicleType ? String(row.vehicleType) : null,
              fuelType: row.fuelType ? String(row.fuelType) : null,
              phone: row.phone ? String(row.phone) : null,
              gpsEnabled: safeBool(row.gpsEnabled),
              acEnabled: safeBool(row.acEnabled),
              cameraSystemEnabled: safeBool(row.cameraSystemEnabled),
              registrationNumber: row.registrationNumber ? String(row.registrationNumber) : null,
              inspectionDate: row.inspectionDate ? String(row.inspectionDate) : null,
              insuranceDate: row.insuranceDate ? String(row.insuranceDate) : null,
              compInsuranceDate: row.compInsuranceDate ? String(row.compInsuranceDate) : null,
              tyreReplaceDate: row.tyreReplaceDate ? String(row.tyreReplaceDate) : null,
              maintenanceDate: row.maintenanceDate ? String(row.maintenanceDate) : null,
              fireExtinguisherDate: row.fireExtinguisherDate ? String(row.fireExtinguisherDate) : null,
              firstAidKit: safeBool(row.firstAidKit),
              seating: String(row.seating || '{}'),
              photo: row.photo ? String(row.photo) : null,
              supplierCompany: row.supplierCompany ? String(row.supplierCompany) : null,
              supplierManager: row.supplierManager ? String(row.supplierManager) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      // 6. Sync "Payments" Table
      if (allSheetsData['Payments']) {
        for (const row of allSheetsData['Payments']) {
          if (!row.id || !row.studentId) continue;
          await prisma.payment.upsert({
            where: { id: String(row.id) },
            update: {
              studentId: String(row.studentId),
              studentName: String(row.studentName || ''),
              parentName: row.parentName ? String(row.parentName) : null,
              amount: safeFloat(row.amount) || 0,
              dueDate: String(row.dueDate || ''),
              paymentDate: row.paymentDate ? String(row.paymentDate) : null,
              status: String(row.status || 'pending'),
              category: String(row.category || 'Tahsilat'),
              description: row.description ? String(row.description) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              studentId: String(row.studentId),
              studentName: String(row.studentName || ''),
              parentName: row.parentName ? String(row.parentName) : null,
              amount: safeFloat(row.amount) || 0,
              dueDate: String(row.dueDate || ''),
              paymentDate: row.paymentDate ? String(row.paymentDate) : null,
              status: String(row.status || 'pending'),
              category: String(row.category || 'Tahsilat'),
              description: row.description ? String(row.description) : null,
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      // 7. Sync "Contracts" Table
      if (allSheetsData['Contracts']) {
        for (const row of allSheetsData['Contracts']) {
          if (!row.id || !row.studentName) continue;
          await prisma.contract.upsert({
            where: { id: String(row.id) },
            update: {
              studentId: row.studentId ? String(row.studentId) : null,
              studentName: String(row.studentName),
              parentName: row.parentName ? String(row.parentName) : null,
              parentPhone: row.parentPhone ? String(row.parentPhone) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              driverName: row.driverName ? String(row.driverName) : null,
              driverPhone: row.driverPhone ? String(row.driverPhone) : null,
              hostessName: row.hostessName ? String(row.hostessName) : null,
              hostessPhone: row.hostessPhone ? String(row.hostessPhone) : null,
              vehiclePlate: row.vehiclePlate ? String(row.vehiclePlate) : null,
              vehicleModel: row.vehicleModel ? String(row.vehicleModel) : null,
              km: safeFloat(row.km),
              annualFee: safeFloat(row.annualFee),
              paymentType: row.paymentType ? String(row.paymentType) : null,
              installmentCount: safeInt(row.installmentCount),
              startDate: row.startDate ? String(row.startDate) : null,
              endDate: row.endDate ? String(row.endDate) : null,
              term: row.term ? String(row.term) : null,
              version: safeInt(row.version) || 1,
              status: String(row.status || 'draft'),
              signedAt: row.signedAt ? String(row.signedAt) : null,
              signerName: row.signerName ? String(row.signerName) : null,
              signaturePreview: row.signaturePreview ? String(row.signaturePreview) : null,
              createdAt: String(row.createdAt || new Date().toISOString()),
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            },
            create: {
              id: String(row.id),
              studentId: row.studentId ? String(row.studentId) : null,
              studentName: String(row.studentName),
              parentName: row.parentName ? String(row.parentName) : null,
              parentPhone: row.parentPhone ? String(row.parentPhone) : null,
              schoolName: row.schoolName ? String(row.schoolName) : null,
              driverName: row.driverName ? String(row.driverName) : null,
              driverPhone: row.driverPhone ? String(row.driverPhone) : null,
              hostessName: row.hostessName ? String(row.hostessName) : null,
              hostessPhone: row.hostessPhone ? String(row.hostessPhone) : null,
              vehiclePlate: row.vehiclePlate ? String(row.vehiclePlate) : null,
              vehicleModel: row.vehicleModel ? String(row.vehicleModel) : null,
              km: safeFloat(row.km),
              annualFee: safeFloat(row.annualFee),
              paymentType: row.paymentType ? String(row.paymentType) : null,
              installmentCount: safeInt(row.installmentCount),
              startDate: row.startDate ? String(row.startDate) : null,
              endDate: row.endDate ? String(row.endDate) : null,
              term: row.term ? String(row.term) : null,
              version: safeInt(row.version) || 1,
              status: String(row.status || 'draft'),
              signedAt: row.signedAt ? String(row.signedAt) : null,
              signerName: row.signerName ? String(row.signerName) : null,
              signaturePreview: row.signaturePreview ? String(row.signaturePreview) : null,
              createdAt: String(row.createdAt || new Date().toISOString()),
              createdBy: row.createdBy ? String(row.createdBy) : null,
              updatedBy: row.updatedBy ? String(row.updatedBy) : null,
              deletedBy: row.deletedBy ? String(row.deletedBy) : null,
              isDeleted: safeBool(row.isDeleted),
            }
          });
          syncedCount++;
        }
      }

      logger.info(`[Google Sheets Sync] Successfully completed. Total items synchronized: ${syncedCount}`);
      return {
        success: true,
        message: `Google Sheets Çift Yönlü Eşitleme Başarılı! (${syncedCount} kayıt güncellendi)`,
        syncedCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('[Google Sheets Sync] Error occurred:', error);
      return {
        success: false,
        message: `E-Tablo senkronizasyonu sırasında hata oluştu: ${error.message}`,
        syncedCount: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
};
