import { API_BASE_URL } from "../constants/env.js";

/**
 * Ако искаш да ползваш API_BASE_URL вместо хардкод:
 *   const MY_POSTS_URL = `${API_BASE_URL}/posts/get-my-posts`;
 * Но ти изрично каза да е към този URL:
 */
const MY_POSTS_URL = "http://localhost/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/backend/api/posts/get-my-posts";
const DELETE_POST_URL = "http://localhost/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/backend/api/posts/delete-post";

// ✅ Reactions (like / dislike)
const LIKE_POST_URL = "http://localhost/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/backend/api/posts/like-post";
const DISLIKE_POST_URL = "http://localhost/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/backend/api/posts/dislike-post";

async function safeJsonFetch(url, options = {}) {
  console.log("[posts]", options.method || "GET", url);

  let response;
  try {
    response = await fetch(url, {
      // важно за "my posts" ако бекенда ползва cookie session
      credentials: options.credentials ?? "include",
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

/**
 * Моите постове (infinite scroll)
 * Пази същия интерфейс като getAllPostsRequest, за да ти е лесно.
 */
export async function getMyPostsRequest({ currentPostId } = {}) {
  const base = MY_POSTS_URL;

  const hasParam =
    currentPostId !== undefined &&
    currentPostId !== null &&
    String(currentPostId).trim() !== "";

  const url = hasParam
    ? `${base}?current_post_id=${encodeURIComponent(String(currentPostId))}`
    : base;

  return safeJsonFetch(url, { method: "GET" });
}

/**
 * Ако все още го ползваш другаде – оставям го.
 * (ако не ти трябва, може да го махнеш)
 */
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

/** ✅ DELETE пост */
export async function deletePostRequest({ postId } = {}) {
  const payload = { post_id: Number(postId) };

  return safeJsonFetch(DELETE_POST_URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** ✅ LIKE пост (toggle: like -> null) */
export async function likePostRequest({ postId } = {}) {
  const payload = { post_id: Number(postId) };

  return safeJsonFetch(LIKE_POST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** ✅ DISLIKE пост (toggle: dislike -> null) */
export async function dislikePostRequest({ postId } = {}) {
  const payload = { post_id: Number(postId) };

  return safeJsonFetch(DISLIKE_POST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
