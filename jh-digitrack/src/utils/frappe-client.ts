import { FrappeApp } from "frappe-js-sdk";
import { toast } from "sonner";
import { HtmlRender } from "@/components/utils/html-render";

const frappe = new FrappeApp(import.meta.env.VITE_FRAPPE_API_URL);

// Show the error message
frappe.axios.interceptors.response.use(undefined, function (error) {
  const errors = JSON.parse(error.response.data._server_messages) || [];
  const err = errors.at(-1);

  // If the error is not a validation error, return the error
  if (!err) return Promise.reject(error);

  // Get the error message
  const { message } = JSON.parse(err);

  // Show the error message
  console.error(message);
  toast.error(HtmlRender({ content: message }).toString());
});

export default {
  api: frappe.call(),
  db: frappe.db(),
  auth: frappe.auth(),
  file: frappe.file(),
};
