import { API_BASE_URL } from "../constants/env.js";

// POST /auth/login
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
      // credentials: "include",
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

// POST /auth/register
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
      // credentials: "include",
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

// GET /auth/me
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

  return { success: false, error: { code: "INVALID_RESPONSE", message: "Invalid /auth/me response" } };
}


// GET /auth/logout
export async function logoutRequest() {
  const url = `${API_BASE_URL}/auth/logout`;

  console.log("[auth] GET", url);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // credentials: "include",
    });
  } catch (err) {
    console.error("[auth] LOGOUT NETWORK ERROR", err);
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
    console.error("[auth] LOGOUT Non-JSON response body:", text);
    data = null;
  }

  console.log("[auth] LOGOUT status:", response.status, "data:", data);

  if (data && typeof data === "object" && "success" in data) {
    return data;
  }

  if (!response.ok) {
    return {
      success: false,
      error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}` },
    };
  }

  return { success: true, message: "Изходът е успешен." };
}
