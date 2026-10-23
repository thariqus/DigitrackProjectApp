import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoSearchOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import { getEmirates, type Emirate } from "../PropertyAutomation/api/CustomerApi";

// =========================================================
// CONSTANTS
// =========================================================

const SUCCESS_STATUSES = ["S", "SUCCESS"];

const EMPTY_FORM = {
  customerName: "",
  customercode: "",
  trNumber: "",
  tradeLicense: "",
  street: "",
  area: "",
  emirate: "",
  city: "",
  mobileNo: "",
};

type FormKey = keyof typeof EMPTY_FORM;

// Result table columns.
// "keys" = possible field names in the SAP response (first match wins).
// Matching ignores case, spaces, underscores and hyphens.
const RESULT_COLUMNS = [
  { label: "Customer Code", keys: ["custom_customer_code", "customercode", "customerno", "kunnr"] },
  { label: "Name", keys: ["customer_name", "customername", "name", "name1"] },
  { label: "TRN Number", keys: ["custom_vat_reg_no", "tax_id", "trnumber", "trnnumber", "trn", "taxnumber"] },
  { label: "Mobile No", keys: ["mobile_no", "mobile", "mobileno", "mobilenumber"] },
  { label: "Trade License No", keys: ["custom_trade_license_no", "tradelicenseno", "tradelicense", "tradelicensenumber"] },
  { label: "City", keys: ["city"] },
  { label: "Area", keys: ["area"] },
  { label: "Street", keys: ["street"] },
];

// Maps each search input to the result column it is compared against.
// Emirate has no result column (SAP does not return it), so it is not compared locally.
const FIELD_TO_COLUMN: Partial<Record<FormKey, string>> = {
  customerName: "Name",
  customercode: "Customer Code",
  trNumber: "TRN Number",
  tradeLicense: "Trade License No",
  mobileNo: "Mobile No",
  city: "City",
  area: "Area",
  street: "Street",
};

type CustomerRow = Record<string, string>;

// =========================================================
// RESPONSE HELPERS
// =========================================================

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

// Look for a value on the record itself, then inside nested address / contact
// (including SAP's contact_list and contact_list.mobile_nos structures)
function pickValue(record: any, keys: string[]): string {
  const contactList = getField(record, "contact_list");

  const sources = [
    record,
    getField(record, "address"),
    getField(record, "contact"),
    contactList,
    getField(contactList, "mobile_nos"),
  ];

  for (const source of sources) {
    for (const key of keys) {
      const value = getField(source, key);
      if (value !== undefined && value !== null && typeof value !== "object") {
        const text = String(value).trim();
        if (text) return text;
      }
    }
  }

  return "";
}

// A customer record is any object that carries a customer code field.
function isCustomerRecord(node: any): boolean {
  return (
    getField(node, "custom_customer_code") !== undefined ||
    getField(node, "customercode") !== undefined
  );
}

// Walks the SAP response at any depth and collects every customer record.
// Handles: a list of records, a single record, a record wrapped in "data",
// or a list wrapped in "data". Stops descending once a record is found,
// so nested SAP sub-objects are not mistaken for separate customers.
function collectRecords(node: any, out: any[] = []): any[] {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRecords(item, out));
    return out;
  }

  if (!node || typeof node !== "object") return out;

  if (isCustomerRecord(node)) {
    out.push(node);
    return out;
  }

  Object.values(node).forEach((value) => collectRecords(value, out));
  return out;
}

function toRow(record: any): CustomerRow {
  const row: CustomerRow = {};
  RESULT_COLUMNS.forEach((col) => {
    row[col.label] = pickValue(record, col.keys);
  });
  return row;
}

// Strips spaces, symbols and case, and drops leading zeros, so that
// "0001016481" matches "1016481" and "ABC-123" matches "abc 123".
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^0+(?=\d)/, "");
}

// A row is removed only when SAP returned a value that conflicts with
// the entered value. Empty SAP values are not treated as mismatches.
function rowMatchesForm(row: CustomerRow, form: typeof EMPTY_FORM): boolean {
  return (Object.keys(FIELD_TO_COLUMN) as FormKey[]).every((key) => {
    const entered = form[key].trim();
    if (!entered) return true;

    const column = FIELD_TO_COLUMN[key];
    if (!column) return true;

    const cell = row[column] ?? "";
    if (!cell) return true;

    return normalize(cell).includes(normalize(entered));
  });
}

