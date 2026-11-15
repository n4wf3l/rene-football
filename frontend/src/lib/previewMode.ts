/**
 * True when the public site is shown inside the admin's live preview
 * (Réglages → `/?hero=…&apercu=1` in an iframe). The page then looks exactly
 * the same, but is not counted as a visit and shows no cookie notice.
 * Read once at load, so it holds while the preview navigates.
 */
export const IS_PREVIEW: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).has('apercu')
  } catch {
    return false
  }
})()
