/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { UserRole } from '../../types';
import { Shield, ShieldAlert, Bus, Key, User, Phone, BookOpen, AlertTriangle, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthService } from '../../services/authService';

export default function Login() {
  const loginFn = useAppStore(state => state.login);
  const [selectedRole, setSelectedRole] = useState<UserRole>('parent');
  
  // Standard inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Parent inputs
  const [studentName, setStudentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isSmsMode, setIsSmsMode] = useState(true); // enabled by default to show capability
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [generatedSms, setGeneratedSms] = useState<string>('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (selectedRole === 'parent' && isSmsMode && !smsSent) {
      // Generate dynamic OTP using AuthService
      const otp = AuthService.generateSmsCode();
      setGeneratedSms(otp.code);

      setTimeout(() => {
        setIsLoading(false);
        setSmsSent(true);
        // Helpful logging for development
        if (import.meta.env.DEV) {
          console.log(`[DEV-SMS-EMULATOR] Doğrulama kodu: ${otp.code}`);
        }
      }, 1000);
      return;
    }

    if (selectedRole === 'parent' && isSmsMode && smsSent) {
      if (!AuthService.verifySmsCode(smsCode, generatedSms)) {
        setIsLoading(false);
        setError(`Doğrulama kodu hatalı!`);
        return;
      }
    }

    try {
      const result = await loginFn(
        selectedRole,
        username,
        password,
        studentName,
        parentPhone
      );

      setIsLoading(false);
      if (!result.success) {
        setError(result.error || 'Giriş yapılamadı!');
        setSmsSent(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Giriş yapılamadı!');
      setSmsSent(false);
    }
  };

  const rolesList: { id: UserRole; label: string; icon: any }[] = [
    { id: 'admin', label: 'Yönetici', icon: Shield },
    { id: 'manager', label: 'Proje Md.', icon: BookOpen },
    { id: 'coordinator', label: 'Okul Sorm.', icon: Key },
    { id: 'accounting', label: 'Muhasebe', icon: DollarSign },
    { id: 'parent', label: 'Veli', icon: User },
    { id: 'driver', label: 'Şoför', icon: Bus },
    { id: 'hostess', label: 'Hostes', icon: User },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-8">
      <div className="w-full max-w-5xl grid md:grid-cols-12 bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200/60">
        
        {/* Left Side: Dynamic Brand Info Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 to-slate-850 p-8 text-white flex flex-col justify-between relative overflow-hidden min-h-[320px] md:min-h-[550px]">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-md inline-block self-start transition-transform hover:scale-105 duration-300">
                <img src="/logo.svg" alt="BERKAYTUR Logo" className="h-12 w-auto object-contain" />
              </div>
              <div>
                <h1 className="font-black text-2xl tracking-tight leading-none text-white">BERKAYTUR</h1>
                <p className="text-xs text-sky-400 font-semibold tracking-wide mt-1.5">Okul Servisi Operasyon Platformu</p>
              </div>
            </div>
            
            <div className="mt-12 md:mt-20 space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-slate-100">
                Kurumsal Okul Servisi Yönetim Platformu
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                BERKAYTUR güvencesiyle servis operasyonları, güzergah takipleri, veli bildirimleri ve puantaj/muhasebe süreçlerinin tek merkezden koordine edildiği kurumsal taşıma platformu.
              </p>
            </div>
          </div>
          
          <div className="relative z-10 pt-8 border-t border-slate-800 mt-8">
            <p className="text-xs text-slate-400">
              © 2026 BERKAYTUR Servis A.Ş. Tüm hakları saklıdır.
            </p>
          </div>
        </div>

        {/* Right Side: Dynamic Form Panel */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Sisteme Giriş</h3>
            <p className="text-slate-500 text-sm mt-1">Devam etmek için lütfen rolünüzü seçerek bilgilerinizi giriniz.</p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 bg-slate-100 p-1.5 rounded-2xl mb-8">
            {rolesList.map(role => {
              const Icon = role.icon;
              const isActive = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  id={`login-role-${role.id}`}
                  onClick={() => {
                    setSelectedRole(role.id);
                    setError(null);
                  }}
                  type="button"
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-white text-blue-600 shadow-sm border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-blue-500' : ''}`} />
                  <span className="text-[10px] font-semibold tracking-wide truncate max-w-full">
                    {role.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm mb-6"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>{error}</div>
            </motion.div>
          )}

          {/* Dynamic Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {selectedRole === 'parent' ? (
              <>
                {/* Parent Login Fields */}
                <div className="space-y-2">
                  <label htmlFor="studentName" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Öğrenci Adı Soyadı
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="studentName"
                      type="text"
                      required
                      value={studentName}
                      disabled={smsSent}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Örn: Ali Yılmaz"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Giriş için sistemde kayıtlı olan öğrenci adını tam giriniz.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="parentPhone" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Veli Telefon Numarası
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      id="parentPhone"
                      type="tel"
                      required
                      value={parentPhone}
                      disabled={smsSent}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="Örn: 0532 999 88 77"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* SMS Verification Preparation */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isSmsMode} 
                      onChange={(e) => {
                        setIsSmsMode(e.target.checked);
                        if (!e.target.checked) setSmsSent(false);
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-slate-600">SMS OTP Doğrulaması Kullan (Gelişmiş Altyapı)</span>
                  </label>
                </div>

                {smsSent && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-2"
                  >
                    <label htmlFor="smsCode" className="block text-xs font-bold text-blue-600 uppercase tracking-wider">
                      SMS Doğrulama Kodu (Telefonunuza simüle edildi)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-blue-500">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        id="smsCode"
                        type="text"
                        required
                        maxLength={4}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="Örn: 1234"
                        className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-widest text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-emerald-600 font-medium">✓ Doğrulama kodu SMS ile telefonunuza gönderildi.</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setSmsSent(false);
                          setSmsCode('');
                        }} 
                        className="text-blue-600 hover:underline"
                      >
                        Bilgileri Değiştir
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <>
                {/* Standard Admin/Staff Login Fields */}
                <div className="space-y-2">
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Kullanıcı Adı
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={selectedRole === 'admin' ? 'Örn: admin' : 'Kullanıcı adınızı girin'}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Şifre
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  İşlem Yapılıyor...
                </>
              ) : selectedRole === 'parent' && isSmsMode && !smsSent ? (
                'Doğrulama Kodu Gönder'
              ) : selectedRole === 'parent' && isSmsMode && smsSent ? (
                'Kodu Doğrula ve Giriş Yap'
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
