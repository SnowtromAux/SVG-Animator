import { API_BASE_URL } from "../constants/env.js";

async function safeJsonFetch(url, options = {}) {
  console.log("[posts]", options.method || "GET", url);

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    console.error("[posts] NETWORK ERROR", err);
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
    console.error("[posts] Non-JSON response body:", text);
    data = null;
  }

  console.log("[posts] status:", response.status, "data:", data);

  if (data && typeof data === "object" && "success" in data) return data;

  if (!response.ok) {
    return {
      success: false,
      error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}` },
    };
  }

  return { success: true, data };
}

export async function getAllPostsRequest({ currentPostId } = {}) {
  const base = `${API_BASE_URL}/posts/get-all-posts`;

  const hasParam =
    currentPostId !== undefined &&
    currentPostId !== null &&
    String(currentPostId).trim() !== "";

  const url = hasParam
    ? `${base}?current_post_id=${encodeURIComponent(String(currentPostId))}`
    : base;

  return safeJsonFetch(url, { method: "GET" });
}

export async function createPostRequest({ animationId, description } = {}) {
  const url = `${API_BASE_URL}/posts/create-post`;

  const payload = {
    animation_id: String(animationId ?? ""),
    description: String(description ?? ""),
  };

  return safeJsonFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
