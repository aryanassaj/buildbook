const KEY = "bb_fingerprint";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

function readCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)bb_fingerprint=([^;]+)/);
  return match ? match[1] : null;
}

function writeCookie(fp: string) {
  document.cookie = `${KEY}=${fp}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getFingerprint(): string {
  let fp = localStorage.getItem(KEY) ?? readCookie();
  if (!fp) {
    fp = crypto.randomUUID();
  }
  localStorage.setItem(KEY, fp);
  writeCookie(fp);
  return fp;
}
