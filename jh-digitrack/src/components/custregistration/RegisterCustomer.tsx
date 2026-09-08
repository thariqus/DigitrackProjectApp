import { useEffect, useState } from "react";

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

  LuTriangleAlert,

  LuRotateCcw,

} from "react-icons/lu";
 
import {

  useCreateCustomer,

  useUpdateCustomer,

  useTransportationZones,

  useCustomerGroups,

  useSalesDistricts,

  useEmirates,

} from "../PropertyAutomation/hooks/useCustomerApi";
 
import { CustomerPayload } from "../PropertyAutomation/api/CustomerApi";
 
const FIELDS = [

  {

    key: "customer_name",

    label: "Customer Name",

    icon: LuUser,

    placeholder: "e.g. Al Maha Trading LLC",

    required: true,

  },

  {

  key: "customer_type",

  label: "Customer Type",

  type: "select",

  icon: LuUser,

  required: true,

  options: [

    { value: "", label: "Select Customer Type" },

    { value: "B2B", label: "B2B" },

    { value: "B2C", label: "B2C" },

  ],

},
 
  {

    key: "business_name",

    label: "Business Name",

    icon: LuUser,

    placeholder: "e.g. Al Maha Trading LLC",

    required: true,

  },
 
  {

    key: "tr_number",

    label: "TR Number",

    icon: LuUser,

    placeholder: "e.g. 123456",

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

    label: "Area",

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

    options: [

      {

        value: "",

        label: "Select Transportation Zone",

      },

      {

        value: "A",

        label: "A",

      },

      {

        value: "B",

        label: "B",

      },

      {

        value: "C",

        label: "C",

      },

    ],

  },
 
  {

    key: "customer_group",

    label: "Customer Group",

    type: "select",

    icon: LuUser,

    required: true,

    options: [

      {

        value: "",

        label: "Select Customer Group",

      },

      {

        value: "A",

        label: "A",

      },

      {

        value: "B",

        label: "B",

      },

      {

        value: "C",

        label: "C",

      },

    ],

  },
 
  {

    key: "sales_district",

    label: "Sales District",

    type: "select",

    icon: LuUser,

    required: true,

    options: [

      {

        value: "",

        label: "Select Sales District",

      },

      {

        value: "A",

        label: "A",

      },

      {

        value: "B",

        label: "B",

      },

      {

        value: "C",

        label: "C",

      },

    ],

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

// STATUS MODAL (shared success / error)

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

            initial={{

              opacity: 0,

              scale: 0.85,

              y: 20,

            }}

            animate={{

              opacity: 1,

              scale: 1,

              y: 0,

            }}

            exit={{

              opacity: 0,

              scale: 0.9,

              y: 10,

            }}

            transition={{

              type: "spring",

              stiffness: 350,

              damping: 25,

            }}

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
 
              <svg

                viewBox="0 0 52 52"

                className="mb-4 h-16 w-16"
>
 
                <motion.circle

                  cx="26"

                  cy="26"

                  r="24"

                  fill="none"

                  stroke={stroke}

                  strokeWidth="2.5"

                  initial={{

                    pathLength: 0,

                  }}

                  animate={{

                    pathLength: 1,

                  }}

                  transition={{

                    duration: 0.45,

                    ease: "easeOut",

                  }}

                />
 
                {isSuccess ? (
<motion.path

                    d="M14.5 27l7 7 16-16"

                    fill="none"

                    stroke={stroke}

                    strokeWidth="3.5"

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    initial={{

                      pathLength: 0,

                    }}

                    animate={{

                      pathLength: 1,

                    }}

                    transition={{

                      duration: 0.35,

                      delay: 0.45,

                      ease: "easeOut",

                    }}

                  />

                ) : (
<>
<motion.path

                      d="M17 17 L35 35"

                      fill="none"

                      stroke={stroke}

                      strokeWidth="3.5"

                      strokeLinecap="round"

                      initial={{

                        pathLength: 0,

                      }}

                      animate={{

                        pathLength: 1,

                      }}

                      transition={{

                        duration: 0.25,

                        delay: 0.45,

                        ease: "easeOut",

                      }}

                    />
 
                    <motion.path

                      d="M35 17 L17 35"

                      fill="none"

                      stroke={stroke}

                      strokeWidth="3.5"

                      strokeLinecap="round"

                      initial={{

                        pathLength: 0,

                      }}

                      animate={{

                        pathLength: 1,

                      }}

                      transition={{

                        duration: 0.25,

                        delay: 0.7,

                        ease: "easeOut",

                      }}

                    />
</>

                )}
 
              </svg>
 
              {/* TITLE */}
 
              <h2 className="text-lg font-bold text-gray-800">

                {title ||

                  (isSuccess ? "Success" : "Validation Required")}
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

                className={`w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${

                  isSuccess

                    ? "bg-green-600 shadow-green-600/20 hover:bg-green-700"

                    : "bg-[#9A3025] shadow-[#9A3025]/20 hover:bg-[#7A251F]"

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
 
function RegisterCustomer() {

  const outletContext = useOutletContext() ?? {};

  const location = useLocation();

  const navigate = useNavigate();

  
 
  const editMode = location.state?.editMode || false;

  const customer = location.state?.customer;
 
  const setHeaderConfig =

    outletContext.setHeaderConfig ?? (() => {});
 
  const [form, setForm] = useState(emptyForm);
 
  const [successModal, setSuccessModal] = useState({

    open: false,

    message: "",

  });
 
  const [errorModal, setErrorModal] = useState({

    open: false,

    message: "",

  });
 
  // =========================================================

  // CREATE CUSTOMER

  // =========================================================
 
  const {

    mutate: createCustomer,

    isPending,

    isError,

    isSuccess,

    error,

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

      custom_trade_license_no:
        customer.trade_licence_number || "",

      address: customer.address || "",

      custom_street:
        customer.street || "",

      custom_area:
        customer.area || "",

      custom_region:
        customer.emirate_region || "",

      custom_city:
        customer.city || "",

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
 
  const { mutate: updateCustomer } = useUpdateCustomer();
 
  // =========================================================

  // MASTER APIs

  // =========================================================
 
  const { data: transportationZones = [] } =

    useTransportationZones();
 
  const { data: customerGroups = [] } =

    useCustomerGroups();
 
  const { data: salesDistrict = [] } =

    useSalesDistricts();
 
  // =========================================================

  // EMIRATE API

  // =========================================================
 
  const { data: emirates = [] } = useEmirates();
 
  // =========================================================

  // HEADER

  // =========================================================
 
  useEffect(() => {

    setHeaderConfig({

      title: editMode

        ? "Edit Customer"

        : "New Customer Registration",

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

  // SUBMIT

  // =========================================================
 
  const handleSubmit = (e) => {

  e.preventDefault();
 
  // =========================================================

  // B2B VALIDATION

  // TR Number OR Trade Licence is mandatory

  // =========================================================
 
  if (form.customer_type === "B2B") {

    const trNumber = form.tr_number?.trim();

    const tradeLicense = form.custom_trade_license_no?.trim();
 
    if (!trNumber && !tradeLicense) {

      setErrorModal({

        open: true,

        message:

          "For B2B customers, either TR Number or Trade Licence Number is required.",

      });

      return;

    }

  }
 
  // =========================================================

  // UPDATE CUSTOMER

  // =========================================================
 
if (editMode) {
  updateCustomer(form, {
    onSuccess: () => {
      setForm(emptyForm);

      // Show existing saved popup
      setSuccessModal({
        open: true,
        message: "Customer updated successfully.",
      });
    },

    onError: (err) => {
      console.error("UPDATE CUSTOMER ERROR:", err);

      setErrorModal({
        open: true,
        message:
          err?.message ||
          "Failed to update customer. Please try again.",
      });
    },
  });
}else {

    // =========================================================

    // CREATE CUSTOMER

    // =========================================================
 
    createCustomer(form, {

      onSuccess: (res) => {

        console.log("Sap Response:",res.sap_response);

        setForm(emptyForm);
 
        setSuccessModal({

          open: true,

          message: "Customer created successfully.",

        });

      },

    });

  }

};
 
  // =========================================================

  // RENDER

  // =========================================================
 
  return (
<div className="min-h-full p-3 bg-gradient-to-br from-[#fdf2f1] via-white to-[#faf7f2]">
<div className="w-full">
 
        {/* ===================================== */}

        {/* HERO HEADER */}

        {/* ===================================== */}
 
        <motion.div

          initial={{

            opacity: 0,

            y: -12,

          }}

          animate={{

            opacity: 1,

            y: 0,

          }}

          transition={{

            duration: 0.5,

            ease: "easeOut",

          }}

          className="relative overflow-hidden rounded-lg bg-[#9A3025] px-4 py-3 text-white shadow-md mb-3"
>
<div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
 
          <div className="absolute -bottom-16 -right-24 w-52 h-52 rounded-full bg-white/5" />
 
          <div className="relative z-10 flex items-center gap-2.5">
 
            <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-base shadow-inner">
<LuUserPlus />
</div>
 
            <div>
 
              <h1 className="text-base font-bold font-display tracking-tight">

                {editMode

                  ? "Edit Customer"

                  : "New Customer Registration"}
</h1>
 
              <p className="text-white/80 text-[11px] mt-0.5">

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

          initial={{

            opacity: 0,

            y: 16,

          }}

          animate={{

            opacity: 1,

            y: 0,

          }}

          transition={{

            duration: 0.5,

            delay: 0.1,

            ease: "easeOut",

          }}

          onSubmit={handleSubmit}

          className="glass-card bg-white/80 rounded-xl shadow-lg p-3"
>
 
          {/* ===================================== */}

          {/* FORM GRID */}

          {/* ===================================== */}
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
 
            {FIELDS.map((field, index) => {

              const Icon = field.icon;
 
              // Skip section-only fields

              if (field.type === "section") {

                return (
<div

                    key={field.key}

                    className="md:col-span-2"
>
<div className="flex items-center gap-2 text-[#9A3025] text-xs font-semibold border-b border-gray-200 pb-1">
<Icon size={13} />
<span>{field.label}</span>
</div>
</div>

                );

              }
 
              return (
<motion.div

                  key={field.key}

                  initial={{

                    opacity: 0,

                    y: 8,

                  }}

                  animate={{

                    opacity: 1,

                    y: 0,

                  }}

                  transition={{

                    duration: 0.35,

                    delay: 0.05 * index,

                  }}

                  className={

                    field.key === "customer_name"

                      ? "md:col-span-2"

                      : ""

                  }
>
 
                  {/* ===================================== */}

                  {/* LABEL */}

                  {/* ===================================== */}
 
                  <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">
 
                    {field.label}
 
                    {field.required && (
<span className="text-[#9A3025] ml-1">

                        *
</span>

                    )}
 
                  </label>
 
                  <div className="relative group">
 
                    {/* ===================================== */}

                    {/* ICON */}

                    {/* ===================================== */}
 
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
<Icon size={13} />
</span>
 
                    {/* ===================================== */}

                    {/* SELECT */}

                    {/* ===================================== */}
 
                    {field.type === "select" ? (
<select

                        required={field.required}

                        value={form[field.key] || ""}

                        onChange={(e) =>

                          handleChange(

                            field.key,

                            e.target.value

                          )

                        }

                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white/90 text-[11px] text-gray-800 shadow-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-gray-300"
>
 
                        {(

                          field.key === "transportation_zone"

                            ? [

                                {

                                  value: "",

                                  label:

                                    "Select Transportation Zone",

                                },
 
                                ...transportationZones.map(

                                  (zone) => ({

                                    value:

                                      zone.transportation_zone_code,
 
                                    label: `${zone.transportation_zone_code} - ${zone.transportation_zone_title}`,

                                  })

                                ),

                              ]
 
                            : field.key === "customer_group"

                            ? [

                                {

                                  value: "",

                                  label:

                                    "Select Customer Group",

                                },
 
                                ...customerGroups.map(

                                  (group) => ({

                                    value: group.name,
 
                                    label: `${group.customer_group_name} - ${group.customer_group_title}`,

                                  })

                                ),

                              ]
 
                            : field.key === "sales_district"

                            ? [

                                {

                                  value: "",

                                  label:

                                    "Select Sales District",

                                },
 
                                ...salesDistrict.map(

                                  (district) => ({

                                    value:

                                      district.sales_district_code,
 
                                    label: `${district.sales_district_code} - ${district.sales_district_title}`,

                                  })

                                ),

                              ]
 
                            // =====================================

                            // EMIRATE DROPDOWN

                            // =====================================
 
                            : field.key === "custom_region"

                            ? [

                                {

                                  value: "",

                                  label: "Select Emirate",

                                },
 
                                ...emirates.map(

                                  (emirate) => ({

                                    value: emirate.name,

                                    label: emirate.name,

                                  })

                                ),

                              ]
 
                            : field.options || []

                        ).map((option) => (
<option

                            key={option.value}

                            value={option.value}
>

                            {option.label}
</option>

                        ))}
 
                      </select>

                    ) : (
 
                      /* ===================================== */

                      /* INPUT */

                      /* ===================================== */
 
                      <input

                        type={field.type || "text"}

                        required={field.required}

                        placeholder={field.placeholder}

                        value={form[field.key] || ""}

                        onChange={(e) =>

                          handleChange(

                            field.key,

                            e.target.value

                          )

                        }

                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white/90 text-[11px] text-gray-800 placeholder:text-gray-400 shadow-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-gray-300"

                      />
 
                    )}
 
                  </div>
 
                </motion.div>

              );

            })}
 
          </div>
 
          {/* ===================================== */}

          {/* ERROR / SUCCESS MESSAGE */}

          {/* ===================================== */}
 
          <AnimatePresence mode="wait">
 
            {isError && (
<motion.div

                initial={{

                  opacity: 0,

                  height: 0,

                }}

                animate={{

                  opacity: 1,

                  height: "auto",

                }}

                exit={{

                  opacity: 0,

                  height: 0,

                }}

                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 mt-3"
>
 
                <LuTriangleAlert className="flex-shrink-0" />
 
                {error?.message ||

                  "Failed to register customer. Please try again."}
 
              </motion.div>

            )}
 
            {isSuccess && !editMode && (
<motion.div

                initial={{

                  opacity: 0,

                  height: 0,

                }}

                animate={{

                  opacity: 1,

                  height: "auto",

                }}

                exit={{

                  opacity: 0,

                  height: 0,

                }}

                className="mt-3"
>
 
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-green-600 text-[11px]">
 
                  <LuCircleCheckBig className="flex-shrink-0" />
 
                  Customer details saved and ready to save next customer.
 
                </div>
 
                {/* TODO: static example payload until the real SAP sync call is wired into create_customer. */}
 
                <div className="mt-2 bg-white rounded-lg border border-gray-200 p-3">
 
                  <pre className="text-[11px] text-gray-700 font-mono whitespace-pre">
 
                    {JSON.stringify(

                      {

                        status: "success",

                        "Customer code": 400,

                        Details: [],

                      },

                      null,

                      2

                    )}
 
                  </pre>
 
                </div>
 
              </motion.div>

            )}
 
          </AnimatePresence>
 
          {/* ===================================== */}

          {/* BUTTONS */}

          {/* ===================================== */}
 
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
 
            {/* REGISTER BUTTON */}
 
            <button

              type="submit"

              disabled={isPending}

              className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-[#b03a30] text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
>
 
              {isPending ? (
<>
<LuLoaderCircle

                    size={13}

                    className="animate-spin"

                  />
 
                  Saving...
</>

              ) : (
<>
<LuUserPlus size={13} />
 
                  {editMode

                    ? "Update Customer"

                    : "Register Customer"}
</>

              )}
 
            </button>
 
            {/* RESET BUTTON */}
 
            <button

              type="button"

              onClick={() => setForm(emptyForm)}

              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
>
 
              <LuRotateCcw size={13} />
 
              Reset
 
            </button>
 
          </div>
 
        </motion.form>
 
      </div>
 
      {/* ===================================== */}

      {/* SUCCESS MODAL */}

      {/* ===================================== */}
 
      <StatusModal

        open={successModal.open}

        type="success"

        title="Success"

        message={successModal.message}

       onClose={() => {
  setSuccessModal({
    open: false,
    message: "",
  });

  if (editMode) {
    window.location.href =
      "/jh-digitrack/customer-registration/customer-list";
  }
}}
      />
 
      {/* ===================================== */}

      {/* ERROR MODAL */}

      {/* ===================================== */}
 
      <StatusModal

        open={errorModal.open}

        type="error"

        title="Validation Required"

        message={errorModal.message}

        onClose={() =>

          setErrorModal({

            open: false,

            message: "",

          })

        }

      />
 
    </div>

  );

}
 
export default RegisterCustomer;
 