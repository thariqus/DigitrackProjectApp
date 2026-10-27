import { useEffect, useRef, useState } from "react";
import { useOutletContext, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuUserPlus,
  LuHash,
  LuUser,
  LuFileText,
  LuMapPin,
  LuLoaderCircle,
  LuCircleCheckBig,
  LuRotateCcw,
  LuX,
} from "react-icons/lu";

import {
  useCreateCustomer,
  useUpdateCustomer,
  useConfirmCustomerSap,
  useTransportationZones,
  useCustomerGroups,
  useSalesDistricts,
  useEmirates,
  useSiteCodes,
} from "../PropertyAutomation/hooks/useCustomerApi";

import { CustomerPayload } from "../PropertyAutomation/api/CustomerApi";

const FIELDS = [
  {
    key: "customer_name",
    label: "Customer Name 1",
    icon: LuUser,
    placeholder: "e.g. Al Maha Trading LLC",
    required: true,
    maxLength: 40,
  },
  {
    key: "business_name",
    label: "Customer Name 2",
    icon: LuUser,
    placeholder: "e.g. Al Maha Trading LLC",
    maxLength: 40,
  },
  {
    key: "customer_type",
    label: "Customer Type",
    type: "radio",
    icon: LuUser,
    required: true,
    options: [
      { value: "B2B", label: "B2B" },
      { value: "B2C", label: "B2C" },
    ],
  },
  {
    key: "tr_number",
    label: "TR Number",
    icon: LuUser,
    placeholder: "e.g. 1234567890",
    maxLength: 15,
    minLength: 15,
    pattern: "^[0-14]{15}$",
  },
  {
    key: "custom_trade_license_no",
    label: "Trade License Number",
    icon: LuFileText,
    placeholder: "e.g. 123456",
  },
  {
    key: "trade_license_expiry",
    label: "Trade License Expiry Date",
    icon: LuFileText,
    type: "date",
  },
  {
    key: "address",
    label: "Address",
    type: "section",
    icon: LuMapPin,
  },
  {
    key: "custom_street",
    label: "Street",
    icon: LuMapPin,
    placeholder: "e.g. Sheikh Zayed Road",
    required: true,
  },
  {
    key: "custom_area",
    label: "Area / Locality",
    icon: LuMapPin,
    placeholder: "e.g. Al Quoz",
    required: true,
  },

  // =========================================================
  // EMIRATE
  // =========================================================
  {
    key: "custom_region",
    label: "Emirate (Region)",
    type: "select",
    icon: LuMapPin,
    required: true,
  },
  {
    key: "custom_city",
    label: "City",
    icon: LuMapPin,
    placeholder: "e.g. Dubai",
    required: true,
  },

  // =========================================================
  // SITE CODE: the field that distinguishes this form
  // =========================================================
  {
    key: "site_code",
    label: "Site Code",
    type: "select",
    icon: LuHash,
    required: true,
    options: [{ value: "", label: "Select Site Code" }],
  },

  {
    key: "email_id",
    label: "Email Id",
    icon: LuHash,
    placeholder: "e.g. abc@gmail.com",
    type: "email",
  },
  {
    key: "mobile_no",
    label: "Mobile No",
    icon: LuHash,
    placeholder: "e.g. +971501234567",
    type: "tel",
    maxLength: 20,
  },
  {
    key: "po_box",
    label: "PO Box",
    icon: LuHash,
    placeholder: "e.g. 1234",
  },
  {
    key: "transportation_zone",
    label: "Transportation Zone",
    type: "select",
    icon: LuUser,
    required: true,
    options: [{ value: "", label: "Select Transportation Zone" }],
  },
  {
    key: "customer_group",
    label: "Customer Group",
    type: "select",
    icon: LuUser,
    required: true,
    options: [{ value: "", label: "Select Customer Group" }],
  },
  {
    key: "sales_district",
    label: "Sales District",
    type: "select",
    icon: LuUser,
    required: true,
    options: [{ value: "", label: "Select Sales District" }],
  },
  {
    key: "sales_office",
    label: "Sales Office",
    icon: LuHash,
    placeholder: "e.g. abcd",
    required: true,
  },
];

