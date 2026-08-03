import { User, UserRole } from '../types';

/**
 * Service to handle secure frontend Authentication and Authorization rules.
 * Decouples logic and credentials validation from store and UI components.
 */
export const AuthService = {
  /**
   * Safe and centralized validation of user roles.
   */
  hasAccess(user: User | null, requiredRoles: UserRole | UserRole[]): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admins always pass

    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  },

  /**
   * Generates a temporary validation SMS code for parent login.
   * Prepares the system for a future SMS API integration gateway.
   */
  generateSmsCode(): { code: string; expiryMs: number } {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiryMs = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    if (import.meta.env.DEV) {
      console.log(`[AUTH SERVICE - SMS ENGINE] Tek kullanımlık kod üretildi: ${code} (Geçerlilik: 5 dk)`);
    }
    return { code, expiryMs };
  },

  /**
   * Standardized SMS validation logic.
   */
  verifySmsCode(inputCode: string, generatedCode?: string): boolean {
    if (!inputCode) return false;
    if (generatedCode) {
      return inputCode === generatedCode;
    }
    return false;
  }
};
