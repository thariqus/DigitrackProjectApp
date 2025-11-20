import React, { useState, useEffect } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { createPortal } from "react-dom";
import { MdOutlineContentCopy, MdOutlineDeleteOutline } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { IoSaveOutline } from "react-icons/io5";

interface Goal {
    id: string;
    name: string;
    desc: string;
    measurement: string;
    targetvalue: string;
    inactive: number;
}

interface EmployeeGoal {
    employee: string;
    goals: Goal[];
}

function GoalList() {
    const goalOptions = [
        { name: "Redesign Website", desc: "Improve website UI/UX" },
        { name: "Increase Traffic", desc: "Grow organic traffic by 20%" },
        { name: "Boost Sales", desc: "Increase conversion rate" },
        { name: "Enhance Branding", desc: "Strengthen online presence" },
    ];

    const employeeGoals: EmployeeGoal[] = [
        {
            employee: "Adhil",
            goals: [
                { id: "1", name: "Enhance UI Design", desc: "Change the overall ui design of the page", measurement: "test", targetvalue: "20%", inactive: 0 },
                { id: "2", name: "Boost Sales", desc: "Increase conversion rate", measurement: "test", targetvalue: "10%", inactive: 0 },
            ],
        },
        {
            employee: "Sruthi",
            goals: [
                { id: "1", name: "Enhance Branding", desc: "Strengthen online presence", measurement: "Engagement", targetvalue: "80%", inactive: 0 },
            ],
        },
    ];

    const [goals, setGoals] = useState<Goal[]>([]);
    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
    const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);

    // Load saved goals from local storage
    useEffect(() => {
        const saved = localStorage.getItem("SavedGoals");
        if (saved) {
            const savedGoals = JSON.parse(saved);
            if (savedGoals.length > 0) setGoals(savedGoals);
            else setGoals([{ id: "1", name: "", desc: "", measurement: "", targetvalue: "", inactive: 0 }]);
        } else {
            setGoals([{ id: "1", name: "", desc: "", measurement: "", targetvalue: "", inactive: 0 }]);
        }
    }, []);

    const handleGoalClick = (goalId: string, index: number, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        setDropdownOpen(dropdownOpen === goalId ? null : goalId);
        setDropdownIndex(index);
    };

    const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
    };

    const handleAddGoal = () => {
        const newGoal: Goal = { id: (goals.length + 1).toString(), name: "", desc: "", measurement: "", targetvalue: "", inactive: 0 };
        setGoals([...goals, newGoal]);
    };

    const handleDeleteAll = () => {
        setGoals([{ id: "1", name: "", desc: "", measurement: "", targetvalue: "", inactive: 0 }]);
        localStorage.removeItem("SavedGoals");
    };

    const handleSave = () => {
        // for (let g of goals) {
        //     if (!g.name || !g.desc || !g.measurement || !g.targetvalue) {
        //         alert(" All fields must be filled to save.");
        //         return;
        //     }
        // }
        localStorage.setItem("SavedGoals", JSON.stringify(goals));
        alert("Goals saved successfully!");
    };

    const handleSubmit = () => {
        if (goals.length < 3) {
            alert(" Add at least 3 goal before submitting.");
            return;
        }

        // for (let g of goals) {
        //     if (!g.name || !g.desc || !g.measurement || !g.targetvalue) {
        //         alert(" All fields must be filled to submit.");
        //         return;
        //     }
        // }

        localStorage.removeItem("SavedGoals");
        alert(" Goals submitted successfully!");
        setGoals([{ id: "1", name: "", desc: "", measurement: "", targetvalue: "", inactive: 0 }]);
        setDropdownOpen(null);
    };

    const handleSelectGoal = (index: number, name: string, desc: string) => {
        const updated = [...goals];
        updated[index].name = name;
        updated[index].desc = desc;
        setGoals(updated);
        setDropdownOpen(null);
        setSearch("");
    };

    const handleCopyAllGoals = () => {
        if (!selectedEmployee) return;
        const selected = employeeGoals.find((e) => e.employee === selectedEmployee);
        if (selected) {
            const copiedGoals = selected.goals.map((g, i) => ({ ...g, id: (goals.length + i + 1).toString() }));
            setGoals([...goals, ...copiedGoals]);
            setShowModal(false);
            setSelectedEmployee(null);
        }
    };

    return (
        <div className="bg-white min-h-screen border rounded-lg px-6 py-6 h-full">
            <h1 className=" text-primary font-medium pb-5 mb-8">Goal Master</h1>

            {/* Copy Button */}
            <div className="flex justify-end mb-5">
                <button
                    className="bg-secondary flex items-center gap-2 text-sm text-primary rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
                    onClick={() => setShowModal(true)}
                >
                    <MdOutlineContentCopy />
                    Copy Goals
                </button>
            </div>

            {/* Table */}
            <div className="border rounded-lg w-full overflow-x-auto overflow-visible">
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-100 text-xs  text-left text-gray-700 ">
                        <tr>
                            <th className="py-3 px-2 font-medium text-center">#</th>
                            <th className="py-3 px-4 font-medium text-center">Goal Name</th>
                            <th className="py-3 px-4 font-medium text-center">Goal Description</th>
                            <th className="py-3 px-2 font-medium text-center">Measurement Criteria</th>
                            <th className="py-3 px-2 font-medium text-center">Target Value</th>
                            <th className="py-3 px-2 font-medium text-center">Inactive</th>
                            <th className="py-3 px-2 font-medium text-center">Add New Goal</th>

                        </tr>
                    </thead>

                    <tbody>
                        {goals.map((goal, index) => (
                            <tr key={goal.id} className="border-b text-xs  hover:bg-gray-50">
                                <td className="py-3 px-2">{index + 1}</td>

                                <td className="relative py-3 px-2">
                                    <div
                                        className="border text-xs  flex items-center gap-2 rounded px-2 py-1 cursor-pointer bg-gray-50"
                                        onClick={(e) => handleGoalClick(goal.id, index, e)}
                                    >
                                        {goal.name || "Select Goal Name"}
                                        <RiArrowDropDownLine className="text-2xl" />
                                    </div>
                                </td>

                                <td className="py-3 px-4">
                                    <textarea
                                        value={goal.desc}
                                        onChange={(e) => {
                                            const updated = [...goals];
                                            updated[index].desc = e.target.value;
                                            setGoals(updated);
                                            autoResizeTextarea(e);
                                        }}
                                        className="border p-1 w-full rounded resize-none overflow-hidden"
                                        rows={1}
                                    />
                                </td>

                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={goal.measurement}
                                        onChange={(e) => {
                                            const updated = [...goals];
                                            updated[index].measurement = e.target.value;
                                            setGoals(updated);
                                        }}
                                        className="border p-1 w-full rounded"
                                    />
                                </td>



                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={goal.targetvalue}
                                        onChange={(e) => {
                                            const updated = [...goals];
                                            updated[index].targetvalue = e.target.value;
                                            setGoals(updated);
                                        }}
                                        className="border p-1 w-24 rounded"
                                    />
                                </td>

                                <td className="py-3 px-4">
                                    <input
                                        type="number"
                                        value={goal.inactive}
                                        onChange={(e) => {
                                            const updated = [...goals];
                                            updated[index].inactive = parseInt(e.target.value) || 0;
                                            setGoals(updated);
                                        }}
                                        className="border p-1 w-20 rounded"
                                    />
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <button onClick={handleAddGoal} className="bg-[#972E26] text-white px-3 py-1 rounded-lg">
                                        +
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Dropdown */}
            {dropdownOpen && dropdownPos !== null && dropdownIndex !== null &&
                createPortal(
                    <div
                        style={{
                            position: "absolute",
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: 208,
                            zIndex: 50,
                        }}
                        className="bg-white shadow-md border rounded-md p-2"
                    >
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search goal..."
                            className="border p-1 w-full rounded mb-2 text-sm"
                        />
                        <ul className="max-h-32 overflow-y-auto text-sm">
                            {goalOptions
                                .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
                                .map((g) => (
                                    <li
                                        key={g.name}
                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => handleSelectGoal(dropdownIndex, g.name, g.desc)}
                                    >
                                        {g.name}
                                    </li>
                                ))}
                        </ul>
                    </div>,
                    document.body
                )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-10">
                <button onClick={handleDeleteAll} className="px-4 py-1 text-xs  flex items-center gap-1 rounded-sm bg-gray-200 text-gray-500"><MdOutlineDeleteOutline className="text-xl"/><span>Delete</span></button>
                <button onClick={handleSave} className="px-4 py-2 flex text-xs  items-center gap-1 rounded-sm bg-secondary text-primary/80"><span><IoSaveOutline /></span>Save</button>
                <button onClick={handleSubmit} className="px-4 py-2 text-xs  rounded-sm bg-primary text-white">Submit</button>
            </div>

            {/* --- Copy button  Modal --- */}
            {showModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    {/* Background Overlay */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl shadow-lg w-[700px] max-w-full max-h-[80vh] flex flex-col z-50 overflow-hidden">
                        <div className="flex justify-between items-center border-b px-5 py-4">
                            <h2 className="font-semibold text-[#972E26] ">Copy Employee Goals</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-black"
                            >
                                <IoMdClose className="text-xl" />
                            </button>
                        </div>

                        <div className="flex flex-1 divide-x overflow-hidden">
                            {/* Left: Employee List */}
                            <div className="w-1/2 p-4 overflow-y-auto">
                                <h3 className="text-xsfont-medium text-gray-700 mb-2">Select Employee</h3>
                                <ul className="space-y-2">
                                    {employeeGoals.map((emp) => (
                                        <li
                                            key={emp.employee}
                                            onClick={() => setSelectedEmployee(emp.employee)}
                                            className={`px-3 py-2 text-xs  rounded-lg cursor-pointer transition-all border ${selectedEmployee === emp.employee
                                                ? "bg-[#F8E9E8] border-[#972E26] text-[#972E26]"
                                                : "hover:bg-gray-100 border-gray-200"
                                                }`}
                                        >
                                            {emp.employee}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Right: Selected Employee Goals */}
                            <div className="w-1/2 p-4 overflow-y-auto">
                                {selectedEmployee ? (
                                    <>
                                        <h3 className="text-xs  font-medium text-gray-700 mb-3">
                                            {selectedEmployee}'s Goals
                                        </h3>
                                        <ul className="space-y-2 text-xs ">
                                            {employeeGoals
                                                .find((e) => e.employee === selectedEmployee)
                                                ?.goals.map((g) => (
                                                    <li
                                                        key={g.id}
                                                        className="border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50"
                                                    >
                                                        <p className="font-medium text-gray-800">{g.name}</p>
                                                        <p className="text-gray-600 text-xs ">{g.desc}</p>
                                                    </li>
                                                ))}
                                        </ul>
                                        <button
                                            className="mt-4 w-full bg-[#972E26] text-white py-2 rounded-lg hover:bg-[#7D241E] transition-all"
                                            onClick={handleCopyAllGoals}
                                        >
                                            Copy All Goals
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 italic">
                                        Select an employee to view their goals.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end p-4 border-t">
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-xs  text-gray-600 hover:text-gray-900"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default GoalList;
