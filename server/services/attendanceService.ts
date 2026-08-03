/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttendanceRepository } from '../repositories/attendanceRepository';
import { LogRepository } from '../repositories/logRepository';
import { prisma } from '../database/prisma';

export const AttendanceService = {
  async getAttendance(options: { page?: number; limit?: number; date?: string; status?: string; allowedStudentIds?: string[] } = {}) {
    return AttendanceRepository.findAll(options);
  },

  async saveAttendance(body: any) {
    const { studentId, date, shift, status, editorName, editorRole } = body;
    if (!studentId || !date || !shift || !status) {
      throw new Error('Eksik puantaj parametreleri.');
    }

    const existing = await AttendanceRepository.findByStudentDateShift(studentId, date, shift);

    const timestamp = new Date().toLocaleString('tr-TR');
    const editorInfo = `${editorName || 'Sistem Yetkilisi'} (${editorRole || 'Coordinator'})`;

    let actionMsg = '';

    if (existing) {
      const oldValue = existing.status;
      actionMsg = `Güncellendi: ${oldValue} -> ${status}`;

      await AttendanceRepository.update(existing.id, {
        status,
        timestamp,
      });
    } else {
      actionMsg = `Yeni Kayıt: ${status}`;
      await AttendanceRepository.create({
        studentId,
        date,
        shift,
        status,
        timestamp,
      });
    }

    // Get student details safely from DB
    const student = await prisma.student.findFirst({
      where: { id: studentId, isDeleted: false },
    });
    const studentName = student ? student.name : `Öğrenci ID: ${studentId}`;

    await LogRepository.create({
      userId: 'system',
      userName: editorName || 'Sistem',
      userRole: editorRole || 'coordinator',
      action: 'Puantaj Değişikliği',
      details: `${studentName} için ${date} (${shift === 'morning' ? 'Sabah' : 'Akşam'}) puantaj kaydı ${actionMsg} olarak işlendi. Değiştiren: ${editorInfo}`,
      timestamp
    });

    return { success: true, message: 'Puantaj kaydı başarıyla kaydedildi.' };
  }
};
