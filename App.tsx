
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import LocationTracker from './components/LocationTracker';
import MapDisplay from './components/MapDisplay';
import SettingsModal from './components/SettingsModal';
import { AppMode, Location, AlarmSettings, HistoryItem, FavoriteTrip } from './types';
import { getDestinationDetails, getTravelTips } from './services/geminiService';
import { translations } from './translations';
import { 
  Search, MapPin, Bell, CheckCircle, RefreshCw, 
  Flag, Map as MapIcon, LocateFixed, Link as LinkIcon,
  Star, Clock as HistoryIcon, Trash2, AlertCircle, XCircle,
  X, ChevronRight, Building, House, Navigation, Settings
} from 'lucide-react';
import { playAlarmSound, triggerHaptic } from './utils';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.IDLE);
  const [destination, setDestination] = useState<Location | null>(null);
  const [startingPoint, setStartingPoint] = useState<Location | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isStartLinked, setIsStartLinked] = useState(true); 
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiDetails, setAiDetails] = useState<{ stopName: string; context: string; landmarks?: string[] } | null>(null);
  const [travelTips, setTravelTips] = useState<string>('');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTrip[]>([]);

  const [settings, setSettings] = useState<AlarmSettings>({
    alertType: 'time',
    threshold: 5,
    enableSound: true,
    alarmSound: 'pulse',
    enableVibration: true,
    language: 'es',
    markers: {
      userColor: '#3b82f6',
      userIcon: 'navigation',
      destColor: '#ef4444',
      destIcon: 'map-pin'
    }
  });

  const t = translations[settings.language];

  // Bucle de Alarma (Sonido y Vibración persistente)
  useEffect(() => {
    let interval: number | undefined;
    
    if (mode === AppMode.ALARM) {
      const triggerAlert = () => {
        if (settings.enableSound) {
          playAlarmSound(settings.alarmSound);
        }
        if (settings.enableVibration) {
          triggerHaptic([500, 200, 500]);
        }
      };

      triggerAlert();
      interval = window.setInterval(triggerAlert, 1500);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [mode, settings.enableSound, settings.enableVibration, settings.alarmSound]);

  const localResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q.length < 2) return [];
    
    const favMatches = favorites
      .filter(f => f.name.toLowerCase().includes(q))
      .map(f => ({ ...f, isLocal: true, type: 'favorite' }));
      
    const histMatches = history
      .filter(h => h.destination.name?.toLowerCase().includes(q))
      .map(h => ({ ...h, isLocal: true, type: 'history' }));

    return [...favMatches, ...histMatches];
  }, [searchQuery, favorites, history]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('busarrival_history');
    const savedFavorites = localStorage.getItem('busarrival_favorites');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  useEffect(() => {
    localStorage.setItem('busarrival_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('busarrival_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (isStartLinked && mode === AppMode.IDLE) {
          setStartingPoint({ ...loc, name: t.startingPoint });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isStartLinked, mode, t.startingPoint]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSuggestions = async () => {
      const queryToUse = searchQuery.trim();
      if (queryToUse.length < 3) {
        setSuggestions([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      
      try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryToUse)}&limit=5&addressdetails=1&dedupe=1&accept-language=${settings.language}`;
        const res = await fetch(url, { signal });
        
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        
        const data = await res.json();
        if (!signal.aborted) {
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn("Search warning:", e.message);
          if (!signal.aborted) {
             setSearchError(t.offlineError || "Error");
             setSuggestions([]);
          }
        }
      } finally {
        if (!signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, settings.language, t.offlineError]);

  const loadAIData = async (query: string, name: string) => {
    setLoading(true);
    try {
      const details = await getDestinationDetails(query, settings.language);
      setAiDetails(details);
      const tips = await getTravelTips(name, settings.language);
      setTravelTips(tips);
    } catch (err) {
      console.warn("AI fallback active");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (mode === AppMode.TRACKING) return;
    const fallbackName = t.tapMap;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${settings.language}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      const name = data.display_name?.split(',')[0] || fallbackName;
      setDestination({ lat, lng, name });
      setMode(AppMode.SEARCHING);
      loadAIData(data.display_name || name, name);
    } catch (err) {
      console.warn("Map click reverse geocode failed", err);
      setDestination({ lat, lng, name: fallbackName });
      setMode(AppMode.SEARCHING);
    }
  };

  const selectSuggestion = (item: any) => {
    triggerHaptic();
    let name, lat, lng;

    if (item.isLocal) {
      if (item.type === 'favorite') {
        name = item.name;
        lat = item.destination.lat;
        lng = item.destination.lng;
      } else {
        name = item.destination.name;
        lat = item.destination.lat;
        lng = item.destination.lng;
      }
    } else {
      name = item.display_name.split(',')[0];
      lat = parseFloat(item.lat);
      lng = parseFloat(item.lon);
    }

    setDestination({ lat, lng, name });
    setSearchQuery(name || "");
    setSuggestions([]);
    setMode(AppMode.SEARCHING);
    loadAIData(item.display_name || name, name || "");
  };

  const addToHistory = (loc: Location) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      destination: loc,
      timestamp: Date.now()
    };
    setHistory(prev => [newItem, ...prev.filter(h => h.destination.name !== loc.name).slice(0, 9)]);
  };

  const toggleLink = () => {
    triggerHaptic(30);
    setIsStartLinked(prev => !prev);
    if (!isStartLinked && userLocation) {
      setStartingPoint({ ...userLocation, name: t.startingPoint });
    }
  };

  const resetApp = () => {
    setMode(AppMode.IDLE);
    setDestination(null);
    setSearchQuery('');
    setSuggestions([]);
    setAiDetails(null);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const saveToFavorites = () => {
    if (!destination) return;
    const name = prompt(t.favoriteName, destination.name) || destination.name;
    const newFav: FavoriteTrip = {
      id: Date.now().toString(),
      name,
      destination,
      isRecurring: true
    };
    setFavorites(prev => [newFav, ...prev]);
    triggerHaptic(50);
  };

  const showDropdown = searchQuery.length >= 2 && (isSearching || localResults.length > 0 || suggestions.length > 0 || searchError || (searchQuery.length >= 3 && suggestions.length === 0));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative selection:bg-blue-100">
      <Header onOpenSettings={() => setShowSettings(true)} lang={settings.language} />

      <main className="flex-1 container mx-auto max-w-lg p-4 pb-24 space-y-6 overflow-y-auto no-scrollbar">
        <MapDisplay 
          userLocation={userLocation} 
          destination={destination} 
          startingLocation={startingPoint}
          radius={settings.alertType === 'distance' ? settings.threshold : undefined}
          onMapClick={handleMapClick}
          onSetStartToCurrent={() => {
            setIsStartLinked(true);
            if (userLocation) setStartingPoint({ ...userLocation, name: t.startingPoint });
          }}
          lang={settings.language}
          markers={settings.markers}
        />

        {mode === AppMode.IDLE && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-gray-900">{t.whereTo}</h2>
                <button
                  onClick={() => { triggerHaptic(20); setShowSettings(true); }}
                  className="p-2 bg-white text-gray-400 border border-gray-100 rounded-2xl hover:text-blue-600 hover:border-blue-100 hover:shadow-md transition-all active:scale-90"
                  aria-label="Settings"
                >
                  <Settings size={20} />
                </button>
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t.searchSub}</p>
            </div>

            <div className="bg-white rounded-[2rem] p-4 shadow-xl border border-gray-100 space-y-3">
               {/* Campo Punto de Partida */}
               <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all ${isStartLinked ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                  <Flag size={18} className={isStartLinked ? 'text-blue-600' : 'text-slate-400'} />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.startingPoint}</p>
                    <p className={`text-sm font-bold truncate ${isStartLinked ? 'text-blue-900' : 'text-slate-700'}`}>{startingPoint?.name || "..."}</p>
                  </div>
                  <button onClick={toggleLink} className={`p-2 rounded-full transition-all ${isStartLinked ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>
                    {isStartLinked ? <LocateFixed size={16} /> : <LinkIcon size={16} />}
                  </button>
               </div>

               {/* Campo de Búsqueda */}
               <div className="relative z-[5000]">
                  <div className="flex items-center gap-4 px-4 py-3 bg-white border-2 border-blue-100 rounded-2xl focus-within:border-blue-500 transition-all shadow-sm">
                    {isSearching ? <RefreshCw size={18} className="text-blue-500 animate-spin" /> : <Search size={18} className="text-blue-500" />}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="flex-1 bg-transparent focus:outline-none text-sm font-bold text-gray-800"
                    />
                  </div>
                  
                  {/* Resultados sugeridos */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl z-[5000] overflow-hidden border border-gray-100 divide-y divide-gray-50 max-h-[50vh] overflow-y-auto">
                      {isSearching && suggestions.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                           <RefreshCw size={12} className="animate-spin" /> {t.searching || "Buscando..."}
                        </div>
                      )}
                      {searchError && (
                        <div className="p-4 text-center text-red-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                           <AlertCircle size={12} /> {searchError}
                        </div>
                      )}
                      {!isSearching && suggestions.length === 0 && localResults.length === 0 && !searchError && (
                        <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                           {t.noResults || "Sin resultados"}
                        </div>
                      )}
                      {[...localResults, ...suggestions].map((item, idx) => (
                        <button key={idx} onClick={() => selectSuggestion(item)} className="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center gap-4 transition-colors group">
                          <div className={`p-2 rounded-xl shrink-0 ${item.isLocal ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                            {item.type === 'favorite' ? <Star size={16} className="fill-current" /> : <MapPin size={16} />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-gray-900 truncate">{item.display_name?.split(',')[0] || item.name}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight truncate">
                              {item.isLocal ? (item.type === 'favorite' ? t.favorites : t.history) : item.display_name?.split(',').slice(1).join(',')}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
               </div>
            </div>

            {/* Favoritos Rápidos */}
            {favorites.length > 0 && (
              <div className="space-y-3">
                <h3 className="px-2 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{t.favorites}</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-2">
                  {favorites.map(fav => (
                    <button 
                      key={fav.id} 
                      onClick={() => selectSuggestion({...fav, isLocal: true, type: 'favorite'})}
                      className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center gap-2 min-w-[120px] max-w-[140px] group relative hover:scale-105 transition-all shrink-0"
                    >
                      <div className="bg-amber-50 p-3 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Star size={20} className="fill-current" />
                      </div>
                      <p className="text-[11px] font-black text-gray-900 text-center truncate w-full">{fav.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Historial Reciente */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{t.history}</h3>
                {history.length > 0 && (
                  <button onClick={() => setHistory([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest">{t.clearHistory}</button>
                )}
              </div>
              <div className="space-y-3">
                {history.length > 0 ? history.map(item => (
                  <div key={item.id} className="group relative bg-white p-1 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all">
                    <button 
                      onClick={() => selectSuggestion({...item, isLocal: true, type: 'history'})}
                      className="w-full p-4 flex items-center gap-4 text-left"
                    >
                      <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <HistoryIcon size={18} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-gray-800 truncate">{item.destination.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500" />
                    </button>
                    <button 
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="absolute -top-1 -right-1 bg-white text-gray-300 p-1.5 rounded-full border border-gray-100 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )) : (
                  <div className="py-12 text-center bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2rem]">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{t.noHistory}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.SEARCHING && destination && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-blue-50 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[11px] font-black uppercase text-blue-600 tracking-[0.2em]">{t.destinationConfirmed}</h3>
                <button onClick={saveToFavorites} className="text-amber-500 hover:text-amber-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
                  <Star size={12} className="fill-current" /> {t.saveFavorite}
                </button>
              </div>
              <h2 className="text-3xl font-black text-gray-900 leading-none mb-6">{aiDetails?.stopName || destination.name}</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => { addToHistory(destination); setMode(AppMode.TRACKING); triggerHaptic(); }} className="w-full bg-blue-600 text-white font-black py-6 rounded-[1.5rem] shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg">
                  <CheckCircle size={24} /> {t.activateAlarm}
                </button>
                <button onClick={resetApp} className="w-full bg-gray-50 text-gray-400 font-bold py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors">
                  {t.change}
                </button>
              </div>
            </div>
          </div>
        )}

        {(mode === AppMode.TRACKING || mode === AppMode.ALARM) && destination && (
           <div className="space-y-4">
              <LocationTracker destination={destination} settings={settings} onArrived={() => setMode(AppMode.ALARM)} />
              <div className="flex justify-center pt-2">
                <button onClick={() => { triggerHaptic(60); resetApp(); }} className="group flex items-center gap-3 px-8 py-3 bg-white border-2 border-red-50 text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.cancelTravel}</span>
                </button>
              </div>
           </div>
        )}
      </main>

      {showSettings && <SettingsModal settings={settings} onSave={(s) => { setSettings(s); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
      
      {mode === AppMode.ALARM && (
        <div className="fixed inset-0 z-[2000] bg-red-600 flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in duration-300">
          <Bell size={80} className="mb-12 animate-bounce" />
          <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.arrivedTitle}</h2>
          <p className="text-xl font-bold opacity-80 mb-16">{destination?.name}</p>
          <button onClick={resetApp} className="w-full max-w-sm bg-white text-red-600 font-black py-8 rounded-[2.5rem] text-2xl shadow-2xl active:scale-95 transition-all">
            {t.awakeButton}
          </button>
        </div>
      )}
      
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[3000] flex flex-col items-center justify-center text-blue-600 animate-in fade-in">
           <RefreshCw className="animate-spin mb-4" size={48} />
           <p className="font-black text-xs uppercase tracking-[0.3em]">{t.loadingAi}</p>
        </div>
      )}
    </div>
  );
};

export default App;
