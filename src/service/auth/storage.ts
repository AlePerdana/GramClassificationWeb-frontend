import type { AuthSession, AuthServiceConfig, AuthUser } from './types';
import { getConfig, getKey } from './config';

const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const sessionStorage = {
    getAccessToken(config?: AuthServiceConfig): string | null {
        const cfg = getConfig(config);
        const storage = getStorage();
        if (!storage) return null;
        return storage.getItem(getKey(cfg.storageKeyPrefix, 'accessToken'));
    },

    getRefreshToken(config?: AuthServiceConfig): string | null {
        const cfg = getConfig(config);
        const storage = getStorage();
        if (!storage) return null;
        return storage.getItem(getKey(cfg.storageKeyPrefix, 'refreshToken'));
    },

    getUser(config?: AuthServiceConfig): AuthUser | null {
        const cfg = getConfig(config);
        const storage = getStorage();
        if (!storage) return null;
        const raw = storage.getItem(getKey(cfg.storageKeyPrefix, 'user'));
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },

    setSession(session: AuthSession, config?: AuthServiceConfig) {
        const cfg = getConfig(config);
        const storage = getStorage();
        if (!storage) return;

        storage.setItem(getKey(cfg.storageKeyPrefix, 'accessToken'), session.tokens.accessToken);
        if (session.tokens.refreshToken) {
            storage.setItem(getKey(cfg.storageKeyPrefix, 'refreshToken'), session.tokens.refreshToken);
        }
        if (session.user) {
            storage.setItem(getKey(cfg.storageKeyPrefix, 'user'), JSON.stringify(session.user));
        }
    },

    clearSession(config?: AuthServiceConfig) {
        const cfg = getConfig(config);
        const storage = getStorage();
        if (!storage) return;
        storage.removeItem(getKey(cfg.storageKeyPrefix, 'accessToken'));
        storage.removeItem(getKey(cfg.storageKeyPrefix, 'refreshToken'));
        storage.removeItem(getKey(cfg.storageKeyPrefix, 'user'));
    },
};
