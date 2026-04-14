import { paramWithSearch } from "../type/common";
import { responsePatient } from "../type/patientType";
import { APP_CONFIG } from "../utils/constant";
import { authService } from "./authService";

export interface PatientQueueListParams extends paramWithSearch {
    specimen_status?: string;
    include_no_specimen?: boolean;
}

export interface PatientUpsertRequest {
    nama_lengkap: string;
    jenis_kelamin: string;
    tanggal_lahir: string;
    alamat?: string;
    no_telepon?: string;
    waktu_masuk?: string;
}

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

export class PatientService {
    async getPatientList(param?: paramWithSearch): Promise<responsePatient> {
        const queryParams = new URLSearchParams();

        if (param?.search) queryParams.append('search', param.search);
        if (param?.page) queryParams.append('page', param.page.toString());
        if (param?.per_page) queryParams.append('per_page', param.per_page.toString());
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/patients?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });

        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to fetch patient list: ${response.statusText}`);
        }
        if (!data) {
            throw new Error('Failed to fetch patient list: empty response body');
        }
        return data as unknown as responsePatient;
    }

    async getPatientQueueList(params?: PatientQueueListParams): Promise<responsePatient> {
        const queryParams = new URLSearchParams();

        if (params?.specimen_status) queryParams.append('specimen_status', params.specimen_status);
        if (params?.include_no_specimen !== undefined) queryParams.append('include_no_specimen', String(params.include_no_specimen));
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/patients?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });

        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to fetch patient list: ${response.statusText}`);
        }
        if (!data) {
            throw new Error('Failed to fetch patient list: empty response body');
        }
        return data as unknown as responsePatient;
    }

    async createPatient(payload: PatientUpsertRequest): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/patients`, {
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
            throw new Error(getMessageFromJson(data) || `Failed to create patient: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }

    async updatePatient(id: number | string, payload: PatientUpsertRequest): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/patients/${id}`, {
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
            throw new Error(getMessageFromJson(data) || `Failed to update patient: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }

    async deletePatient(id: number | string): Promise<JsonRecord> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/patients/${id}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        const data = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(getMessageFromJson(data) || `Failed to delete patient: ${response.statusText}`);
        }
        return (data as JsonRecord) || {};
    }
}