import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { IoSearchOutline } from "react-icons/io5";

import { getCustomerList } from "../PropertyAutomation/api/CustomerApi";

const PAGE_SIZE = 20;

function CustomerSearch() {
  const outletContext = useOutletContext() ?? {};

  const setHeaderConfig =
    outletContext.setHeaderConfig ?? (() => {});

  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHeaderConfig({
      title: "",
    });
  }, [setHeaderConfig]);


  // =========================================================
  // SEARCH CUSTOMER
  // =========================================================

  const handleSearch = async (e) => {
    e.preventDefault();

    const searchValue = search.trim();

    if (!searchValue) {
      setCustomer(null);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setCustomer(null);
      setSearched(false);

      // Get customer from your existing Frappe API
      const result = await getCustomerList(
        1,
        PAGE_SIZE,
        searchValue
      );

      const customers = result?.data || [];

      // Backend already performs the search.
      // Take the first matching customer.
      const foundCustomer =
        customers.length > 0
          ? customers[0]
          : null;

      setCustomer(foundCustomer);
      setSearched(true);

      // =====================================================
      // SEND FOUND CUSTOMER DATA TO SAP
      // =====================================================

    } catch (error) {
      console.error(
        "Error searching/sending customer:",
        error
      );

      setCustomer(null);
      setSearched(true);

    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const handleClear = () => {
    setSearch("");
    setCustomer(null);
    setSearched(false);
  };

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
          className="w-full max-w-[700px]"
        >

          {/* =================================================
              SEARCH BAR
          ================================================= */}

          <div
            className="
              w-full
              h-14
              flex
              items-center
              rounded-full
              border
              border-gray-300
              bg-white
              shadow-sm
              hover:shadow-md
              focus-within:shadow-md
              transition-shadow
            "
          >

            <IoSearchOutline
              className="
                ml-5
                text-gray-500
                text-xl
                flex-shrink-0
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCustomer(null);
                setSearched(false);
              }}
              placeholder="Search customer by any field"
              className="
                flex-1
                h-full
                px-4
                text-sm
                text-gray-700
                outline-none
                bg-transparent
              "
            />

            {search && (
              <button
                type="button"
                onClick={handleClear}
                className="
                  mr-3
                  w-8
                  h-8
                  rounded-full
                  text-gray-400
                  hover:bg-gray-100
                  hover:text-gray-600
                  text-xl
                "
              >
                ×
              </button>
            )}

          </div>

          {/* =================================================
              SEARCH BUTTON
          ================================================= */}

          <div className="flex justify-center gap-3 mt-7">

            <button
              type="submit"
              disabled={loading}
              className="
                px-5
                py-2.5
                bg-gray-100
                hover:bg-gray-200
                border
                border-gray-200
                rounded-md
                text-sm
                text-gray-700
                transition
                disabled:opacity-50
              "
            >
              {loading
                ? "Searching..."
                : "Customer Search"}
            </button>

          </div>

        </form>

        {/* ===================================================
            CUSTOMER RESULT
        =================================================== */}

        {searched && (
          <div className="w-full mt-8 mb-6">

            {customer ? (

              <div
                className="
                  w-full
                  bg-white
                  rounded-xl
                  border
                  border-gray-200
                  shadow-md
                  overflow-hidden
                "
              >

                {/* =========================================
                    RESULT HEADER
                ========================================= */}

                <div className="bg-[#BD272C] px-4 py-2">

                  <h2 className="text-sm font-semibold text-white">
                    Customer Details
                  </h2>

                </div>

                {/* =========================================
                    TABLE
                ========================================= */}

                <div className="w-full overflow-x-auto">

                  <table
                    className="
                      w-full
                      table-auto
                      whitespace-nowrap
                    "
                  >

                    {/* =====================================
                        TABLE HEADER
                    ===================================== */}

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Customer Name
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Customer Type
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Business Name
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          TR Number
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Trade Licence
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Street
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Area
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Emirate
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          City
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Email
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          PO Box
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Transportation Zone
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Customer Group
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Sales District
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">
                          Sales Office
                        </th>

                      </tr>

                    </thead>

                    {/* =====================================
                        TABLE BODY
                    ===================================== */}

                    <tbody>

                      <tr className="border-t hover:bg-gray-50">

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.customer_name || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.customer_type || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.business_name || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.tr_number || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.trade_licence_number || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.street || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.area || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.emirate_region || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.city || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.email_id || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.po_box || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.transportation_zone || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.customer_group || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.sales_district || "-"}
                        </td>

                        <td className="px-3 py-3 text-xs text-gray-700">
                          {customer.sales_office || "-"}
                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            ) : (

              /* ===========================================
                 NO CUSTOMER FOUND
                 =========================================== */

              <div
                className="
                  bg-white
                  border
                  border-gray-200
                  rounded-xl
                  shadow-sm
                  p-8
                  text-center
                "
              >

                <p className="text-sm text-gray-500">
                  No customer found for
                </p>

                <p className="text-sm font-semibold text-[#BD272C] mt-1">
                  {search}
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