const emptyForm = FIELDS.reduce(
  (acc, field) => ({
    ...acc,
    [field.key]: "",
  }),
  {} as CustomerPayload
);

const emptyResult = {
  open: false,
  ok: false,
  title: "",
  message: "",
  status: "",
  code: "",
  sapRecord: null,
  values: null,
};

const emptyNotice = {
  open: false,
  type: "error",
  title: "",
  message: "",
  resetOnClose: false,
};

// =========================================================
// SAP RESPONSE HELPERS
// Only status "S" is success. Anything else is shown as an error.
// =========================================================

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

function checkSapResponse(res, fallbackSuccessMessage) {
  const sapResult = findSapResult(res);

  // No SAP status in the response → it's an error
  if (!sapResult) {
    return {
      ok: false,
      title: "SAP Error",
      message:
        "SAP rejected the request. Please check the details and try again.",
    };
  }

  const status = sapResult.status.trim().toUpperCase();
  // SUCCESS ONLY IF STATUS IS "S". ALL OTHER CASES FAIL.
  const isSuccess = status === "S";

  const sapMessage =
    (typeof sapResult.message === "string" && sapResult.message.trim()) ||
    sapResult.error_details?.error_message ||
    "";

  if (!isSuccess) {
    return {
      ok: false,
      title: sapResult.code ? `SAP Error (${sapResult.code})` : "SAP Error",
      message:
        sapMessage ||
        "SAP rejected the request. Please check the details and try again.",
    };
  }

  return {
    ok: true,
    title: "Success",
    message: sapMessage || fallbackSuccessMessage,
  };
}

// Splits a SAP message into separate lines.
// Breaks on "|" and on a sentence that starts right after a closing ")".
function splitSapMessage(message) {
  if (typeof message !== "string") return [];
  return message
    .split(/\s*\|\s*|(?<=\))\s+(?=[A-Z])/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// Formats "YYYY-MM-DD" as "DD/MM/YYYY" for display. Other values pass through.
function formatDateForDisplay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

// Splits the flat field list into sections, each starting at a "section" field
function groupFields(fields) {
  const sections = [];
  let current = {
    key: "customer_details",
    label: "Customer Details",
    icon: LuUser,
    rows: [],
  };

  fields.forEach((field) => {
    if (field.type === "section") {
      if (current.rows.length) sections.push(current);
      current = { key: field.key, label: field.label, icon: field.icon, rows: [] };
      return;
    }
    current.rows.push(field);
  });
  if (current.rows.length) sections.push(current);

  return sections;
}

// =========================================================
// RECEIVED DATA TABLE (SAP values only)
// =========================================================

const SAP_TABLE_COLUMNS = [
  "Customer code",
  "Name",
  "TRN Number",
  "Mobile No",
  "Trade License No",
  "City",
  "Area",
  "Street",
];

// Builds one row from the SAP record. Anything SAP did not return shows "—".
function buildCustomerRow(rec) {
  const pick = (...values) =>
    values.find((v) => v != null && String(v).trim() !== "") ?? "—";

  const source = rec ?? {};

  return {
    "Customer code": pick(source.custom_customer_code),
    Name: pick(source.customer_name),
    "TRN Number": pick(source.custom_vat_reg_no, source.tax_id),
    "Mobile No": pick(source.mobile_no),
    "Trade License No": pick(source.custom_trade_license_no),
    City: pick(source.city),
    Area: pick(source.area),
    Street: pick(source.street),
  };
}

// =========================================================
// NOTICE MODAL (validation, registration result)
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
            className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* TOP ACCENT */}
            <div
              className="h-1.5 flex-shrink-0"
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
            <div className="flex flex-col items-center overflow-y-auto px-8 py-8">
              {/* ANIMATED CIRCLE + MARK */}
              <svg viewBox="0 0 52 52" className="mb-4 h-16 w-16 flex-shrink-0">
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
                {title || (isSuccess ? "Success" : "Validation Required")}
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
// RESULT MODAL
// SAP error: entered details, then SAP status, code and response.
// SAP success: received data table, then SAP status.
// Footer button registers the customer in both cases.
// =========================================================

