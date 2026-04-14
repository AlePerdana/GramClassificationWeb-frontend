import type { AuthServiceConfig } from './types';
import { APP_CONFIG } from '../../utils/constant';

export const defaultConfig: Required<
    Pick<
        AuthServiceConfig,
        | 'apiBaseUrl'
        | 'loginPath'
        | 'refreshPath'
        | 'authHeaderName'
        | 'authHeaderPrefix'
        | 'storageKeyPrefix'
    >
> = {
    apiBaseUrl:
        (APP_CONFIG?.API_BASE_URL as string | undefined) ??
        ((import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined) ??
        `${((import.meta as any)?.env?.VITE_API_HOST as string | undefined) ?? 'http://localhost:8000'}/api`,
    loginPath: 'auth/login',
    refreshPath: '/token/refresh/',
    authHeaderName: 'Authorization',
    authHeaderPrefix: 'Bearer',
    storageKeyPrefix: 'auth.',
};

export const getConfig = (config?: AuthServiceConfig) => {
    const merged = {
        ...defaultConfig,
        ...config,
    };
    return merged as typeof defaultConfig & AuthServiceConfig;
};

export const joinUrl = (baseUrl: string, path: string) => {
    if (/^https?:\/\//i.test(path)) return path;
    const trimmedBase = baseUrl.replace(/\/+$/, '');
    const trimmedPath = path.startsWith('/') ? path : `/${path}`;
    return `${trimmedBase}${trimmedPath}`;
};

export const getKey = (storageKeyPrefix: string, name: string) => `${storageKeyPrefix}${name}`;
