export type SdkSession = {
  jwt: string;
  expiration: number;
};

export const SESSION_KEY = "ab-sdk-session";

export function getStoredSession(): SdkSession | null {
  const storedSessionString = localStorage.getItem(SESSION_KEY);
  if (storedSessionString) {
    try {
      const storedSession = JSON.parse(storedSessionString);
      // TODO: Check if expiration has passed
      if (storedSession.jwt && storedSession.expiration) {
        return {
          jwt: storedSession.jwt,
          expiration: storedSession.expiration,
        };
      }
    } catch {
      // Swallow error, no valid jwt found
    }
  }
  return null;
}

export function storeSession(session: SdkSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
