/** Normalize machine media metadata; never infer financial meaning from speech. */
export function normalizeAudioContentType(
  data: string,
  contentType: string,
): string {
  const declared = contentType.toLowerCase().trim().split(";")[0];
  let header = "";
  try {
    // Only inspect the container header, without decoding/copying the recording.
    const prefix = data.slice(0, 64);
    header = atob(prefix.slice(0, prefix.length - (prefix.length % 4)));
  } catch {
    // The provider remains responsible for decoding unsupported/malformed media.
  }
  if (header.slice(4, 8) === "ftyp") return "audio/mp4";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WAVE") {
    return "audio/wav";
  }
  if (header.startsWith("OggS")) return "audio/ogg";
  if (header.startsWith("fLaC")) return "audio/flac";
  if (header.startsWith("ID3")) return "audio/mpeg";
  if (header.charCodeAt(0) === 0xff && (header.charCodeAt(1) & 0xf6) === 0xf0) {
    return "audio/x-aac";
  }
  // Legacy Mobile captures use audio/aac; Vertex calls raw AAC audio/x-aac.
  if (declared === "audio/aac") return "audio/x-aac";
  if (declared === "audio/x-m4a" || declared === "audio/m4a") {
    return "audio/mp4";
  }
  if (declared === "audio/mp3" || declared === "audio/mpga") {
    return "audio/mpeg";
  }
  return declared;
}
