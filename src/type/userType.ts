import { meta } from "./common"

export interface responseUser {
    data: user[]
    meta: meta
}

export interface user {
    id: number;
    full_name: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface UserRequest {
    full_name: string;
    username: string;
    password?: string;
    role: string;
    is_active?: boolean;
    email?: string;
}

export interface UserUpdateRequest extends UserRequest {
    new_password?: string;
}

export interface UserCreateRequest extends UserRequest {
    password: string;
}