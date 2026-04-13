import { supabase } from "./supabaseClient";

const IMAGE_BUCKET = "public-images";

function getExt(filename: string) {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx + 1).toLowerCase();
}

export async function uploadImage(file: File, prefix: string) {
  const ext = getExt(file.name) || "png";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

