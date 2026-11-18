import { FrappeApp } from "frappe-js-sdk";
import { serverMessage } from "@/utils/server-message";

const frappe = new FrappeApp(import.meta.env.VITE_FRAPPE_API_URL);

// Log the server's message and pass the original error on. frappe-js-sdk
// builds the error it throws from error.response, including
// _server_messages, so callers can show the reason with errorMessage().
// (This used to call the HtmlRender component as a function, which throws
// outside React rendering. The SDK then failed with "Cannot read properties
// of undefined (reading 'data')" and the server's message was lost.)
frappe.axios.interceptors.response.use(undefined, function (error) {
  const message = serverMessage(error?.response?.data);
  if (message) console.error(message);
  return Promise.reject(error);
});

export default {
  api: frappe.call(),
  db: frappe.db(),
  auth: frappe.auth(),
  file: frappe.file(),
};
