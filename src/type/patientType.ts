import { meta } from "./common"

export interface responsePatient {
    data: patient[]
    meta: meta
}

export interface patient {
    nama_lengkap: string;
    jenis_kelamin: string;
    tanggal_lahir: string;
    alamat: string;
    no_telepon: string;
    patient_date: string;
    date: string;
    id: number;
    id_pasien: string;
    created_at: string;
    updated_at: string;
}