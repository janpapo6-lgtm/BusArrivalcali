
import React from 'react';
import { Bus } from 'lucide-react';
import { translations } from '../translations';
import { Language } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  lang: Language;
}

const Header: React.FC<HeaderProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bus size={28} className="text-blue-200" />
        <h1 className="text-xl font-bold tracking-tight">{t.appTitle}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-400/30">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          {t.liveTracking}
        </div>
      </div>
    </header>
  );
};

export default Header;
