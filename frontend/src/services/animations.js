import { API_BASE_URL } from "../constants/env.js";

// GET /animation/get-all-animations?page=1&search_text=...
export async function getAllAnimationsRequest({ page = 1, searchText = "" } = {}) {
  const url = `${API_BASE_URL}/animation/get-all-animations?page=${encodeURIComponent(page)}&search_text=${encodeURIComponent(searchText)}`;

  console.log("[animations] GET", url);

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
    console.error("[animations] NETWORK ERROR", err);
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
    console.error("[animations] Non-JSON response body:", text);
    data = null;
  }

  console.log("[animations] status:", response.status, "data:", data);

  // Ако бекендът връща {success: true/false, ...} -> директно
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

  // fallback
  return {
    success: true,
    data,
  };
}
