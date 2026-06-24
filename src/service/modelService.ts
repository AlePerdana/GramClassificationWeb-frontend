import { paramWithStatus, paramWithTaskType } from "../type/common";
import { requestBodyRetrain, responseModel, responseProgressRetrain, responseRetrain } from "../type/modelType";
import { APP_CONFIG } from "../utils/constant";
import authService from "./authService";
import { handleUnauthorized } from "./auth/authGuard";

export class ModelService {
    async getModelList(param?: paramWithTaskType): Promise<responseModel> {
        const queryParams = new URLSearchParams();

        if (param?.task_type) queryParams.append('task_type', param.task_type);
        if (param?.page) queryParams.append('page', param.page.toString());
        if (param?.per_page) queryParams.append('per_page', param.per_page.toString());
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch model list: ${response.statusText}`);
        }
        return response.json() as Promise<responseModel>;
    }

    async retrainModel(requestBody: requestBodyRetrain): Promise<responseRetrain> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/retrain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthorizationHeader(),
            },
            body: JSON.stringify(requestBody),
        });

        const tryReadJson = async () => {
            try {
                return await response.json();
            } catch {
                return null;
            }
        };

        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const errorBody = await tryReadJson();
            const message =
                (errorBody && typeof errorBody.message === 'string' && errorBody.message) ||
                (errorBody && typeof errorBody.detail === 'string' && errorBody.detail) ||
                `Failed to retrain model: ${response.statusText}`;
            throw new Error(message);
        }

        const body = await tryReadJson();
        return body as responseRetrain;
    }

    async getProgressRetrain(params?: paramWithStatus): Promise<responseProgressRetrain> {
        const queryParams = new URLSearchParams();

        if (params?.status) queryParams.append('status', params.status);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/training-jobs?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch retrain progress: ${response.statusText}`);
        }
        return response.json() as Promise<responseProgressRetrain>;
    }

    async cancelTrainingJob(jobId: number): Promise<{ message: string }> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/training-jobs/${jobId}/cancel`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || err?.message || 'Gagal membatalkan training job.');
        }
        return response.json();
    }

    async deleteTrainingJob(jobId: number): Promise<{ message: string }> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/training-jobs/${jobId}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || err?.message || 'Gagal menghapus training job.');
        }
        return response.json();
    }

    async activateModel(modelId: number): Promise<{ message: string }> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/${modelId}/activate`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || err?.message || 'Gagal mengaktifkan model.');
        }
        return response.json();
    }

    async deleteModel(modelId: number): Promise<{ message: string }> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/${modelId}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || err?.message || 'Gagal menghapus model.');
        }
        return response.json();
    }

    async getRetrainConfig(): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/retrain-config`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch retrain config: ${response.statusText}`);
        }
        return response.json();
    }

    async updateRetrainConfig(data: { auto_retrain_enabled?: boolean; trigger_count?: number }): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/retrain-config`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
            body: JSON.stringify(data),
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.detail || err?.message || 'Gagal memperbarui konfigurasi retrain.');
        }
        return response.json();
    }

    async getRetrainOptions(): Promise<any[]> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/retrain/options`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch retrain options: ${response.statusText}`);
        }
        return response.json();
    }

    async getActiveModel(): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/active`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch active model: ${response.statusText}`);
        }
        return response.json();
    }

    async getBestModel(): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/best`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch best model: ${response.statusText}`);
        }
        return response.json();
    }
    async uploadModel(formData: FormData): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/upload`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
            body: formData,
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal mengunggah model: ${response.statusText}`);
        }
        return data;
    }

    async benchmarkAll(): Promise<{ message: string }> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/benchmark-all`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal melakukan benchmark: ${response.statusText}`);
        }
        return data;
    }

    async benchmarkSingle(modelId: number): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/${modelId}/benchmark`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal melakukan benchmark: ${response.statusText}`);
        }
        return data;
    }

    async getTrendData(period: string = 'daily'): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/trend?period=${period}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        if (!response.ok) {
            throw new Error(`Failed to fetch trend data: ${response.statusText}`);
        }
        return response.json();
    }

    async benchmarkYolo(modelId?: number, testDataPath?: string): Promise<any> {
        const params = new URLSearchParams();
        if (modelId) params.append('model_id', modelId.toString());
        if (testDataPath) params.append('test_data_path', testDataPath);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/yolo-benchmark${qs}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal melakukan benchmark YOLO: ${response.statusText}`);
        }
        return data;
    }

    async benchmarkActive(): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/benchmark-active`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal melakukan benchmark model aktif: ${response.statusText}`);
        }
        return data;
    }

    async benchmarkAllYolo(): Promise<any> {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/admin/models/yolo-benchmark-all`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
            },
        });
        if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized'); }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Gagal melakukan benchmark semua model YOLO: ${response.statusText}`);
        }
        return data;
    }

}