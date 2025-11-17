import React, { useState } from "react";
import { useNavigate } from "react-router";
import Pagination from "../../components/Pagination";

interface CategoriesList {
  id: string;
  code: string;
  name: string;
}

function CategoryMaster() {
  const [category, setCategory] = useState<CategoriesList[]>([
    { id: "1", code: "00011", name: "Thomas" },
    { id: "2", code: "00211", name: "Thomson" },
    { id: "3", code: "00321", name: "Johnson" },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const navigate = useNavigate()

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = category.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(category.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleCategoryNavigation = () => {
    navigate("/category")
  }

  return (
    <div className="bg-white border rounded-lg px-6 py-6 h-full">
      <h1 className="text-xl font-medium pb-5">Categories List</h1>
      <div className="flex justify-end mb-5">
        <button className="bg-[#972E26] text-white rounded-lg flex justify-end px-3 py-2" onClick={handleCategoryNavigation}>Add new Category</button>
      </div>

      <div className="border rounded-lg w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-500 border-b ">
            <tr>
              <th className="py-3 font-medium px-4">#</th>
              <th className="py-3 font-medium px-4">Code</th>
              <th className="py-3 font-medium px-4">Name</th>
            </tr>
          </thead>

          <tbody>
            {category.map((item) => (
              <tr
                key={item.id}
                className="border-b hover:bg-gray-50  transition"
              >
                <td className="py-3 px-4">{item.id}</td>
                <td className="py-3 px-4">{item.code}</td>
                <td className="py-3 px-4">{item.name}</td>
              </tr>
            ))}
          </tbody>

        </table>
        
        {/* Pagination Controls */}
        <Pagination rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          totalPages={totalPages} handlePageChange={handlePageChange} />

      </div>


    </div>
  );
}

export default CategoryMaster;
