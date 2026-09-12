import React, { useState } from 'react'
import { AiOutlineDelete } from 'react-icons/ai';
import "../pages/AdminSettings.css"
import { useEffect } from "react";
import frappeClient from "@/utils/frappe-client";
type Row = {
  year: string;
  quaterly: string;
  from: string;
  to: string;
  current: boolean;
};

const getQuarterOptions = (year: string) =>
  year.trim() === ""
    ? []
    : [1, 2, 3, 4].map((q) => `${year} Q${q}`);

const YEAR_OPTIONS = Array.from({ length: 2030 - 2020 + 1 }, (_, i) => String(2020 + i));



function AdminSettings() {
 const [enableGoalSubmission, setEnableGoalSubmission] = useState(false);
 const [enableGoalEvaluation, setEnableGoalEvaluation] = useState(false);
 const [enableYearlyAppraisal, setEnableYearlyAppraisal] = useState(false);
 const [emailTemplate, setEmailTemplate] = useState("");

 const [minNoOfGoals,setMinNoOfGoals] = useState<number | "">("");
 const [maxValue,setMaxValue] = useState<number | "">("");
 const [minValue,setMinValue] = useState<number | "">("");
 const [rows, setRows] = useState<Row[]>([
  {
    year: '',
    quaterly: '',
    from: '',
    to: '',
    current: false,
  },
]);
 const [selectedRows,setSelecetdRows] = useState<number[]>([]);

 const AddRow = () => {
  setRows([
    ...rows,
    {
      year: '',
      quaterly: '',
      from: '',
      to: '',
      current: false,
    },
  ]);
};
const [message, setMessage] = useState<{
  text: string;
  type: "success" | "error" | "";
}>({ text: "", type: "" });

useEffect(() => {
  if (message.text) {
    const timer = setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [message]);

useEffect(() => {
  const fetchSettings = async () => {
    try {
      const res = await frappeClient.api.get<{
        message: any;
      }>("jh_digitrack.api.pms_admin_settings.get_pms_settings");

      const data = res.message;

      setMinNoOfGoals(data.min_no_of_goals ?? "");
      setMinValue(data.min_value ?? "");
      setMaxValue(data.max_value ?? "");

      setEnableGoalSubmission(!!data.enable_goal_submission);
      setEnableGoalEvaluation(!!data.enable_goal_evaluation);
      setEnableYearlyAppraisal(!!data.enable_yearly_appraisal);
      setEmailTemplate(data.email_template ?? "");

      setRows(
        (data.rows || []).map((r: any) => ({
          year: r.year ?? "",
          quaterly: r.quaterly ?? "",
          from: r.from ?? "",
          to: r.to ?? "",
          current: !!r.current,
        }))
      );
    } catch (err) {
      console.error("Error fetching PMS settings", err);
    }
  };

  fetchSettings();
}, []);

const handleChange = (
  index: number,
  field: keyof Row,
  value: string | boolean
) => {
  const updatedRows = [...rows];
  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };
  setRows(updatedRows);
};

const handleSave = async () => {

  const hasIncompleteRow = rows.some(
    (r) =>
      !r.year.trim() ||
      !r.quaterly.trim() ||
      !r.from.trim() ||
      !r.to.trim()
  );

  if (hasIncompleteRow) {
    setMessage({
      text: "Please fill in Year, Quarterly, From and To for all rows before saving.",
      type: "error",
    });
    return;
  }

  const seenQuarters = new Set<string>();
  const hasDuplicateQuarter = rows.some((r) => {
    const key = `${r.year.trim()}|${r.quaterly.trim()}`;
    if (seenQuarters.has(key)) {
      return true;
    }
    seenQuarters.add(key);
    return false;
  });

  if (hasDuplicateQuarter) {
    setMessage({
      text: "Duplicate Year and Quarterly combination found. Each row must have a unique Year and Quarterly.",
      type: "error",
    });
    return;
  }

  const hasValidCurrentRow = rows.some(
    (r) => r.current && r.year.trim() !== ""
  );

  if (!hasValidCurrentRow) {
    setMessage({
      text: "At least one row must be marked as current and must have a Year value.",
      type: "error",
    });
    return;
  }

  if (enableYearlyAppraisal) {
    const currentRow = rows.find((r) => r.current);
    const isCurrentQuarterQ4 = !!currentRow && /Q4$/.test(currentRow.quaterly.trim());

    if (!isCurrentQuarterQ4) {
      setMessage({
        text: "Enable Yearly Appraisal can only be turned on when the current row's Quarterly is Q4.",
        type: "error",
      });
      return;
    }
  }

  if (!window.confirm("Are you sure you want to save these settings?")) {
    return;
  }

  const payload = {
    min_no_of_goals: minNoOfGoals,
    min_value: minValue,
    max_value: maxValue,
    enable_goal_submission: enableGoalSubmission ? 1 : 0,
    enable_goal_evaluation: enableGoalEvaluation ? 1 : 0,
    enable_yearly_appraisal: enableYearlyAppraisal ? 1 : 0,
    email_template: emailTemplate,
    rows,
  };

  try {
    await frappeClient.api.post(
      "jh_digitrack.api.pms_admin_settings.save_pms_settings",
      payload
    );

    setMessage({
      text: "Settings saved successfully.",
      type: "success",
    });
  } catch (err) {
    console.error("Error saving PMS settings", err);

    setMessage({
      text: "Failed to save settings.",
      type: "error",
    });
  }
};


const handleDeleteRow = async (index: number) => {
  const rowToDelete = rows[index];

  if (rowToDelete.current) {
    setMessage({
      text: "You cannot delete the current row. Please change the current year first.",
      type: "error",
    });
    return;
  }

  if (rows.length <= 1) {
    setMessage({
      text: "At least one row must exist and be marked as current.",
      type: "error",
    });
    return;
  }

  if (!window.confirm("Are you sure you want to delete this row?")) {
    return;
  }

  const updatedRows = rows.filter((_, i) => i !== index);
  setRows(updatedRows);

  try {
    await frappeClient.api.post(
      "jh_digitrack.api.pms_admin_settings.save_pms_settings",
      {
        min_no_of_goals: minNoOfGoals,
        min_value: minValue,
        max_value: maxValue,
        enable_goal_submission: enableGoalSubmission ? 1 : 0,
        enable_goal_evaluation: enableGoalEvaluation ? 1 : 0,
        enable_yearly_appraisal: enableYearlyAppraisal ? 1 : 0,
        email_template: emailTemplate,
        rows: updatedRows,
      }
    );

    setMessage({
      text: "Deleted successfully.",
      type: "success",
    });
  } catch (err) {
    console.error(err);
    setMessage({
      text: "Failed to delete row.",
      type: "error",
    });
  }
};

const deleteSelectedRows = async () => {
  const rowsToDelete = rows.filter((_, index) =>
    selectedRows.includes(index)
  );

  const hasCurrentRow = rowsToDelete.some((r) => r.current);

  if (hasCurrentRow) {
    setMessage({
      text: "You cannot delete the current row. Please change the current year first.",
      type: "error",
    });
    return;
  }
  const remainingRows = rows.filter((_, index) => !selectedRows.includes(index));
  const hasAnyCurrent = remainingRows.some((r) => r.current);

  if (!hasAnyCurrent) {
    setMessage({
      text: "At least one row must be marked as current before deleting.",
      type: "error",
    });
    return;
  }
  if (rows.length - selectedRows.length < 1) {
    setMessage({
      text: "At least one row must exist and be marked as current.",
      type: "error",
    });
    return;
  }

  if (!window.confirm("Are you sure you want to delete selected rows?")) {
    return;
  }

  const updatedRows = rows.filter(
    (_, index) => !selectedRows.includes(index)
  );

  setRows(updatedRows);
  setSelecetdRows([]);

  try {
    await frappeClient.api.post(
      "jh_digitrack.api.pms_admin_settings.save_pms_settings",
      {
        min_no_of_goals: minNoOfGoals,
        min_value: minValue,
        max_value: maxValue,
        enable_goal_submission: enableGoalSubmission ? 1 : 0,
        enable_goal_evaluation: enableGoalEvaluation ? 1 : 0,
        enable_yearly_appraisal: enableYearlyAppraisal ? 1 : 0,
        email_template: emailTemplate,
        rows: updatedRows,
      }
    );

    setMessage({
      text: "Deleted successfully.",
      type: "success",
    });
  } catch (err) {
    console.error(err);
    setMessage({
      text: "Failed to delete rows.",
      type: "error",
    });
  }
};




  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 h-full relative overflow-hidden">
      <div className="flex justify-between">
          <h1 className="text-primary font-medium ">Admin Settings</h1>
           {/* <button className='text-white text-xs bg-primary px-3 py-2 rounded-md cursor-pointer'>Save</button> */}
           <button
              type="button"
              onClick={handleSave}
              className="text-white text-xs bg-primary px-3 py-2 rounded-md cursor-pointer"
            >
              Save
            </button>

      </div>
        
        <form className="flex gap-5 pt-5">
          <div className='flex w-[20%] flex-col gap-2'>
             <div className="flex flex-col gap-2 items-start">
                <p className="text-xs">Minimum No. of Goals</p>
                    <input type="text" inputMode="numeric"        
                      pattern="[0-9]*"
                      value={minNoOfGoals}
                      onChange={(e) => {
                        const value = e.target.value;

                        // allow only digits and max 3 length
                        if (/^\d*$/.test(value) && value.length <= 3) {
                          setMinNoOfGoals(value === "" ? "" : Number(value));
                        }
                      }}
                      onKeyDown={(e) => {
                        // block non-numeric keys
                        if (
                          !/[0-9]/.test(e.key) &&
                          e.key !== "Backspace" &&
                          e.key !== "Delete" &&
                          e.key !== "ArrowLeft" &&
                          e.key !== "ArrowRight" &&
                          e.key !== "Tab"
                        ) {
                          e.preventDefault();
                        }
                      }}
                      className="w-30 no-spinner px-1 border border-gray-300 rounded-sm focus:outline-none"
                    />
              </div>

            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Min Value</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minValue}
                  onChange={(e) => {
                    const value = e.target.value;

                    // allow only digits and max 3 length
                    if (/^\d*$/.test(value) && value.length <= 3) {
                      setMinValue(value === "" ? "" : Number(value));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      e.key !== "Backspace" &&
                      e.key !== "Delete" &&
                      e.key !== "ArrowLeft" &&
                      e.key !== "ArrowRight" &&
                      e.key !== "Tab"
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-30 px-1 no-spinner border border-gray-300 rounded-sm focus:outline-none"
                />

            </div>
            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Max value</p>
              <input type="text" inputMode="numeric" 
               pattern="[0-9]*"
                value={maxValue}
                max={110}
                onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 3) {
                  setMaxValue(Number(value));
                } 

                if (value === "") {
                  setMaxValue("");
                  return;
                }
                const num = Number(value)
                if (num > 110) {
                  setMaxValue(110);
                }
              }}
                className='w-30 px-1 no-spinner border border-gray-300  rounded-sm focus:outline-none' />
            </div>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex gap-2">
                  {/* <input type="checkbox"  className='border bordre-gray-300'/> */}
                  <input
                    type="checkbox"
                    checked={enableGoalSubmission}
                    onChange={(e) => setEnableGoalSubmission(e.target.checked)}
                    className="border"
                  />
                  <p className='text-xs '>Enable Goal Submission</p>
                </div>
                <div className="flex gap-2">
                  {/* <input type="checkbox"  className='border bordre-gray-300'/> */}
                  <input
                    type="checkbox"
                    checked={enableGoalEvaluation}
                    onChange={(e) => setEnableGoalEvaluation(e.target.checked)}
                    className="border"
                  />
                  <p className='text-xs '>Enable Goal Evaluation</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={enableYearlyAppraisal}
                    onChange={(e) => setEnableYearlyAppraisal(e.target.checked)}
                    className="border"
                  />
                  <p className='text-xs '>Enable Yearly Appraisal</p>
                </div>
            </div>
          
          </div>

        <div className='flex w-full flex-col gap-2'>
             <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Email Template </p>
              {/* <textarea className='w-full px-1 rounded-sm h-56 border bordre-gray-300 focus:outline-none' name="" id=""></textarea> */}
              <textarea
                value={emailTemplate}
                maxLength={500}
                onChange={(e) => setEmailTemplate(e.target.value)}
                className="w-full px-1 rounded-sm h-56 border focus:outline-none"
              name="" id=""></textarea>

             </div>
            
        </div>      
      </form>

        <div className="border rounded-lg w-full mt-5">
          <table className="w-full text-center table-auto table-fixed">
            <thead className="bg-gray-100 text-gray-500 text-[11px]">
              <tr>
                <th className="py-2 px-2  w-[10%]">No</th>
                <th className="py-2 px-1   w-[15%]">Year</th>
                <th className="py-2 px-1  w-[15%]">Quarterly</th>
                <th className="py-2 px-1  w-[25%]">From</th>
                <th className="py-2 px-1  w-[25%]">To</th>
                <th className="py-2 px-1  text-center  w-[15%]">Current</th>
                <th className="py-2 px-1  text-center  w-[10%]">Action</th>
              </tr>
            </thead>
           <tbody>
    {rows.map((row, index) => (
      <tr key={index} className="border-b text-xs align-top">


      <td className="px-2 py-2">{index + 1}</td>

 

    
      <td className="px-1 py-2">
        <select
          className="w-full rounded-sm px-2 py-1 border border-gray-300 focus:outline-none"
          value={row.year}
          onChange={(e) => {
            const value = e.target.value;
            const updatedRows = [...rows];
            updatedRows[index] = {
              ...updatedRows[index],
              year: value,
              quaterly: '',
            };
            setRows(updatedRows);
          }}
        >
          <option value="">Select</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </td>

      <td className="px-1 py-2">
        <select
          className="w-full rounded-sm px-2 py-1 border border-gray-300 focus:outline-none"
          value={row.quaterly}
          disabled={row.year.trim() === ""}
          onChange={(e) => handleChange(index, 'quaterly', e.target.value)}
        >
          <option value="">Select</option>
          {getQuarterOptions(row.year).map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </td>

      <td className="px-1 py-2">
        <input
          type="date"
          className="w-full border rounded-sm px-2 py-1"
          value={row.from}
          onChange={(e) =>
            handleChange(index, 'from', e.target.value)
          }
        />
      </td>

      <td className="px-1 py-2">
        <input
          type="date"
          className="w-full border rounded-sm px-2 py-1"
          value={row.to}
          onChange={(e) =>
            handleChange(index, 'to', e.target.value)
          }
        />
      </td>

      <td className="px-1 py-2 text-center">
        <input
          type="checkbox"
          checked={row.current}
          onChange={(e) => {
            const checked = e.target.checked;

            const updatedRows = rows.map((r, i) => ({
              ...r,
              current: checked && i === index, // only one true
            }));

            setRows(updatedRows);
          }}
        />
      </td>

      <td className="px-1 py-2 text-center">
        <button
          type="button"
          onClick={() => handleDeleteRow(index)}
          className="text-red-600 hover:text-red-800"
        >
          <AiOutlineDelete size={16} />
        </button>
      </td>
    </tr>
  ))}
</tbody>


      <div className="flex gap-3 items-center m-2">

        <button
        type="button"
        className="bg-gray-200 text-nowrap text-black p-1 text-xs  rounded-md"
        onClick={AddRow}
      >
        Add Row
      </button>


      </div>
{message.text && (
  <div
    className={`fixed top-5 right-5 flex items-center justify-between gap-3 px-6 py-3 rounded-lg shadow-xl text-sm font-medium z-[9999]
    ${message.type === "success" ? "bg-green-100 text-green-700 border border-green-300" : ""}
    ${message.type === "error" ? "bg-red-100 text-red-700 border border-red-300" : ""}`}
  >
    <span>{message.text}</span>
    <button
      onClick={() => setMessage({ text: "", type: "" })}
      className="ml-3 text-lg font-bold leading-none text-gray-500 hover:text-gray-700"
    >
      ×
    </button>
  </div>
)}

      

   </table>
</div>


      </div>
      
  )
}

export default AdminSettings


