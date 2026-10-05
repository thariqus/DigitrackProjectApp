import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoSearchOutline } from "react-icons/io5";

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
  // Strips anything that isn't 0-9; optional max length
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
  // =========================================================

  const [sapResponse, setSapResponse] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // HEADER
  // =========================================================

  useEffect(() => {
    setHeaderConfig({
      title: "",
    });
  }, [setHeaderConfig]);

  // =========================================================
  // SEARCH CUSTOMER IN SAP
  // =========================================================

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous result
    setSearched(false);
    setSapResponse(null);
    setError("");

    // =======================================================
    // GET SEARCH VALUES
    // =======================================================

    const customerName = form.customerName.trim();
    const customercode = form.customercode.trim();
    const trNumber = form.trNumber.trim();
    const tradeLicense = form.tradeLicense.trim();

    // =======================================================
    // VALIDATE
    // At least one field must be entered
    // =======================================================

    if (!customerName && !customercode && !trNumber && !tradeLicense) {
      setError(
        "Please enter Customer Name, Customer Code, TR Number, or Trade License."
      );
      setSearched(true);
      return;
    }

    // =======================================================
    // NUMERIC VALIDATION
    // Customer Code, TR Number, Trade License → digits only
    // TR Number → exactly 15 digits
    // =======================================================

    if (customercode && !/^\d+$/.test(customercode)) {
      setError("Customer Code must contain numbers only.");
      setSearched(true);
      return;
    }

    if (trNumber && !/^\d{15}$/.test(trNumber)) {
      setError("TR Number must contain exactly 15 digits.");
      setSearched(true);
      return;
    }

    if (tradeLicense && !/^\d+$/.test(tradeLicense)) {
      setError("Trade License must contain numbers only.");
      setSearched(true);
      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // CALL EXISTING FRAPPE API
      // =====================================================

      const response = await fetch(
        "/api/method/jh_digitrack.api.mastermanagement_api.search_sap_customer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",

          // =================================================
          // SEND ALL FOUR VALUES
          // Empty values will be sent as ""
          // =================================================

          body: JSON.stringify({
            customerName,
            customercode,
            trNumber,
            tradeLicense,
          }),
        }
      );

      // =====================================================
      // READ FRAPPE RESPONSE
      // =====================================================

      const result = await response.json();

      console.log("Frappe Response:", result);

      // Frappe normally puts the returned Python object
      // inside "message"
      const sapResult = result?.message ?? result;

      console.log("SAP Result:", sapResult);

      // =====================================================
      // HTTP / FRAPPE ERROR
      // =====================================================

      if (!response.ok) {
        throw new Error(
          result?.exception ||
            result?.message?.message ||
            result?.message ||
            `SAP customer search failed (HTTP ${response.status})`
        );
      }

      // =====================================================
      // GET SAP DATA
      //
      // Backend response:
      //
      // {
      //   success: true,
      //   status_code: 200,
      //   data: {
      //     status: "Success",
      //     "Customer code": "400",
      //     "Details": [...]
      //   }
      // }
      // =====================================================

      const sapData = sapResult?.data ?? sapResult;

      console.log("SAP Data:", sapData);

      // =====================================================
      // SAP FAILURE
      //
      // {
      //   "status": "FAILED",
      //   "errorCode": "400",
      //   "message": "Customer not found"
      // }
      // =====================================================

      if (
        sapResult?.success === false ||
        sapData?.status?.toUpperCase?.() === "FAILED"
      ) {
        const failureMessage =
          sapData?.message ||
          sapResult?.message ||
          "Customer was not found in SAP.";

        setError(failureMessage);
        setSapResponse(null);
        setSearched(true);
        return;
      }

      // =====================================================
      // SAP SUCCESS
      //
      // {
      //   "status": "Success",
      //   "Customer code": "400",
      //   "Details": [...]
      // }
      // =====================================================

      if (sapData?.status?.toLowerCase?.() === "success") {
        setSapResponse(sapData);
        setSearched(true);
        return;
      }

      // =====================================================
      // UNKNOWN RESPONSE
      // =====================================================

      setSapResponse(sapData);
      setSearched(true);
    } catch (searchError: any) {
      console.error("SAP customer search error:", searchError);

      setSapResponse(null);
      setError(searchError?.message || "Unable to search customer in SAP.");
      setSearched(true);
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

    setSapResponse(null);
    setSearched(false);
    setError("");
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
      {/* =====================================================
          SEARCH AREA
      ===================================================== */}

      <div className="flex flex-col items-center pt-8">
        {/* ===================================================
            TITLE
        =================================================== */}

        <h1 className="text-5xl font-semibold tracking-tight mb-8">
          <span className="text-[#9A3025]">Customer</span>
          <span className="text-gray-700 ml-2">Search</span>
        </h1>

        {/* ===================================================
            SEARCH FORM
        =================================================== */}

        <form onSubmit={handleSearch} className="w-full max-w-[900px]">
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5">
            {/* =================================================
                FOUR SEARCH FIELDS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* =============================================
                  CUSTOMER NAME
              ============================================= */}

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

              {/* =============================================
                  CUSTOMER CODE (digits only)
              ============================================= */}

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

              {/* =============================================
                  TRADE LICENSE (digits only)
              ============================================= */}

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

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div className="flex justify-center gap-3 mt-6">
              {/* SEARCH */}

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

              {/* CLEAR */}

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

        {/* ===================================================
            SAP CUSTOMER RESULT
        =================================================== */}

        {searched && (
          <div className="w-full max-w-[1000px] mt-8 mb-6">
            {/* =================================================
                FAILURE
            ================================================= */}

            {error ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#9A3025]">
                      Customer Search Failed
                    </p>

                    <p className="text-sm text-rose-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : sapResponse ? (
              /* =================================================
                 SUCCESS
              ================================================= */

              <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
                {/* =============================================
                    HEADER
                ============================================= */}

                <div className="bg-rose-50 border-b border-rose-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-[#9A3025]">
                    SAP Customer Details
                  </h2>

                  <p className="text-[11px] text-gray-500 mt-1">
                    Customer details returned from SAP
                  </p>
                </div>

                <div className="p-5">
                  {/* ===========================================
                      STATUS + CUSTOMER CODE
                  =========================================== */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {/* STATUS */}

                    <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Status</p>

                      <p className="text-sm font-semibold text-green-600">
                        {sapResponse?.status || "Success"}
                      </p>
                    </div>

                    {/* CUSTOMER CODE */}

                    <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">
                        Customer Code
                      </p>

                      <p className="text-sm font-semibold text-gray-800">
                        {sapResponse?.["Customer code"] ??
                          sapResponse?.["Customer code "] ??
                          sapResponse?.customerCode ??
                          "-"}
                      </p>
                    </div>
                  </div>

                  {/* ===========================================
                      DETAILS
                  =========================================== */}

                  <div>
                    <h3 className="text-sm font-semibold text-[#9A3025] mb-3">
                      Customer Details
                    </h3>

                    {Array.isArray(sapResponse?.Details) &&
                    sapResponse.Details.length > 0 ? (
                      <div className="space-y-4">
                        {sapResponse.Details.map(
                          (customer: any, index: number) => (
                            <div
                              key={index}
                              className="border border-rose-200 rounded-lg overflow-hidden"
                            >
                              {/* CUSTOMER NUMBER */}

                              <div className="bg-rose-50 px-4 py-2 border-b border-rose-200">
                                <p className="text-xs font-semibold text-[#9A3025]">
                                  Customer {index + 1}
                                </p>
                              </div>

                              {/* CUSTOMER DETAILS */}

                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(customer).map(
                                    ([key, value]) => (
                                      <div key={key}>
                                        <p className="text-[11px] text-gray-500 mb-1">
                                          {key}
                                        </p>

                                        <p className="text-sm text-gray-800 break-words">
                                          {value === null ||
                                          value === undefined ||
                                          value === ""
                                            ? "-"
                                            : typeof value === "object"
                                            ? JSON.stringify(value, null, 2)
                                            : String(value)}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-5 text-center">
                        <p className="text-sm text-gray-500">
                          SAP returned success, but no customer details were
                          found.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ===========================================
                      RAW SAP RESPONSE
                  =========================================== */}

                  <details className="mt-5">
                    <summary className="cursor-pointer text-xs font-medium text-[#9A3025] hover:text-rose-700">
                      View Raw SAP Response
                    </summary>

                    <div className="mt-3 max-h-[400px] overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-4">
                      <pre className="text-xs leading-5 text-gray-700 font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(sapResponse, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              /* =================================================
                 NO CUSTOMER
              ================================================= */

              <div className="bg-rose-50 border border-rose-200 rounded-xl shadow-sm p-8 text-center">
                <p className="text-sm text-gray-600">
                  Customer was not found in SAP.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerSearch;