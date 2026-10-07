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
  required: true,
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
    label: "Trade Licence Number",
    icon: LuFileText,
    placeholder: "e.g. 123456",
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
  // SITE CODE — the field that distinguishes this form
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

// =========================================================
// SAP RESPONSE HELPERS
// Works with any wrapper depth / field set returned by SAP.
// =========================================================

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

function checkSapResponse(res, fallbackSuccessMessage) {
  const sapResult = findSapResult(res);
  const rootFailed = res?.success === false || res?.data?.success === false;

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
  // SUCCESS ONLY IF STATUS IS "S" — ALL OTHER CASES FAIL
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

// =========================================================
// STATUS MODAL (shared success / error)
// =========================================================

function StatusModal({
  open,
  type = "error",
  title,
  message,
  sap = null,
  onClose,
}) {
  const isSuccess = type === "success";
  const stroke = isSuccess ? "#22c55e" : "#DC2626";
  const sapRows = sap?.rows ?? [];

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

              {/* SAP RESPONSE DETAILS */}
              {sapRows.length > 0 && (
                <div
                  className={`mt-4 w-full overflow-hidden rounded-lg border text-left ${
                    isSuccess
                      ? "border-green-200 bg-green-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div
                    className={`border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSuccess
                        ? "border-green-200 text-green-700"
                        : "border-rose-200 text-[#9A3025]"
                    }`}
                  >
                    SAP Response
                  </div>

                  <div className="max-h-48 space-y-1.5 overflow-y-auto px-3 py-2">
                    {sapRows.map((row, i) => (
                      <div
                        key={`${row.label}-${i}`}
                        className="flex gap-2 text-[11px]"
                      >
                        <span className="w-28 flex-shrink-0 font-semibold text-gray-500">
                          {row.label}
                        </span>
                        <span className="min-w-0 break-words font-medium text-gray-800">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
// CONFIRM DETAILS MODAL
// =========================================================

function ConfirmDetailsModal({
  open,
  editMode,
  fields,
  getDisplayValue,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  // Group fields into sections: everything before the first "section"
  // field goes under "Customer Details".
  const sections = [];
  let current = { key: "customer_details", label: "Customer Details", icon: LuUser, rows: [] };

  fields.forEach((field) => {
    if (field.type === "section") {
      if (current.rows.length) sections.push(current);
      current = { key: field.key, label: field.label, icon: field.icon, rows: [] };
      return;
    }
    current.rows.push(field);
  });
  if (current.rows.length) sections.push(current);

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
            if (!isSubmitting) onClose();
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
            <div
              className="h-1.5 flex-shrink-0"
              style={{
                background: "linear-gradient(90deg,#9A3025,#c44738,#9A3025)",
              }}
            />

            {/* HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-rose-100 bg-rose-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#9A3025]">
                  {editMode
                    ? "Confirm Updated Details"
                    : "Confirm Customer Details"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Please review the details below. Close this window to make
                  changes.
                </p>
              </div>

              {/* CANCEL (X) — back to the form to edit */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Cancel and edit"
                title="Cancel and edit"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-white hover:text-[#9A3025] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LuX size={20} />
              </button>
            </div>

            {/* DETAILS */}
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {sections.map((section) => {
                const SectionIcon = section.icon;

                return (
                  <div key={section.key}>
                    {/* SECTION TITLE */}
                    <div className="mb-2 flex items-center gap-2 text-base font-semibold text-[#9A3025]">
                      <SectionIcon size={17} />
                      <span>{section.label}</span>
                    </div>

                    {/* KEY / VALUE ROWS */}
                    <div className="overflow-hidden rounded-lg border border-rose-200">
                      {section.rows.map((field, i) => {
                        const displayValue = getDisplayValue(field);
                        const isEmpty = displayValue === "—";

                        return (
                          <div
                            key={field.key}
                            className={`grid grid-cols-[170px_1fr] sm:grid-cols-[200px_1fr] ${
                              i > 0 ? "border-t border-rose-100" : ""
                            }`}
                          >
                            {/* LABEL (left) */}
                            <div className="flex items-center bg-rose-50/70 px-4 py-2.5 text-sm font-medium text-gray-600">
                              {field.label}
                            </div>

                            {/* VALUE (right) */}
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
            </div>

            {/* FOOTER */}
            <div className="flex flex-shrink-0 justify-end border-t border-rose-100 px-6 py-4">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[#9A3025] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#832619] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
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

function CustomerWithsite() {
  const outletContext = useOutletContext() ?? {};
  const location = useLocation();
  const navigate = useNavigate();

  const editMode = location.state?.editMode || false;
  const customer = location.state?.customer;

  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});

  const [form, setForm] = useState(emptyForm);

  const [successModal, setSuccessModal] = useState({
    open: false,
    title: "",
    message: "",
    sap: null,
  });

  const [errorModal, setErrorModal] = useState({
    open: false,
    title: "",
    message: "",
    sap: null,
    resetOnClose: false,
  });

  // Controls the "confirm details" popup shown before registering.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reference to the TR Number input.
  const trNumberRef = useRef<HTMLInputElement>(null);

  // Tracks whether the error popup was previously open.
  const errorModalWasOpenRef = useRef(false);

  // Whether the current error is about the TR Number (focus it on close).
  const focusTrOnCloseRef = useRef(false);

  // =========================================================
  // SHOW ERROR POPUP
  // =========================================================

  const showError = (
    message,
    { title = "", focusTr = false, sap = null, resetOnClose = false } = {}
  ) => {
    focusTrOnCloseRef.current = focusTr;
    setErrorModal({ open: true, title, message, sap, resetOnClose });
  };

  // Focus TR Number only after a TR-related popup has actually closed.
  useEffect(() => {
    if (
      errorModalWasOpenRef.current &&
      !errorModal.open &&
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

    errorModalWasOpenRef.current = errorModal.open;
  }, [errorModal.open]);

  // =========================================================
  // CREATE CUSTOMER
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
        address: customer.address || "",
        custom_street: customer.street || "",
        custom_area: customer.area || "",
        custom_region: customer.emirate_region || "",
        custom_city: customer.city || "",
        site_code: customer.site_code || "",
        email_id: customer.email_id || "",
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

  // =========================================================
  // MASTER APIs
  // =========================================================

  const { data: transportationZones = [] } = useTransportationZones();
  const { data: customerGroups = [] } = useCustomerGroups();
  const { data: salesDistrict = [] } = useSalesDistricts();
  const { data: emirates = [] } = useEmirates();
  const { data: siteCodes = [] } = useSiteCodes();

  // =========================================================
  // DISPLAY VALUE FOR CONFIRMATION POPUP
  // Shows readable labels (e.g. "A - Zone Title") instead of raw codes.
  // =========================================================

  const getDisplayValue = (field) => {
    const value = form[field.key];

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return "—";
    }

    switch (field.key) {
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
            label: emirate.name,
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
  // SUBMIT (VALIDATE → OPEN CONFIRMATION POPUP)
  // =========================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    // TR Number must contain exactly 10 digits
    const trNumber = form.tr_number?.trim();

    if (trNumber && !/^\d{15}$/.test(trNumber)) {
      showError("TR Number must contain exactly 15 digits.", {
        title: "Validation Required",
        focusTr: true,
      });
      return;
    }

    // B2B: TR Number OR Trade Licence is mandatory
    if (form.customer_type === "B2B") {
      const tradeLicense = form.custom_trade_license_no?.trim();

      if (!trNumber && !tradeLicense) {
        showError(
          "For B2B customers, either TR Number or Trade Licence Number is required.",
          { title: "Validation Required", focusTr: true }
        );
        return;
      }
    }

    // Site Code is mandatory for this form
    if (!form.site_code?.trim()) {
      showError("Please select a Site Code.", {
        title: "Validation Required",
      });
      return;
    }

    // All validation passed → show confirmation popup
    setConfirmOpen(true);
  };

  // =========================================================
  // HANDLE API RESULT (shared by create + update)
  // SAP can return HTTP 200 with status "E", so check the body.
  // =========================================================

  const handleApiResult = (res, successMessage) => {
    console.log("SAP Response:", res);
    setConfirmOpen(false);

    const result = checkSapResponse(res, successMessage);

    if (!result.ok) {
      showError(result.message, {
        title: result.title,
        sap: result.sap,
        resetOnClose: !editMode, // new registration → start fresh
      });
      return;
    }

    setForm(emptyForm);
    setSuccessModal({
      open: true,
      title: result.title,
      message: result.message,
      sap: result.sap,
    });
  };

  const handleApiError = (err, fallbackMessage) => {
    console.error("CUSTOMER API ERROR:", err);
    setConfirmOpen(false);

    // Some backends return the SAP body inside the error (e.g. axios err.response.data)
    const errorBody = err?.response?.data ?? err?.data;
    const result = errorBody ? checkSapResponse(errorBody, "") : null;

    if (result && !result.ok) {
      showError(result.message, {
        title: result.title,
        sap: result.sap,
        resetOnClose: !editMode,
      });
      return;
    }

    showError(err?.message || fallbackMessage, {
      title: "Request Failed",
      resetOnClose: !editMode,
    });
  };

  // =========================================================
  // FINAL REGISTER / UPDATE (from confirmation popup)
  // =========================================================

  const handleConfirmRegister = () => {
    if (editMode) {
      updateCustomer(form, {
        onSuccess: (res) =>
          handleApiResult(res, "Customer updated successfully."),
        onError: (err) =>
          handleApiError(err, "Failed to update customer. Please try again."),
      });
      return;
    }

    createCustomer(form, {
      onSuccess: (res) =>
        handleApiResult(res, "Customer created successfully."),
      onError: (err) =>
        handleApiError(err, "Failed to register customer. Please try again."),
    });
  };

  // =========================================================
  // RENDER
  // =========================================================

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
                    {field.required && (
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
                            required={field.required}
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
                          required={field.required}
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
                        /* INPUT */
                        <input
                          ref={
                            field.key === "tr_number" ? trNumberRef : undefined
                          }
                          type={
                            field.key === "tr_number"
                              ? "text"
                              : field.type || "text"
                          }
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
                            placeholder:text-gray-400
                            shadow-sm
                            transition-all
                            outline-none
                            focus:border-rose-400
                            focus:ring-2
                            focus:ring-rose-100
                            hover:border-rose-300
                          "
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
            {/* CONFIRM BUTTON (opens review popup) */}
            <button
              type="submit"
              disabled={isPending || isUpdating}
              className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-[#9A3025] px-5 py-2 rounded-lg text-xs font-semibold shadow-sm hover:bg-rose-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LuCircleCheckBig size={13} />
              {editMode ? "Confirm Update" : "Confirm"}
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
      {/* CONFIRM DETAILS MODAL */}
      {/* ===================================== */}

      <ConfirmDetailsModal
        open={confirmOpen}
        editMode={editMode}
        fields={FIELDS}
        getDisplayValue={getDisplayValue}
        isSubmitting={isPending || isUpdating}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRegister}
      />

      {/* ===================================== */}
      {/* SUCCESS MODAL */}
      {/* ===================================== */}

      <StatusModal
        open={successModal.open}
        type="success"
        title={successModal.title || "Success"}
        message={successModal.message}
        sap={successModal.sap}
        onClose={() => {
          setSuccessModal({ open: false, title: "", message: "", sap: null });

          if (editMode) {
            navigate("/jh-digitrack/customer-registration/customer-list", {
              replace: true,
            });
          }
        }}
      />

      {/* ===================================== */}
      {/* ERROR MODAL */}
      {/* ===================================== */}

      <StatusModal
        open={errorModal.open}
        type="error"
        title={errorModal.title || "Validation Required"}
        message={errorModal.message}
        sap={errorModal.sap}
        onClose={() => {
          const shouldReset = errorModal.resetOnClose;

          setErrorModal({
            open: false,
            title: "",
            message: "",
            sap: null,
            resetOnClose: false,
          });

          if (shouldReset) {
            setForm(emptyForm);
            resetCreateCustomer();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </div>
  );
}

export default CustomerWithsite;
