import { createAuthService } from './service';
import { AuthService } from './authServiceClass';

export type { AuthServiceApi } from './service';
export { AuthService } from './authServiceClass';

export type { AuthTokens, AuthUser, AuthSession, LoginRequest, AuthServiceConfig } from './types';
export type { AppRole } from './types';
export { AuthError } from './errors';

// Default singleton instance (mirrors old `authService.ts` behavior)
export const authService = new AuthService(createAuthService());
export default authService;
