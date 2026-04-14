import { paramWithTaskType } from "../type/common";
import { requestBodyRetrain, responseModel, responseRetrain } from "../type/modelType";
import { APP_CONFIG } from "../utils/constant";
import authService from "./authService";

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

        if (!response.ok) {
            const errorBody = await tryReadJson();
            const message =
                (errorBody && typeof errorBody.message === 'string' && errorBody.message) ||
                `Failed to retrain model: ${response.statusText}`;
            throw new Error(message);
        }

        const body = await tryReadJson();
        return body as responseRetrain;
    }
}