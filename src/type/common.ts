export interface meta {
    total_page: number;
    total: number;
    page: number;
    last_page: number;
}

export interface param {
    page?: number;
    per_page?: number; 
}

export interface paramWithDate extends param {
    start_date?: string;
    end_date?: string;
}

export interface paramWithTaskType extends param {
    task_type?: string;
}

export interface paramWithSearch extends param {
    search?: string;
}