import { FrappeApp } from "frappe-js-sdk";
import { toast } from "sonner";
import { HtmlRender } from "@/components/utils/html-render";

const frappe = new FrappeApp(import.meta.env.VITE_FRAPPE_API_URL);

frappe.axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // ✅ HARD SESSION EXPIRE CHECK
    if (status === 401 || status === 403) {
      console.warn("Frappe session expired. Logging out React...");

      // Clear any local app state if needed
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login
      window.location.href = "/login";
      return Promise.reject(error);
    }

    const errors =
      JSON.parse(error?.response?.data?._server_messages || "[]") || [];
    const err = errors.at(-1);

    if (!err) return Promise.reject(error);

    const { message } = JSON.parse(err);
    console.error(message);
    toast.error(HtmlRender({ content: message }).toString());

    return Promise.reject(error);
  }
);

export default {
  api: frappe.call(),
  db: frappe.db(),
  auth: frappe.auth(),
  file: frappe.file(),
};
