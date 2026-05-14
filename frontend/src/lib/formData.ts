/**
 * Convert a flat JSON-style payload into FormData for multipart endpoints.
 *
 * Arrays/objects → JSON-stringified so Laravel can decode them back. Booleans
 * become "1"/"0" (Laravel reads them as truthy strings). Files pass through.
 *
 * Pass `methodOverride` to spoof a PUT/PATCH via Laravel's `_method` so the
 * browser can POST multipart (it can't send files via PUT natively).
 */
export function buildFormData(
  payload: Record<string, unknown>,
  files: Record<string, File | undefined | null> = {},
  methodOverride: 'POST' | 'PUT' | 'PATCH' | null = null,
  removeFlags: Record<string, boolean> = {},
): FormData {
  const fd = new FormData()

  if (methodOverride && methodOverride !== 'POST') {
    fd.append('_method', methodOverride)
  }

  for (const [key, raw] of Object.entries(payload)) {
    if (raw === null || raw === undefined) continue
    if (Array.isArray(raw) || (typeof raw === 'object' && !(raw instanceof File))) {
      fd.append(key, JSON.stringify(raw))
    } else if (typeof raw === 'boolean') {
      fd.append(key, raw ? '1' : '0')
    } else {
      fd.append(key, String(raw))
    }
  }

  for (const [key, file] of Object.entries(files)) {
    if (file) fd.append(key, file)
  }
  for (const [key, flag] of Object.entries(removeFlags)) {
    if (flag) fd.append(key, '1')
  }

  return fd
}
