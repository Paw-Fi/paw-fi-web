// Shared helper for uploading receipt images to Supabase Storage
// Used by both WhatsApp webhook and mobile app process-expenses

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export async function uploadReceiptImage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  imageBuffer: Uint8Array,
  contentType: string,
  identifier: string // userId or phone
): Promise<string | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-receipt-upload' } },
    });

    const timestamp = Date.now();
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `receipts/${identifier}/${timestamp}.${ext}`;

    console.log('[storage-helper] Uploading to:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(fileName, imageBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[storage-helper] Upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(fileName);

    console.log('[storage-helper] Upload successful:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[storage-helper] Unexpected error:', error);
    return null;
  }
}
