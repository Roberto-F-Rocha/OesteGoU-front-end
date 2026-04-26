import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./authKeys";

export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getUser() {
  const user = localStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setSession(token: string, user: any) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}