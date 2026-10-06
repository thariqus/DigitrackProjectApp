import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoSearchOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";

// =========================================================
// RESPONSE HELPERS
// =========================================================

const SUCCESS_STATUSES = ["S", "SUCCESS"];

// Case/space-insensitive field lookup:
// getField(obj, "customercode") matches "Customercode", "Customer code ", "customerCode", ...
function getField(obj: any, name: string) {
  if (!obj || typeof obj !== "object") return undefined;

  const target = name.toLowerCase().replace(/[\s_-]/g, "");
  const key = Object.keys(obj).find(
    (k) => k.toLowerCase().replace(/[\s_-]/g, "") === target
  );

  return key !== undefined ? obj[key] : undefined;
}

function CustomerSearch() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});

  // =========================================================
  // FORM STATE
  // =========================================================

  const [form, setForm] = useState({
    customerName: "",
    customercode: "",
    trNumber: "",
    tradeLicense: "",
  });

  // =========================================================
  // DIGITS-ONLY INPUT HANDLER
  // =========================================================

  const handleNumericChange = (
    key: "customercode" | "trNumber" | "tradeLicense",
    value: string,
    maxLength?: number
  ) => {
    let digits = value.replace(/\D/g, "");
    if (maxLength) digits = digits.slice(0, maxLength);

    setForm((prev) => ({ ...prev, [key]: digits }));
  };

  // =========================================================
  // SEARCH STATE
  // result: { ok, customerCode, message }
  // =========================================================

  const [result, setResult] = useState<{
    ok: boolean;
    customerCode: string;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // =========================================================
  // HEADER
  // =========================================================

  useEffect(() => {
    setHeaderConfig({ title: "" });
  }, [setHeaderConfig]);

  const showError = (message: string, customerCode = "") =>
    setResult({ ok: false, customerCode, message });

  // =========================================================
  // SEARCH CUSTOMER IN SAP
  // =========================================================

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const customerName = form.customerName.trim();
    const customercode = form.customercode.trim();
    const trNumber = form.trNumber.trim();
    const tradeLicense = form.tradeLicense.trim();

    // At least one field must be entered
    if (!customerName && !customercode && !trNumber && !tradeLicense) {
      showError(
        "Please enter Customer Name, Customer Code, TR Number, or Trade License."
      );
      return;
    }

    // =======================================================
    // NUMERIC VALIDATION
    // Customer Code, TR Number, Trade License → digits only
    // TR Number → exactly 15 digits
    // =======================================================

    if (customercode && !/^\d+$/.test(customercode)) {
      showError("Customer Code must contain numbers only.");
      return;
    }

    if (trNumber && !/^\d{15}$/.test(trNumber)) {
      setError("TR Number must contain exactly 15 digits.");
      setSearched(true);
      return;
    }

    if (tradeLicense && !/^\d+$/.test(tradeLicense)) {
      showError("Trade License must contain numbers only.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/method/jh_digitrack.api.mastermanagement_api.search_sap_customer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customerName,
            customercode,
            trNumber,
            tradeLicense,
          }),
        }
      );

      const json = await response.json();
      console.log("Frappe Response:", json);

      // Frappe puts the returned Python object inside "message"
      const backend = json?.message ?? json;

      if (!response.ok) {
        throw new Error(
          backend?.message ||
            json?.exception ||
            `SAP customer search failed (HTTP ${response.status})`
        );
      }

      // Backend: { success, status_code, data: { status, Customercode, Message, ... } }
      const sapData = backend?.data ?? backend;

      const status = String(getField(sapData, "status") ?? "")
        .trim()
        .toUpperCase();

      const customerCode = String(getField(sapData, "customercode") ?? "").trim();

      const message = String(
        getField(sapData, "message") ??
          getField(getField(sapData, "error_details"), "error_message") ??
          ""
      ).trim();

      const isSuccess =
        backend?.success !== false && SUCCESS_STATUSES.includes(status);

      setResult({
        ok: isSuccess,
        customerCode,
        message:
          message ||
          (isSuccess
            ? "Customer found in SAP."
            : "Customer was not found in SAP."),
      });
    } catch (searchError: any) {
      console.error("SAP customer search error:", searchError);
      showError(searchError?.message || "Unable to search customer in SAP.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const handleClear = () => {
    setForm({
      customerName: "",
      customercode: "",
      trNumber: "",
      tradeLicense: "",
    });
    setResult(null);
  };

  // =========================================================
  // SHARED INPUT STYLE
  // =========================================================

  const inputClass = `
    w-full
    h-12
    px-4
    rounded-lg
    border
    border-rose-200
    bg-white
    text-sm
    text-gray-700
    outline-none
    focus:border-rose-400
    focus:ring-2
    focus:ring-rose-100
    hover:border-rose-300
    transition
  `;

  const trRemaining = 15 - form.trNumber.length;

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col items-center pt-8">
        {/* TITLE */}
        <h1 className="text-5xl font-semibold tracking-tight mb-8">
          <span className="text-[#9A3025]">Customer</span>
          <span className="text-gray-700 ml-2">Search</span>
        </h1>

        {/* SEARCH FORM */}
        <form onSubmit={handleSearch} className="w-full max-w-[900px]">
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CUSTOMER NAME */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  placeholder="ABC Trading"
                  className={inputClass}
                />
              </div>

              {/* CUSTOMER CODE */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Customer Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.customercode}
                  onChange={(e) =>
                    handleNumericChange("customercode", e.target.value)
                  }
                  placeholder="e.g. 400"
                  className={inputClass}
                />
              </div>

              {/* =============================================
                  TR NUMBER (digits only, exactly 15)
              ============================================= */}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  TR Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.trNumber}
                  onChange={(e) =>
                    handleNumericChange("trNumber", e.target.value, 15)
                  }
                  placeholder="e.g. 1234567890"
                  className={inputClass}
                />
                {form.trNumber && trRemaining > 0 && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {trRemaining} more digit{trRemaining === 1 ? "" : "s"}{" "}
                    required
                  </p>
                )}
              </div>

              {/* TRADE LICENSE */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Trade License
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.tradeLicense}
                  onChange={(e) =>
                    handleNumericChange("tradeLicense", e.target.value)
                  }
                  placeholder="e.g. 123456"
                  className={inputClass}
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="
                  px-6
                  py-2.5
                  bg-rose-50
                  hover:bg-rose-100
                  border
                  border-rose-200
                  hover:border-rose-300
                  text-[#9A3025]
                  rounded-lg
                  text-sm
                  font-semibold
                  shadow-sm
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                <span className="flex items-center gap-2">
                  <IoSearchOutline />
                  {loading ? "Searching SAP..." : "Customer Search"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="
                  px-6
                  py-2.5
                  bg-white
                  hover:bg-rose-50
                  border
                  border-rose-200
                  hover:border-rose-300
                  rounded-lg
                  text-sm
                  text-gray-700
                  font-medium
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        {/* =================================================
            RESULT — customer code + message only
        ================================================= */}
        {result && (
          <div className="w-full max-w-[900px] mt-8 mb-6">
            <div
              className={`overflow-hidden rounded-xl border shadow-sm ${
                result.ok
                  ? "border-green-200 bg-green-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              {/* HEADER */}
              <div
                className={`flex items-center gap-2 border-b px-5 py-3 ${
                  result.ok
                    ? "border-green-200 text-green-700"
                    : "border-rose-200 text-[#9A3025]"
                }`}
              >
                {result.ok ? (
                  <IoCheckmarkCircle size={20} />
                ) : (
                  <IoCloseCircle size={20} />
                )}
                <h2 className="text-base font-semibold">
                  {result.ok ? "Customer Found" : "Customer Search Failed"}
                </h2>
              </div>

              {/* BODY */}
              <div className="bg-white">
                {(result.ok || result.customerCode) && (
                  <div className="grid grid-cols-[160px_1fr] border-b border-gray-100">
                    <div className="bg-gray-50 px-5 py-3 text-sm font-medium text-gray-600">
                      Customer Code
                    </div>
                    <div className="px-5 py-3 text-sm font-semibold text-gray-900 tabular-nums">
                      {result.customerCode || "—"}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-[160px_1fr]">
                  <div className="bg-gray-50 px-5 py-3 text-sm font-medium text-gray-600">
                    Message
                  </div>
                  <div
                    className={`px-5 py-3 text-sm font-semibold ${
                      result.ok ? "text-gray-900" : "text-[#9A3025]"
                    }`}
                  >
                    {result.message}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerSearch;
