// Helper function to upload receipt images to Supabase Storage

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export async function uploadReceiptImage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  imageBuffer: Uint8Array,
  contentType: string,
  phone: string
): Promise<string | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-receipt-upload' } },
    });

    const timestamp = Date.now();
    const phoneHash = phone.replace(/[^0-9]/g, '').slice(-10); // Last 10 digits for privacy
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `receipts/${phoneHash}/${timestamp}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[storage-helper] Upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(fileName);

    console.log('[storage-helper] Image uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[storage-helper] Unexpected error:', error);
    return null;
  }
}
