/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'READ_USERS', 'MANAGE_USERS',
    'READ_SCHOOLS', 'WRITE_SCHOOLS', 'CREATE_SCHOOLS', 'UPDATE_SCHOOLS', 'DELETE_SCHOOLS',
    'READ_STUDENTS', 'WRITE_STUDENTS',
    'READ_VEHICLES', 'WRITE_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_PAYMENTS', 'WRITE_PAYMENTS',
    'READ_APPLICATIONS', 'WRITE_APPLICATIONS',
    'READ_CONTRACTS', 'WRITE_CONTRACTS',
    'READ_LOGS', 'WRITE_LOGS',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS',
    'READ_WHATSAPP', 'WRITE_WHATSAPP',
    'READ_REPORTS', 'MANAGE_SYSTEM',
    'ADMIN_ACCESS', 'MANAGE_ROLES', 'MANAGE_DATABASE', 'MANAGE_BACKUP', 'RESTORE_BACKUP'
  ],
  manager: [
    'READ_USERS', 'MANAGE_USERS',
    'READ_SCHOOLS', 'WRITE_SCHOOLS', 'CREATE_SCHOOLS', 'UPDATE_SCHOOLS', 'DELETE_SCHOOLS',
    'READ_STUDENTS', 'WRITE_STUDENTS',
    'READ_VEHICLES', 'WRITE_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_PAYMENTS', 'WRITE_PAYMENTS',
    'READ_APPLICATIONS', 'WRITE_APPLICATIONS',
    'READ_CONTRACTS', 'WRITE_CONTRACTS',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS',
    'READ_WHATSAPP', 'WRITE_WHATSAPP',
    'READ_REPORTS'
  ],
  coordinator: [
    'READ_USERS', 'MANAGE_USERS',
    'READ_SCHOOLS', 'UPDATE_SCHOOLS',
    'READ_STUDENTS', 'WRITE_STUDENTS',
    'READ_VEHICLES', 'WRITE_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_APPLICATIONS', 'WRITE_APPLICATIONS',
    'READ_CONTRACTS', 'WRITE_CONTRACTS',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS',
    'READ_WHATSAPP', 'WRITE_WHATSAPP',
    'READ_REPORTS'
  ],
  accounting: [
    'READ_SCHOOLS',
    'READ_STUDENTS',
    'READ_PAYMENTS', 'WRITE_PAYMENTS',
    'READ_REPORTS'
  ],
  parent: [
    'READ_STUDENTS',
    'READ_ATTENDANCE',
    'READ_CONTRACTS',
    'READ_DOCUMENTS'
  ],
  driver: [
    'READ_STUDENTS',
    'READ_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS'
  ],
  hostess: [
    'READ_STUDENTS',
    'READ_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS'
  ],
  operation: [
    'READ_SCHOOLS',
    'READ_STUDENTS',
    'READ_VEHICLES',
    'READ_ATTENDANCE', 'WRITE_ATTENDANCE',
    'READ_APPLICATIONS',
    'READ_DOCUMENTS', 'WRITE_DOCUMENTS',
    'READ_REPORTS'
  ]
};

async function authenticateRequest(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const verified = await AuthService.verify(token);
  if (!verified) {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş JWT yetki anahtarı.' });
    return null;
  }

  (req as any).user = verified;
  return verified;
}

export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const verified = await authenticateRequest(req, res);
      if (!verified) return;

      if (!allowedRoles.includes(verified.role) && verified.role !== 'admin') {
        return res.status(403).json({ error: 'Bu işlemi yapmaya yetkiniz bulunmamaktadır.' });
      }

      next();
    } catch (e: any) {
      return res.status(401).json({ error: e.message || 'Geçersiz oturum.' });
    }
  };
}

export function requirePermission(allowedPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const verified = await authenticateRequest(req, res);
      if (!verified) return;

      if (verified.role === 'admin') {
        return next();
      }

      const userPermissions = ROLE_PERMISSIONS[verified.role] || [];
      const hasPermission = allowedPermissions.some((permission) => userPermissions.includes(permission));

      if (!hasPermission) {
        return res.status(403).json({ error: 'Bu işlemi yapmak için gerekli izniniz bulunmamaktadır.' });
      }

      next();
    } catch (e: any) {
      return res.status(401).json({ error: e.message || 'Geçersiz oturum.' });
    }
  };
}
