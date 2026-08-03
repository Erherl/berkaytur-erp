/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContractRepository } from '../repositories/contractRepository';
import { LogRepository } from '../repositories/logRepository';
import { prisma } from '../database/prisma';
import logger from '../utils/logger';

export const ContractService = {
  async getContracts(options: { page?: number; limit?: number; search?: string; status?: string; allowedStudentIds?: string[] } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.allowedStudentIds) {
      where.studentId = { in: options.allowedStudentIds };
    }
    if (options.search) {
      where.OR = [
        { studentName: { contains: options.search } },
        { parentName: { contains: options.search } },
        { schoolName: { contains: options.search } },
        { driverName: { contains: options.search } },
        { vehiclePlate: { contains: options.search } },
      ];
    }

    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      })
    ]);

    const result = await Promise.all(
      contracts.map(async (c) => {
        const history = await prisma.contractHistory.findMany({
          where: { contractId: c.id },
          orderBy: { version: 'desc' }
        });
        return {
          ...c,
          history
        };
      })
    );

    return {
      contracts: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async createContract(body: any) {
    const { 
      studentId, studentName, parentName, parentPhone, schoolName,
      driverName, driverPhone, hostessName, hostessPhone,
      vehiclePlate, vehicleModel, km, annualFee, paymentType,
      installmentCount, startDate, endDate, term 
    } = body;

    if (!studentId || !studentName) {
      throw new Error('Öğrenci bilgileri zorunludur.');
    }

    const newContract = {
      studentId,
      studentName,
      parentName: parentName || 'Veli',
      parentPhone: parentPhone || '',
      schoolName: schoolName || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      hostessName: hostessName || '',
      hostessPhone: hostessPhone || '',
      vehiclePlate: vehiclePlate || '',
      vehicleModel: vehicleModel || '',
      km: km || 0,
      annualFee: annualFee || 24000,
      paymentType: paymentType || 'Taksitli',
      installmentCount: installmentCount !== undefined ? installmentCount : 5,
      startDate: startDate || '',
      endDate: endDate || '',
      term: term || '2026-2027 Güz Dönemi',
      version: 1,
      status: 'pending_signature',
      createdAt: new Date().toLocaleDateString('tr-TR'),
    };

    const saved = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          ...newContract,
          km: newContract.km ? Number(newContract.km) : null,
          annualFee: newContract.annualFee ? Number(newContract.annualFee) : null,
          installmentCount: newContract.installmentCount ? Number(newContract.installmentCount) : 0,
          version: newContract.version ? Number(newContract.version) : 1,
        }
      });

      await tx.contractHistory.create({
        data: {
          contractId: contract.id,
          version: 1,
          createdAt: new Date().toLocaleString(),
          details: 'Sözleşme ve PDF taslağı ilk sürüm olarak oluşturuldu.'
        }
      });

      await tx.log.create({
        data: {
          userId: 'system',
          userName: 'Sistem',
          userRole: 'admin',
          action: 'Sözleşme Taslağı Oluşturuldu',
          details: `${studentName} ve velisi ${parentName} için yeni sözleşme v1 taslağı oluşturuldu.`,
          timestamp: new Date().toLocaleString()
        }
      });

      return contract;
    });

    return saved;
  },

  async signContract(id: string, body: any) {
    const { signatureData, signerName } = body;

    if (typeof signatureData !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(signatureData)) {
      throw new Error('İmza verisi geçersiz formatta. Geçerli bir canvas imzası (PNG/JPEG/WEBP data URL) gönderilmelidir.');
    }

    const contract = await ContractRepository.findById(id);
    if (!contract) {
      throw new Error('Sözleşme bulunamadı.');
    }

    const newVersion = contract.version + 1;
    
    const updated = await prisma.$transaction(async (tx) => {
      await tx.contractHistory.create({
        data: {
          contractId: id,
          version: newVersion,
          createdAt: new Date().toLocaleString('tr-TR'),
          details: `Dijital imza onaylandı. İmzacı: ${signerName || contract.parentName}. Sözleşme yürürlüğe girdi (v${newVersion}).`
        }
      });

      const up = await tx.contract.update({
        where: { id },
        data: {
          status: 'active',
          signedAt: new Date().toLocaleString('tr-TR'),
          signerName: signerName || contract.parentName,
          signaturePreview: signatureData,
          version: newVersion,
        }
      });

      // Update Student registrationStatus to 'İmzalandı'
      if (contract.studentId) {
        try {
          await tx.student.update({
            where: { id: contract.studentId },
            data: { registrationStatus: 'İmzalandı' }
          });
        } catch (stdErr) {
          logger.error('[CONTRACT SIGN] Failed to update student registrationStatus:', stdErr);
        }
      }

      await tx.log.create({
        data: {
          userId: 'system',
          userName: signerName || contract.parentName,
          userRole: 'parent',
          action: 'Sözleşme Dijital Olarak İmzalandı',
          details: `${contract.studentName} öğrencimizin sözleşmesi ${signerName || contract.parentName} tarafından dijital imza ile onaylandı ve yürürlüğe girdi.`,
          timestamp: new Date().toLocaleString()
        }
      });

      return up;
    });

    return updated;
  }
};
