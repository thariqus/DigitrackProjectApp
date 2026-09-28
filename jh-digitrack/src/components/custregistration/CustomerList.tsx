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

function CustomerList() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // SAP response viewer
  const [sapResponse, setSapResponse] = useState<unknown | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [sapResponseLoading, setSapResponseLoading] = useState(false);
  const [sapResponseError, setSapResponseError] = useState("");

  const handleSapResponse = (customer) => {
    if (!customer?.customer_details) {
      setSelectedCustomer(customer?.customer_name || customer?.name || "");
      setSapResponse(null);
      setSapResponseError("No SAP response has been saved for this customer.");
      return;
    }

    setSelectedCustomer(customer.customer_name || customer.name || "");
    setSapResponseError("");

    let responseValue = customer.customer_details;

    if (typeof responseValue === "string") {
      const cleanedValue = responseValue
        .replace(/<pre[^>]*>/i, "")
        .replace(/<\/pre>/i, "")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();

      try {
        responseValue = JSON.parse(cleanedValue);
      } catch {
        responseValue = cleanedValue;
      }
    }

    setSapResponse(responseValue);
  };

  const closeSapResponse = () => {
    setSapResponse(null);
    setSelectedCustomer("");
    setSapResponseError("");
    setSapResponseLoading(false);
  };

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

  const customers = data?.data || [];
  const totalPages = data?.total_pages || 1;
  const isLastPage = page >= totalPages;

  // Shared cell classes
  const thBase =
    "px-2 py-2.5 text-left align-bottom text-[10px] font-semibold leading-tight";
  const tdBase = "truncate px-2 py-2 text-[10px] text-gray-600";

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen overflow-x-hidden rounded-xl bg-white p-3">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "#A61F24" }}>
          Registered Customers
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate("/jh-digitrack/customer-registration/register-customer")
          }
          className="flex items-center gap-1.5 rounded-md bg-[#9A3025] px-2.5 py-1.5 text-[11px] text-white shadow transition hover:bg-[#7A251F]"
        >
          <IoAdd className="text-sm" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* =====================================================
          CARD
      ===================================================== */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        {/* ===================================================
            SEARCH
        =================================================== */}
        <div className="border-b border-gray-200 p-2">
          <div className="relative">
            <IoSearchOutline className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#9A3025]"
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
              <col className="w-[7%]" />    {/* Customer Name     */}
              <col className="w-[5%]" />    {/* Customer Type     */}
              <col className="w-[7%]" />    {/* Business Name     */}
              <col className="w-[5%]" />    {/* TR Number         */}
              <col className="w-[6%]" />    {/* Trade Licence     */}
              <col className="w-[6%]" />    {/* Street            */}
              <col className="w-[6%]" />    {/* Area              */}
              <col className="w-[5%]" />    {/* Emirate           */}
              <col className="w-[5%]" />    {/* City              */}
              <col className="w-[9%]" />    {/* Email             */}
              <col className="w-[4%]" />    {/* PO Box            */}
              <col className="w-[6%]" />    {/* Transport Zone    */}
              <col className="w-[6%]" />    {/* Customer Group    */}
              <col className="w-[5%]" />    {/* Sales District    */}
              <col className="w-[5%]" />    {/* Sales Office      */}
              <col className="w-[6%]" />    {/* Status            */}
              <col className="w-[3.5%]" />  {/* Action            */}
              <col className="w-[3.5%]" />  {/* SAP               */}
            </colgroup>

            {/* =================================================
                TABLE HEADER
            ================================================= */}
            <thead className="bg-[#9A3025] text-white">
              <tr>
                <th className={thBase}>Customer</th>
                <th className={thBase}>Type</th>
                <th className={thBase}>Business</th>
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
                <th className={`${thBase} text-center`}>Status</th>
                <th className={`${thBase} text-center`}>Edit</th>
                <th className={`${thBase} text-center`}>SAP</th>
              </tr>
            </thead>

            {/* =================================================
                TABLE BODY
            ================================================= */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-6 text-center text-xs text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((customer, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 align-middle transition odd:bg-white even:bg-gray-50/60 hover:bg-red-50/70"
                  >
                    <td
                      className={`${tdBase} font-medium text-gray-900`}
                      title={customer.customer_name}
                    >
                      {customer.customer_name}
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

                    {/* Status */}
                    <td className="px-1 py-2 text-center">
                      <span
                        className={`inline-block max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          customer.status === "Active"
                            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                            : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                        }`}
                        title={customer.status}
                      >
                        {customer.status}
                      </span>
                    </td>

                    {/* Edit */}
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/jh-digitrack/customer-registration/register-customer",
                            { state: { editMode: true, customer } }
                          )
                        }
                        className="rounded bg-[#972E26] px-1.5 py-1 text-[9px] text-white transition hover:bg-[#7A251F]"
                      >
                        Edit
                      </button>
                    </td>

                    {/* SAP */}
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleSapResponse(customer)}
                        className="rounded bg-[#9A3025] px-1.5 py-1 text-[9px] text-white transition hover:bg-[#7A251F]"
                      >
                        SAP
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="py-6 text-center text-xs text-gray-500">
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
        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2">
          <span className="text-[11px] text-gray-500">
            Showing {customers.length} customers
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-md border border-[#9A3025] px-2 py-1 text-[10px] text-[#9A3025] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="flex items-center gap-1 rounded-md border border-[#9A3025] px-2 py-1 text-[10px] text-[#9A3025] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <IoChevronForwardOutline />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          SAP RESPONSE MODAL
      ===================================================== */}
      {(sapResponseLoading || sapResponseError || sapResponse !== null) && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeSapResponse}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-[#9A3025] px-4 py-3 text-white">
              <div>
                <h3 className="text-sm font-semibold">SAP Response</h3>
                {selectedCustomer && (
                  <p className="mt-0.5 text-[10px] text-white/80">
                    Customer: {selectedCustomer}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeSapResponse}
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/15"
                aria-label="Close SAP response"
              >
                <IoClose size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4">
              {sapResponseLoading ? (
                <div className="py-10 text-center text-xs text-gray-500">
                  Loading SAP response...
                </div>
              ) : sapResponseError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                  {sapResponseError}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-gray-700">
                  {typeof sapResponse === "string"
                    ? sapResponse
                    : JSON.stringify(sapResponse, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerList;