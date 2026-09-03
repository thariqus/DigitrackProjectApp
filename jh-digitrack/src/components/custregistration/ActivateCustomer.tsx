import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { IoPersonAddOutline } from "react-icons/io5";

import { useActivateCustomer } from "../PropertyAutomation/hooks/useCustomerApi";

function ActivateCustomer() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig =
    outletContext.setHeaderConfig ?? (() => {});
  const navigate = useNavigate();

  const [companyCode, setCompanyCode] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  const [errorModal, setErrorModal] = useState({
    open: false,
    message: "",
  });

  const {
    mutateAsync: activateCustomer,
    isPending,
  } = useActivateCustomer();

  useEffect(() => {
    setHeaderConfig({
      title: "",
    });
  }, [setHeaderConfig]);

  // ---------------------------------------------------------
  // Activate Customer
  // ---------------------------------------------------------
  const handleActivate = async (e) => {
  e.preventDefault();

  try {
    const result = await activateCustomer({
      customerCode: customerCode.trim(),
      companyCode: companyCode.trim(),
    });

    console.log("Activate Customer Response:", result);

    navigate(
      "/jh-digitrack/customer-registration/sap-response",
      {
        state: {
          customer: {
            customer_code: customerCode.trim(),
            company_code: companyCode.trim(),
          },
          result,
        },
      }
    );

  } catch (error) {
    console.error(
      "Activate Customer Error:",
      error
    );

    setErrorModal({
      open: true,
      message:
        "Unable to activate customer. Please try again.",
    });
  }
};

  // ---------------------------------------------------------
  // Reset
  // ---------------------------------------------------------
  const handleReset = () => {
    setCompanyCode("");
    setCustomerCode("");
  };

  return (
    <div className="w-full">

      {/* =====================================================
          PAGE HEADING
      ===================================================== */}
      <div className="flex items-center justify-between mb-3">

        <h2
          className="text-sm font-semibold"
          style={{ color: "#9A3025" }}
        >
          Activate Customer
        </h2>

      </div>


      {/* =====================================================
          CARD
      ===================================================== */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">


        {/* ===================================================
            CARD HEADER
        =================================================== */}
        <div className="bg-[#9A3025] px-5 py-4 text-white">

          <div className="flex items-center gap-3">

            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">

              <IoPersonAddOutline className="text-xl" />

            </div>


            {/* Header Text */}
            <div>

              <h2 className="text-lg font-semibold">
                Activate Customer
              </h2>

              <p className="text-xs text-white/80">
                Enter the company code and customer code
                to activate the customer.
              </p>

            </div>

          </div>

        </div>


        {/* ===================================================
            FORM
        =================================================== */}
        <form onSubmit={handleActivate}>

          <div className="p-5">


            {/* =================================================
                INPUTS
            ================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              {/* =================================================
                  COMPANY CODE
              ================================================= */}
              <div>

                <label className="block text-xs font-semibold text-gray-600 mb-1">

                  Company Code

                  <span className="text-[#9A3025] ml-1">
                    *
                  </span>

                </label>


                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) =>
                    setCompanyCode(e.target.value)
                  }
                  placeholder="e.g. JALEEL01"
                  className="
                    w-full
                    border
                    border-gray-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    outline-none
                    focus:border-[#9A3025]
                    focus:ring-2
                    focus:ring-[#9A3025]/10
                    transition
                  "
                />

              </div>


              {/* =================================================
                  CUSTOMER CODE
              ================================================= */}
              <div>

                <label className="block text-xs font-semibold text-gray-600 mb-1">

                  Customer Code

                  <span className="text-[#9A3025] ml-1">
                    *
                  </span>

                </label>


                <input
                  type="text"
                  required
                  value={customerCode}
                  onChange={(e) =>
                    setCustomerCode(e.target.value)
                  }
                  placeholder="e.g. CUST001"
                  className="
                    w-full
                    border
                    border-gray-300
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    outline-none
                    focus:border-[#9A3025]
                    focus:ring-2
                    focus:ring-[#9A3025]/10
                    transition
                  "
                />

              </div>

            </div>


            {/* =================================================
                BUTTONS
            ================================================= */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200">


              {/* =================================================
                  ACTIVATE BUTTON
              ================================================= */}
              <button
                type="submit"
                disabled={isPending}
                className="
                  flex
                  items-center
                  gap-2
                  bg-[#9A3025]
                  hover:bg-[#7A251F]
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  text-white
                  px-5
                  py-2
                  rounded-md
                  text-xs
                  font-semibold
                  shadow
                  transition
                "
              >

                <IoPersonAddOutline />

                {isPending
                  ? "Activating..."
                  : "Activate Customer"}

              </button>


              {/* =================================================
                  RESET BUTTON
              ================================================= */}
              <button
                type="button"
                onClick={handleReset}
                className="
                  px-5
                  py-2
                  rounded-md
                  border
                  border-gray-300
                  text-gray-600
                  hover:bg-gray-50
                  text-xs
                  font-medium
                  transition
                "
              >
                Reset
              </button>

            </div>

          </div>

        </form>

      </div>


      {/* =====================================================
          ERROR MODAL
      ===================================================== */}
      <AnimatePresence>

        {errorModal.open && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-black/40
              backdrop-blur-sm
            "
            onClick={() =>
              setErrorModal({
                open: false,
                message: "",
              })
            }
          >

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.85,
                y: 12,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 8,
              }}
              transition={{
                duration: 0.25,
                ease: "easeOut",
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
              className="
                bg-white
                rounded-2xl
                shadow-xl
                px-8
                py-8
                flex
                flex-col
                items-center
                max-w-xs
                w-full
                mx-4
              "
            >

              {/* =================================================
                  ERROR ICON
              ================================================= */}
              <svg
                viewBox="0 0 52 52"
                className="w-16 h-16 mb-4"
              >

                {/* Circle */}
                <motion.circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="#9A3025"
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


                {/* X */}
                <motion.path
                  d="M18 18l16 16"
                  fill="none"
                  stroke="#9A3025"
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


                {/* X */}
                <motion.path
                  d="M34 18l-16 16"
                  fill="none"
                  stroke="#9A3025"
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

              </svg>


              {/* Error Message */}
              <p className="text-sm font-semibold text-gray-800 text-center">
                {errorModal.message}
              </p>


              {/* OK */}
              <button
                type="button"
                onClick={() =>
                  setErrorModal({
                    open: false,
                    message: "",
                  })
                }
                className="
                  mt-5
                  px-6
                  py-2
                  rounded-lg
                  bg-[#9A3025]
                  hover:bg-[#7A251F]
                  text-white
                  text-xs
                  font-semibold
                  transition-colors
                "
              >
                OK
              </button>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}

export default ActivateCustomer;