
import React from 'react';
import { Bus, MapPin, Settings } from 'lucide-react';
import { translations } from '../translations';
import { Language } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  lang: Language;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, lang }) => {
  const t = translations[lang];

  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bus size={28} className="text-blue-200" />
        <h1 className="text-xl font-bold tracking-tight">{t.appTitle}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex bg-blue-700 px-3 py-1 rounded-full text-xs font-medium items-center gap-1">
          <MapPin size={14} />
          {t.liveTracking}
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
