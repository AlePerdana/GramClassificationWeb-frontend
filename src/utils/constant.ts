const API_HOST = (import.meta as any).env.VITE_API_HOST || 'http://localhost:8000';

export const APP_CONFIG = {
    API_HOST,
    API_BASE_URL: `${API_HOST}/api`,
} as const;