/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaymentRepository } from '../repositories/paymentRepository';
import { LogRepository } from '../repositories/logRepository';

export const PaymentService = {
  async getPayments(options: { page?: number; limit?: number; search?: string; status?: string; allowedStudentIds?: string[] } = {}) {
    return PaymentRepository.findAll(options);
  },

  async createPayment(body: any) {
    const { studentId, studentName, parentName, amount, dueDate, category, description, paymentMethod, currency } = body;

    if (!studentId || !amount) {
      throw new Error('Öğrenci ID ve Tutar zorunludur.');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Lütfen 0\'dan büyük geçerli bir tahsilat tutarı giriniz.');
    }

    const validatedCurrency = currency || 'TL';
    if (validatedCurrency !== 'TL') {
      throw new Error('Yalnızca Türk Lirası (TL) cinsinden tahsilat yapılabilir.');
    }

    const newPayment = {
      studentId,
      studentName: studentName || 'Bilinmeyen Öğrenci',
      parentName: parentName || 'Bilinmeyen Veli',
      amount: numAmount,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0],
      status: 'paid',
      category: category || 'Tahsilat',
      description: description || 'Servis Ücreti Tahsilatı',
      paymentMethod: paymentMethod || 'Nakit',
      currency: validatedCurrency,
      createdAt: new Date().toLocaleString('tr-TR')
    };

    const saved = await PaymentRepository.create(newPayment);

    await LogRepository.create({
      userId: 'system',
      userName: 'Muhasebe Sorumlusu',
      userRole: 'accounting',
      action: 'Finansal Tahsilat Yapıldı',
      details: `${newPayment.studentName} velisi ${newPayment.parentName}'den ${numAmount} ${validatedCurrency} tutarında ${newPayment.paymentMethod} tahsilat yapıldı.`,
      timestamp: new Date().toLocaleString()
    });

    return saved;
  },

  async rollbackPayment(id: string, operatorName?: string, operatorRole?: string) {
    const payment = await PaymentRepository.findById(id);
    if (!payment) {
      throw new Error('Geri alınmak istenen işlem bulunamadı.');
    }

    const descriptionWithRollback = (payment.description || '') + ` (İade Edildi. İptal Eden: ${operatorName || 'Sistem Yetkilisi'})`;

    const updated = await PaymentRepository.update(id, {
      status: 'pending',
      paymentDate: null,
      description: descriptionWithRollback
    });

    await LogRepository.create({
      userId: 'system',
      userName: operatorName || 'Sistem',
      userRole: operatorRole || 'accounting',
      action: 'Ödeme İşlemi Geri Alındı',
      details: `${payment.studentName} için yapılan ${payment.amount} TL tutarındaki tahsilat işlemi ${operatorName || 'Yönetici'} tarafından İPTAL edildi (Rollback). Borç durumu bekliyor konumuna getirildi.`,
      timestamp: new Date().toLocaleString()
    });

    return { success: true, payment: updated };
  }
};
