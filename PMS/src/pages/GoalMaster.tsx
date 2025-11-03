import React, { useEffect, useState } from "react";
import Pagination from "../components/Pagination"; 
import { IoMdClose } from "react-icons/io";
import { IoAdd } from "react-icons/io5";
import { CiSearch } from "react-icons/ci";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { useGoalMaster, GoalMaster as GoalMasterType} from "../hooks/goalmaster";

function GoalMaster() {
  const { goals, setGoals, loading, addGoal, editGoal, refetch} = useGoalMaster();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [newGoal, setNewGoal] = useState<GoalMasterType>({
    id: "",
    name: "",
    description: "",
    measurement: "",
    target: "",
  });
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "warning" | "" }>({ text: "", type: "" });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenModal) handleCloseModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpenModal]
  
);
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setNewGoal({ id: "", name: "", description: "", measurement: "", target: "" });
    setIsEdit(false);
  };

  const handleSave = async () => {
    const { name, description, measurement } = newGoal;

    if (!name.trim() || !description.trim() || !measurement.trim()) {
      setMessage({
        text: "Fill in all required fields to add this goal.",
        type: "error",
      });
      return;
    }

    try {
      if (isEdit) {
        await editGoal(newGoal);
        setMessage({ text: "Goal updated successfully!", type: "success" });
      } else {
        await addGoal(newGoal);
        setMessage({ text: "Goal added successfully!", type: "success" });
      }

      refetch();
      handleCloseModal();
    } catch (err) {
      setMessage({ text: "Something went wrong while saving.", type: "error" });
    }
  };


  const handleEdit = (item: GoalMasterType) => {
    setIsEdit(true);
    setNewGoal(item);
    setIsOpenModal(true);
  };

  const filteredGoals = goals.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGoals.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredGoals.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) return <div className="p-4 text-gray-500">Loading goals...</div>;

  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-6 h-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl text-primary font-medium">Goal Master</h1>
        <button
          className="bg-[#972E26] flex items-center gap-1 hover:bg-[#7d241f] transition text-white rounded-lg px-3 py-2"
          onClick={() => setIsOpenModal(true)}
        >
          <IoAdd className="text-lg" />
          <span>Add New Goal</span>
        </button>
      </div>


      {/* Table */}
      <div className="border rounded-lg w-full overflow-x-auto">
        <div className="px-2 py-3 border-b flex items-center relative">
          <CiSearch className="absolute left-5 text-gray-400" />
          <input
            type="text"
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="px-8 py-1 border rounded-full w-80 focus:outline-none placeholder:text-gray-300"
            placeholder="Search Goal name here..."
          />
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm text-gray-700 border-b">
            <tr>
              <th className="py-3 font-medium px-4 w-[10%]">Goal Id</th>
              <th className="py-3 font-medium px-4 w-[25%]">Goal Name</th>
              <th className="py-3 font-medium px-4 w-[40%]">Description</th>
              <th className="py-3 font-medium px-4 w-[20%]">Measurement Criteria</th>
              <th className="py-3 font-medium px-4 w-[5%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((item) => (
              <tr key={item.id} className="border-b text-sm transition">
                <td className="py-3 px-4">{item.id}</td>
                <td className="py-3 px-4">{item.name}</td>
                <td className="py-3 px-4">{item.description}</td>
                <td className="py-3 px-4">{item.measurement}</td>
                <td className="px-7 cursor-pointer" onClick={() => handleEdit(item)}>
                  <MdOutlineModeEditOutline />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Old Pagination */}
        <Pagination
          rowsPerPage={rowsPerPage}
          setRowsPerPage={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      </div>
      {message.text && (
        <div className="fixed top-20 right-10 z-[2000] transition-all duration-300">
          <div
            className={`px-4 py-2 rounded-md text-sm font-medium shadow-lg border max-w-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border-green-300"
                : message.type === "error"
                ? "bg-red-100 text-red-700 border-red-300"
                : message.type === "warning"
                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpenModal && (
        <div
          className="fixed top-20 left-0 inset-0 flex justify-end bg-black/20 backdrop-blur-sm z-20"
          onClick={handleCloseModal}
        >
            <div
              className="bg-white w-full max-w-2xl h-full shadow-2xl px-5 pt-6 pb-8 relative border-l border-gray-200 animate-slideIn flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >

            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition"
              onClick={handleCloseModal}
            >
              <IoMdClose size={20} />
            </button>

            <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-0">
              {isEdit
                ? newGoal.goal_assigned
                  ? "View Goal"
                  : "Edit Goal"
                : "Add New Goal"}
            </h2>

            <div className="space-y-5 overflow-y-auto flex-1 pr-2">

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Goal Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  placeholder="Enter Goal Name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                  required
                  readOnly={newGoal.goal_assigned}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  placeholder="Enter Description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full border border-gray-300 h-35 rounded-lg px-3 py-2 focus:outline-none"
                  required
                  readOnly={newGoal.goal_assigned}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Measurement Criteria <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Measurement Criteria"
                  value={newGoal.measurement}
                  onChange={(e) => setNewGoal({ ...newGoal, measurement: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                  required
                  readOnly={newGoal.goal_assigned}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t mt-2">
              <button
                onClick={handleCloseModal}
                className="px-4 w-1/2 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || newGoal.goal_assigned}
                className={`px-4 py-2 w-1/2 rounded-lg text-white transition
                  ${newGoal.goal_assigned
                    ? "bg-gray-400 cursor-not-allowed opacity-60"
                    : "bg-[#972E26] hover:bg-[#7d241f]"
                  }`}
              >
                {isEdit
                  ? newGoal.goal_assigned
                    ? "View Only"
                    : "Update Goal"
                  : "Add Goal"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalMaster;
