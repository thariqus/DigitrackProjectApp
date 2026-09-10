import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoSearchOutline } from "react-icons/io5";

function CustomerSearch() {
  const outletContext = useOutletContext() ?? {};

  const setHeaderConfig =
    outletContext.setHeaderConfig ?? (() => {});

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

    if (
      !customerName &&
      !customercode &&
      !trNumber &&
      !tradeLicense
    ) {
      setError(
        "Please enter Customer Name, Customer Code, TR Number, or Trade License."
      );

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

      if (
        sapData?.status?.toLowerCase?.() === "success"
      ) {
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
      console.error(
        "SAP customer search error:",
        searchError
      );

      setSapResponse(null);

      setError(
        searchError?.message ||
          "Unable to search customer in SAP."
      );

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

          <span className="text-[#BD272C]">
            Customer
          </span>

          <span className="text-gray-700 ml-2">
            Search
          </span>

        </h1>

        {/* ===================================================
            SEARCH FORM
        =================================================== */}

        <form
          onSubmit={handleSearch}
          className="w-full max-w-[900px]"
        >

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">

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
                    setForm({
                      ...form,
                      customerName: e.target.value,
                    })
                  }
                  placeholder="ABC Trading"
                  className="
                    w-full
                    h-12
                    px-4
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-[#BD272C]
                    focus:ring-1
                    focus:ring-[#BD272C]
                  "
                />

              </div>

              {/* =============================================
                  CUSTOMER CODE
              ============================================= */}

              <div>

                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Customer Code
                </label>

                <input
                  type="text"
                  value={form.customercode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customercode: e.target.value,
                    })
                  }
                  placeholder="Customer code"
                  className="
                    w-full
                    h-12
                    px-4
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-[#BD272C]
                    focus:ring-1
                    focus:ring-[#BD272C]
                  "
                />

              </div>

              {/* =============================================
                  TR NUMBER
              ============================================= */}

              <div>

                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  TR Number
                </label>

                <input
                  type="text"
                  value={form.trNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      trNumber: e.target.value,
                    })
                  }
                  placeholder="100001234500003"
                  className="
                    w-full
                    h-12
                    px-4
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-[#BD272C]
                    focus:ring-1
                    focus:ring-[#BD272C]
                  "
                />

              </div>

              {/* =============================================
                  TRADE LICENSE
              ============================================= */}

              <div>

                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Trade License
                </label>

                <input
                  type="text"
                  value={form.tradeLicense}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tradeLicense: e.target.value,
                    })
                  }
                  placeholder="TL123456"
                  className="
                    w-full
                    h-12
                    px-4
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-[#BD272C]
                    focus:ring-1
                    focus:ring-[#BD272C]
                  "
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
                  bg-[#BD272C]
                  hover:bg-[#9f2025]
                  text-white
                  rounded-lg
                  text-sm
                  font-medium
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >

                {loading
                  ? "Searching SAP..."
                  : "Customer Search"}

              </button>

              {/* CLEAR */}

              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="
                  px-6
                  py-2.5
                  bg-gray-100
                  hover:bg-gray-200
                  border
                  border-gray-200
                  rounded-lg
                  text-sm
                  text-gray-700
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

              <div className="bg-red-50 border border-red-200 rounded-xl p-5">

                <div className="flex items-start gap-3">

                  <div className="flex-1">

                    <p className="text-sm font-semibold text-red-600">
                      Customer Search Failed
                    </p>

                    <p className="text-sm text-red-500 mt-1">
                      {error}
                    </p>

                  </div>

                </div>

              </div>

            ) : sapResponse ? (

              /* =================================================
                 SUCCESS
              ================================================= */

              <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">

                {/* =============================================
                    HEADER
                ============================================= */}

                <div className="bg-[#BD272C] px-5 py-4">

                  <h2 className="text-base font-semibold text-white">
                    SAP Customer Details
                  </h2>

                  <p className="text-[11px] text-white/80 mt-1">
                    Customer details returned from SAP
                  </p>

                </div>

                <div className="p-5">

                  {/* ===========================================
                      STATUS + CUSTOMER CODE
                  =========================================== */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

                    {/* STATUS */}

                    <div className="border border-gray-200 rounded-lg p-4">

                      <p className="text-xs text-gray-500 mb-1">
                        Status
                      </p>

                      <p className="text-sm font-semibold text-green-600">
                        {sapResponse?.status || "Success"}
                      </p>

                    </div>

                    {/* CUSTOMER CODE */}

                    <div className="border border-gray-200 rounded-lg p-4">

                      <p className="text-xs text-gray-500 mb-1">
                        Customer Code
                      </p>

                      <p className="text-sm font-semibold text-gray-800">

                        {
                          sapResponse?.["Customer code"] ??
                          sapResponse?.["Customer code "] ??
                          sapResponse?.customerCode ??
                          "-"
                        }

                      </p>

                    </div>

                  </div>

                  {/* ===========================================
                      DETAILS
                  =========================================== */}

                  <div>

                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Customer Details
                    </h3>

                    {Array.isArray(sapResponse?.Details) &&
                    sapResponse.Details.length > 0 ? (

                      <div className="space-y-4">

                        {sapResponse.Details.map(
                          (customer: any, index: number) => (

                            <div
                              key={index}
                              className="
                                border
                                border-gray-200
                                rounded-lg
                                overflow-hidden
                              "
                            >

                              {/* CUSTOMER NUMBER */}

                              <div className="
                                bg-gray-50
                                px-4
                                py-2
                                border-b
                                border-gray-200
                              ">

                                <p className="text-xs font-semibold text-gray-600">
                                  Customer {index + 1}
                                </p>

                              </div>

                              {/* CUSTOMER DETAILS */}

                              <div className="p-4">

                                <div className="
                                  grid
                                  grid-cols-1
                                  md:grid-cols-2
                                  gap-4
                                ">

                                  {Object.entries(customer).map(
                                    ([key, value]) => (

                                      <div key={key}>

                                        <p className="
                                          text-[11px]
                                          text-gray-500
                                          mb-1
                                        ">
                                          {key}
                                        </p>

                                        <p className="
                                          text-sm
                                          text-gray-800
                                          break-words
                                        ">

                                          {value === null ||
                                          value === undefined ||
                                          value === "" ? (
                                            "-"
                                          ) : typeof value === "object" ? (
                                            JSON.stringify(
                                              value,
                                              null,
                                              2
                                            )
                                          ) : (
                                            String(value)
                                          )}

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

                      <div className="
                        border
                        border-gray-200
                        rounded-lg
                        p-5
                        text-center
                      ">

                        <p className="text-sm text-gray-500">
                          SAP returned success, but no customer
                          details were found.
                        </p>

                      </div>

                    )}

                  </div>

                  {/* ===========================================
                      RAW SAP RESPONSE
                  =========================================== */}

                  <details className="mt-5">

                    <summary className="
                      cursor-pointer
                      text-xs
                      font-medium
                      text-gray-500
                    ">
                      View Raw SAP Response
                    </summary>

                    <div className="
                      mt-3
                      max-h-[400px]
                      overflow-auto
                      rounded-lg
                      border
                      border-gray-200
                      bg-gray-50
                      p-4
                    ">

                      <pre className="
                        text-xs
                        leading-5
                        text-gray-700
                        font-mono
                        whitespace-pre-wrap
                        break-words
                      ">
                        {JSON.stringify(
                          sapResponse,
                          null,
                          2
                        )}
                      </pre>

                    </div>

                  </details>

                </div>

              </div>

            ) : (

              /* =================================================
                 NO CUSTOMER
              ================================================= */

              <div className="
                bg-white
                border
                border-gray-200
                rounded-xl
                shadow-sm
                p-8
                text-center
              ">

                <p className="text-sm text-gray-500">
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