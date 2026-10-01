import axios from "axios";

/**
 * Single configured axios instance used by every API call.
 * - Base URL comes from VITE_API_URL (see .env.example)
 * - The Sanctum bearer token is attached automatically
 * - A 401 on a logged-in session clears the token and notifies AuthContext
 */
const TOKEN_KEY = "invoicify_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Turns any axios error into { status, message, fields }.
 * `fields` maps Laravel validation errors (snake_case) onto the camelCase
 * field names our forms use, e.g. property_name -> propertyName.
 */
export function parseApiError(error) {
  if (!error.response) {
    return {
      status: 0,
      message: "Can't reach the server. Check your connection and that the API is running.",
      fields: {},
    };
  }
  const { status, data } = error.response;
  const fields = {};
  if (data?.errors) {
    for (const [key, value] of Object.entries(data.errors)) {
      fields[snakeToCamel(key)] = Array.isArray(value) ? value[0] : value;
    }
  }
  return { status, message: data?.message || "Something went wrong. Please try again.", fields };
}

export default http;
