import React, { useState } from 'react'
import { AiOutlineDelete } from 'react-icons/ai';
import "../pages/AdminSettings.css"
import { useEffect } from "react";
import frappeClient from "@/utils/frappe-client";
type Row = {
  year: string;
  from: string;
  to: string;
  current: boolean;
};



function AdminSettings() {
 const [enableGoalSubmission, setEnableGoalSubmission] = useState(false);
 const [enableGoalEvaluation, setEnableGoalEvaluation] = useState(false);
 const [emailTemplate, setEmailTemplate] = useState("");

 const [minNoOfGoals,setMinNoOfGoals] = useState<number | "">("");
 const [maxValue,setMaxValue] = useState<number | "">("");
 const [minValue,setMinValue] = useState<number | "">("");
 const [rows, setRows] = useState<Row[]>([
  {
    year: '',
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
      setEmailTemplate(data.email_template ?? "");

      setRows(
        (data.rows || []).map((r: any) => ({
          year: r.year ?? "",
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
  if (!window.confirm("Are you sure you want to save these settings?")) {
    return;
  }

  const payload = {
    min_no_of_goals: minNoOfGoals,
    min_value: minValue,
    max_value: maxValue,
    enable_goal_submission: enableGoalSubmission ? 1 : 0,
    enable_goal_evaluation: enableGoalEvaluation ? 1 : 0,
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
                <th className="py-2 px-2  w-[10%]"></th>
                <th className="py-2 px-2  w-[10%]">No</th>
                <th className="py-2 px-1   w-[15%]">Year</th>
                <th className="py-2 px-1  w-[25%]">From</th>
                <th className="py-2 px-1  w-[25%]">To</th>
                <th className="py-2 px-1  text-center  w-[15%]">Current</th>
              </tr>
            </thead>
           <tbody>
    {rows.map((row, index) => (
      <tr key={index} className="border-b text-xs align-top">
        <td className="text-center px-1 py-2">
          <input type="checkbox" checked={selectedRows.includes(index)}
          onChange={(e)=>{
          if(e.target.checked){
            setSelecetdRows([...selectedRows,index]);
          }else{
            setSelecetdRows(selectedRows.filter((i)=> i!=index));
          }}}
        />
      </td>

      <td className="px-2 py-2">{index + 1}</td>

      <td className="px-1 py-2">
        <input
          type="number"
          className="w-full rounded-sm no-spinner px-2 py-1 border border-gray-300 focus:outline-none"
          value={row.year}
                onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 4) {

                  const updatedRows = [...rows];
                  updatedRows[index] = {
                    ...updatedRows[index],
                    year: value,
                  }
                  setRows(updatedRows);
                } 
              }}
          // onChange={(e) =>
          //   handleChange(index, 'year', e.target.value)
          // }
        />
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

        {selectedRows.length > 0 && (
        <button
          type="button"
          className="bg-primary text-white p-1 text-xs rounded-sm"
          onClick={deleteSelectedRows}
        >
          <AiOutlineDelete />
        </button>
      )}
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