function ResultModal({
  open,
  ok,
  title,
  status,
  code,
  message,
  sapRecord,
  values,
  getDisplayValue,
  editMode,
  registering,
  onRegister,
  onClose,
}) {
  const accent = ok
    ? "linear-gradient(90deg,#22c55e,#4ade80,#22c55e)"
    : "linear-gradient(90deg,#9A3025,#c44738,#9A3025)";

   const sapRows = [{ label: "Response", value: message }];

  const sections = groupFields(FIELDS);
  const row = buildCustomerRow(sapRecord);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4"
          onClick={() => {
            if (!registering) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* TOP ACCENT */}
            <div className="h-1.5 flex-shrink-0" style={{ background: accent }} />

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              disabled={registering}
              aria-label="Close"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuX size={18} />
            </button>


            {/* BODY */}
                        <div className="space-y-5 overflow-y-auto px-6 pb-5 pt-12">
              {/* ENTERED DETAILS (error only) */}
              {!ok &&
                values &&
                sections.map((section) => {
                  const SectionIcon = section.icon;

                  return (
                    <div key={section.key}>
                      <div className="mb-2 flex items-center gap-2 text-base font-semibold text-[#9A3025]">
                        <SectionIcon size={17} />
                        <span>{section.label}</span>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-rose-200">
                        {section.rows.map((field, i) => {
                          const displayValue = getDisplayValue(field, values);
                          const isEmpty = displayValue === "—";

                          return (
                            <div
                              key={field.key}
                              className={`grid grid-cols-[170px_1fr] sm:grid-cols-[200px_1fr] ${
                                i > 0 ? "border-t border-rose-100" : ""
                              }`}
                            >
                              <div className="flex items-center bg-rose-50/70 px-4 py-2.5 text-sm font-medium text-gray-600">
                                {field.label}
                              </div>
                              <div
                                className={`flex items-center break-words px-4 py-2.5 text-sm font-semibold ${
                                  isEmpty ? "text-gray-400" : "text-gray-900"
                                }`}
                              >
                                {displayValue}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {/* RECEIVED DATA (success only) */}
              {ok && (
                <div>
                  <div className="mb-2 text-base font-semibold text-green-700">
                    Received Data
                  </div>

                  <div className="w-full overflow-x-auto rounded-lg border border-green-200">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-green-50">
                        <tr>
                          {SAP_TABLE_COLUMNS.map((col) => (
                            <th
                              key={col}
                              className="whitespace-nowrap border-b border-green-200 px-2 py-1.5 font-semibold text-green-700"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {SAP_TABLE_COLUMNS.map((col) => (
                            <td
                              key={col}
                              className="break-words px-2 py-1.5 font-medium text-gray-800"
                            >
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SAP STATUS AND RESPONSE */}
              <div>
                <div
                  className={`mb-2 text-base font-semibold ${
                    ok ? "text-green-700" : "text-[#9A3025]"
                  }`}
                >
                  SAP Status &amp; Response
                </div>

                <div
                  className={`overflow-hidden rounded-lg border ${
                    ok ? "border-green-200" : "border-rose-200"
                  }`}
                >
                  {sapRows.map((r, i) => (
                    <div
                      key={r.label}
                      className={`grid grid-cols-[170px_1fr] sm:grid-cols-[200px_1fr] ${
                        i > 0
                          ? ok
                            ? "border-t border-green-100"
                            : "border-t border-rose-100"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 ${
                          ok ? "bg-green-50/70" : "bg-rose-50/70"
                        }`}
                      >
                        {r.label}
                      </div>
                      <div className="flex flex-col justify-center gap-1.5 break-words px-4 py-2.5 text-sm font-semibold text-gray-900">
                      {splitSapMessage(r.value).map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER: REGISTER BUTTON (runs the old create/update flow) */}
            <div className="flex flex-shrink-0 justify-end border-t border-rose-100 px-6 py-4">
              <button
                type="button"
                onClick={onRegister}
                disabled={registering}
                className="flex items-center gap-2 rounded-lg bg-[#9A3025] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#832619] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registering ? (
                  <>
                    <LuLoaderCircle size={16} className="animate-spin" />
                    {editMode ? "Updating..." : "Registering..."}
                  </>
                ) : (
                  <>
                    <LuUserPlus size={16} />
                    {editMode ? "Update Customer" : "Register Customer"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const isFieldRequired = (field, values) => {
  if (field.key === "trade_license_expiry") {
    return Boolean(values.custom_trade_license_no?.trim());
  }
  if (field.key === "tr_number" || field.key === "custom_trade_license_no") {
    return values.customer_type === "B2B" || Boolean(field.required);
  }
  return Boolean(field.required);
};
function CustomerWithsite() {
  const outletContext = useOutletContext() ?? {};
  const location = useLocation();
  const navigate = useNavigate();

  const editMode = location.state?.editMode || false;
  const customer = location.state?.customer;

  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});

  const [form, setForm] = useState(emptyForm);

  // SAP result card (error details or received data), with the submitted values
  const [resultModal, setResultModal] = useState(emptyResult);

  // Validation and registration notices
  const [notice, setNotice] = useState(emptyNotice);

  // Reference to the TR Number input.
  const trNumberRef = useRef<HTMLInputElement>(null);

  // Tracks whether the notice was previously open.
  const noticeWasOpenRef = useRef(false);

  // Whether the current notice is about the TR Number (focus it on close).
  const focusTrOnCloseRef = useRef(false);

  // =========================================================
  // SHOW NOTICE (validation and registration messages)
  // =========================================================

  const showNotice = (
    message,
    { type = "error", title = "", focusTr = false, resetOnClose = false } = {}
  ) => {
    focusTrOnCloseRef.current = focusTr;
    setNotice({ open: true, type, title, message, resetOnClose });
  };

  // Focus TR Number only after a TR-related notice has actually closed.
  useEffect(() => {
    if (
      noticeWasOpenRef.current &&
      !notice.open &&
      focusTrOnCloseRef.current
    ) {
      focusTrOnCloseRef.current = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const input = trNumberRef.current;
          if (!input) return;

          input.focus();

          const length = input.value.length;
          try {
            input.setSelectionRange(length, length);
          } catch {
            // Ignore unsupported selection-range cases.
          }
        });
      });
    }

    noticeWasOpenRef.current = notice.open;
  }, [notice.open]);

  // =========================================================
  // CREATE / UPDATE CUSTOMER (old flow)
  // =========================================================

  const {
    mutate: createCustomer,
    isPending,
    reset: resetCreateCustomer,
  } = useCreateCustomer();

  // =========================================================
  // EDIT MODE
  // =========================================================

  useEffect(() => {
    if (editMode && customer) {
      setForm({
        ...emptyForm,
        name: customer.name || "",
        customer_name: customer.customer_name || "",
        customer_type: customer.customer_type || "",
        business_name: customer.business_name || "",
        tr_number: customer.tr_number || "",
        custom_trade_license_no: customer.trade_licence_number || "",
        trade_license_expiry: customer.trade_license_expiry || "",
        address: customer.address || "",
        custom_street: customer.street || "",
        custom_area: customer.area || "",
        custom_region: customer.emirate_region || "",
        custom_city: customer.city || "",
        site_code: customer.site_code || "",
        email_id: customer.email_id || "",
        mobile_no: customer.mobile_no || "",
        po_box: customer.po_box || "",
        transportation_zone: customer.transportation_zone || "",
        customer_group: customer.customer_group || "",
        sales_district: customer.sales_district || "",
        sales_office: customer.sales_office || "",
      });

      resetCreateCustomer();
    }
  }, [editMode, customer, resetCreateCustomer]);

  // =========================================================
  // UPDATE CUSTOMER
  // =========================================================

  const { mutate: updateCustomer, isPending: isUpdating } =
    useUpdateCustomer();

  const { mutate: confirmSap, isPending: isConfirming } = useConfirmCustomerSap();

  // =========================================================
  // MASTER APIs
  // =========================================================

  const { data: transportationZones = [] } = useTransportationZones();
  const { data: customerGroups = [] } = useCustomerGroups();
  const { data: salesDistrict = [] } = useSalesDistricts();
  const { data: emirates = [] } = useEmirates();
  const { data: siteCodes = [] } = useSiteCodes();

  // =========================================================
  // DISPLAY VALUE FOR DETAIL CARDS
  // Shows readable labels (e.g. "A - Zone Title") instead of raw codes.
  // =========================================================

  const getDisplayValue = (field, values = form) => {
    const value = values[field.key];

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return "—";
    }

    switch (field.key) {
      case "trade_license_expiry":
        return formatDateForDisplay(value);

      case "transportation_zone": {
        const zone = transportationZones.find(
          (z) => z.transportation_zone_code === value
        );
        return zone
          ? `${zone.transportation_zone_code} - ${zone.transportation_zone_title}`
          : value;
      }

      case "customer_group": {
        const group = customerGroups.find((g) => g.name === value);
        return group
          ? `${group.customer_group_name} - ${group.customer_group_title}`
          : value;
      }

      case "custom_region": {
        const emirate = emirates.find((e) => e.name === value);
        if (!emirate) return value;
        return emirate.description
          ? `${emirate.name} - ${emirate.description}`
          : emirate.name;
      }

      case "sales_district": {
        const district = salesDistrict.find(
          (d) => d.sales_district_code === value
        );
        return district
          ? `${district.sales_district_code} - ${district.sales_district_title}`
          : value;
      }

      case "site_code": {
        const site = siteCodes.find((s) => s.site_code === value);
        return site ? site.site_code : value;
      }

      default:
        return value;
    }
  };

  // =========================================================
  // SELECT OPTIONS (master data per select field)
  // =========================================================

  const getSelectOptions = (field) => {
    switch (field.key) {
      case "transportation_zone":
        return [
          { value: "", label: "Select Transportation Zone" },
          ...transportationZones.map((zone) => ({
            value: zone.transportation_zone_code,
            label: `${zone.transportation_zone_code} - ${zone.transportation_zone_title}`,
          })),
        ];

      case "customer_group":
        return [
          { value: "", label: "Select Customer Group" },
          ...customerGroups.map((group) => ({
            value: group.name,
            label: `${group.customer_group_name} - ${group.customer_group_title}`,
          })),
        ];

      case "sales_district":
        return [
          { value: "", label: "Select Sales District" },
          ...salesDistrict.map((district) => ({
            value: district.sales_district_code,
            label: `${district.sales_district_code} - ${district.sales_district_title}`,
          })),
        ];

      case "custom_region":
        return [
          { value: "", label: "Select Emirate" },
          ...emirates.map((emirate) => ({
            value: emirate.name,
            label: emirate.description
              ? `${emirate.name} - ${emirate.description}`
              : emirate.name,
          })),
        ];

      case "site_code":
        return [
          { value: "", label: "Select Site Code" },
          ...siteCodes.map((site) => ({
            value: site.site_code,
            label: site.site_code,
          })),
        ];

      default:
        return field.options || [];
    }
  };

  // =========================================================
  // HEADER
  // =========================================================

  useEffect(() => {
    setHeaderConfig({
      title: editMode
        ? "Edit Customer"
        : "New Customer Registration with Site Code",
    });
  }, [setHeaderConfig, editMode]);

  // =========================================================
  // HANDLE CHANGE
  // =========================================================

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // =========================================================
  // START A FRESH REGISTRATION
  // Clears the form and leaves edit mode (same as after a new registration).
  // =========================================================

  const startNewRegistration = () => {
    setForm(emptyForm);
    resetCreateCustomer();

    if (editMode) {
      navigate("/jh-digitrack/customer-registration/customer-list", {
        replace: true,
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================================================
  // SUBMIT (VALIDATE → SEND TO SAP → SHOW RESULT)
  // =========================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    // TR Number must contain exactly 15 digits
    const trNumber = form.tr_number?.trim();

    if (trNumber && !/^\d{15}$/.test(trNumber)) {
      showNotice("TR Number must contain exactly 15 digits.", {
        title: "Validation Required",
        focusTr: true,
      });
      return;
    }

    // B2B: TR Number AND Trade License Number are both mandatory
if (form.customer_type === "B2B") {
  const tradeLicense = form.custom_trade_license_no?.trim();

  if (!trNumber) {
    showNotice("TR Number is required for B2B customers.", {
      title: "Validation Required",
      focusTr: true,
    });
    return;
  }

  if (!tradeLicense) {
    showNotice("Trade License Number is required for B2B customers.", {
      title: "Validation Required",
    });
    return;
  }
}

    // Site Code is mandatory for this form
    if (!form.site_code?.trim()) {
      showNotice("Please select a Site Code.", {
        title: "Validation Required",
      });
      return;
    }

        // Trade license expiry is mandatory when a license number is entered
    if (
      form.custom_trade_license_no?.trim() &&
      !form.trade_license_expiry
    ) {
      showNotice(
        "Trade License Expiry Date is required when a Trade License Number is entered.",
        { title: "Validation Required" }
      );
      return;
    }

    // Snapshot the values so the result card and Register button use what was submitted
    const snapshot = { ...form };

    confirmSap(form, {
      onSuccess: (res) => handleSapResult(res, snapshot),
      onError: (err) => handleSapError(err, snapshot),
    });
  };

  // =========================================================
  // HANDLE SAP RESULT
  // Opens the result card: entered details + error on failure,
  // received data on success.
  // =========================================================

  const handleSapResult = (res, values) => {
    console.log("SAP Response:", res);

    const sap = findSapResult(res);
    const result = checkSapResponse(res, "Customer sent to SAP successfully.");

    setResultModal({
      open: true,
      ok: result.ok,
      title: result.title,
      message: result.message,
      status: sap?.status ? String(sap.status).trim() : "—",
      code: sap?.code ? String(sap.code).trim() : "—",
      sapRecord: sap ?? null,
      values,
    });
  };

  const handleSapError = (err, values) => {
    console.error("CUSTOMER API ERROR:", err);

    // Some backends return the SAP body inside the error (e.g. axios err.response.data)
    const errorBody = err?.response?.data ?? err?.data;

    if (errorBody && findSapResult(errorBody)) {
      handleSapResult(errorBody, values);
      return;
    }

    setResultModal({
      open: true,
      ok: false,
      title: "Request Failed",
      message: err?.message || "Failed to send customer to SAP. Please try again.",
      status: "—",
      code: "—",
      sapRecord: null,
      values,
    });
  };

  // =========================================================
  // REGISTER CUSTOMER (old create/update flow, runs after SAP result)
  // =========================================================

  const handleRegisterResult = (res) => {
    setResultModal(emptyResult);

    // Backend-level failure (validation, duplicate, server error)
    if (res?.status_code && res.status_code !== 200) {
      showNotice(res.message || "Customer registration failed.", {
        title: res.status_code === 409 ? "Duplicate Customer" : "Registration Failed",
        resetOnClose: false,
      });
      return;
    }

    // Update path returns no SAP status
    if (editMode) {
      showNotice("Customer updated successfully.", {
        type: "success",
        title: "Success",
        resetOnClose: true,
      });
      return;
    }

    const sap = findSapResult(res?.sap_response);

    if (!sap) {
      showNotice("The customer was saved, but no SAP status was returned.", {
        title: "Registration Incomplete",
        resetOnClose: false,
      });
      return;
    }

    if (String(sap.status).trim().toUpperCase() === "S") {
      showNotice(sap.message || "Customer registered successfully.", {
        type: "success",
        title: "Success",
        resetOnClose: true,
      });
      return;
    }

    showNotice(
      `The customer was saved, but SAP did not accept it: ${
        sap.message || "no message returned."
      }`,
      {
        title: sap.code ? `SAP Error (${sap.code})` : "SAP Error",
        resetOnClose: false,
      }
    );
  };

  const handleRegisterError = (err) => {
    setResultModal(emptyResult);

    const errorBody = err?.response?.data ?? err?.data;
    const sap = errorBody ? findSapResult(errorBody) : null;

    showNotice(
      sap?.message || err?.message || "Failed to register customer. Please try again.",
      { title: "Request Failed", resetOnClose: false }
    );
  };

  const handleRegister = () => {
    const values = resultModal.values || form;

    if (editMode) {
      updateCustomer(values, {
        onSuccess: handleRegisterResult,
        onError: handleRegisterError,
      });
      return;
    }

    createCustomer(values, {
      onSuccess: handleRegisterResult,
      onError: handleRegisterError,
    });
  };

  // Closes the result card without registering. The form keeps its values.
  const closeResult = () => {
    setResultModal(emptyResult);
  };

  // =========================================================
  // RENDER
  // =========================================================

  const isRegistering = isPending || isUpdating;

  return (
    <div className="min-h-full p-3 bg-white">
      <div className="w-full">
        {/* ===================================== */}
        {/* HERO HEADER */}
        {/* ===================================== */}

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-[#9A3025] shadow-sm mb-3"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -right-24 w-52 h-52 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white flex items-center justify-center text-base text-[#9A3025] shadow-sm">
              <LuUserPlus />
            </div>

            <div>
              <h1 className="text-base font-bold font-display tracking-tight">
                {editMode
                  ? "Edit Customer"
                  : "New Customer Registration With Site Code"}
              </h1>

              <p className="text-gray-500 text-[11px] mt-0.5">
                {editMode
                  ? "Update customer information."
                  : "Create a new customer profile."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ===================================== */}
        {/* FORM CARD */}
        {/* ===================================== */}

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-rose-200 shadow-sm p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            {FIELDS.map((field, index) => {
              const Icon = field.icon;

              // SECTION-ONLY FIELDS
              if (field.type === "section") {
                return (
                  <div key={field.key} className="md:col-span-2">
                    <div className="flex items-center gap-2 text-[#9A3025] text-xs font-semibold border-b border-rose-200 pb-2">
                      <Icon size={13} />
                      <span>{field.label}</span>
                    </div>
                  </div>
                );
              }

              return (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * index }}
                  className={
                    field.key === "customer_name" ? "md:col-span-2" : ""
                  }
                >
                  {/* LABEL */}
                    <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">
                    {field.label}
                    {isFieldRequired(field, form) && (
                      <span className="text-rose-600 ml-1">*</span>
                    )}
                  </label>

                  {/* CUSTOMER TYPE RADIO BUTTONS */}
                  {field.type === "radio" ? (
                    <div className="flex items-center gap-6 min-h-[34px]">
                      {field.options?.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="radio"
                            name={field.key}
                            value={option.value}
                            checked={form[field.key] === option.value}
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            required={isFieldRequired(field, form)}
                            className="
                              h-4
                              w-4
                              appearance-none
                              rounded-full
                              border
                              border-rose-300
                              bg-white
                              checked:border-[#9A3025]
                              checked:bg-[#9A3025]
                              focus:outline-none
                              focus:ring-2
                              focus:ring-rose-100
                              cursor-pointer
                              transition
                            "
                          />

                          <span className="text-[11px] font-medium text-gray-700 group-hover:text-[#9A3025]">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="relative group">
                      {/* ICON */}
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors">
                        <Icon size={13} />
                      </span>

                      {/* SELECT */}
                      {field.type === "select" ? (
                        <select
                          required={isFieldRequired(field, form)}
                          value={form[field.key] || ""}
                          onChange={(e) =>
                            handleChange(field.key, e.target.value)
                          }
                          className="
                            w-full
                            pl-9
                            pr-3
                            py-1.5
                            rounded-lg
                            border
                            border-rose-200
                            bg-white
                            text-[11px]
                            text-gray-800
                            shadow-sm
                            transition-all
                            outline-none
                            focus:border-rose-400
                            focus:ring-2
                            focus:ring-rose-100
                            hover:border-rose-300
                          "
                        >
                          {getSelectOptions(field).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        /* INPUT (text, email, tel, date) */
                        <input
                          ref={
                            field.key === "tr_number" ? trNumberRef : undefined
                          }
                          type={
                            field.key === "tr_number"
                              ? "text"
                              : field.type || "text"
                          }
                          lang={field.type === "date" ? "en-GB" : undefined}
                          inputMode={
                            field.key === "tr_number" ? "numeric" : undefined
                          }
                          maxLength={
                            field.key === "tr_number"
                              ? 15
                              : field.key === "customer_name" || field.key === "business_name"
                                ? 40
                                : undefined
                          }
                          required={field.required}
                          placeholder={field.placeholder}
                          value={form[field.key] || ""}
                          onChange={(e) => {
                            let value = e.target.value;

                            // TR Number: numbers only, maximum 15 digits
                            if (field.key === "tr_number") {
                              value = value.replace(/\D/g, "").slice(0, 15);
                            }

                            handleChange(field.key, value);
                          }}
                          className={`
                            w-full
                            pl-9
                            pr-3
                            py-1.5
                            rounded-lg
                            border
                            border-rose-200
                            bg-white
                            text-[11px]
                            text-gray-800
                            placeholder:text-gray-400
                            shadow-sm
                            transition-all
                            outline-none
                            focus:border-rose-400
                            focus:ring-2
                            focus:ring-rose-100
                            hover:border-rose-300
                            ${field.type === "date" && !form[field.key] ? "text-gray-400" : ""}
                          `}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ===================================== */}
          {/* BUTTONS */}
          {/* ===================================== */}

          <div className="flex gap-2 mt-5 pt-4 border-t border-rose-100">
            {/* CONFIRM BUTTON (sends to SAP) */}
            <button
              type="submit"
              disabled={isRegistering || isConfirming}
              className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-[#9A3025] px-5 py-2 rounded-lg text-xs font-semibold shadow-sm hover:bg-rose-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LuCircleCheckBig size={13} />
              {isConfirming ? "Sending..." : editMode ? "Confirm Update" : "Confirm"}
            </button>

            {/* RESET BUTTON */}
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="flex items-center gap-1.5 border border-rose-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-medium hover:bg-rose-50 hover:border-rose-300 transition-all duration-200"
            >
              <LuRotateCcw size={13} />
              Reset
            </button>
          </div>
        </motion.form>
      </div>

      {/* ===================================== */}
      {/* RESULT MODAL (entered details + SAP error, or received data + Register button) */}
      {/* ===================================== */}

      <ResultModal
        open={resultModal.open}
        ok={resultModal.ok}
        title={resultModal.title}
        status={resultModal.status}
        code={resultModal.code}
        message={resultModal.message}
        sapRecord={resultModal.sapRecord}
        values={resultModal.values}
        getDisplayValue={getDisplayValue}
        editMode={editMode}
        registering={isRegistering}
        onRegister={handleRegister}
        onClose={closeResult}
      />

      {/* ===================================== */}
      {/* NOTICE MODAL (validation, registration result) */}
      {/* ===================================== */}

      <StatusModal
        open={notice.open}
        type={notice.type}
        title={notice.title || (notice.type === "success" ? "Success" : "Validation Required")}
        message={notice.message}
        onClose={() => {
          const shouldReset = notice.resetOnClose;
          setNotice(emptyNotice);
          if (shouldReset) startNewRegistration();
        }}
      />
    </div>
  );
}

export default CustomerWithsite;