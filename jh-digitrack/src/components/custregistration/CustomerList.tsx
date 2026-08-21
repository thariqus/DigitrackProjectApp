import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  IoAdd,
  IoSearchOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

import axios from "axios";

import { useGetCustomerList } from "../PropertyAutomation/hooks/useCustomerApi";

const PAGE_SIZE = 20;

function CustomerList() {
  const outletContext = useOutletContext() ?? {};
  const setHeaderConfig = outletContext.setHeaderConfig ?? (() => {});
  const navigate = useNavigate();

  // Function to handle SAP response

//   const handleSAPResponse = async (customer: any) => {
//   try {
//     console.log("Sending customer to SAP:", customer);

//     const response = await axios.post(
//       "/api/method/jh_digitrack.jh_digitrack.api.mastermanagement_api.create_update_customer_master",
//       customer,
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("SAP API Response:", response.data);

//     navigate("/jh-digitrack/sample/sap-response", {
//       state: {
//         customer: customer,
//         sapResponse: response.data,
//       },
//     });
//   } catch (error: unknown) {
//     console.error("SAP API Error:", error);

//     if (axios.isAxiosError(error)) {
//       console.error("SAP Error Response:", error.response?.data);

//       alert(
//         error.response?.data?.message ||
//           "SAP API request failed"
//       );
//     } else {
//       alert("Unable to connect to SAP API");
//     }
//   }
// };
// function end 
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setHeaderConfig({
      title: "Registered Customers",
    });
  }, [setHeaderConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading: loading } = useGetCustomerList(
    page,
    PAGE_SIZE,
    debouncedSearch
  );

  const customers = data?.data || [];
  const totalPages = data?.total_pages || 1;

  const isLastPage = page >= totalPages;

  return (
    <div className="min-h-screen bg-white rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-md font-semibold"
          style={{ color: "#A61F24" }}
        >
          Registered Customers
        </h2>

        <button
          onClick={() => navigate("/jh-digitrack/sample/register-customer")}
          className="bg-[#BD272C] hover:bg-[#A61F24] text-white px-3 py-2 rounded-md flex items-center gap-2 shadow transition"
        >
          <IoAdd />
          <span className="text-xs">
            Register New Customer
          </span>
        </button>

        
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#BD272C] focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#BD272C] text-white">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">Customer Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Business Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">TR Number</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Trade Licence Number</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Street</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Area</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Emirate</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">City</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">PO Box</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Transportation Zone</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Customer Group</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Sales District</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Sales Office</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={16} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((customer, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-red-50 transition"
                  >
                    <td className="px-3 py-2 text-sm">{customer.customer_name}</td>
                    <td className="px-3 py-2 text-sm">{customer.business_name}</td>
                    <td className="px-3 py-2 text-sm">{customer.tr_number}</td>
                    <td className="px-3 py-2 text-sm">{customer.custom_trade_license_no}</td>
                    <td className="px-3 py-2 text-sm">{customer.custom_street}</td>
                    <td className="px-3 py-2 text-sm">{customer.custom_area}</td>
                    <td className="px-3 py-2 text-sm">{customer.custom_region}</td>
                    <td className="px-3 py-2 text-sm">{customer.custom_city}</td>
                    <td className="px-3 py-2 text-sm">{customer.email_id}</td>
                    <td className="px-3 py-2 text-sm">{customer.po_box}</td>
                    <td className="px-3 py-2 text-sm">{customer.transportation_zone}</td>
                    <td className="px-3 py-2 text-sm">{customer.customer_group}</td>
                    <td className="px-3 py-2 text-sm">{customer.sales_district}</td>
                    <td className="px-3 py-2 text-sm">{customer.sales_office}</td>
                    <td className="px-3 py-2 text-sm">{customer.status === "Active" ? "Active" : customer.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate("/jh-digitrack/sample/register-customer", {
                              state: {
                                editMode: true,
                                customer,
                              },
                            })
                          }
                          className="bg-[#972E26] hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs"
                        >
                          Edit
                        </button>
{/* 
                        <button
                        onClick={() => handleSAPResponse(customer)}
                        className="bg-[#BD272C] hover:bg-[#A61F24] text-white px-3 py-1 rounded-md text-xs"
                      >
                        SAP Response
                      </button> */}


                        <button
                          onClick={() =>
                            navigate("/jh-digitrack/sample/sap-response", {
                              state: {
                                customer,
                              },
                            })
                          }
                          className="bg-[#BD272C] hover:bg-[#A61F24] text-white px-3 py-1 rounded-md text-xs"
                        >
                          SAP Response
                        </button>


                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="text-center py-6 text-gray-500">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">
            Showing {customers.length} customers
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-md border border-[#BD272C] text-[#BD272C] hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <IoChevronBackOutline />
              Previous
            </button>

            <span className="px-3 py-2 text-sm font-medium">
              Page {page}
            </span>

            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isLastPage}
              className="flex items-center gap-1 px-3 py-2 rounded-md border border-[#BD272C] text-[#BD272C] hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
