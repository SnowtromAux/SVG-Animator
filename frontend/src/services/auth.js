import { API_BASE_URL } from "../constants/env.js";

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

  // If backend returns { success, ... } in JSON, pass through
  if (data && typeof data === "object" && "success" in data) {
    return data;
  }

  // Fallback if backend returns unexpected format
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
    data,
    message: "Регистрацията е успешна.",
  };
}
