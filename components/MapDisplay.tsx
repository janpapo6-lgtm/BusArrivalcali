
import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Location, Language, MarkerSettings } from '../types';
import { translations } from '../translations';
import { Loader2, Maximize2, Map as MapIcon, Flag, LocateFixed, Navigation2, Layers, Car, Mountain, Globe } from 'lucide-react';
import { triggerHaptic } from '../utils';

interface MapDisplayProps {
  userLocation: Location | null;
  destination: Location | null;
  startingLocation?: Location | null;
  radius?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onSetStartToCurrent?: () => void;
  lang: Language;
  markers: MarkerSettings;
}

type MapType = 'standard' | 'satellite' | 'terrain';

const TILE_PROVIDERS = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  traffic: 'https://tile.memomaps.at/tilegen/{z}/{x}/{y}.png' 
};

const ICON_PATHS: Record<string, string> = {
  'navigation': '<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'circle': '<circle cx="12" cy="12" r="10"/>',
  'bus': '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s1 0 1-1V7c0-1-1-1-1-1H3C2 6 2 7 2 7v10c0 1 1 1 1 1h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  'car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  'bike': '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'store': '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>',
  'coffee': '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'
};

const createMarkerHtml = (color: string, iconName: string, isUser: boolean = false): string => {
  const path = ICON_PATHS[iconName] || ICON_PATHS['circle'];
  return `
    <div style="
      width: 32px; 
      height: 32px; 
      background: white; 
      border: 2.5px solid ${color}; 
      border-radius: 50%; 
      box-shadow: 0 3px 8px rgba(0,0,0,0.15); 
      display: flex; 
      align-items: center; 
      justify-content: center;
      position: relative;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        ${path}
      </svg>
      ${isUser ? `
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${color};
          opacity: 0.15;
          animation: marker-pulse 2s infinite ease-out;
          z-index: -1;
        "></div>
        <style>
          @keyframes marker-pulse {
            0% { transform: scale(1); opacity: 0.3; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        </style>
      ` : ''}
    </div>
  `;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ userLocation, destination, startingLocation, radius, onMapClick, onSetStartToCurrent, lang, markers }) => {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const mainRouteRef = useRef<L.Polyline | null>(null);
  const mainRouteCasingRef = useRef<L.Polyline | null>(null);
  const altRoutesRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onMapClickRef = useRef(onMapClick);
  
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trafficLayerRef = useRef<L.TileLayer | null>(null);

  const t = translations[lang];

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: true,
      touchZoom: true
    }).setView([0, 0], 2);

    tileLayerRef.current = L.tileLayer(TILE_PROVIDERS[mapType], {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    tileLayerRef.current.on('load', () => setIsMapLoading(false));

    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    altRoutesRef.current = L.layerGroup().addTo(mapRef.current);

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_PROVIDERS[mapType]);
  }, [mapType]);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = L.tileLayer(TILE_PROVIDERS.traffic, {
          opacity: 0.7,
          zIndex: 100
        });
      }
      trafficLayerRef.current.addTo(mapRef.current);
    } else {
      if (trafficLayerRef.current) {
        mapRef.current.removeLayer(trafficLayerRef.current);
      }
    }
  }, [showTraffic]);

  const focusFullRoute = () => {
    if (!mapRef.current) return;
    triggerHaptic(20);
    const points: L.LatLngExpression[] = [];
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    if (destination) points.push([destination.lat, destination.lng]);
    if (startingLocation) points.push([startingLocation.lat, startingLocation.lng]);
    
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }
  };

  const handleSetStartToMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    if (onSetStartToCurrent) {
      onSetStartToCurrent();
    }
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
    }
  };

  const fetchRoute = async (start: Location, end: Location) => {
    if (!mapRef.current) return;
    try {
      // Usamos el servicio OSRM gratuito (router.project-osrm.org).
      // NOTA: Este servicio es público y a menudo está sobrecargado, por lo que a veces devuelve errores 503 o HTML en lugar de JSON.
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
      
      const res = await fetch(url);
      
      // Verificamos si la respuesta es válida y es JSON antes de intentar parsearla
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.warn("Routing service unavailable or returned non-JSON response.");
        return; // Salimos silenciosamente para no romper la app
      }

      const data = await res.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        if (mainRouteRef.current) mapRef.current.removeLayer(mainRouteRef.current);
        if (mainRouteCasingRef.current) mapRef.current.removeLayer(mainRouteCasingRef.current);
        if (altRoutesRef.current) altRoutesRef.current.clearLayers();

        const primaryCoords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        
        mainRouteCasingRef.current = L.polyline(primaryCoords, {
          color: '#ffffff',
          weight: 12,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false
        }).addTo(mapRef.current);

        mainRouteRef.current = L.polyline(primaryCoords, {
          color: markers.userColor,
          weight: 7,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(mapRef.current);
      }
    } catch (err) {
      // Ignoramos errores de red o parseo en la ruta para que la app siga funcionando (solo sin línea de ruta)
      console.warn("Routing error handled safely:", err);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    if (startingLocation) {
      const startPos: L.LatLngExpression = [startingLocation.lat, startingLocation.lng];
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: createMarkerHtml('#64748b', 'flag', false),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker(startPos, { icon: startIcon, zIndexOffset: 500 }).addTo(mapRef.current);
      } else {
        startMarkerRef.current.setLatLng(startPos);
        startMarkerRef.current.setIcon(startIcon);
      }
    }

    if (userLocation) {
      const pos: L.LatLngExpression = [userLocation.lat, userLocation.lng];
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: createMarkerHtml(markers.userColor, markers.userIcon, true),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(pos, { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng(pos);
        userMarkerRef.current.setIcon(userIcon);
      }
    }

    if (destination) {
      const destPos: L.LatLngExpression = [destination.lat, destination.lng];
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: createMarkerHtml(markers.destColor, markers.destIcon, false),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(destPos, { icon: destIcon }).addTo(mapRef.current);
      } else {
        destMarkerRef.current.setLatLng(destPos);
        destMarkerRef.current.setIcon(destIcon);
      }

      const startPoint = startingLocation || userLocation;
      if (startPoint) fetchRoute(startPoint, destination);

      if (radius !== undefined) {
        if (!circleRef.current) {
          circleRef.current = L.circle(destPos, {
            radius: radius,
            color: markers.destColor,
            fillColor: markers.destColor,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '8, 8'
          }).addTo(mapRef.current);
        } else {
          circleRef.current.setLatLng(destPos);
          circleRef.current.setRadius(radius);
        }
      }
    } else {
      if (destMarkerRef.current) mapRef.current.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
      if (circleRef.current) mapRef.current.removeLayer(circleRef.current);
      circleRef.current = null;
      if (mainRouteRef.current) mapRef.current.removeLayer(mainRouteRef.current);
      mainRouteRef.current = null;
      if (mainRouteCasingRef.current) mapRef.current.removeLayer(mainRouteCasingRef.current);
      mainRouteCasingRef.current = null;
      if (altRoutesRef.current) altRoutesRef.current.clearLayers();
    }
  }, [userLocation, destination, startingLocation, radius, markers]);

  return (
    <div className="w-full h-[450px] md:h-[600px] shadow-2xl overflow-hidden border border-gray-200 rounded-[3rem] relative bg-gray-100 transition-all duration-500 ease-in-out">
      <div ref={containerRef} className="w-full h-full" />
      
      {isMapLoading && (
        <div className="absolute inset-0 z-[500] bg-gray-100 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
        </div>
      )}

      {/* BARRA DE CONTROLES INFERIOR IZQUIERDA - UNIFICADOS */}
      <div className="absolute bottom-6 left-6 z-[400] flex flex-col gap-3 pointer-events-none">
        
        <div className="flex flex-col items-start gap-3 pointer-events-auto">
          {/* Submenú de Capas */}
          <div className={`flex flex-col gap-2 transition-all duration-300 ${isLayersOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
            <button onClick={() => { setMapType('standard'); setIsLayersOpen(false); }} className="w-[52px] h-[52px] bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center active:scale-95 transition-all">
              <MapIcon size={20} className={mapType === 'standard' ? 'text-blue-600' : 'text-slate-400'} />
            </button>
            <button onClick={() => { setMapType('satellite'); setIsLayersOpen(false); }} className="w-[52px] h-[52px] bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center active:scale-95 transition-all">
              <Globe size={20} className={mapType === 'satellite' ? 'text-blue-600' : 'text-slate-400'} />
            </button>
            <button onClick={() => { setMapType('terrain'); setIsLayersOpen(false); }} className="w-[52px] h-[52px] bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center active:scale-95 transition-all">
              <Mountain size={20} className={mapType === 'terrain' ? 'text-blue-600' : 'text-slate-400'} />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => { setIsLayersOpen(!isLayersOpen); triggerHaptic(10); }}
              className={`w-[52px] h-[52px] bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all ${isLayersOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-500'}`}
            >
              <Layers size={22} />
            </button>

            <button 
              onClick={() => { setShowTraffic(!showTraffic); triggerHaptic(10); }}
              className={`w-[52px] h-[52px] bg-white rounded-[1.5rem] shadow-2xl border flex items-center justify-center transition-all active:scale-90 ${showTraffic ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-500'}`}
            >
              <Car size={22} />
            </button>

            <button 
              onClick={handleSetStartToMe}
              className="w-[52px] h-[52px] bg-white text-slate-600 rounded-[1.5rem] shadow-2xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all"
            >
              <LocateFixed size={22} />
            </button>

            {destination && (
              <button 
                onClick={(e) => { e.stopPropagation(); focusFullRoute(); }}
                className="h-[52px] px-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-90 transition-all group/btn"
              >
                <Maximize2 size={22} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/btn:block">{t.viewFullRoute}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      <div className="absolute top-6 left-6 z-[400] bg-blue-600/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-blue-400/50 text-[10px] font-black text-white shadow-xl pointer-events-none uppercase tracking-widest">
        {t.tapMap}
      </div>
    </div>
  );
};

export default MapDisplay;
