const AUTH_KEY = "kosmic_auth";

export const DEMO_CREDENTIALS = {
  username: "Member",
  password: "Member123",
};

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function login(): void {
  sessionStorage.setItem(AUTH_KEY, "true");
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
