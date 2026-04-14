import { meta } from "./common";

export interface responseModel {
    data: model[];
    meta: meta
}

export interface model {
    id: number;
    model_name: string;
    task_type: string;
    version: string;
    accuracy: number;
    f1_score: number;
    status: string;
    is_recommended: boolean;
    delta_acc?: number | null;
    delta_f1?: number | null;
    delta_time?: number | null;
    created_at: string;
    updated_at: string;
}

export interface requestBodyRetrain {
    model_id: number;
    epochs_head?: number;
    epochs_ft?: number;
    batch_size?: number;
    val_ratio_crop?: number;
}

export interface responseRetrain {
    job_id: number;
    status: string;
    message: string;
}

export interface responseProgressRetrain {
    data: progressRetrain[]
    meta: meta
}

export interface progressRetrain {
    job_id: number;
    model_name: string;
    model_id: number;
    status: string;
    progress_percent: number;
}