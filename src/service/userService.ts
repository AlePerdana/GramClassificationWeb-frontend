import { paramWithSearch } from "../type/common";
import { responseUser, UserCreateRequest, UserUpdateRequest } from "../type/userType";
import { APP_CONFIG } from "../utils/constant";
import { authService } from "./authService";



type JsonRecord = Record<string, unknown>;

const readJsonSafely = async (response: Response): Promise<unknown | null> => {
    try {
        return (await response.json()) as unknown;
    } catch {
        return null;
    }
};

const getMessageFromJson = (json: unknown | null): string | null => {
    if (!json || typeof json !== 'object') return null;
    const msg = (json as JsonRecord).message;
    return typeof msg === 'string' && msg.trim() ? msg : null;
};

export class userService {
    async getUserList(param?: paramWithSearch): Promise<responseUser> {
        const queryParams = new URLSearchParams();

        if (param?.search) queryParams.append('search', param.search);
        if (param?.page) queryParams.append('page', param.page.toString());
        if (param?.per_page) queryParams.append('per_page', param.per_page.toString());
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/users?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });

        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to fetch user list: ${response.statusText}`);
        }
        if (!data) {
            throw new Error('Failed to fetch user list: empty response body');
        }
        return data as unknown as responseUser;
    }

    async createUser(payload: UserCreateRequest): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
            body: JSON.stringify(payload),
        });
        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to create user: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }

    async updateUser(id: number | string, payload: UserUpdateRequest): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
            body: JSON.stringify(payload),
        });
        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to update user: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }

    async deleteUser(id: number | string): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to delete user: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }
}