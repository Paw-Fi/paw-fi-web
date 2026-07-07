import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getPlaidInstitutionById } from "./plaid-client.ts";
import { resolvePlaidCountryCode } from "./plaid-country.ts";
import {
  buildPlaidInstitutionLogoStoragePath,
  decodePlaidLogoBase64,
  hashLogoBytes,
} from "./plaid-institution-logo-utils.ts";

const PUBLIC_BUCKET = "public";

export interface StoredPlaidInstitutionLogo {
  publicUrl: string | null;
  storagePath: string | null;
  primaryColor: string | null;
}

export async function fetchAndStorePlaidInstitutionLogo(params: {
  supabase: SupabaseClient;
  userId: string;
  institutionId?: string | null;
  countryCode?: string | null;
}): Promise<StoredPlaidInstitutionLogo | null> {
  const institutionId = params.institutionId?.trim();
  if (!institutionId) return null;

  const countryCode =
    resolvePlaidCountryCode({
      requestedCountryCode: params.countryCode,
    }) ?? "US";
  const institution = await getPlaidInstitutionById({
    institutionId,
    countryCodes: [countryCode],
  });
  const primaryColor = normalizePlaidHexColor(institution.primary_color);
  const logoBytes = decodePlaidLogoBase64(institution.logo);
  if (!logoBytes) {
    return {
      publicUrl: null,
      storagePath: null,
      primaryColor,
    };
  }

  const contentHash = await hashLogoBytes(logoBytes);
  const storagePath = buildPlaidInstitutionLogoStoragePath({
    userId: params.userId,
    institutionId,
    hash: contentHash,
  });

  const { error } = await params.supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(storagePath, logoBytes, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = params.supabase.storage
    .from(PUBLIC_BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    return {
      publicUrl: null,
      storagePath,
      primaryColor,
    };
  }

  return {
    publicUrl: `${publicUrl}?v=${contentHash}`,
    storagePath,
    primaryColor,
  };
}

function normalizePlaidHexColor(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
}
