import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  IoAdd,
  IoSearchOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoClose,
} from "react-icons/io5";

import { useGetCustomerList } from "../PropertyAutomation/hooks/useCustomerApi";

const PAGE_SIZE = 20;

type FilterStatus = "all" | "success" | "failed";

const ROUTES = {
  registerWithoutSite: "/jh-digitrack/customer-registration/register-customer",
  registerWithSite: "/jh-digitrack/customer-registration/customer-with-site-code",
};

function renderStatusBadge(status: unknown) {
  const value = String(status ?? "").trim().toUpperCase();

  const statusConfig = {
    S: { label: "Success", color: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    E: { label: "Error", color: "bg-rose-50 text-[#9A3025] ring-1 ring-rose-200" },
    W: { label: "Warning", color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    A: { label: "Abort", color: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" },
    I: { label: "Info", color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  };

  const config =
    statusConfig[value] || {
      label: value || "—",
      color: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
    };

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium ${config.color}`}
      title={config.label}
    >
      {value || "—"}
    </span>
  );
}

function CustomerList() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("success");

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------

  useEffect(() => {
    setHeaderConfig({ title: "" });
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

  const { data, isLoading: loading } = useGetCustomerList(
    page,
    PAGE_SIZE,
    debouncedSearch
  );

  let customers = data?.data || [];

  // ---------------------------------------------------------
  // FILTER BY SAP STATUS
  // ---------------------------------------------------------

  if (filterStatus !== "all") {
    customers = customers.filter((customer) => {
      const status = String(customer.status ?? "").trim().toUpperCase();
      if (filterStatus === "success") {
        return status === "S";
      }
      if (filterStatus === "failed") {
        return ["E", "W", "A", "I"].includes(status);
      }
      return true;
    });
  }

  // ---------------------------------------------------------
  // SORT BY SAP STATUS (S first, then E, W, A, I)
  // ---------------------------------------------------------

  const statusOrder = { S: 0, E: 1, W: 2, A: 3, I: 4 };
  customers = [...customers].sort((a, b) => {
    const statusA = String(a.status ?? "").trim().toUpperCase();
    const statusB = String(b.status ?? "").trim().toUpperCase();

    const orderA = statusOrder[statusA] ?? 99;
    const orderB = statusOrder[statusB] ?? 99;

    return orderA - orderB;
  });

  const totalPages = data?.total_pages || 1;
  const isLastPage = page >= totalPages;

  // Shared cell classes
  const thBase =
    "px-2 py-2.5 text-left align-bottom text-[10px] font-semibold leading-tight";

  const tdBase = "truncate px-2 py-2 text-[10px] text-gray-600";

  // Total columns in the table (used for loading and empty rows)
  const COLUMN_COUNT = 18;

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen overflow-x-hidden rounded-xl bg-white p-3">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[#9A3025]">
          Registered Customers
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* STATUS FILTER */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="status-filter"
              className="text-[10px] font-medium text-gray-500"
            >
              Filter:
            </label>

            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setPage(1);
              }}
              className="
                rounded-md
                border
                border-rose-200
                bg-white
                py-1.5
                pl-2
                pr-7
                text-[10px]
                font-semibold
                text-gray-700
                shadow-sm
                outline-none
                transition
                hover:border-rose-300
                focus:border-rose-400
                focus:ring-2
                focus:ring-rose-100
              "
            >
              <option value="all">All</option>
              <option value="success">✓ Success</option>
              <option value="failed">✕ Failed</option>
            </select>
          </div>

          {/* REGISTER BUTTONS */}
          <div className="flex items-center gap-2 sm:ml-auto">
            {/* REGISTER WITHOUT SITE CODE */}
            <button
              type="button"
              onClick={() => navigate(ROUTES.registerWithoutSite)}
              className="
                flex
                items-center
                gap-1.5
                rounded-md
                border
                border-rose-200
                bg-white
                px-2.5
                py-1.5
                text-[11px]
                font-semibold
                text-[#9A3025]
                shadow-sm
                transition
                hover:bg-rose-50
                hover:border-rose-300
              "
            >
              <IoAdd className="text-sm" />
              <span>Register without Site Code</span>
            </button>

            {/* REGISTER WITH SITE CODE */}
            <button
              type="button"
              onClick={() => navigate(ROUTES.registerWithSite)}
              className="
                flex
                items-center
                gap-1.5
                rounded-md
                border
                border-rose-200
                bg-rose-50
                px-2.5
                py-1.5
                text-[11px]
                font-semibold
                text-[#9A3025]
                shadow-sm
                transition
                hover:bg-rose-100
                hover:border-rose-300
              "
            >
              <IoAdd className="text-sm" />
              <span>Register with Site Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          CARD
      ===================================================== */}

      <div
        className="
          overflow-hidden
          rounded-lg
          border
          border-rose-200
          bg-white
          shadow-sm
        "
      >
        {/* ===================================================
            SEARCH
        =================================================== */}

        <div className="border-b border-rose-100 p-2">
          <div className="relative">
            <IoSearchOutline
              className="
                absolute
                left-2.5
                top-1/2
                -translate-y-1/2
                text-sm
                text-gray-400
              "
            />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="
                w-full
                rounded-md
                border
                border-rose-200
                py-1.5
                pl-8
                pr-3
                text-xs
                text-gray-700
                outline-none
                transition
                hover:border-rose-300
                focus:border-rose-400
                focus:ring-2
                focus:ring-rose-100
              "
            />
          </div>
        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="w-full">
          <table className="w-full table-fixed border-collapse">
            {/* =================================================
                COLUMN WIDTHS — must total 100%
            ================================================= */}

            <colgroup>
              <col className="w-[7%]" />   {/* Customer Name 1 */}
              <col className="w-[6%]" />   {/* Customer Code */}
              <col className="w-[5%]" />   {/* Type */}
              <col className="w-[6%]" />   {/* Customer Name 2 */}
              <col className="w-[5%]" />   {/* TR No. */}
              <col className="w-[6%]" />   {/* Licence */}
              <col className="w-[6%]" />   {/* Street */}
              <col className="w-[6%]" />   {/* Area */}
              <col className="w-[5%]" />   {/* Emirate */}
              <col className="w-[5%]" />   {/* City */}
              <col className="w-[8%]" />   {/* Email */}
              <col className="w-[4%]" />   {/* PO Box */}
              <col className="w-[6%]" />   {/* Zone */}
              <col className="w-[6%]" />   {/* Group */}
              <col className="w-[5%]" />   {/* District */}
              <col className="w-[5%]" />   {/* Office */}
              <col className="w-[6%]" />   {/* Status */}
              <col className="w-[3%]" />   {/* Edit */}
            </colgroup>

            {/* =================================================
                TABLE HEADER
            ================================================= */}

            <thead className="bg-rose-50 text-[#9A3025]">
              <tr>
                <th className={thBase}>Customer Name 1</th>

                <th className={thBase}>Customer Code</th>

                <th className={thBase}>Type</th>

                <th className={thBase}>Customer Name 2</th>

                <th className={`${thBase} text-right`}>TR No.</th>

                <th className={`${thBase} text-right`}>Licence</th>

                <th className={thBase}>Street</th>

                <th className={thBase}>Area</th>

                <th className={thBase}>Emirate</th>

                <th className={thBase}>City</th>

                <th className={thBase}>Email</th>

                <th className={`${thBase} text-right`}>PO Box</th>

                <th className={thBase}>Zone</th>

                <th className={thBase}>Group</th>

                <th className={thBase}>District</th>

                <th className={thBase}>Office</th>

                <th className="px-1 py-2.5 text-center align-bottom text-[10px] font-semibold leading-tight">
                  Status
                </th>

                <th className={`${thBase} text-center`}>Edit</th>
              </tr>
            </thead>

            {/* =================================================
                TABLE BODY
            ================================================= */}

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="py-6 text-center text-xs text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((customer, index) => (
                  <tr
                    key={index}
                    className="
                      border-b
                      border-rose-100
                      align-middle
                      transition
                      odd:bg-white
                      even:bg-rose-50/30
                      hover:bg-rose-50
                    "
                  >
                    <td
                      className={`${tdBase} font-medium text-gray-900`}
                      title={customer.customer_name}
                    >
                      {customer.customer_name}
                    </td>

                    <td
                      className={`${tdBase} font-semibold text-gray-800 tabular-nums`}
                      title={customer.custom_customer_code}
                    >
                      {customer.custom_customer_code || "—"}
                    </td>

                    <td className={tdBase} title={customer.customer_type}>
                      {customer.customer_type}
                    </td>

                    <td className={tdBase} title={customer.business_name}>
                      {customer.business_name}
                    </td>

                    <td
                      className={`${tdBase} text-right tabular-nums`}
                      title={customer.tr_number}
                    >
                      {customer.tr_number}
                    </td>

                    <td
                      className={`${tdBase} text-right tabular-nums`}
                      title={customer.trade_licence_number}
                    >
                      {customer.trade_licence_number}
                    </td>

                    <td className={tdBase} title={customer.street}>
                      {customer.street}
                    </td>

                    <td className={tdBase} title={customer.area}>
                      {customer.area}
                    </td>

                    <td className={tdBase} title={customer.emirate_region}>
                      {customer.emirate_region}
                    </td>

                    <td className={tdBase} title={customer.city}>
                      {customer.city}
                    </td>

                    <td className={tdBase} title={customer.email_id}>
                      {customer.email_id}
                    </td>

                    <td
                      className={`${tdBase} text-right tabular-nums`}
                      title={customer.po_box}
                    >
                      {customer.po_box}
                    </td>

                    <td className={tdBase} title={customer.transportation_zone}>
                      {customer.transportation_zone}
                    </td>

                    <td className={tdBase} title={customer.customer_group}>
                      {customer.customer_group}
                    </td>

                    <td className={tdBase} title={customer.sales_district}>
                      {customer.sales_district}
                    </td>

                    <td className={tdBase} title={customer.sales_office}>
                      {customer.sales_office}
                    </td>

                    {/* STATUS */}

                    <td className="px-1 py-2">
                      <div className="flex justify-center">
                        {renderStatusBadge(customer.status)}
                      </div>
                    </td>

                    {/* EDIT */}

                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/jh-digitrack/customer-registration/register-customer",
                            {
                              state: {
                                editMode: true,
                                customer,
                              },
                            }
                          )
                        }
                        className="
                          rounded
                          bg-rose-50
                          border
                          border-rose-200
                          px-1.5
                          py-1
                          text-[9px]
                          font-semibold
                          text-[#9A3025]
                          transition
                          hover:bg-rose-100
                          hover:border-rose-300
                        "
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="py-6 text-center text-xs text-gray-500"
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

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-rose-100
            px-3
            py-2
          "
        >
          <span className="text-[11px] text-gray-500">
            Showing {customers.length} customers
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="
                flex
                items-center
                gap-1
                rounded-md
                border
                border-rose-200
                px-2
                py-1
                text-[10px]
                text-[#9A3025]
                transition
                hover:bg-rose-50
                hover:border-rose-300
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <IoChevronBackOutline />
              Previous
            </button>

            <span className="px-2 py-1 text-[10px] font-medium">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isLastPage}
              className="
                flex
                items-center
                gap-1
                rounded-md
                border
                border-rose-200
                px-2
                py-1
                text-[10px]
                text-[#9A3025]
                transition
                hover:bg-rose-50
                hover:border-rose-300
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
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