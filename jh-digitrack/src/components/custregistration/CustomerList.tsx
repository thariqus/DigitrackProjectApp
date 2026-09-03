import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  IoAdd,
  IoSearchOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

import { useGetCustomerList } from "../PropertyAutomation/hooks/useCustomerApi";

const PAGE_SIZE = 20;

function CustomerList() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  useEffect(() => {
    setHeaderConfig({
      title: "",
    });
  }, [setHeaderConfig]);

  // ---------------------------------------------------------
  // Search debounce
  // ---------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // ---------------------------------------------------------
  // Customer API
  // ---------------------------------------------------------
  const {
    data,
    isLoading: loading,
  } = useGetCustomerList(
    page,
    PAGE_SIZE,
    debouncedSearch
  );

  const customers = data?.data || [];
  const totalPages = data?.total_pages || 1;

  const isLastPage = page >= totalPages;

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-white rounded-xl p-3 overflow-x-hidden">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex items-center justify-between mb-2">

        <h2
          className="text-sm font-semibold"
          style={{ color: "#A61F24" }}
        >
          Registered Customers
        </h2>

        <button
          onClick={() =>
            navigate(
              "/jh-digitrack/custregistration/register-customer"
            )
          }
          className="bg-[##9A3025] hover:bg-[##7A251F] text-white px-2.5 py-1.5 rounded-md flex items-center gap-1.5 shadow transition text-[11px]"
        >
          <IoAdd className="text-sm" />

          <span>
            Register New Customer
          </span>
        </button>

      </div>


      {/* =====================================================
          CARD
      ===================================================== */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">


        {/* ===================================================
            SEARCH
        =================================================== */}
        <div className="p-2 border-b">

          <div className="relative">

            <IoSearchOutline
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-[#9A3025] focus:outline-none"
            />

          </div>

        </div>


        {/* ===================================================
            TABLE
        =================================================== */}
        <div className="w-full overflow-hidden">

          <table className="w-full table-fixed border-collapse">


            {/* =================================================
                COLUMN WIDTHS
            ================================================= */}
            <colgroup>

              {/* 1 */}
              <col className="w-[8%]" />

              {/* Customer Type */}
              <col className="w-[8%]" />

              {/* 2 */}
              <col className="w-[8%]" />

              {/* 3 */}
              <col className="w-[6%]" />

              {/* 4 */}
              <col className="w-[8%]" />

              {/* 5 */}
              <col className="w-[6%]" />

              {/* 6 */}
              <col className="w-[6%]" />

              {/* 7 */}
              <col className="w-[6%]" />

              {/* 8 */}
              <col className="w-[6%]" />

              {/* 9 */}
              <col className="w-[8%]" />

              {/* 10 */}
              <col className="w-[5%]" />

              {/* 11 */}
              <col className="w-[7%]" />

              {/* 12 */}
              <col className="w-[7%]" />

              {/* 13 */}
              <col className="w-[6%]" />

              {/* 14 */}
              <col className="w-[6%]" />

              {/* 15 - Status */}
              <col className="w-[5%]" />

              {/* 16 - Action */}
              <col className="w-[5%]" />

              {/* 17 - SAP Response */}
              <col className="w-[6%]" />

            </colgroup>


            {/* =================================================
                TABLE HEADER
            ================================================= */}
            <thead className="bg-[#9A3025] text-white">

              <tr>

                {/* Customer Name */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Customer Name
                </th>


                {/* Customer type */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Customer Type
                </th>


                {/* Business Name */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Business Name
                </th>


                {/* TR Number */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  TR Number
                </th>


                {/* Trade Licence */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Trade Licence Number
                </th>


                {/* Street */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Street
                </th>


                {/* Area */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Area
                </th>


                {/* Emirate */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Emirate
                </th>


                {/* City */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  City
                </th>


                {/* Email */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Email
                </th>


                {/* PO Box */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  PO Box
                </th>


                {/* Transportation Zone */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Transportation Zone
                </th>


                {/* Customer Group */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Customer Group
                </th>


                {/* Sales District */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Sales District
                </th>


                {/* Sales Office */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  Sales Office
                </th>


                {/* Status */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Status
                </th>


                {/* Action */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold">
                  Action
                </th>


                {/* SAP Response */}
                <th className="px-1.5 py-1.5 text-left text-[10px] font-semibold break-words">
                  SAP Response
                </th>

              </tr>

            </thead>


            {/* =================================================
                TABLE BODY
            ================================================= */}
            <tbody>

              {/* Loading */}
              {loading ? (

                <tr>

                  <td
                    colSpan={17}
                    className="text-center py-5 text-xs"
                  >
                    Loading...
                  </td>

                </tr>

              ) : customers.length > 0 ? (

                customers.map((customer, index) => (

                  <tr
                    key={index}
                    className="border-b hover:bg-red-50 transition"
                  >

                    {/* =================================================
                        Customer Name
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.customer_name}
                    </td>

                    <td className="px-1.5 py-1.5 text-[10px] break-words">
  {customer.customer_type}
</td>


                    {/* =================================================
                        Business Name
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.business_name}
                    </td>


                    {/* =================================================
                        TR Number
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.tr_number}
                    </td>


                    {/* =================================================
                        Trade Licence
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.trade_licence_number}
                    </td>


                    {/* =================================================
                        Street
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.street}
                    </td>


                    {/* =================================================
                        Area
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.area}
                    </td>


                    {/* =================================================
                        Emirate
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.emirate_region}
                    </td>


                    {/* =================================================
                        City
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.city}
                    </td>


                    {/* =================================================
                        Email
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.email_id}
                    </td>


                    {/* =================================================
                        PO Box
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.po_box}
                    </td>


                    {/* =================================================
                        Transportation Zone
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.transportation_zone}
                    </td>


                    {/* =================================================
                        Customer Group
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.customer_group}
                    </td>


                    {/* =================================================
                        Sales District
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.sales_district}
                    </td>


                    {/* =================================================
                        Sales Office
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px] break-words">
                      {customer.sales_office}
                    </td>


                    {/* =================================================
                        Status
                    ================================================= */}
                    <td className="px-1.5 py-1.5 text-[10px]">
                      {customer.status === "Active"
                        ? "Active"
                        : customer.status}
                    </td>


                    {/* =================================================
                        ACTION - EDIT
                    ================================================= */}
                    <td className="px-1.5 py-1.5">

                      <button
                        onClick={() =>
                          navigate(
                            "/jh-digitrack/custregistration/register-customer",
                            {
                              state: {
                                editMode: true,
                                customer,
                              },
                            }
                          )
                        }
                        className="bg-[#972E26] hover:bg-blue-700 text-white px-1.5 py-1 rounded text-[9px]"
                      >
                        Edit
                      </button>

                    </td>


                    {/* =================================================
                        SAP RESPONSE
                    ================================================= */}
                    <td className="px-1.5 py-1.5">

                      <button
                        onClick={() =>
                          navigate(
                            "/jh-digitrack/custregistration/SapResponse",
                            {
                              state: {
                                customer,
                              },
                            }
                          )
                        }
                        className="bg-[#9A3025] hover:bg-[#7A251F] text-white px-1.5 py-1 rounded text-[9px]"
                      >
                        SAP
                      </button>

                    </td>

                  </tr>

                ))

              ) : (

                /* =====================================================
                   NO CUSTOMERS
                ===================================================== */
                <tr>

                  <td
                    colSpan={18}
                    className="text-center py-5 text-xs text-gray-500"
                  >
                    No customers found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* =====================================================
            PAGINATION
        ===================================================== */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">


          {/* Customer Count */}
          <span className="text-[11px] text-gray-500">
            Showing {customers.length} customers
          </span>


          {/* Pagination Buttons */}
          <div className="flex items-center gap-1.5">


            {/* Previous */}
            <button
              onClick={() =>
                setPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={page === 1}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#9A3025] text-[#9A3025] hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-[10px]"
            >

              <IoChevronBackOutline />

              Previous

            </button>


            {/* Current Page */}
            <span className="px-2 py-1 text-[10px] font-medium">
              Page {page}
            </span>


            {/* Next */}
            <button
              onClick={() =>
                setPage((prev) => prev + 1)
              }
              disabled={isLastPage}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#9A3025] text-[#9A3025] hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-[10px]"
            >

              Next

              <IoChevronForwardOutline />

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default CustomerList;