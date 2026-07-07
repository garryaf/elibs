export interface EmsifaProvince {
  id: string;
  name: string;
}

export interface EmsifaRegency {
  id: string;
  province_id: string;
  name: string;
}

export interface EmsifaDistrict {
  id: string;
  regency_id: string;
  name: string;
}

export interface EmsifaVillage {
  id: string;
  district_id: string;
  name: string;
}

export interface SyncResult {
  provinsi: number;
  kabupatenKota: number;
  kecamatan: number;
  kelurahanDesa: number;
  errors: SyncError[];
}

export interface SyncError {
  level: 'provinsi' | 'kabupaten_kota' | 'kecamatan' | 'kelurahan_desa';
  parentId: string;
  error: string;
}
