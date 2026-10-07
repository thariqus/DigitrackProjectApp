import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { IoPersonAddOutline } from "react-icons/io5";

import { useActivateCustomer } from "../PropertyAutomation/hooks/useCustomerApi";

// =========================================================
// SAP RESPONSE HELPERS
// Only status "S" is success — anything else is shown as an error.
// =========================================================

const SUCCESS_STATUSES = ["S", "SUCCESS"];

function parseIfJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

// Walks the response and returns the first object matching `test`.
function findNode(node, test, depth = 0) {
  node = parseIfJson(node);
  if (node == null || typeof node !== "object" || depth > 8) return null;
  if (!Array.isArray(node) && test(node)) return node;

  for (const value of Object.values(node)) {
    const found = findNode(value, test, depth + 1);
    if (found) return found;
  }
  return null;
}

function findSapResult(res) {
  // Pass 1: classic SAP single-letter status (E / S / W / A / I)
  const strict = findNode(
    res,
    (n) =>
      typeof n.status === "string" &&
      /^[ESWAI]$/i.test(n.status.trim()) &&
      ("code" in n || "message" in n)
  );
  if (strict) return strict;

  // Pass 2: word status ("Error", "Success", ...) with a text message
  return findNode(
    res,
    (n) =>
      typeof n.status === "string" &&
      n.status.trim() !== "" &&
      isNaN(Number(n.status)) &&
      typeof n.message === "string"
  );
}

function checkActivationResponse(res) {
  // Backend wraps SAP's result as: sap_response: { success, status_code, data }
  const wrapper = findNode(res, (n) => "sap_response" in n)?.sap_response;
  const sapCallFailed = wrapper?.success === false || res?.success === false;

  const sapResult = findSapResult(wrapper ?? res);

  const sapMessage =
    (typeof sapResult?.message === "string" && sapResult.message.trim()) ||
    sapResult?.error_details?.error_message ||
    wrapper?.data?.error ||
    wrapper?.data?.raw_response ||
    "";

  // SAP returned a status → only "S" is success
  if (sapResult) {
    const status = sapResult.status.trim().toUpperCase();
    const isSuccess = !sapCallFailed && SUCCESS_STATUSES.includes(status);

    if (!isSuccess) {
      const kind =
        status === "W" || status === "WARNING" ? "SAP Warning" : "SAP Error";

      return {
        ok: false,
        title: sapResult.code ? `${kind} (${sapResult.code})` : kind,
        message:
          sapMessage || "SAP rejected the activation. Please try again.",
      };
    }

    return {
      ok: true,
      title: "Customer Activated",
      message: sapMessage || "Customer activated successfully.",
    };
  }

  // No SAP status in the response
  if (sapCallFailed) {
    return {
      ok: false,
      title: "SAP Error",
      message: sapMessage || "Unable to reach SAP. Please try again.",
    };
  }

  return {
    ok: true,
    title: "Customer Activated",
    message: sapMessage || "Customer activated successfully.",
  };
}

// =========================================================
// STATUS MODAL (success ✓ / error ✕) — message only
// =========================================================

