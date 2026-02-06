
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
let wakeLock: any = null;
let keepAliveInterval: number | null = null;

/**
 * BACKGROUND HACK 1: Wake Lock
 * Requests the screen to stay on. Handles NotAllowedError silently.
 */
export const requestWakeLock = async () => {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake Lock active');
    } catch (err: any) {
      // Silently ignore permission policy errors
      if (err.name !== 'NotAllowedError' && err.name !== 'SecurityError') {
        console.warn('WakeLock failed:', err.message);
      }
    }
  }
};

export const releaseWakeLock = () => {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
    }).catch(() => {
      wakeLock = null;
    });
  }
};

/**
 * BACKGROUND HACK 2: Silent Audio & Notifications
 * Initializes audio context and permissions.
 */
export const initBackgroundService = async () => {
  // 1. Request Notification Permission
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
    try {
      await Notification.requestPermission();
    } catch (e) {}
  }

  // 2. Start Silent Audio Loop (Keep Alive)
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (sharedAudioCtx.state === 'suspended') {
    try {
      await sharedAudioCtx.resume();
    } catch (e) {}
  }

  // Play a silent sound every 20 seconds to keep the tab "active" in background
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  const playSilentPing = () => {
    if (!sharedAudioCtx) return;
    try {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.frequency.value = 100; // Low freq
      gain.gain.value = 0.001; // Almost silent but technically playing
      osc.start();
      osc.stop(sharedAudioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  playSilentPing(); // Immediate
  keepAliveInterval = window.setInterval(playSilentPing, 20000);
  
  // 3. Request Wake Lock
  await requestWakeLock();
};

export const stopBackgroundService = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  releaseWakeLock();
};

export const sendSystemNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'arrival-alarm'
          } as any);
        });
      } else {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
};

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
