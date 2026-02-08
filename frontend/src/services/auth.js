import { API_BASE_URL } from "../constants/env.js";

/**
 * POST /auth/login
 * Body: { login: string, password: string }
 */
export async function loginRequest({ login, password }) {
  const url = `${API_BASE_URL}/auth/login`;

  console.log("[auth] POST", url, { login });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ login, password }),
    });
  } catch (err) {
    console.error("[auth] NETWORK ERROR", err);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Няма връзка със сървъра. Опитайте отново.",
      },
    };
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("[auth] Non-JSON response body:", text);
    data = null;
  }

  console.log("[auth] status:", response.status, "data:", data);

  if (data && typeof data === "object" && "success" in data) {
    return data;
  }

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: "HTTP_ERROR",
        message: `Request failed with status ${response.status}`,
      },
    };
  }

  return { success: true, data };
}

/**
 * POST /auth/register
 * Body: { email: string, username: string, password: string }
 */
export async function registerRequest({ email, username, password }) {
  const url = `${API_BASE_URL}/auth/register`;

  console.log("[auth] POST", url, { email, username });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, username, password }),
    });
  } catch (err) {
    console.error("[auth] NETWORK ERROR", err);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Няма връзка със сървъра. Опитайте отново.",
      },
    };
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("[auth] Non-JSON response body:", text);
    data = null;
  }

  console.log("[auth] status:", response.status, "data:", data);

  if (data && typeof data === "object" && "success" in data) {
    return data;
  }

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: "HTTP_ERROR",
        message: `Request failed with status ${response.status}`,
      },
    };
  }

  return {
    success: true,
    message: "Регистрацията е успешна.",
    data,
  };
}

/**
 * GET /auth/me
 * Expected response:
 * {"success":true,"user":{"id":17,"username":"axel123","email":"snowtromgs@gmail.com"}}
 */
export async function meRequest() {
  const url = `${API_BASE_URL}/auth/me`;

  console.log("[auth] GET", url);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // IMPORTANT: if your backend uses cookies/sessions and frontend+backend are different origins,
      // you might need: credentials: "include"
      // credentials: "include",
    });
  } catch (err) {
    console.error("[auth] ME NETWORK ERROR", err);
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network error" },
    };
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("[auth] ME Non-JSON response body:", text);
    data = null;
  }

  console.log("[auth] ME status:", response.status, "data:", data);

  if (data && typeof data === "object" && "success" in data) {
    return data;
  }

  if (!response.ok) {
    return {
      success: false,
      error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}` },
    };
  }

  // If it returned something unexpected but 2xx:
  return { success: false, error: { code: "INVALID_RESPONSE", message: "Invalid /auth/me response" } };
}
