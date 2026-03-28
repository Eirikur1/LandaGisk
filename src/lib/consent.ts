/** Browser storage key for the cookie / storage consent record */
export const CONSENT_STORAGE_KEY = "dagrun-consent-v1";

export type StoredConsent = {
  v: 1;
  essential: true;
  analytics: boolean;
  at: string;
};

export function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredConsent;
    if (p?.v === 1 && p.essential === true) return p;
  } catch {
    /* ignore */
  }
  return null;
}

/** Use before loading optional analytics scripts */
export function analyticsAllowed(): boolean {
  return readConsent()?.analytics === true;
}