function StatusModal({ open, type = "error", title, message, onClose }) {
  const isSuccess = type === "success";
  const stroke = isSuccess ? "#22c55e" : "#DC2626";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* TOP ACCENT */}
            <div
              className="h-1.5"
              style={{
                background: isSuccess
                  ? "linear-gradient(90deg,#22c55e,#4ade80,#22c55e)"
                  : "linear-gradient(90deg,#9A3025,#c44738,#9A3025)",
              }}
            />

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
            >
              <span className="text-xl leading-none">&times;</span>
            </button>

            {/* CONTENT */}
            <div className="flex flex-col items-center px-8 py-8">
              {/* ANIMATED CIRCLE + MARK */}
              <svg viewBox="0 0 52 52" className="mb-4 h-16 w-16">
                <motion.circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke={stroke}
                  strokeWidth="2.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />

                {isSuccess ? (
                  <motion.path
                    d="M14.5 27l7 7 16-16"
                    fill="none"
                    stroke={stroke}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
                  />
                ) : (
                  <>
                    <motion.path
                      d="M17 17 L35 35"
                      fill="none"
                      stroke={stroke}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25, delay: 0.45, ease: "easeOut" }}
                    />
                    <motion.path
                      d="M35 17 L17 35"
                      fill="none"
                      stroke={stroke}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25, delay: 0.7, ease: "easeOut" }}
                    />
                  </>
                )}
              </svg>

              {/* TITLE */}
              <h2 className="text-center text-lg font-bold text-gray-800">
                {title || (isSuccess ? "Success" : "Activation Failed")}
              </h2>

              {/* MESSAGE */}
              <p className="mt-2 max-w-sm text-center text-sm leading-6 text-gray-500">
                {message}
              </p>

              {/* DIVIDER */}
              <div className="my-6 h-px w-full bg-gray-100" />

              {/* BUTTON */}
              <button
                type="button"
                onClick={onClose}
                className={`w-full rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
                  isSuccess
                    ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-700"
                    : "bg-rose-50 border border-rose-200 text-[#9A3025] shadow-sm hover:bg-rose-100 hover:border-rose-300"
                }`}
              >
                {isSuccess ? "Done" : "OK, Got It"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =========================================================
// ACTIVATE CUSTOMER PAGE
// =========================================================

const inputClass = `
  w-full
  border
  border-rose-200
  rounded-lg
  px-3
  py-2
  text-sm
  outline-none
  focus:border-rose-400
  focus:ring-2
  focus:ring-rose-100
  hover:border-rose-300
  transition
`;

function ActivateCustomer() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const [companyCode, setCompanyCode] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  const [statusModal, setStatusModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  // ---------------------------------------------------------
  // SAP API
  // ---------------------------------------------------------
  const { mutateAsync: activateCustomer, isPending } = useActivateCustomer();

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  useEffect(() => {
    setHeaderConfig({ title: "" });
  }, [setHeaderConfig]);

  // ---------------------------------------------------------
  // Reset
  // ---------------------------------------------------------
  const handleReset = () => {
    setCompanyCode("");
    setCustomerCode("");
  };

  // ---------------------------------------------------------
  // Activate Customer
  // ---------------------------------------------------------
  const handleActivate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const result = await activateCustomer({
        customerCode: customerCode.trim(),
        companyCode: companyCode.trim(),
      });

      console.log("Activate Customer Response:", result);

      const outcome = checkActivationResponse(result);

      setStatusModal({
        open: true,
        type: outcome.ok ? "success" : "error",
        title: outcome.title,
        message: outcome.message,
      });
    } catch (error: any) {
      console.error("Activate Customer Error:", error);

      // Backend may return a readable message even on 4xx/5xx
      const body = error?.response?.data ?? error?.data;
      const backendMessage =
        body?.message?.message || body?.message || error?.message;

      setStatusModal({
        open: true,
        type: "error",
        title: "Activation Failed",
        message:
          typeof backendMessage === "string" && backendMessage.trim()
            ? backendMessage
            : "Unable to activate customer. Please try again.",
      });
    }
  };

  const closeStatusModal = () => {
    const wasSuccess = statusModal.type === "success";

    setStatusModal({ open: false, type: "error", title: "", message: "" });

    // Start fresh after a successful activation; keep values after an error
    if (wasSuccess) handleReset();
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="w-full">
      {/* =====================================================
          PAGE HEADING
      ===================================================== */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#9A3025]">
          Activate Customer
        </h2>
      </div>

      {/* =====================================================
          ACTIVATION CARD
      ===================================================== */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-md overflow-hidden">
        {/* CARD HEADER */}
        <div className="bg-rose-50 border-b border-rose-200 px-5 py-4 text-[#9A3025]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <IoPersonAddOutline className="text-xl" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">Activate Customer</h2>
              <p className="text-xs text-gray-500">
                Enter the company code and customer code to activate the
                customer.
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleActivate}>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* COMPANY CODE */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Company Code
                  <span className="text-[#9A3025] ml-1">*</span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={companyCode}
                  onChange={(e) =>
                    setCompanyCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="e.g. 2100"
                  className={inputClass}
                />
              </div>

              {/* CUSTOMER CODE */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer Code
                  <span className="text-[#9A3025] ml-1">*</span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={customerCode}
                  onChange={(e) =>
                    setCustomerCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="e.g. 1038432"
                  className={inputClass}
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-rose-100">
              <button
                type="submit"
                disabled={isPending}
                className="
                  flex
                  items-center
                  gap-2
                  bg-rose-50
                  border
                  border-rose-200
                  text-[#9A3025]
                  hover:bg-rose-100
                  hover:border-rose-300
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  px-5
                  py-2
                  rounded-lg
                  text-xs
                  font-semibold
                  shadow-sm
                  transition
                "
              >
                <IoPersonAddOutline />
                {isPending ? "Activating..." : "Activate Customer"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="
                  px-5
                  py-2
                  rounded-lg
                  border
                  border-rose-200
                  text-gray-600
                  hover:bg-rose-50
                  hover:border-rose-300
                  text-xs
                  font-medium
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* =====================================================
          STATUS MODAL (message only)
      ===================================================== */}
      <StatusModal
        open={statusModal.open}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={closeStatusModal}
      />
    </div>
  );
}

export default ActivateCustomer;
