/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { loginSchema, getZodErrorMessage } from '../validators/schemas';
import { successResponse, errorResponse } from '../utils/response';

export const AuthController = {
  async login(req: Request, res: Response) {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json(errorResponse(getZodErrorMessage(validated.error)));
    }

    const { username, password, rememberMe, role } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // Extrapolate device type from user agent strings
    let deviceType = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'Tablet';

    try {
      const result = await AuthService.login({
        username,
        password,
        role,
        ipAddress,
        userAgent,
        deviceType,
        rememberMe: !!rememberMe
      });

      res.json(successResponse(result, 'Kullanıcı başarıyla giriş yaptı.'));
    } catch (e: any) {
      res.status(401).json(errorResponse(e.message || 'Giriş başarısız.'));
    }
  },

  async verify(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('Giriş yapılmamış.'));
    }
    const token = authHeader.split(' ')[1];
    try {
      const user = await AuthService.verify(token);
      res.json(successResponse(user, 'Kullanıcı oturumu doğrulandı.'));
    } catch (e: any) {
      res.status(401).json(errorResponse(e.message || 'Geçersiz veya süresi dolmuş oturum.'));
    }
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    try {
      const result = await AuthService.refresh(refreshToken, ipAddress, userAgent);
      res.json(successResponse(result, 'Oturum başarıyla yenilendi.'));
    } catch (e: any) {
      res.status(401).json(errorResponse(e.message || 'Geçersiz yenileme oturumu.'));
    }
  },

  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const { refreshToken } = req.body;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';

    await AuthService.logout(accessToken, refreshToken);
    res.json(successResponse(null, 'Başarıyla çıkış yapıldı.'));
  }
};