function CustomerSearch() {
  const outletContext: any = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});

  // =========================================================
  // EMIRATES (from Emirate doctype)
  // =========================================================

  const [emirates, setEmirates] = useState<Emirate[]>([]);
  const [emiratesLoading, setEmiratesLoading] = useState(true);

  useEffect(() => {
    getEmirates()
      .then(setEmirates)
      .catch((err) => console.error("Failed to load emirates:", err))
      .finally(() => setEmiratesLoading(false));
  }, []);

  // =========================================================
  // FORM STATE
  // =========================================================

  const [form, setForm] = useState(EMPTY_FORM);

  const setText = (key: FormKey, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // =========================================================
  // DIGITS-ONLY INPUT HANDLER
  // =========================================================

  const handleNumericChange = (
    key: "customercode" | "trNumber" | "mobileNo",
    value: string,
    maxLength?: number
  ) => {
    let digits = value.replace(/\D/g, "");
    if (maxLength) digits = digits.slice(0, maxLength);

    setForm((prev) => ({ ...prev, [key]: digits }));
  };

  // =========================================================
  // SEARCH STATE
  // result: { ok, message, rows }
  // =========================================================

  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    rows: CustomerRow[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // =========================================================
  // HEADER
  // =========================================================

  useEffect(() => {
    setHeaderConfig({ title: "" });
  }, [setHeaderConfig]);

  const showError = (message: string) =>
    setResult({ ok: false, message, rows: [] });

  // =========================================================
  // SEARCH CUSTOMER IN SAP
  // =========================================================

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const values = {
      customerName: form.customerName.trim(),
      customercode: form.customercode.trim(),
      trNumber: form.trNumber.trim(),
      tradeLicense: form.tradeLicense.trim(),
      street: form.street.trim(),
      area: form.area.trim(),
      emirate: form.emirate.trim(),
      city: form.city.trim(),
      mobileNo: form.mobileNo.trim(),
    };

    // At least one field (any field) must be entered
    const anyFilled = Object.values(values).some(Boolean);
    if (!anyFilled) {
      showError("Please enter at least one customer detail.");
      return;
    }

    // =======================================================
    // VALIDATION
    // Customer Code → digits only
    // TR Number → exactly 15 digits
    // Mobile No → digits only
    // =======================================================

    if (values.customercode && !/^\d+$/.test(values.customercode)) {
      showError("Customer Code must contain numbers only.");
      return;
    }

    if (values.trNumber && !/^\d{15}$/.test(values.trNumber)) {
      showError("TR Number must contain exactly 15 digits.");
      return;
    }

    if (values.mobileNo && !/^\d+$/.test(values.mobileNo)) {
      showError("Mobile No must contain numbers only.");
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
            customerName: values.customerName,
            customercode: values.customercode,
            trNumber: values.trNumber,
            tradeLicense: values.tradeLicense,
            address: {
              street: values.street,
              area: values.area,
              emirate: values.emirate,
              city: values.city,
            },
            contact: {
              mobileNo: values.mobileNo,
            },
          }),
        }
      );

      const json = await response.json();

      // Frappe puts the returned Python object inside "message"
      const backend = json?.message ?? json;

      if (!response.ok) {
        throw new Error(
          backend?.message ||
            json?.exception ||
            `SAP customer search failed (HTTP ${response.status})`
        );
      }

      // Backend: { success, status_code, data: <SAP response> }
      const sapData = backend?.data ?? backend;

      const status = String(getField(sapData, "status") ?? "")
        .trim()
        .toUpperCase();

      const sapMessage = String(
        getField(sapData, "message") ??
          getField(getField(sapData, "error_details"), "error_message") ??
          ""
      ).trim();

      const sapOk =
        backend?.success !== false &&
        (status ? SUCCESS_STATUSES.includes(status) : true);

      if (!sapOk) {
        setResult({
          ok: false,
          rows: [],
          message: sapMessage || "Customer was not found in SAP.",
        });
        return;
      }

      // Collect every customer record from the SAP response (any shape),
      // convert to table rows, drop empty rows, then drop rows that conflict
      // with an entered field.
      const allRows = collectRecords(sapData)
        .map(toRow)
        .filter((row) => Object.values(row).some(Boolean));

      const rows = allRows.filter((row) => rowMatchesForm(row, form));

      if (rows.length === 0) {
        setResult({
          ok: false,
          rows: [],
          message: "No customer matched all the details entered.",
        });
        return;
      }

      setResult({
        ok: true,
        rows,
        message:
          sapMessage ||
          `${rows.length} customer${rows.length === 1 ? "" : "s"} found in SAP.`,
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
    setForm(EMPTY_FORM);
    setResult(null);
  };

  // =========================================================
  // SHARED STYLES (compact)
  // =========================================================

  const inputClass = `
    w-full
    h-10
    px-3
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

  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  const sectionClass = "col-span-full pt-2 border-t border-rose-100";

  const sectionTitleClass =
    "text-[11px] font-semibold uppercase tracking-wide text-[#9A3025]";

  const hintClass = "mt-0.5 text-[11px] text-rose-600";

  const trRemaining = 15 - form.trNumber.length;

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col items-center pt-4">
        {/* TITLE */}
        <h1 className="text-4xl font-semibold tracking-tight mb-5">
          <span className="text-[#9A3025]">Customer</span>
          <span className="text-gray-700 ml-2">Search</span>
        </h1>

        {/* SEARCH FORM */}
        <form onSubmit={handleSearch} className="w-full max-w-[1100px]">
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              {/* CUSTOMER NAME */}
              <div>
                <label className={labelClass}>Customer Name</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setText("customerName", e.target.value)}
                  placeholder="ABC Trading"
                  className={inputClass}
                />
              </div>

              {/* CUSTOMER CODE */}
              <div>
                <label className={labelClass}>Customer Code</label>
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

              {/* TR NUMBER (digits only, exactly 15) */}
              <div>
                <label className={labelClass}>TR Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={form.trNumber}
                  onChange={(e) =>
                    handleNumericChange("trNumber", e.target.value, 15)
                  }
                  placeholder="e.g. 123456789012345"
                  className={inputClass}
                />
                {form.trNumber && trRemaining > 0 && (
                  <p className={hintClass}>
                    {trRemaining} more digit{trRemaining === 1 ? "" : "s"}{" "}
                    required
                  </p>
                )}
              </div>

              {/* TRADE LICENSE */}
              <div>
                <label className={labelClass}>Trade License</label>
                <input
                  type="text"
                  value={form.tradeLicense}
                  onChange={(e) => setText("tradeLicense", e.target.value)}
                  placeholder="e.g. ABC-123456"
                  className={inputClass}
                />
              </div>

              {/* ADDRESS */}
              <div className={sectionClass}>
                <p className={sectionTitleClass}>Address</p>
              </div>

              {/* STREET */}
              <div>
                <label className={labelClass}>Street</label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setText("street", e.target.value)}
                  placeholder="e.g. Al Quoz"
                  className={inputClass}
                />
              </div>

              {/* AREA */}
              <div>
                <label className={labelClass}>Area</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => setText("area", e.target.value)}
                  placeholder="e.g. Industrial Area"
                  className={inputClass}
                />
              </div>

              {/* EMIRATE (from Emirate doctype) */}
              <div>
                <label className={labelClass}>Emirate</label>
                <select
                  value={form.emirate}
                  onChange={(e) => setText("emirate", e.target.value)}
                  disabled={emiratesLoading}
                  className={`${inputClass} ${
                    form.emirate ? "" : "text-gray-400"
                  }`}
                >
                  <option value="">
                    {emiratesLoading ? "Loading..." : "Select Emirate"}
                  </option>
                  {emirates.map((emirate) => (
                  <option
                    key={emirate.name}
                    value={emirate.name}
                    className="text-gray-700"
                  >
                    {emirate.description
                      ? `${emirate.name} - ${emirate.description}`
                      : emirate.name}
                  </option>
                ))}
                </select>
              </div>

              {/* CITY */}
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setText("city", e.target.value)}
                  placeholder="e.g. Dubai"
                  className={inputClass}
                />
              </div>

              {/* CONTACT */}
              <div className={sectionClass}>
                <p className={sectionTitleClass}>Contact</p>
              </div>

              {/* MOBILE NO */}
              <div>
                <label className={labelClass}>Mobile No</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.mobileNo}
                  onChange={(e) =>
                    handleNumericChange("mobileNo", e.target.value)
                  }
                  placeholder="e.g. 971554499846"
                  className={inputClass}
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="
                  px-5
                  py-2
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
                  px-5
                  py-2
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

        {/* RESULT */}
        {result && (
          <div className="w-full max-w-[1100px] mt-4 mb-4">
            <div
              className={`overflow-hidden rounded-xl border shadow-sm ${
                result.ok
                  ? "border-green-200 bg-green-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              {/* HEADER */}
              <div
                className={`flex items-center gap-2 border-b px-4 py-2 ${
                  result.ok
                    ? "border-green-200 text-green-700"
                    : "border-rose-200 text-[#9A3025]"
                }`}
              >
                {result.ok ? (
                  <IoCheckmarkCircle size={18} />
                ) : (
                  <IoCloseCircle size={18} />
                )}
                <h2 className="text-sm font-semibold">
                  {result.ok ? "Customer Found" : "Customer Search Failed"}
                </h2>
                <span
                  className={`ml-2 text-sm ${
                    result.ok ? "text-gray-700" : "text-[#9A3025]"
                  }`}
                >
                  — {result.message}
                </span>
              </div>

              {/* TABLE */}
              {result.ok && result.rows.length > 0 && (
                <div className="bg-white overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {RESULT_COLUMNS.map((col) => (
                          <th
                            key={col.label}
                            className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200 whitespace-nowrap"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, index) => (
                        <tr
                          key={`${row["Customer Code"]}-${index}`}
                          className="border-b border-gray-100 last:border-b-0 hover:bg-rose-50/40"
                        >
                          {RESULT_COLUMNS.map((col) => (
                            <td
                              key={col.label}
                              className={`px-4 py-2 text-gray-800 whitespace-nowrap ${
                                col.label === "Customer Code"
                                  ? "font-semibold tabular-nums"
                                  : ""
                              }`}
                            >
                              {row[col.label] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerSearch;