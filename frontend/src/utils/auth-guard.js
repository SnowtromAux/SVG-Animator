import { meRequest } from "../services/auth.js";

const LOGIN_URL = "/svganimator/frontend/login";

const LS_USERNAME_KEY = "user.username";
const LS_EMAIL_KEY = "user.email";

export function getStoredUserMeta() {
  return {
    username: localStorage.getItem(LS_USERNAME_KEY),
    email: localStorage.getItem(LS_EMAIL_KEY),
  };
}

export function clearStoredUserMeta() {
  localStorage.removeItem(LS_USERNAME_KEY);
  localStorage.removeItem(LS_EMAIL_KEY);
}

async function authGuard() {
  try {
    const result = await meRequest();

    if (result?.success && result?.user) {
      const { username, email } = result.user;

      if (typeof username === "string") {
        localStorage.setItem(LS_USERNAME_KEY, username);
      }
      if (typeof email === "string") {
        localStorage.setItem(LS_EMAIL_KEY, email);
      }

      return result.user;
    }

    localStorage.removeItem(LS_USERNAME_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
    window.location.replace(LOGIN_URL);
    return null;
  } catch (e) {
    localStorage.removeItem(LS_USERNAME_KEY);
    localStorage.removeItem(LS_EMAIL_KEY);
    window.location.replace(LOGIN_URL);
    return null;
  }
}

await authGuard();