
/**
 * Calculates the distance between two points using the Haversine formula.
 * @returns distance in meters
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Calculates Estimated Time of Arrival in minutes.
 * Default average bus speed in city: 22 km/h
 */
export const calculateETA = (distanceMeters: number, avgSpeedKmH: number = 22): number => {
  if (distanceMeters <= 0) return 0;
  const speedMS = (avgSpeedKmH * 1000) / 3600;
  const timeSeconds = distanceMeters / speedMS;
  return Math.ceil(timeSeconds / 60);
};

export const formatTime = (minutes: number): string => {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Provides tactile feedback. Supports single duration or vibration patterns.
 */
export const triggerHaptic = (pattern: number | number[] = 15) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors if blocked by browser policy
    }
  }
};

let sharedAudioCtx: AudioContext | null = null;

/**
 * Plays synthesized alarm sounds using Web Audio API.
 * Reuses AudioContext to comply with browser performance best practices.
 */
export const playAlarmSound = (soundId: string = 'pulse') => {
  if (soundId === 'none') return;
  
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if it was suspended by browser's autoplay policy
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }

    const oscillator = sharedAudioCtx.createOscillator();
    const gainNode = sharedAudioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(sharedAudioCtx.destination);

    const now = sharedAudioCtx.currentTime;

    switch (soundId) {
      case 'beep':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
      case 'chime':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.5);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        oscillator.start(now);
        oscillator.stop(now + 0.8);
        break;
      case 'siren':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.linearRampToValueAtTime(900, now + 0.4);
        oscillator.frequency.linearRampToValueAtTime(300, now + 0.8);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.7);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
        oscillator.start(now);
        oscillator.stop(now + 0.8);
        break;
      case 'pulse':
      default:
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
        break;
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
