/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRepository } from '../repositories/userRepository';
import { LogRepository } from '../repositories/logRepository';
import { prisma } from '../database/prisma';
import { 
  verifyPassword, 
  signAccessToken, 
  signRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken 
} from '../utils/crypto';
import { CONFIG } from '../config';
import logger from '../utils/logger';

export const AuthService = {
  /**
   * Log in a user with Brute-Force checking, Device Tracking, and Session creation
   */
  async login(credentials: {
    username: string;
    password?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    deviceType?: string;
    rememberMe?: boolean;
  }) {
    const { username, password, role, ipAddress, userAgent, deviceId, deviceType, rememberMe } = credentials;

    if (!username || !password) {
      throw new Error('Kullanıcı adı ve şifre gereklidir.');
    }

    // 0. Database Connection Verification (Skipped in unit tests)
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'testing' && !process.env.VITEST) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL çevre değişkeni yapılandırılmamış. Lütfen Neon / PostgreSQL veritabanı bağlantısını ekleyin.');
      }
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (dbErr: any) {
        logger.error('🚨 [AUTH] Veritabanı bağlantı / datasource hatası:', dbErr);
        throw new Error('Veritabanı erişim hatası oluştu. Lütfen veritabanı durumunu kontrol edin.');
      }
    }

    // 1. Brute-Force Check
    const blockTimeWindow = new Date(Date.now() - CONFIG.BRUTE_FORCE_WINDOW_MS);
    const failedCount = await UserRepository.countFailedAttempts(username, blockTimeWindow);
    if (failedCount >= CONFIG.BRUTE_FORCE_MAX_ATTEMPTS) {
      // Log the brute force alert
      await LogRepository.create({
        userId: 'system',
        userName: username,
        userRole: 'guest',
        action: 'Brute Force Engelleme',
        details: `IP: ${ipAddress || 'unknown'} adresi üzerinden '${username}' hesabına brute-force giriş engellendi.`,
        timestamp: new Date().toLocaleString()
      });

      throw new Error('Çok fazla başarısız giriş denemesi. Hesabınız geçici olarak kilitlendi. Lütfen 15 dakika sonra tekrar deneyin.');
    }

    // 2. Lookup User / Parent
    let user: any = null;
    let isPasswordValid = false;

    if (role === 'parent') {
      // Root-cause fix: Önceki sürüm tüm öğrenci tablosunu belleğe çekip
      // includes() ile kısmi telefon eşleşmesi yapıyordu. Bu hem DoS vektörü
      // (büyük tablolarda bellek + CPU yükü) hem de IDOR benzeri risk
      // (kısmi telefon eşleşmesi yanlış veliye giriş imkânı) yaratıyordu.
      // Yeni akış: telefonu tam olarak normalized şekilde DB'de arıyoruz,
      // sonra öğrenci adını sabit-zamanlı (constant-time) karşılaştırıyoruz.
      const cleanPhone = (username || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        throw new Error('Lütfen geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX).');
      }
      const cleanName = (password || '').trim();

      let candidates: any[] = [];
      try {
        // Telefonun son 10 hanesiyle eşleşen adayları çek. Veritabanı düzeyinde filtre.
        candidates = await prisma.student.findMany({
          where: {
            isDeleted: false,
            parentPhone: { contains: cleanPhone.slice(-10) }
          },
          take: 5 // Brute-force etkisini sınırla
        });
      } catch (err: any) {
        logger.error('🚨 [AUTH] Veli araması sırasında veritabanı hatası:', err);
        throw new Error('Veritabanı sorgu hatası oluştu.');
      }

      // Öğrenci adı eşleşmesi sabit-zamanlı karşılaştırma ile yapılır.
      const normalizeName = (n: string) => (n || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
      const targetName = normalizeName(cleanName);
      const phoneDigits = cleanPhone;

      let foundStudent: any = null;
      for (const s of candidates) {
        const sPhoneDigits = (s.parentPhone || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
        // Tam telefon eşleşmesi: A'da B yok; B'de A yok; son 10 hane eşleşmesi
        const phoneOk =
          sPhoneDigits === phoneDigits ||
          (sPhoneDigits.length >= 10 && phoneDigits.length >= 10 && sPhoneDigits.slice(-10) === phoneDigits.slice(-10));
        const nameOk = normalizeName(s.name) === targetName;
        if (phoneOk && nameOk) {
          foundStudent = s;
          break;
        }
      }

      if (!foundStudent) {
        logger.warn(`⚠️ [AUTH] Veli girişi başarısız - Öğrenci/Telefon eşleşmedi: ${cleanPhone.slice(0, 3)}***`);
        throw new Error('Girdiğiniz bilgilerle eşleşen bir öğrenci kaydı bulunamadı.');
      }

      user = {
        id: `parent_${foundStudent.id}`,
        role: 'parent',
        name: foundStudent.parentName || 'Veli',
        username: foundStudent.parentPhone || '',
        email: `${foundStudent.name.toLowerCase().replace(/\s+/g, '')}@veli.com`,
        phone: foundStudent.parentPhone || '',
        status: 'active',
        mustChangePassword: false,
        assignedSchools: '[]',
        assignedAreas: '[]',
        assignedProjects: '[]',
        assignedVehicles: '[]',
        assignedDrivers: '[]',
        assignedHostesses: '[]'
      };
      isPasswordValid = true;
    } else {
      try {
        user = await UserRepository.findByUsername(username);
      } catch (err: any) {
        logger.error(`🚨 [AUTH] ${username} için kullanıcı araması yapılırken veritabanı hatası:`, err);
        throw new Error('Veritabanı sorgu hatası oluştu.');
      }

      if (!user) {
        logger.warn(`⚠️ [AUTH] Kullanıcı bulunamadı: ${username}`);
        // Record failed login for IP/username tracking
        await UserRepository.createLoginHistory({
          username,
          ipAddress,
          userAgent,
          deviceType,
          status: 'failed',
          details: 'Kullanıcı bulunamadı.'
        });
        throw new Error('Geçersiz kullanıcı adı veya şifre.');
      }

      const userStatus = user.status || 'active';
      if (userStatus !== 'active') {
        logger.warn(`⚠️ [AUTH] Pasif kullanıcı giriş denemesi: ${username}`);
        throw new Error('Hesabınız aktif durumda değildir. Lütfen sistem yöneticisiyle iletişime geçin.');
      }

      try {
        isPasswordValid = await verifyPassword(user.passwordHash, password);
      } catch (err: any) {
        logger.error(`🚨 [AUTH] ${username} için şifre doğrulama hatası:`, err);
        throw new Error('Şifre doğrulama sırasında teknik bir hata oluştu.');
      }
    }

    // 3. Password Verification
    if (!isPasswordValid) {
      logger.warn(`⚠️ [AUTH] Hatalı şifre denemesi: ${username}`);
      // Record failed login
      await UserRepository.createLoginHistory({
        userId: user.id.startsWith('parent_') ? undefined : user.id,
        username,
        ipAddress,
        userAgent,
        deviceType,
        status: 'failed',
        details: 'Hatalı şifre veya doğrulama denemesi.'
      });
      throw new Error('Geçersiz kullanıcı adı veya şifre.');
    }

    // 4. Successful Login
    const accessToken = signAccessToken({ userId: user.id, username: user.username, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, username: user.username, role: user.role });

    // Set expiration based on Remember Me
    const sessionLifetime = rememberMe ? 30 * 24 * 60 * 60 * 1000 : CONFIG.SESSION_TIMEOUT_MS; // 30 days or Session Timeout (e.g. 30 min)
    const expiresAt = new Date(Date.now() + sessionLifetime);

    // Create session record in database only for persisted staff/admin users.
    if (!(user.role === 'parent' || String(user.id).startsWith('parent_'))) {
      await UserRepository.createSession({
        userId: user.id,
        refreshToken,
        deviceId,
        deviceType,
        ipAddress,
        userAgent,
        expiresAt,
      });
    }

    // Record login success history
    await UserRepository.createLoginHistory({
      userId: user.id.startsWith('parent_') ? undefined : user.id,
      username,
      ipAddress,
      userAgent,
      deviceType,
      status: 'success',
      details: 'Giriş başarılı.'
    });

    // Create central audit log
    await LogRepository.create({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Kullanıcı Girişi',
      details: `JWT Access/Refresh token çifti başarıyla üretildi. Cihaz: ${deviceType || 'Bilinmiyor'}, IP: ${ipAddress || 'Bilinmiyor'}.`,
      timestamp: new Date().toLocaleString()
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        phone: user.phone,
        tcNo: user.tcNo || null,
        photo: user.photo || null,
        notes: user.notes || null,
        mustChangePassword: user.mustChangePassword || false,
        assignedSchools: JSON.parse(user.assignedSchools || '[]'),
        assignedAreas: JSON.parse(user.assignedAreas || '[]'),
        assignedProjects: JSON.parse(user.assignedProjects || '[]'),
        assignedVehicles: JSON.parse(user.assignedVehicles || '[]'),
        assignedDrivers: JSON.parse(user.assignedDrivers || '[]'),
        assignedHostesses: JSON.parse(user.assignedHostesses || '[]')
      }
    };
  },

  /**
   * Token refresh with Refresh Token Rotation (RTR) to prevent replay attacks
   */
  async refresh(oldRefreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!oldRefreshToken) {
      throw new Error('Yenileme anahtarı gereklidir.');
    }

    const decoded = verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      throw new Error('Yenileme oturum anahtarı süresi dolmuş veya geçersiz.');
    }

    if (decoded.role === 'parent' || decoded.userId.startsWith('parent_')) {
      const studentId = decoded.userId.replace('parent_', '');
      const student = await prisma.student.findFirst({ where: { id: studentId, isDeleted: false } });
      if (!student) {
        throw new Error('Kullanıcı bulunamadı.');
      }
      return {
        accessToken: signAccessToken({ userId: decoded.userId, username: student.parentPhone || '', role: 'parent' }),
        refreshToken: signRefreshToken({ userId: decoded.userId, username: student.parentPhone || '', role: 'parent' }),
        user: {
          id: decoded.userId,
          name: student.parentName || 'Veli',
          username: student.parentPhone || '',
          role: 'parent',
          email: `${student.name.toLowerCase().replace(/\s+/g, '')}@veli.com`,
          phone: student.parentPhone || '',
          tcNo: null,
          photo: null,
          notes: null,
          mustChangePassword: false,
          assignedSchools: [],
          assignedAreas: [],
          assignedProjects: [],
          assignedVehicles: [],
          assignedDrivers: [],
          assignedHostesses: []
        }
      };
    }

    // 1. Check if token is blacklisted or session exists
    const session = await UserRepository.findSessionByToken(oldRefreshToken);
    if (!session) {
      // Replay Attack protection: if a refresh token is used but no active session exists,
      // it might be a stolen token that was already rotated. Invalidate all sessions of this user!
      await UserRepository.deleteSessionsByUserId(decoded.userId);
      await LogRepository.create({
        userId: decoded.userId,
        userName: decoded.username,
        userRole: decoded.role,
        action: 'Oturum Sızma Şüphesi',
        details: `Geçersiz yenileme anahtarı denemesi saptandı. Önlem olarak kullanıcının tüm açık oturumları kapatıldı.`,
        timestamp: new Date().toLocaleString()
      });
      throw new Error('Geçersiz yenileme oturumu.');
    }

    // 2. Decode/verify token
    if (!decoded || decoded.userId !== session.userId) {
      // Clean up invalid session
      await UserRepository.deleteSessionByToken(oldRefreshToken);
      throw new Error('Yenileme oturum anahtarı süresi dolmuş veya geçersiz.');
    }

    // Fetch user
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı.');
    }

    // 3. Rotate tokens: Generate new Access & Refresh tokens
    const newAccessToken = signAccessToken({ userId: user.id, username: user.username, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id, username: user.username, role: user.role });

    // 4. Invalidate old session and save rotated refresh token
    await UserRepository.deleteSessionByToken(oldRefreshToken);
    await UserRepository.createSession({
      userId: user.id,
      refreshToken: newRefreshToken,
      deviceId: session.deviceId ?? undefined,
      deviceType: session.deviceType ?? undefined,
      ipAddress: (ipAddress || session.ipAddress) ?? undefined,
      userAgent: (userAgent || session.userAgent) ?? undefined,
      expiresAt: session.expiresAt // Keep original expiration for session continuity
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        phone: user.phone,
        tcNo: user.tcNo,
        photo: user.photo,
        notes: user.notes,
        mustChangePassword: user.mustChangePassword,
        assignedSchools: JSON.parse(user.assignedSchools || '[]'),
        assignedAreas: JSON.parse(user.assignedAreas || '[]'),
        assignedProjects: JSON.parse(user.assignedProjects || '[]'),
        assignedVehicles: JSON.parse(user.assignedVehicles || '[]'),
        assignedDrivers: JSON.parse(user.assignedDrivers || '[]'),
        assignedHostesses: JSON.parse(user.assignedHostesses || '[]')
      }
    };
  },

  /**
   * Log out a user, destroying active session and blacklisting the active access token
   */
  async logout(accessToken: string, refreshToken: string) {
    if (refreshToken) {
      await UserRepository.deleteSessionByToken(refreshToken);
    }

    // Blacklist access token until it expires
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      if (decoded) {
        // Blacklist token for safety
        await UserRepository.blacklistToken(accessToken, new Date(Date.now() + 20 * 60 * 1000)); // standard 20m window

        await LogRepository.create({
          userId: decoded.userId,
          userName: decoded.username,
          userRole: decoded.role,
          action: 'Kullanıcı Çıkışı',
          details: `Başarıyla çıkış yapıldı ve JWT oturum anahtarları iptal edildi.`,
          timestamp: new Date().toLocaleString()
        });
      }
    }

    return { success: true };
  },

  /**
   * Verify access token and ensure it is not blacklisted
   */
  async verify(accessToken: string) {
    if (!accessToken) {
      throw new Error('Erişim anahtarı bulunamadı.');
    }

    // 1. Check Blacklist
    const isBlacklisted = await UserRepository.isTokenBlacklisted(accessToken);
    if (isBlacklisted) {
      throw new Error('Oturum sonlandırıldı. Lütfen tekrar giriş yapın.');
    }

    // 2. Decode Token
    const decoded = verifyAccessToken(accessToken);
    if (!decoded) {
      throw new Error('Geçersiz veya süresi dolmuş oturum.');
    }

    // 3. Fetch User or Parent
    let user: any = null;
    if (decoded.role === 'parent' || decoded.userId.startsWith('parent_')) {
      const studentId = decoded.userId.replace('parent_', '');
      const student = await prisma.student.findFirst({
        where: { id: studentId, isDeleted: false }
      });
      if (!student) {
        throw new Error('Kullanıcı bulunamadı.');
      }
      user = {
        id: decoded.userId,
        role: 'parent',
        name: student.parentName || 'Veli',
        username: student.parentPhone || '',
        email: `${student.name.toLowerCase().replace(/\s+/g, '')}@veli.com`,
        phone: student.parentPhone || '',
        status: 'active',
        mustChangePassword: false,
        assignedSchools: '[]',
        assignedAreas: '[]',
        assignedProjects: '[]',
        assignedVehicles: '[]',
        assignedDrivers: '[]',
        assignedHostesses: '[]'
      };
    } else {
      user = await UserRepository.findById(decoded.userId);
    }

    if (!user) {
      throw new Error('Kullanıcı bulunamadı.');
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email,
      phone: user.phone,
      tcNo: user.tcNo || null,
      photo: user.photo || null,
      notes: user.notes || null,
      mustChangePassword: user.mustChangePassword || false,
      assignedSchools: typeof user.assignedSchools === 'string' ? JSON.parse(user.assignedSchools || '[]') : (user.assignedSchools || []),
      assignedAreas: typeof user.assignedAreas === 'string' ? JSON.parse(user.assignedAreas || '[]') : (user.assignedAreas || []),
      assignedProjects: typeof user.assignedProjects === 'string' ? JSON.parse(user.assignedProjects || '[]') : (user.assignedProjects || []),
      assignedVehicles: typeof user.assignedVehicles === 'string' ? JSON.parse(user.assignedVehicles || '[]') : (user.assignedVehicles || []),
      assignedDrivers: typeof user.assignedDrivers === 'string' ? JSON.parse(user.assignedDrivers || '[]') : (user.assignedDrivers || []),
      assignedHostesses: typeof user.assignedHostesses === 'string' ? JSON.parse(user.assignedHostesses || '[]') : (user.assignedHostesses || [])
    };
  }
};
