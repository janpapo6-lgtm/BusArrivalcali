
import React, { useEffect, useState } from 'react';
import { Location, AlarmSettings } from '../types';
import { calculateDistance, formatDistance, calculateETA, formatTime, triggerHaptic } from '../utils';
import { Navigation, Clock, Target, Moon, Coffee } from 'lucide-react';
import { translations } from '../translations';

interface Props {
  destination: Location;
  settings: AlarmSettings;
  onArrived: () => void;
}

const LocationTracker: React.FC<Props> = ({ destination, settings, onArrived }) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  
  const t = translations[settings.language];

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(t.geoError);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calculateDistance(latitude, longitude, destination.lat, destination.lng);
        const currentEta = calculateETA(dist);
        
        setDistance(dist);
        setEta(currentEta);

        // Si estamos en modo posponer, ignoramos los disparadores
        if (Date.now() < snoozeUntil) return;

        let shouldTrigger = false;
        if (settings.alertType === 'distance') {
          shouldTrigger = dist <= settings.threshold;
        } else {
          shouldTrigger = currentEta <= settings.threshold;
        }

        // ACTIVACIÓN AUTOMÁTICA: Si se cumple la condición, disparamos la alarma inmediatamente
        if (shouldTrigger) {
          onArrived();
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [destination, settings, snoozeUntil, onArrived, t.geoError]);

  useEffect(() => {
    let interval: number;
    if (snoozeUntil > Date.now()) {
      interval = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((snoozeUntil - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          window.clearInterval(interval);
        }
      }, 1000);
    } else {
      setSecondsLeft(0);
    }
    return () => window.clearInterval(interval);
  }, [snoozeUntil]);

  const isSnoozed = secondsLeft > 0;

  return (
    <div className="space-y-4 relative">
      <div className={`bg-white rounded-3xl p-6 shadow-xl border-2 transition-all duration-500 ${isSnoozed ? 'border-amber-200 shadow-amber-100/50' : 'border-gray-100'}`}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t.enRouteTo}</p>
            <h2 className="text-xl font-black text-gray-900 leading-tight">{destination.name}</h2>
          </div>
          <div className={`${isSnoozed ? 'bg-amber-500' : 'bg-blue-600'} text-white p-3 rounded-2xl shadow-lg transition-colors duration-500`}>
            {isSnoozed ? <Moon size={22} className="animate-pulse" /> : <Navigation size={22} className="animate-pulse" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-blue-600" />
              <p className="text-blue-600 text-[10px] font-black uppercase tracking-wider">{t.distance}</p>
            </div>
            <p className="text-2xl font-black text-blue-900 tracking-tight">
              {distance !== null ? formatDistance(distance) : '--'}
            </p>
          </div>
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-emerald-600" />
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider">{t.arrival}</p>
            </div>
            <p className="text-2xl font-black text-emerald-900 tracking-tight">
              {eta !== null ? formatTime(eta) : '--'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            {isSnoozed ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-in fade-in slide-in-from-left-2">
                <Coffee size={12} />
                <p className="text-[10px] font-black uppercase tracking-wider">
                  {t.snoozeButton}: {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  {t.notifyAtThreshold} {settings.threshold} {settings.alertType === 'time' ? t.minutes : t.meters}
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">{t.gpsUpdated}</p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTracker;
