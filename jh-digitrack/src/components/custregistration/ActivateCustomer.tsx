import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoPersonAddOutline } from "react-icons/io5";

function ActivateCustomer() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig =
    outletContext.setHeaderConfig ?? (() => {});

  const [companyCode, setCompanyCode] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  useEffect(() => {
    setHeaderConfig({
      title: "Activate Customer",
    });
  }, [setHeaderConfig]);

  const handleActivate = (e) => {
    e.preventDefault();

    if (!companyCode.trim()) {
      alert("Please enter Company Code");
      return;
    }

    if (!customerCode.trim()) {
      alert("Please enter Customer Code");
      return;
    }

    // TODO: backend method not implemented yet — confirm the real path with the Frappe team.
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
                className="flex items-center gap-2 bg-[#BD272C] hover:bg-[#A61F24] text-white px-5 py-2 rounded-md text-xs font-semibold shadow transition"
              >
                <IoPersonAddOutline />
                Activate Customer
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
    </div>
  );
}

export default ActivateCustomer;
