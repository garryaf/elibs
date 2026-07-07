"use client";

import { useCallback } from "react";
import { RegionSelect } from "./RegionSelect";
import { useRegionData } from "./useRegionData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegionValue {
  provinsiId?: string;
  kabupatenKotaId?: string;
  kecamatanId?: string;
  kelurahanDesaId?: string;
}

export interface CascadingRegionSelectorProps {
  value: RegionValue;
  onChange: (value: RegionValue) => void;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CascadingRegionSelector({
  value,
  onChange,
  disabled = false,
}: CascadingRegionSelectorProps) {
  // Data hooks for each level
  const provinsi = useRegionData({
    endpoint: "provinsi",
  });

  const kabupatenKota = useRegionData({
    endpoint: "kabupaten-kota",
    parentId: value.provinsiId,
    requiresParent: true,
  });

  const kecamatan = useRegionData({
    endpoint: "kecamatan",
    parentId: value.kabupatenKotaId,
    requiresParent: true,
  });

  const kelurahanDesa = useRegionData({
    endpoint: "kelurahan-desa",
    parentId: value.kecamatanId,
    requiresParent: true,
  });

  // ─── Handlers (cascading reset) ──────────────────────────────────────────

  const handleProvinsiChange = useCallback(
    (id: string) => {
      // Reset all children when province changes
      onChange({
        provinsiId: id,
        kabupatenKotaId: undefined,
        kecamatanId: undefined,
        kelurahanDesaId: undefined,
      });
    },
    [onChange]
  );

  const handleKabupatenKotaChange = useCallback(
    (id: string) => {
      // Reset kecamatan and kelurahan when kabupaten changes
      onChange({
        ...value,
        kabupatenKotaId: id,
        kecamatanId: undefined,
        kelurahanDesaId: undefined,
      });
    },
    [onChange, value]
  );

  const handleKecamatanChange = useCallback(
    (id: string) => {
      // Reset kelurahan when kecamatan changes
      onChange({
        ...value,
        kecamatanId: id,
        kelurahanDesaId: undefined,
      });
    },
    [onChange, value]
  );

  const handleKelurahanDesaChange = useCallback(
    (id: string) => {
      onChange({
        ...value,
        kelurahanDesaId: id,
      });
    },
    [onChange, value]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Provinsi */}
      <RegionSelect
        label="Provinsi"
        placeholder="Pilih provinsi..."
        items={provinsi.items}
        value={value.provinsiId}
        onChange={handleProvinsiChange}
        isLoading={provinsi.isLoading}
        error={provinsi.error}
        search={provinsi.search}
        onSearchChange={provinsi.setSearch}
        onRetry={provinsi.retry}
        disabled={disabled}
      />

      {/* Kabupaten / Kota */}
      <RegionSelect
        label="Kabupaten / Kota"
        placeholder="Pilih kabupaten/kota..."
        items={kabupatenKota.items}
        value={value.kabupatenKotaId}
        onChange={handleKabupatenKotaChange}
        isLoading={kabupatenKota.isLoading}
        error={kabupatenKota.error}
        search={kabupatenKota.search}
        onSearchChange={kabupatenKota.setSearch}
        onRetry={kabupatenKota.retry}
        disabled={disabled || !value.provinsiId}
      />

      {/* Kecamatan */}
      <RegionSelect
        label="Kecamatan"
        placeholder="Pilih kecamatan..."
        items={kecamatan.items}
        value={value.kecamatanId}
        onChange={handleKecamatanChange}
        isLoading={kecamatan.isLoading}
        error={kecamatan.error}
        search={kecamatan.search}
        onSearchChange={kecamatan.setSearch}
        onRetry={kecamatan.retry}
        disabled={disabled || !value.kabupatenKotaId}
      />

      {/* Kelurahan / Desa */}
      <RegionSelect
        label="Kelurahan / Desa"
        placeholder="Pilih kelurahan/desa..."
        items={kelurahanDesa.items}
        value={value.kelurahanDesaId}
        onChange={handleKelurahanDesaChange}
        isLoading={kelurahanDesa.isLoading}
        error={kelurahanDesa.error}
        search={kelurahanDesa.search}
        onSearchChange={kelurahanDesa.setSearch}
        onRetry={kelurahanDesa.retry}
        disabled={disabled || !value.kecamatanId}
      />
    </div>
  );
}
