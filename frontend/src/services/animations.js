import { API_BASE_URL } from "../constants/env.js";

/**
 * Helper: safe fetch -> JSON {success,...} или fallback error
 */
async function safeJsonFetch(url, options = {}) {
  console.log("[animations]", options.method || "GET", url);

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    console.error("[animations] NETWORK ERROR", err);
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: "Няма връзка със сървъра. Опитайте отново." },
    };
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("[animations] Non-JSON response body:", text);
    data = null;
  }

  console.log("[animations] status:", response.status, "data:", data);

  // ако backend връща {success:...} – връщаме директно
  if (data && typeof data === "object" && "success" in data) return data;

  if (!response.ok) {
    return {
      success: false,
      error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}` },
    };
  }

  return { success: true, data };
}

// GET /animation/get-animation?animation_id=XXX
export async function getAnimationRequest({ animationId } = {}) {
  const url = `${API_BASE_URL}/animation/get-animation?animation_id=${encodeURIComponent(animationId ?? "")}`;
  return safeJsonFetch(url, { method: "GET" });
}

// POST /animation/create-animation
// Body: { name, svg_text, settings }
export async function createAnimationRequest({ name, svgText, settings } = {}) {
  const url = `${API_BASE_URL}/animation/create-animation`;

  const payload = {
    name: name ?? "Untitled",
    svg_text: svgText ?? "",
    settings: settings ?? {},
  };

  return safeJsonFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// PUT /animation/save-animation
export async function saveAnimationRequest(payload = {}) {
  const url = `${API_BASE_URL}/animation/save-animation`;

  return safeJsonFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// GET /animation/get-all-animations?page=1&search_text=...
export async function getAllAnimationsRequest({ page = 1, searchText = "" } = {}) {
  const url = `${API_BASE_URL}/animation/get-all-animations?page=${encodeURIComponent(page)}&search_text=${encodeURIComponent(
    searchText
  )}`;

  return safeJsonFetch(url, { method: "GET" });
}

// DELETE /animation/delete-animation
export async function deleteAnimationRequest({ animationId } = {}) {
  const url = `${API_BASE_URL}/animation/delete-animation`;
  const payload = { animation_id: animationId };

  return safeJsonFetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
