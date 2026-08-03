/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehicleRepository } from '../repositories/vehicleRepository';
import { LogRepository } from '../repositories/logRepository';

export const VehicleService = {
  async getAllVehicles(options: { page?: number; limit?: number; search?: string; status?: string; allowedVehicleIds?: string[] } = {}) {
    return VehicleRepository.findAll(options);
  },

  async createVehicle(body: any) {
    const newVehicle = {
      seating: {},
      history: [
        { date: new Date().toISOString().split('T')[0], type: 'audit', title: 'Sistem Kaydı', details: 'Araç sisteme başarıyla kaydedildi.' }
      ],
      ...body
    };

    const saved: any = await VehicleRepository.create(newVehicle);

    await LogRepository.create({
      userId: 'system',
      userName: 'Sistem',
      userRole: 'admin',
      action: 'Araç Eklendi',
      details: `${saved.plate} plakalı yeni araç (${saved.brand} ${saved.model}) sisteme kaydedildi.`,
      timestamp: new Date().toLocaleString()
    });

    return saved;
  },

  async updateVehicle(id: string, body: any) {
    const updated: any = await VehicleRepository.update(id, body);
    if (!updated) {
      throw new Error('Araç bulunamadı.');
    }

    await LogRepository.create({
      userId: 'system',
      userName: 'Sistem',
      userRole: 'admin',
      action: 'Araç Güncellendi',
      details: `${updated.plate} plakalı araç bilgileri güncellendi.`,
      timestamp: new Date().toLocaleString()
    });

    return updated;
  },

  async deleteVehicle(id: string) {
    const deleted: any = await VehicleRepository.delete(id);
    if (!deleted) {
      throw new Error('Silinmek istenen araç bulunamadı.');
    }

    await LogRepository.create({
      userId: 'system',
      userName: 'Sistem',
      userRole: 'admin',
      action: 'Araç Silindi',
      details: `${deleted.plate} plakalı araç sistemden silindi.`,
      timestamp: new Date().toLocaleString()
    });

    return { success: true };
  },

  async addHistory(id: string, body: any) {
    const { date, type, title, details, cost } = body;
    const vehicle: any = await VehicleRepository.findById(id);
    if (!vehicle) {
      throw new Error('Araç bulunamadı.');
    }

    const newHistoryItem = {
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'audit',
      title,
      details,
      cost
    };

    await VehicleRepository.addHistory(id, newHistoryItem);

    await LogRepository.create({
      userId: 'system',
      userName: 'Sistem',
      userRole: 'admin',
      action: 'Araç Geçmişi Eklendi',
      details: `${vehicle.plate} aracı için yeni geçmiş kaydı girildi: ${title}`,
      timestamp: new Date().toLocaleString()
    });

    return newHistoryItem;
  },

  async validateSeating(id: string, seatNumber: any, studentId: string, action: string) {
    const vehicle: any = await VehicleRepository.findById(id);
    if (!vehicle) {
      throw new Error('Araç bulunamadı.');
    }

    const seatNum = Number(seatNumber);
    if (seatNum <= 0 || seatNum > vehicle.capacity) {
      throw new Error(`Geçersiz koltuk numarası. Araç kapasitesi: ${vehicle.capacity}`);
    }

    if (action === 'assign') {
      const seatingMap = vehicle.seating || {};
      const alreadySeatedNum = Object.keys(seatingMap).find(key => seatingMap[key] === studentId);
      if (alreadySeatedNum) {
        throw new Error(`Öğrenci zaten bu araçta ${alreadySeatedNum} numaralı koltuğa yerleştirilmiş.`);
      }

      if (seatingMap[seatNumber] && seatingMap[seatNumber] !== studentId) {
        throw new Error(`${seatNumber} numaralı koltuk şu anda dolu.`);
      }
    }

    return { valid: true };
  },

  async updateSeating(id: string, seating: any, editorName?: string) {
    const vehicle: any = await VehicleRepository.findById(id);
    if (!vehicle) {
      throw new Error('Araç bulunamadı.');
    }

    const seatNumbers = Object.keys(seating);
    if (seatNumbers.length > vehicle.capacity) {
      throw new Error(`Toplam oturan sayısı araç kapasitesini (${vehicle.capacity}) aşamaz.`);
    }

    const studentIds = Object.values(seating).filter(sid => !!sid);
    const uniqueStudents = new Set(studentIds);
    if (uniqueStudents.size !== studentIds.length) {
      throw new Error('Aynı öğrenci birden fazla koltuğa atanamaz.');
    }

    const updated = await VehicleRepository.update(id, { seating });

    await LogRepository.create({
      userId: 'system',
      userName: editorName || 'Koordinatör',
      userRole: 'coordinator',
      action: 'Koltuk Planı Kaydedildi',
      details: `${vehicle.plate} plakalı servis aracı için koltuk planı güncellendi ve sunucuda doğrulandı.`,
      timestamp: new Date().toLocaleString()
    });

    return updated;
  }
};
