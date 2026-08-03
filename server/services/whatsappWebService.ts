/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogRepository } from '../repositories/logRepository';
import { prisma } from '../database/prisma';
import logger from '../utils/logger';

export type WhatsAppConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_RECEIVED' | 'CONNECTED';

export interface WhatsAppServiceState {
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  phoneNumber: string | null;
  logs: string[];
}

interface QueueItem {
  id: string; // matches DB message ID
  phone: string;
  message: string;
  mediaType?: 'PDF' | 'IMAGE' | 'LOCATION' | 'AUDIO' | 'FILE';
  attempts: number;
  nextAttemptTime: number;
}

class WhatsAppWebManager {
  private state: WhatsAppServiceState = {
    status: 'DISCONNECTED',
    qrCode: null,
    phoneNumber: null,
    logs: ['[Sistem] WhatsApp Hizmeti Başlatıldı. Çevresel parametreler denetleniyor.']
  };

  private queue: QueueItem[] = [];
  private processing = false;
  private queueInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isReconnecting = false;

  constructor() {
    this.addLog('Güvenli üretim standardı kontrolü yapılıyor...');
    // Initialize connection and begin queue processor
    this.connect();
    this.startQueueProcessor();
  }

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const logLine = `[${timestamp}] ${message}`;
    this.state.logs.unshift(logLine);
    if (this.state.logs.length > 100) {
      this.state.logs = this.state.logs.slice(0, 100);
    }
    logger.info(`[WhatsAppWebService] ${message}`);
  }

  public getState(): WhatsAppServiceState {
    return { ...this.state };
  }

  /**
   * Health check, reconnect and setup with max 5 retries to prevent infinite loops
   */
  public async connect(): Promise<{ success: boolean; message: string }> {
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!gatewayUrl) {
      this.state.status = 'DISCONNECTED';
      this.state.qrCode = null;
      this.state.phoneNumber = null;
      this.addLog('⚠️ UYARI: WHATSAPP_GATEWAY_URL çevre değişkeni tanımlı değil.');
      this.addLog('Sistem dürüstçe "Standby / Çevrimdışı (Manual Gönderim)" moduna geçti.');
      this.addLog('Tüm toplu mesajlar tarayıcı üzerinden manuel yönlendirme (web.whatsapp.com) ile güvenle iletilecektir.');
      return {
        success: false,
        message: 'WHATSAPP_GATEWAY_URL çevre değişkeni tanımlanmadığı için canlı API bağlantısı kurulamıyor.'
      };
    }

    this.state.status = 'CONNECTING';
    this.addLog(`Canlı API Ağ Geçidine bağlanılıyor: ${gatewayUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(`${gatewayUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        this.state.status = 'CONNECTED';
        this.state.qrCode = null;
        this.state.phoneNumber = data.phoneNumber || 'Kurumsal Bulut Hattı';
        this.reconnectAttempts = 0; // Reset reconnect counter on successful health check
        this.addLog(`✅ Canlı API Ağ Geçidi Bağlantısı Başarılı! Aktif Hat: ${this.state.phoneNumber}`);

        await LogRepository.create({
          userId: 'system',
          userName: 'WhatsApp Web API',
          userRole: 'admin',
          action: 'WhatsApp Gateway Bağlantısı Başarılı',
          details: `WhatsApp API Gateway (${gatewayUrl}) ile güvenli bağlantı sağlandı. Hat: ${this.state.phoneNumber}`,
          timestamp: new Date().toLocaleString()
        }).catch(() => {});

        return { success: true, message: 'Canlı API ağ geçidine başarıyla bağlanıldı.' };
      } else {
        throw new Error(`Ağ Geçidi HTTP hata kodu döndürdü: ${res.status}`);
      }
    } catch (err: any) {
      this.state.status = 'DISCONNECTED';
      this.state.qrCode = null;
      this.state.phoneNumber = null;
      this.addLog(`❌ Canlı Ağ Geçidi Bağlantı Hatası: ${err.message || err}`);

      // Schedule graceful reconnect with max retries and exponential backoff
      this.scheduleReconnect();

      return {
        success: false,
        message: `Ağ Geçidi bağlantı hatası: ${err.message || 'Yanıt alınamadı'}`
      };
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addLog(`🚨 Maksimum yeniden bağlanma denemesine (${this.maxReconnectAttempts}) ulaşıldı. Otomatik reconnect durduruldu.`);
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts += 1;
    const backoffMs = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 2000); // 4s, 8s, 16s, 32s, 30s max
    this.addLog(`🔄 Otomatik yeniden bağlanma planlandı (${this.reconnectAttempts}/${this.maxReconnectAttempts}). ${backoffMs / 1000} saniye sonra denenecek...`);

    setTimeout(async () => {
      this.isReconnecting = false;
      await this.connect().catch(() => {});
    }, backoffMs);
  }

  public async disconnect(): Promise<void> {
    this.addLog('Canlı bağlantı kesiliyor...');
    this.state.status = 'DISCONNECTED';
    this.state.qrCode = null;
    this.state.phoneNumber = null;
    this.addLog('WhatsApp canlı API bağlantısı tamamen kapatıldı. Sistem pasif moddadır.');
  }

  /**
   * Queue message for direct API dispatch
   */
  public async queueMessage(messageId: string, phone: string, message: string, mediaType?: 'PDF' | 'IMAGE' | 'LOCATION' | 'AUDIO' | 'FILE') {
    const item: QueueItem = {
      id: messageId,
      phone,
      message,
      mediaType,
      attempts: 0,
      nextAttemptTime: Date.now()
    };

    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      this.addLog(`Vercel Serverless ortamında anlık WhatsApp API gönderimi başlatılıyor: ID ${messageId} -> Alıcı: ${phone}`);
      this.processQueueItem(item).catch(err => {
        logger.error('[WhatsAppWebService] Immediate serverless dispatch error:', err);
      });
      return;
    }

    this.queue.push(item);
    this.addLog(`Yeni mesaj API gönderim kuyruğuna eklendi: ID ${messageId} -> Alıcı: ${phone}`);
  }

  /**
   * Start asynchronous loop to process queue with rate limiting and retry mechanism
   */
  private startQueueProcessor() {
    if (process.env.VERCEL || process.env.VERCEL_ENV) return;
    if (this.queueInterval) return;

    this.queueInterval = setInterval(async () => {
      if (this.processing || this.queue.length === 0) return;
      this.processing = true;

      const now = Date.now();
      const nextIndex = this.queue.findIndex(item => item.nextAttemptTime <= now);

      if (nextIndex !== -1) {
        const item = this.queue[nextIndex];
        // Remove from queue temporarily while we process it
        this.queue.splice(nextIndex, 1);

        try {
          await this.processQueueItem(item);
        } catch (err) {
          logger.error('[WhatsAppWebService] Queue processing error:', err);
        }
      }

      this.processing = false;
    }, 2000); // Rate-limiting: process max 1 message every 2 seconds to avoid WhatsApp spam triggers
  }

  /**
   * Real API Dispatch with Timeout & Retries
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!gatewayUrl) {
      this.addLog(`⚠️ [Kuyruk] Gönderim başarısız: WHATSAPP_GATEWAY_URL tanımlı değil. ID: ${item.id}`);
      await prisma.message.update({
        where: { id: item.id },
        data: { status: 'failed' }
      }).catch(() => {});
      return;
    }

    this.addLog(`[Kuyruk] Gönderiliyor: ID ${item.id} -> ${item.phone} (Deneme: ${item.attempts + 1})`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s API timeout

      const cleanPhone = item.phone.replace(/\s+/g, '').replace('+', '');

      const payload = {
        phone: cleanPhone,
        message: item.message,
        mediaType: item.mediaType || null,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`${gatewayUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : ''
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        this.addLog(`✅ [Kuyruk] İletildi! ID: ${item.id} -> ${item.phone}`);
        await prisma.message.update({
          where: { id: item.id },
          data: { status: 'sent' } // Status updated on real delivery only! No fake delivery statuses
        }).catch(() => {});
      } else {
        const errorText = await res.text().catch(() => 'Bilinmeyen Hata');
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

    } catch (err: any) {
      this.addLog(`❌ [Kuyruk] Gönderim Hatası (ID: ${item.id}): ${err.message || err}`);

      item.attempts += 1;
      if (item.attempts < 3) {
        // Exponential Backoff: wait 4s after 1st attempt, 8s after 2nd attempt
        const delayMs = Math.pow(2, item.attempts + 1) * 1000;
        item.nextAttemptTime = Date.now() + delayMs;
        this.queue.push(item); // Re-queue
        this.addLog(`[Kuyruk] Mesaj yeniden sıraya alındı. ${delayMs / 1000} saniye sonra tekrar denenecek.`);
      } else {
        this.addLog(`🚨 [Kuyruk] Maksimum deneme sayısına ulaşıldı. Mesaj iletilemedi: ID: ${item.id}`);
        await prisma.message.update({
          where: { id: item.id },
          data: { status: 'failed' }
        }).catch(() => {});
      }
    }
  }

  /**
   * Direct trigger method used by client for active message requests
   */
  public async sendMediaMessage(phone: string, message: string, mediaType: 'PDF' | 'IMAGE' | 'LOCATION' | 'AUDIO' | 'FILE') {
    this.addLog(`Tekli Mesaj İstemi [${mediaType}] -> Alıcı: ${phone}`);

    const newDelivery = await prisma.message.create({
      data: {
        recipientPhone: phone,
        recipientName: 'Veli/Sürücü (Münferit)',
        message: `[${mediaType}] ${message}`,
        templateName: `Medya:${mediaType}`,
        status: 'pending', // Starts as pending, queue will update it on real dispatch
        timestamp: new Date().toLocaleString()
      }
    });

    // Queue for asynchronous delivery
    await this.queueMessage(newDelivery.id.toString(), phone, message, mediaType);

    return { success: true, messageId: newDelivery.id, status: 'pending' };
  }
}

export const WhatsAppWebService = new WhatsAppWebManager();
