/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ApiClient } from '../infrastructure/api/apiClient';
import { Key, Lock, CheckCircle, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForcePasswordChange() {
  const { currentUser, logout } = useAppStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError('Yeni şifre güvenlik sebebiyle en az 4 karakter uzunluğunda olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler uyuşmuyor! Lütfen kontrol edin.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiClient.changePassword(currentUser.id, newPassword);
      if (res.success) {
        setSuccess(true);
        
        // Sync Zustand store state
        setTimeout(() => {
          useAppStore.setState((state) => {
            const updatedUser = state.currentUser ? { ...state.currentUser, mustChangePassword: false } : null;
            
            // Sync in rawUsers database
            const updatedRawUsers = state.rawUsers.map(u => 
              u.id === state.currentUser?.id ? { ...u, mustChangePassword: false } : u
            );

            return {
              currentUser: updatedUser,
              rawUsers: updatedRawUsers
            };
          });
        }, 1500);

      } else {
        setError(res.error || 'Şifre güncelleme başarısız oldu.');
      }
    } catch (err: any) {
      setError(err.message || 'Sistem hatası oluştu, lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="force-password-change-container">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-200"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Güvenlik Güncellemesi</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Sayın <span className="text-blue-600 font-bold">{currentUser.name}</span>, ilk girişinizde hesabınızı güvenceye almak için şifrenizi güncellemeniz zorunludur.
            </p>
          </div>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-3"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-800">Şifreniz başarıyla güncellendi!</p>
            <p className="text-xs text-slate-400 font-semibold">Panele yönlendiriliyorsunuz, lütfen bekleyin...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Yeni Şifreniz</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-blue-500 text-slate-800"
                  placeholder="En az 4 karakter giriniz"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Yeni Şifre Tekrar</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-blue-500 text-slate-800"
                  placeholder="Yeni şifrenizi doğrulayın"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                {isLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle & Giriş Yap'}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-center">
              <button
                type="button"
                onClick={logout}
                className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" /> Çıkış Yap / Geri Dön
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
