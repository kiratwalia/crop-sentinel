/**
 * Turns an uploaded photo into a compact data URL.
 *
 * A `blob:` object URL dies with the page that created it, so the result page
 * would show a broken photo after a refresh. A downscaled JPEG data URL can be
 * stored alongside the analysis and rendered again on any later page load.
 */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

export async function fileToStorableImageUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);

  try {
    const image = new Image();
    image.src = original;
    await image.decode();

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return original;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return original;
  }
}
