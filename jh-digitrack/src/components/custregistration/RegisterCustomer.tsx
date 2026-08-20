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
    required: true,
  },
  {
    key: "custom_trade_license_no",
    label: "Trade Licence Number",
    icon: LuFileText,
    placeholder: "e.g. 123456",
    required: true,
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
  {
    key: "custom_region",
    label: "Emirate (Region)",
    icon: LuMapPin,
    placeholder: "e.g. Dubai",
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
    required: true,
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
      { value: "", label: "Select Transportation Zone" },
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
    ],
  },

  {
    key: "customer_group",
    label: "Customer Group",
    type: "select",
    icon: LuUser,
    required: true,
    options: [
      { value: "", label: "Select Customer Group" },
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
    ],
  },

  {
    key: "sales_district",
    label: "Sales District",
    type: "select",
    icon: LuUser,
    required: true,
    options: [
      { value: "", label: "Select Sales District" },
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
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

function RegisterCustomer() {
  const outletContext = useOutletContext() ?? {};
  const location = useLocation();
  const navigate = useNavigate();

  const editMode = location.state?.editMode || false;
  const customer = location.state?.customer;

  const setHeaderConfig =
    outletContext.setHeaderConfig ?? (() => {});

  const [form, setForm] = useState(emptyForm);

  const {
    mutate: createCustomer,
    isPending,
    isError,
    isSuccess,
    error,
    reset: resetCreateCustomer,
  } = useCreateCustomer();

  useEffect(() => {
    if (editMode && customer) {
      setForm(customer);
      resetCreateCustomer();
    }
  }, [editMode, customer, resetCreateCustomer]);

  const { mutate: updateCustomer } = useUpdateCustomer();

  const { data: transportationZones = [] } = useTransportationZones();
  const { data: customerGroups = [] } = useCustomerGroups();
  const { data: salesDistrict = [] } = useSalesDistricts();

  // ---------------------------------------
  // Header
  // ---------------------------------------
  useEffect(() => {
    setHeaderConfig({
      title: editMode ? "Edit Customer" : "Register as New Customer",
    });
  }, [setHeaderConfig, editMode]);

  // ---------------------------------------
  // Handle Change
  // ---------------------------------------
  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ---------------------------------------
  // Submit
  // ---------------------------------------
  const handleSubmit = (e) => {
    e.preventDefault();

    if (editMode) {
      updateCustomer(form, {
        onSuccess: () => {
          alert("Customer updated successfully.");

          setForm(emptyForm);

          navigate("/jh-digitrack/sample/register-customer", {
            replace: true,
          });
        },
      });
    } else {
      createCustomer(form, {
        onSuccess: () => {
          setForm(emptyForm);

          alert("Customer created successfully.");
        },
      });
    }
  };

  return (
    <div className="min-h-full p-3 bg-gradient-to-br from-[#fdf2f1] via-white to-[#faf7f2]">
      <div className="w-full">

        {/* ===================================== */}
        {/* HERO HEADER */}
        {/* ===================================== */}

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          className="relative overflow-hidden rounded-lg bg-[#BD272C] px-4 py-3 text-white shadow-md mb-3"
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
                  : "Register as New Customer"}
              </h1>

              <p className="text-white/80 text-[11px] mt-0.5">
                {editMode
                  ? "Update customer information."
                  : "Create a new customer profile to start billing them."}
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

          {/* FORM GRID */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">

            {FIELDS.map((field, index) => {
              const Icon = field.icon;

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

                  {/* LABEL */}

                  <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">
                    {field.label}

                    {field.required && (
                      <span className="text-[#BD272C] ml-1">
                        *
                      </span>
                    )}
                  </label>

                  <div className="relative group">

                    {/* ICON */}

                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                      <Icon size={13} />
                    </span>

                    {/* SELECT */}

                    {field.type === "select" ? (
                      <select
                        required={field.required}
                        value={form[field.key]}
                        onChange={(e) =>
                          handleChange(
                            field.key,
                            e.target.value
                          )
                        }
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white/90 text-[11px] text-gray-800 shadow-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-gray-300"
                      >
                        {(
                          field.key ===
                          "transportation_zone"
                            ? [
                                {
                                  value: "",
                                  label:
                                    "Select transportation Zone",
                                },
                                ...transportationZones.map(
                                  (zone) => ({
                                    value:
                                      zone.transportation_zone_code,
                                    label: `${zone.transportation_zone_code} - ${zone.transportation_zone_title}`,
                                  })
                                ),
                              ]
                            : field.key ===
                              "customer_group"
                            ? [
                                {
                                  value: "",
                                  label:
                                    "Select Customer Group",
                                },
                                ...customerGroups.map(
                                  (group) => ({
                                    value: group.name,
                                    label: `${group.custom_customer_group_title} - ${group.parent_customer_group}`,
                                  })
                                ),
                              ]
                            : field.key ===
                              "sales_district"
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
                                    label: `${district.sales_district_title}${district.sales_district_code} - ${district.sales_district_title}`,
                                  })
                                ),
                              ]
                            : field.options
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

                      /* INPUT */

                      <input
                        type={field.type || "text"}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={form[field.key]}
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
    </div>
  );
}

export default RegisterCustomer;
