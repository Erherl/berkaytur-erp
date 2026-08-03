/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { Calendar, Volume2, VolumeX, ArrowRight } from 'lucide-react';

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export default function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const settings = useAppStore(state => state.settings);
  const currentUser = useAppStore(state => state.currentUser);
  const schools = useAppStore(state => state.schools);
  const activeSchoolId = useAppStore(state => state.activeSchoolId);
  const setActiveSchoolId = useAppStore(state => state.setActiveSchoolId);

  const [speechDone, setSpeechDone] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(settings?.audioWelcomeEnabled ?? true);

  const userSchools = currentUser?.role === 'coordinator'
    ? schools.filter(s => s.id === currentUser.schoolId || (s.assignedCoordinators || []).includes(currentUser.id))
    : currentUser?.role === 'manager'
    ? schools.filter(s => (s.assignedManagers || []).includes(currentUser.id))
    : [];

  // Format date and time in Turkish with a live updating clock
  const [formattedDate, setFormattedDate] = useState('');
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    const date = new Date('2026-07-15T16:09:53-07:00'); // Seeded base date
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setFormattedDate(date.toLocaleDateString('tr-TR', options));

    // Live Clock ticking
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API Turkish Welcome Voice with automatic trigger or fallback
  const speakWelcome = () => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Clear any pending speech
        const utterance = new SpeechSynthesisUtterance('Hoş geldiniz!');
        utterance.lang = 'tr-TR';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        
        // Try to find a Turkish voice if available
        const voices = window.speechSynthesis.getVoices();
        const trVoice = voices.find(v => v.lang.includes('tr') || v.lang.includes('TR'));
        if (trVoice) {
          utterance.voice = trVoice;
        }

        window.speechSynthesis.speak(utterance);
        setSpeechDone(true);
      } catch (error) {
        console.warn('Speech synthesis failed: ', error);
      }
    }
  };

  useEffect(() => {
    if (audioEnabled) {
      // Small timeout to allow user interaction context
      const timer = setTimeout(() => {
        speakWelcome();
      }, 600);

      // Autoplay fallback: speak when user clicks anywhere on the document if blocked
      const handleUserInteraction = () => {
        if (!speechDone) {
          speakWelcome();
        }
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };

      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
    }
  }, [audioEnabled, speechDone]);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-9999 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Dynamic Grid Background for cosmic premium feel */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:4rem_4rem]" />
      
      {/* Decorative Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10 space-y-12 flex flex-col items-center">
        
        {/* Animated Brand Showcase */}
        <div className="flex flex-col items-center gap-4 transition-all duration-700 animate-fade-in">
          <div className="p-6 bg-white rounded-3xl shadow-2xl shadow-blue-500/10 max-w-xs transition-all hover:scale-105 duration-300">
            <img src="/logo.svg" alt="BERKAYTUR Logo" className="h-14 w-auto object-contain" />
          </div>
          
          <div className="text-xs tracking-widest font-extrabold uppercase text-sky-400 font-sans mt-2">
            Kurumsal Okul Servisi Yönetim Platformu
          </div>
        </div>

        {/* Big Premium Welcome Heading */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white animate-fade-in">
            Hoş Geldiniz
          </h1>
          
          {currentUser?.name && (
            <p className="text-lg text-slate-300 font-medium">
              Sayın <span className="text-blue-400 font-bold underline decoration-blue-500/40 underline-offset-4">{currentUser.name}</span>
            </p>
          )}
        </div>

        {/* Date & Time Display */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 px-6 py-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-300 text-sm font-semibold tracking-wide shadow-sm backdrop-blur-md">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{formattedDate || '15 Temmuz 2026 Çarşamba'}</span>
          </div>
          
          {liveTime && (
            <div className="flex items-center gap-3 px-6 py-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-blue-400 text-sm font-bold tracking-widest font-mono shadow-sm backdrop-blur-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>SAAT: {liveTime}</span>
            </div>
          )}
        </div>

        {/* Access Button */}
        <div className="flex flex-col items-center gap-4 w-full pt-4">
          {userSchools.length > 1 && (
            <div className="w-full max-w-xs space-y-2 text-left bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aktif Çalışılacak Okul Seçimi:</label>
              <select
                value={activeSchoolId}
                onChange={e => setActiveSchoolId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Atanan Okullar ({userSchools.length})</option>
                {userSchools.map(s => (
                  <option key={s.id} value={s.id}>🏫 {s.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            id="welcome-overlay-continue-btn"
            onClick={onDismiss}
            className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95 cursor-pointer"
          >
            Sistem Paneline Geçiş Yap
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Toggle speech voice option */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-900/50 cursor-pointer"
            title="Sesli Karşılamayı Aç/Kapat"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Sesli Karşılama Aktif</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Sesli Karşılama Kapalı</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 text-[10px] text-slate-500 tracking-wider uppercase font-mono">
        Kurumsal Operasyon Kontrol Portalı
      </div>
    </div>
  );
}
