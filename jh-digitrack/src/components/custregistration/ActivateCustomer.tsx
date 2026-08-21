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

  const { mutateAsync: activateCustomer, isPending } = useActivateCustomer();

  useEffect(() => {
    setHeaderConfig({
      title: "",
    });
  }, [setHeaderConfig]);

  const handleActivate = async (e) => {
    e.preventDefault();

    try {
      const result = await activateCustomer({
        customerCode: customerCode.trim(),
        companyCode: companyCode.trim(),
      });

      if (!result.matched) {
        setErrorModal({ open: true, message: result.message });
        return;
      }

      navigate("/jh-digitrack/sample/sap-response", {
        state: {
          customer: { customer_name: result.data?.customer_name },
          result,
        },
      });
    } catch (error) {
      console.error("Activate Customer Error:", error);
      setErrorModal({
        open: true,
        message: "Unable to activate customer. Please try again.",
      });
    }
  };

  const handleReset = () => {
    setCompanyCode("");
    setCustomerCode("");
  };

  return (
    <div className="w-full">

      {/* Page Heading */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-md font-semibold"
          style={{ color: "#A61F24" }}
        >
          Activate Customer
        </h2>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">

        {/* Card Header */}
        <div className="bg-[#BD272C] px-5 py-4 text-white">
          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <IoPersonAddOutline className="text-xl" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Activate Customer
              </h2>

              <p className="text-xs text-white/80">
                Enter the company code and customer code to activate the customer.
              </p>
            </div>

          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleActivate}>

          <div className="p-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Company Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Company Code
                  <span className="text-[#BD272C] ml-1">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  placeholder="e.g. JALEEL01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#BD272C] focus:ring-2 focus:ring-[#BD272C]/10 transition"
                />
              </div>

              {/* Customer Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Customer Code
                  <span className="text-[#BD272C] ml-1">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="e.g. CUST001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#BD272C] focus:ring-2 focus:ring-[#BD272C]/10 transition"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200">

              {/* Activate */}
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 bg-[#BD272C] hover:bg-[#A61F24] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-xs font-semibold shadow transition"
              >
                <IoPersonAddOutline />
                {isPending ? "Activating..." : "Activate Customer"}
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-medium transition"
              >
                Reset
              </button>

            </div>

          </div>

        </form>
      </div>

      {/* ===================================== */}
      {/* ERROR MODAL */}
      {/* ===================================== */}

      <AnimatePresence>
        {errorModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setErrorModal({ open: false, message: "" })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl px-8 py-8 flex flex-col items-center max-w-xs w-full mx-4"
            >
              <svg viewBox="0 0 52 52" className="w-16 h-16 mb-4">
                <motion.circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="#BD272C"
                  strokeWidth="2.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />

                <motion.path
                  d="M18 18l16 16"
                  fill="none"
                  stroke="#BD272C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.45, ease: "easeOut" }}
                />

                <motion.path
                  d="M34 18l-16 16"
                  fill="none"
                  stroke="#BD272C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.7, ease: "easeOut" }}
                />
              </svg>

              <p className="text-sm font-semibold text-gray-800 text-center">
                {errorModal.message}
              </p>

              <button
                type="button"
                onClick={() => setErrorModal({ open: false, message: "" })}
                className="mt-5 px-6 py-2 rounded-lg bg-[#BD272C] hover:bg-[#A61F24] text-white text-xs font-semibold transition-colors"
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
