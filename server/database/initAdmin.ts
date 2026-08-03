/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { prisma } from './prisma';
import argon2 from 'argon2';
import { logger } from '../utils/logger';

export async function initAdmin() {
  try {
    logger.info('🔍 [ADMIN] System Admin (Yönetici) kontrolü yapılıyor...');

    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️ [ADMIN] DATABASE_URL ortam değişkeni tanımlı değil. Veritabanı yönetici seeding adımı atlanıyor.');
      return;
    }

    // Migrate any legacy elevated roles in DB to admin
    try {
      await prisma.user.updateMany({
        where: { role: { equals: 'super_admin', mode: 'insensitive' } },
        data: { role: 'admin' }
      });
    } catch (migErr) {
      // Ignored if DB table not yet ready or empty
    }

    // Read configuration from environment variables
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@localhost';
    const configuredPassword = process.env.ADMIN_PASSWORD;

    let password: string;
    if (!configuredPassword) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('🚨 [ADMIN] Production ortamında ADMIN_PASSWORD ortam değişkeni tanımlanmalıdır!');
        throw new Error('Production ortamında ADMIN_PASSWORD eksik.');
      }

      password = crypto.randomBytes(18).toString('base64url');
      logger.warn(`⚠️ [ADMIN] ADMIN_PASSWORD bulunamadı. Development için tek kullanımlık geçici şifre üretildi: "${password}"`);
    } else {
      password = configuredPassword;
    }

    // Check if System Admin already exists in the database
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          role: 'admin',
          username: username,
          email: email,
          passwordHash: passwordHash,
          status: 'active'
        }
      });
      logger.info(`✅ [ADMIN] Yönetici hesabı güncellendi ve doğrulandı. (Kullanıcı Adı: ${username})`);
      return;
    }

    // Create the primary System Admin account
    await prisma.user.create({
      data: {
        id: 'admin-bkt',
        role: 'admin',
        name: 'Berkaytur Sistem Yöneticisi',
        username: username,
        passwordHash: passwordHash,
        email: email,
        phone: null,
        schoolId: null,
        vehicleId: null,
        status: 'active',
        mustChangePassword: false,
        assignedSchools: JSON.stringify([]),
        assignedAreas: JSON.stringify([]),
        assignedProjects: JSON.stringify([]),
        assignedVehicles: JSON.stringify([]),
        assignedDrivers: JSON.stringify([]),
        assignedHostesses: JSON.stringify([])
      }
    });

    logger.info(`🚀 [ADMIN] Berkaytur Yönetici hesabı başarıyla oluşturuldu! (Kullanıcı Adı: ${username})`);
  } catch (error) {
    logger.error('❌ [ADMIN] Yönetici hesabı oluşturulurken hata meydana geldi:', error);
  }
}
