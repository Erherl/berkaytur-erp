/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../database/prisma';
import { CONFIG } from '../config';
import { LogRepository } from '../repositories/logRepository';
import { DatabaseResilience } from '../database/databaseResilience';
import logger from '../utils/logger';

const TABLES_METADATA = [
  { name: 'users', model: prisma.user },
  { name: 'schools', model: prisma.school },
  { name: 'students', model: prisma.student },
  { name: 'parents', model: prisma.parent },
  { name: 'drivers', model: prisma.driver },
  { name: 'hostesses', model: prisma.hostess },
  { name: 'vehicles', model: prisma.vehicle },
  { name: 'routes', model: prisma.route },
  { name: 'stops', model: prisma.stop },
  { name: 'attendance', model: prisma.attendance },
  { name: 'notifications', model: prisma.notification },
  { name: 'messages', model: prisma.message },
  { name: 'logs', model: prisma.log },
  { name: 'settings', model: prisma.setting },
  { name: 'backups', model: prisma.backup },
  { name: 'documents', model: prisma.document },
  { name: 'payments', model: prisma.payment },
  { name: 'applications', model: prisma.application },
  { name: 'contracts', model: prisma.contract },
  { name: 'appStorageEntries', model: prisma.appStorageEntry }
];

export const BackupService = {
  /**
   * Run full database dump and save JSON backup
   */
  async runBackup(triggeredBy = 'Otomatik Sistem Yedekleyici') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.json`;
    const backupPath = path.join(CONFIG.BACKUPS_DIR, filename);

    // Dynamic relational table dump using concurrent reads
    const dumpData: any = {};
    await Promise.all(
      TABLES_METADATA.map(async (table) => {
        try {
          dumpData[table.name] = await (table.model as any).findMany();
        } catch (err) {
          dumpData[table.name] = [];
        }
      })
    );

    if (!fs.existsSync(CONFIG.BACKUPS_DIR)) {
      fs.mkdirSync(CONFIG.BACKUPS_DIR, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(dumpData, null, 2), 'utf8');

    const sizeBytes = fs.statSync(backupPath).size;
    const backupRecord = await prisma.backup.create({
      data: {
        filename,
        timestamp: new Date().toLocaleString('tr-TR'),
        sizeBytes,
        createdBy: triggeredBy
      }
    });

    await LogRepository.create({
      userId: 'system',
      userName: 'Yedekleme Sistemi',
      userRole: 'admin',
      action: 'Otomatik Yedek Oluşturuldu',
      details: `${filename} isimli veritabanı yedeği (${(sizeBytes / 1024).toFixed(2)} KB) başarıyla sistem tarafından yedeklendi.`,
      timestamp: new Date().toLocaleString()
    });

    return backupRecord;
  },

  /**
   * Initialize background cron scheduler
   */
  initScheduler() {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      logger.info('⏰ [SCHEDULER] Vercel Serverless ortamı algılandı. Sürekli çalışan setInterval zamanlayıcısı devredışı bırakıldı. Dış Vercel Cron tetikleyicisi kullanılmalıdır.');
      return;
    }

    logger.info('⏰ [SCHEDULER] Günlük otomatik veritabanı yedekleme sistemi başlatıldı.');
    // Run backup every 24 hours
    const intervalMs = 24 * 60 * 60 * 1000;
    
    // Schedule periodic execution
    const timer = setInterval(async () => {
      try {
        logger.info('⏰ [SCHEDULER] Günlük otomatik yedekleme başlatılıyor...');
        await this.runBackup();
        logger.info('⏰ [SCHEDULER] Günlük otomatik yedekleme başarıyla tamamlandı.');
        
        logger.info('🧹 [SCHEDULER] Günlük otomatik veritabanı bakım çalışması başlatılıyor...');
        await DatabaseResilience.runMaintenance();
        logger.info('🧹 [SCHEDULER] Günlük otomatik bakımı tamamlandı.');
      } catch (err: any) {
        logger.error('❌ [SCHEDULER] Günlük otomatik işlem hatası:', err);
      }
    }, intervalMs);

    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }
};
