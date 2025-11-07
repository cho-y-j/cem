// Supabase Storage helper functions
import { getSupabase } from './db';

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const key = normalizeKey(relKey);
  const bucketName = 'erms';

  // 파일 업로드
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(key, data, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[Storage] Upload error:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Public URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(key);

  console.log(`[Storage] File uploaded: ${key} -> ${publicUrl}`);
  return { key, url: publicUrl };
}

export async function storageGet(
  relKey: string,
  _expiresIn = 300
): Promise<{ key: string; url: string; }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const key = normalizeKey(relKey);
  const bucketName = 'erms';

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(key);

  return { key, url: publicUrl };
}
