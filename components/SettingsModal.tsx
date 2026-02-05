
import React from 'react';
import { 
  X, Bell, Map as MapIcon, Languages, Volume2, Smartphone, Save,
  Navigation, User, Bus, Car, Bike, MapPin, Flag, Home, Star, Store, Coffee, Circle, Play
} from 'lucide-react';
import { AlarmSettings, Language } from '../types';
import { translations } from '../translations';
import { triggerHaptic, playAlarmSound } from '../utils';

interface SettingsModalProps {
  settings: AlarmSettings;
  onSave: (newSettings: AlarmSettings) => void;
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000'];

const ICON_MAP: Record<string, React.ElementType> = {
  'navigation': Navigation,
  'user': User,
  'bus': Bus,
  'car': Car,
  'bike': Bike,
  'map-pin': MapPin,
  'flag': Flag,
  'home': Home,
  'star': Star,
  'store': Store,
  'coffee': Coffee,
  'circle': Circle
};

const ICONS = Object.keys(ICON_MAP).filter(key => key !== 'circle');

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = React.useState<AlarmSettings>({ ...settings });
  const t = translations[localSettings.language];

  const handleSave = () => {
    triggerHaptic(30);
    onSave(localSettings);
  };

  const handleTestSound = (soundId: string) => {
    setLocalSettings({ ...localSettings, alarmSound: soundId });
    playAlarmSound(soundId);
    if (localSettings.enableVibration) {
      triggerHaptic(100);
    }
  };

  const renderIconPicker = (currentIcon: string, onSelect: (icon: string) => void, color: string) => (
    <div className="flex flex-wrap gap-2">
      {ICONS.map(iconKey => {
        const IconComponent = ICON_MAP[iconKey];
        const isSelected = currentIcon === iconKey;
        return (
          <button
            key={iconKey}
            onClick={() => onSelect(iconKey)}
            className={`p-2.5 rounded-xl border-2 transition-all ${
              isSelected 
                ? 'border-blue-600 bg-blue-50 shadow-md scale-110' 
                : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'
            }`}
          >
            <IconComponent size={18} style={{ color: isSelected ? color : undefined }} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t.settingsTitle}</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{t.appTitle} Preferences</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
          {/* Idioma */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Languages size={20} />
              <h3 className="font-black text-xs uppercase tracking-[0.2em]">{t.language}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['es', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLocalSettings({ ...localSettings, language: lang })}
                  className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                    localSettings.language === lang 
                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' 
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {lang === 'es' ? 'Español' : 'English'}
                </button>
              ))}
            </div>
          </section>

          {/* Tipo de Alarma */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Bell size={20} />
              <h3 className="font-black text-xs uppercase tracking-[0.2em]">{t.alertType}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({ ...localSettings, alertType: 'time' })}
                className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                  localSettings.alertType === 'time' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' 
                  : 'border-gray-100 text-gray-400'
                }`}
              >
                {t.time}
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, alertType: 'distance' })}
                className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                  localSettings.alertType === 'distance' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' 
                  : 'border-gray-100 text-gray-400'
                }`}
              >
                {t.distanceLabel}
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-[2rem] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">
                  {localSettings.alertType === 'time' ? t.notifyBefore : t.notifyAtDist}
                </span>
                <span className="text-xl font-black text-blue-600">
                  {localSettings.threshold} {localSettings.alertType === 'time' ? t.minutes : 'm'}
                </span>
              </div>
              <input
                type="range"
                min={localSettings.alertType === 'time' ? "1" : "100"}
                max={localSettings.alertType === 'time' ? "15" : "2000"}
                step={localSettings.alertType === 'time' ? "1" : "50"}
                value={localSettings.threshold}
                onChange={(e) => setLocalSettings({ ...localSettings, threshold: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </section>

          {/* Sonido y Vibración */}
          <section className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Volume2 size={20} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">{t.sound}</span>
                </div>
                <button 
                  onClick={() => setLocalSettings({...localSettings, enableSound: !localSettings.enableSound})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.enableSound ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.enableSound ? 'left-7' : 'left-1'}`} />
                </button>
             </div>

             {localSettings.enableSound && (
               <div className="grid grid-cols-2 gap-2">
                 {['pulse', 'beep', 'chime', 'siren'].map(s => (
                   <button
                     key={s}
                     onClick={() => handleTestSound(s)}
                     className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-between group ${
                       localSettings.alarmSound === s ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'
                     }`}
                   >
                     <span>{s}</span>
                     <Play size={12} className={localSettings.alarmSound === s ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'} />
                   </button>
                 ))}
               </div>
             )}

             <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Smartphone size={20} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">{t.vibration}</span>
                </div>
                <button 
                   onClick={() => setLocalSettings({...localSettings, enableVibration: !localSettings.enableVibration})}
                   className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.enableVibration ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.enableVibration ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
          </section>

          {/* Marcadores */}
          <section className="space-y-8 pb-4">
            <div className="flex items-center gap-3 text-blue-600">
              <MapIcon size={20} />
              <h3 className="font-black text-xs uppercase tracking-[0.2em]">{t.mapCustomization}</h3>
            </div>
            
            {/* User Marker Config */}
            <div className="space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <User size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.userMarker}</p>
              </div>
              
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.markerColor}</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setLocalSettings({...localSettings, markers: {...localSettings.markers, userColor: c}})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${localSettings.markers.userColor === c ? 'border-blue-600 scale-125 shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.markerIcon}</p>
                {renderIconPicker(localSettings.markers.userIcon, (icon) => setLocalSettings({...localSettings, markers: {...localSettings.markers, userIcon: icon}}), localSettings.markers.userColor)}
              </div>
            </div>

            {/* Destination Marker Config */}
            <div className="space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <MapPin size={16} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.destMarker}</p>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.markerColor}</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setLocalSettings({...localSettings, markers: {...localSettings.markers, destColor: c}})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${localSettings.markers.destColor === c ? 'border-blue-600 scale-125 shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.markerIcon}</p>
                {renderIconPicker(localSettings.markers.destIcon, (icon) => setLocalSettings({...localSettings, markers: {...localSettings.markers, destIcon: icon}}), localSettings.markers.destColor)}
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={handleSave}
            className="w-full bg-blue-600 text-white font-black py-6 rounded-[1.5rem] shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
          >
            <Save size={24} /> {t.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
