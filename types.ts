
export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export type Language = 'es' | 'en';

export interface MarkerSettings {
  userColor: string;
  userIcon: string;
  destColor: string;
  destIcon: string;
}

export interface AlarmSettings {
  alertType: 'distance' | 'time';
  threshold: number; // meters or minutes
  enableSound: boolean;
  alarmSound: string; // sound profile id
  enableVibration: boolean;
  language: Language;
  markers: MarkerSettings;
}

export interface HistoryItem {
  id: string;
  destination: Location;
  timestamp: number;
}

export interface FavoriteTrip {
  id: string;
  name: string;
  destination: Location;
  isRecurring: boolean;
}

export enum AppMode {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  TRACKING = 'TRACKING',
  ALARM = 'ALARM'
}
