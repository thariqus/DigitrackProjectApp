"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
  totalPages: number;
  initialPage?: number;
  siblingsCount?: number;
  onPageChange?: (page: number) => void;
}

export default function PaginationWithState({
  totalPages = 10,
  initialPage = 1,
  siblingsCount = 1,
  onPageChange,
}: PaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    onPageChange?.(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];

    // Always show first page
    pageNumbers.push(1);

    // Calculate range of pages to show around current page
    const leftSibling = Math.max(2, currentPage - siblingsCount);
    const rightSibling = Math.min(totalPages - 1, currentPage + siblingsCount);

    // Add left ellipsis if needed
    if (leftSibling > 2) {
      pageNumbers.push("leftEllipsis");
    }

    // Add pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      pageNumbers.push(i);
    }

    // Add right ellipsis if needed
    if (rightSibling < totalPages - 1) {
      pageNumbers.push("rightEllipsis");
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePrevious();
            }}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>

        {pageNumbers.map((page, index) => {
          if (page === "leftEllipsis" || page === "rightEllipsis") {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={`page-${page}`}>
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page as number);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleNext();
            }}
            className={
              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
            }
            aria-disabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
