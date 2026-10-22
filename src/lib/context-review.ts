/** Set by the dedicated native review build before frontend code runs. */
export function isContextReview(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as Window & { __ARGUS_CONTEXT_REVIEW__?: boolean }).__ARGUS_CONTEXT_REVIEW__ === true
  );
}
