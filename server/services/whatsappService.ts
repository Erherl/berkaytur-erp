/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { LogRepository } from '../repositories/logRepository';
import { WhatsAppWebService } from './whatsappWebService';
import logger from '../utils/logger';

export const WhatsAppService = {
  async getLogs(options: { page?: number; limit?: number } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 50;
    const skip = (page - 1) * limit;

    // Use concurrent counts and paginated findMany instead of findMany without limits
    const [total, messages] = await Promise.all([
      prisma.message.count(),
      prisma.message.findMany({
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      })
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async send(body: any) {
    const { recipientPhone, recipientName, message, templateName } = body;
    if (!recipientPhone || !message) {
      throw new Error('recipientPhone ve message alanları zorunludur.');
    }

    let finalMessage = message;
    let finalTemplateName = templateName || 'Genel Bilgilendirme';
    let attachedDocId: string | null = null;
    let attachedFilename: string | null = null;

    const lowerMessage = message.toLowerCase();
    const isPdfRequest = lowerMessage.includes('ekli') || 
                          lowerMessage.includes('ekteki') || 
                          lowerMessage.includes('hakediş') || 
                          lowerMessage.includes('hakedis') || 
                          lowerMessage.includes('sözleşme') || 
                          lowerMessage.includes('sozlesme') || 
                          lowerMessage.includes('makbuz') || 
                          lowerMessage.includes('ödeme planı') || 
                          lowerMessage.includes('odeme plani') || 
                          lowerMessage.includes('iade') || 
                          lowerMessage.includes('ceza') || 
                          lowerMessage.includes('fatura') ||
                          lowerMessage.includes('belge') ||
                          lowerMessage.includes('evrak') ||
                          lowerMessage.includes('rapor');

    if (isPdfRequest) {
      try {
        const { PdfGeneratorService } = await import('./pdfGeneratorService');
        const { DocumentService } = await import('./documentService');

        // Determine docType and category
        let docType = 'Genel';
        let category = 'Genel';
        if (lowerMessage.includes('detay')) {
          docType = 'Hakediş Detayı';
          category = 'Hakediş';
        } else if (lowerMessage.includes('hakediş') || lowerMessage.includes('hakedis') || lowerMessage.includes('tedarikçi') || lowerMessage.includes('tedarikci')) {
          docType = 'Hakediş Özeti';
          category = 'Hakediş';
        } else if (lowerMessage.includes('sözleşme') || lowerMessage.includes('sozlesme') || lowerMessage.includes('mukavele')) {
          docType = 'Servis Sözleşmesi';
          category = 'Sözleşmeler';
        } else if (lowerMessage.includes('plan')) {
          docType = 'Ödeme Planı';
          category = 'Finans';
        } else if (lowerMessage.includes('makbuz') || lowerMessage.includes('tahsilat')) {
          docType = 'Tahsilat Makbuzu';
          category = 'Finans';
        } else if (lowerMessage.includes('iade') || lowerMessage.includes('geri ödeme')) {
          docType = 'İade Hesaplaması';
          category = 'Finans';
        } else if (lowerMessage.includes('ceza') || lowerMessage.includes('kesinti') || lowerMessage.includes('ihlal')) {
          docType = 'Ceza Bildirimi';
          category = 'Ceza';
        } else if (lowerMessage.includes('fatura') || lowerMessage.includes('kdv') || lowerMessage.includes('e-arşiv')) {
          docType = 'Fatura';
          category = 'Finans';
        } else {
          docType = 'Resmi Evrak';
          category = 'Belgeler';
        }

        // Generate the PDF
        const { filename, base64 } = PdfGeneratorService.generatePDF(
          docType, 
          recipientName || 'Sayın Yetkili/Veli', 
          recipientPhone, 
          message
        );

        // Upload/Save document record in database and disk
        const savedDoc = await DocumentService.uploadDocument({
          name: filename,
          category: category,
          fileSize: '1.4 MB',
          uploadedBy: 'Berkaytur Akıllı AI Servisi',
          fileData: base64,
          ownerUserId: 'system'
        }, {
          id: 'system',
          name: 'Berkaytur Akıllı AI Servisi',
          role: 'admin'
        });
        attachedDocId = savedDoc.id;
        attachedFilename = filename;

        // Wrap message with attachment meta block (Never send just plain text, always single action)
        finalMessage = `[PDF Eki: ${filename}] Sayın ${recipientName || 'Kullanıcımız'}, ${message} (Belgeyi indirmek için tıklayın: /api/v1/documents/download/${savedDoc.id})`;
        finalTemplateName = `Medya:PDF:${docType}`;

      } catch (err: any) {
        logger.error('Auto-PDF Generation Failed inside WhatsApp flow:', err);
        // Fallback gracefully without stopping the system
      }
    }

    const isGatewayConfigured = !!process.env.WHATSAPP_GATEWAY_URL;

    const newDelivery = await prisma.message.create({
      data: {
        recipientPhone,
        recipientName: recipientName || 'Veli/Sürücü',
        message: finalMessage,
        templateName: finalTemplateName,
        status: isGatewayConfigured ? 'pending' : 'sent', // 'pending' for live API gateway, 'sent' for manual web flow
        timestamp: new Date().toLocaleString(),
      }
    });

    if (isGatewayConfigured) {
      // Queue the message for live API gateway transmission
      await WhatsAppWebService.queueMessage(
        newDelivery.id.toString(),
        recipientPhone,
        finalMessage,
        isPdfRequest ? 'PDF' : undefined
      );
    }

    await LogRepository.create({
      userId: 'system',
      userName: 'WhatsApp Gateway API',
      userRole: 'admin',
      action: isPdfRequest ? 'Otomatik Belgeli WhatsApp Gönderimi' : 'Otomatik WhatsApp API Gönderimi',
      details: isPdfRequest
        ? `${recipientName} (${recipientPhone}) kişisine PDF ekli resmi evrak gönderildi: "${attachedFilename}"`
        : `${recipientName} (${recipientPhone}) kişisine otomatik şablon mesajı gönderildi: "${message.substring(0, 50)}..."`,
      timestamp: new Date().toLocaleString()
    });

    return {
      messageId: newDelivery.id,
      status: isGatewayConfigured ? 'pending' : 'sent',
      attachedDocId,
      attachedFilename,
      details: isPdfRequest 
        ? `WhatsApp Gateway API ve Berkaytur Akıllı Fiyat Motoru evrağı oluşturup belge eki olarak gönderdi: ${attachedFilename}`
        : 'WhatsApp Gateway API mesaj gönderim isteğini kabul etti.'
    };
  }
};
