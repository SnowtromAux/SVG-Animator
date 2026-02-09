import { meRequest } from "../services/auth.js";

const LOGIN_URL = "/svganimator/frontend/login";

const LS_USERNAME_KEY = "user.username";
const LS_EMAIL_KEY = "user.email";

if (!window.__SVG_AUTH_GUARD_RUNNING__) {
  window.__SVG_AUTH_GUARD_RUNNING__ = true;

  (async () => {
    try {
      const result = await meRequest();

      if (result?.success && result?.user) {
        const { username, email } = result.user || {};

        if (typeof username === "string") localStorage.setItem(LS_USERNAME_KEY, username);
        if (typeof email === "string") localStorage.setItem(LS_EMAIL_KEY, email);

        window.dispatchEvent(
          new CustomEvent("auth:user-ready", { detail: { username, email, user: result.user } })
        );

        return;
      }

      localStorage.removeItem(LS_USERNAME_KEY);
      localStorage.removeItem(LS_EMAIL_KEY);

      window.location.replace(LOGIN_URL);
    } catch (e) {
      localStorage.removeItem(LS_USERNAME_KEY);
      localStorage.removeItem(LS_EMAIL_KEY);

      window.location.replace(LOGIN_URL);
    }
  })();
}