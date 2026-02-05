import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno (como tu API_KEY de Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Esto inyecta la clave API de forma segura en tu código
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});