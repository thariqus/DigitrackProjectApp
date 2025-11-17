// import React, { useState } from "react";

// function Pagination({ rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages, handlePageChange }) {
//   const [open, setOpen] = useState(false);

//   const options = [10, 20, 30];

//   return (
//     <div className="flex gap-20 items-center mt-4 px-2">
//       <div className="flex items-center gap-2 relative">
//         <span>Show</span>

//         {/* Dropdown button */}
//         <div className="relative">
//           <button type="button"
//             onClick={() => setOpen(!open)}
//             className="border rounded px-3 py-1 flex items-center gap-1"
//           >
//             {rowsPerPage}
//             <svg
//               className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//             </svg>
//           </button>

//           {/* Dropdown menu */}
//           {open && (
//             <div className="absolute left-0 bottom-full mt-1 w-20 border rounded bg-white shadow-md z-[999]">
//               {options.map((opt) => (
//                 <div
//                   key={opt}
//                   onClick={() => {
//                     setRowsPerPage(opt);
//                     setCurrentPage(1);
//                     setOpen(false);
//                   }}
//                   className={`block w-full text-left px-3 py-1 hover:bg-gray-100 ${
//                     rowsPerPage === opt ? "bg-gray-200 font-medium" : ""
//                   }`}
//                 >
//                   {opt}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         <span>entries</span>
//       </div>

//       {/* Pagination buttons */}
//       <div className="flex items-center gap-2 my-4">
//         <button
//           onClick={() => handlePageChange(currentPage - 1)}
//           disabled={currentPage === 1}
//           className="px-3 py-1 border rounded disabled:opacity-50"
//         >
//           Previous
//         </button>

//         {[...Array(totalPages)].map((_, i) => (
//           <button
//             key={i}
//             onClick={() => handlePageChange(i + 1)}
//             className={`px-3 py-1 border rounded ${
//               currentPage === i + 1 ? "bg-[#ffe4e6] text-gray-600" : ""
//             }`}
//           >
//             {i + 1}
//           </button>
//         ))}

//         <button
//           onClick={() => handlePageChange(currentPage + 1)}
//           disabled={currentPage === totalPages}
//           className="px-3 py-1 border rounded disabled:opacity-50"
//         >
//           Next
//         </button>
//       </div>
//     </div>
//   );
// }

// export default Pagination;



import React, { useState } from "react";

interface PaginationProps {
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  totalPages: number;
  handlePageChange: (page: number) => void;
}

function Pagination({
  rowsPerPage,
  setRowsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  handlePageChange
}: PaginationProps) {
  const [open, setOpen] = useState(false);

  const options = [10, 20, 30];

  return (
    <div className="flex gap-20 items-center mt-2 px-2">
      <div className="flex items-center gap-2 relative">
        <span>Show</span>

        {/* Dropdown button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="border rounded px-3 py-1 flex items-center gap-1"
          >
            {rowsPerPage}
            <svg
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {open && (
            <div className="absolute left-0 bottom-full mt-1 w-20 border rounded bg-white shadow-md z-[999]">
              {options.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    setRowsPerPage(opt);
                    setCurrentPage(1);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1 hover:bg-gray-100 ${
                    rowsPerPage === opt ? "bg-gray-200 font-medium" : ""
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        <span>entries</span>
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center gap-2 my-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={`px-3 py-1 border rounded ${
              currentPage === i + 1 ? "bg-[#ffe4e6] text-gray-600" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;



// import * as React from "react"
// import {
//   ChevronLeftIcon,
//   ChevronRightIcon,
//   MoreHorizontalIcon,
// } from "lucide-react"

// import { cn } from "@/lib/utils"
// import { Button, buttonVariants } from "@/components/ui/button"

// function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
//   return (
//     <nav
//       role="navigation"
//       aria-label="pagination"
//       data-slot="pagination"
//       className={cn("mx-auto flex w-full justify-center", className)}
//       {...props}
//     />
//   )
// }

// function PaginationContent({
//   className,
//   ...props
// }: React.ComponentProps<"ul">) {
//   return (
//     <ul
//       data-slot="pagination-content"
//       className={cn("flex flex-row items-center gap-1", className)}
//       {...props}
//     />
//   )
// }

// function PaginationItem({ ...props }: React.ComponentProps<"li">) {
//   return <li data-slot="pagination-item" {...props} />
// }

// type PaginationLinkProps = {
//   isActive?: boolean
// } & Pick<React.ComponentProps<typeof Button>, "size"> &
//   React.ComponentProps<"a">

// function PaginationLink({
//   className,
//   isActive,
//   size = "icon",
//   ...props
// }: PaginationLinkProps) {
//   return (
//     <a
//       aria-current={isActive ? "page" : undefined}
//       data-slot="pagination-link"
//       data-active={isActive}
//       className={cn(
//         buttonVariants({
//           variant: isActive ? "outline" : "ghost",
//           size,
//         }),
//         className
//       )}
//       {...props}
//     />
//   )
// }

// function PaginationPrevious({
//   className,
//   ...props
// }: React.ComponentProps<typeof PaginationLink>) {
//   return (
//     <PaginationLink
//       aria-label="Go to previous page"
//       size="default"
//       className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
//       {...props}
//     >
//       <ChevronLeftIcon />
//       <span className="hidden sm:block">Previous</span>
//     </PaginationLink>
//   )
// }

// function PaginationNext({
//   className,
//   ...props
// }: React.ComponentProps<typeof PaginationLink>) {
//   return (
//     <PaginationLink
//       aria-label="Go to next page"
//       size="default"
//       className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
//       {...props}
//     >
//       <span className="hidden sm:block">Next</span>
//       <ChevronRightIcon />
//     </PaginationLink>
//   )
// }

// function PaginationEllipsis({
//   className,
//   ...props
// }: React.ComponentProps<"span">) {
//   return (
//     <span
//       aria-hidden
//       data-slot="pagination-ellipsis"
//       className={cn("flex size-9 items-center justify-center", className)}
//       {...props}
//     >
//       <MoreHorizontalIcon className="size-4" />
//       <span className="sr-only">More pages</span>
//     </span>
//   )
// }

// export {
//   Pagination,
//   PaginationContent,
//   PaginationLink,
//   PaginationItem,
//   PaginationPrevious,
//   PaginationNext,
//   PaginationEllipsis,
// }
