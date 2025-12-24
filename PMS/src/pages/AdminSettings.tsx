import React, { useState } from 'react'

type Row = {
  year: string;
  from: string;
  to: string;
  current: boolean;
};


function AdminSettings() {
 const [rows, setRows] = useState<Row[]>([
  {
    year: '',
    from: '',
    to: '',
    current: false,
  },
]);



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




  return (
    <div className="bg-white min-h-screen border rounded-lg px-6 py-2 h-full relative overflow-hidden">
      <div className="flex justify-between">
          <h1 className="text-primary font-medium pb-5">Admin Settings</h1>
           <button className='text-white bg-primary px-5 rounded-md cursor-pointer'>Save</button>
      </div>
        
        <form className="flex gap-20">
          <div className='flex flex-col gap-2'>
              <div className="flex flex-col gap-2 items-start">
                <p className='text-xs '>Minimum No.of Goals</p>
                <input type="text" className='w-50 border bordre-gray-300  rounded-sm focus:outline-none' />
              </div>
            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Assessment Year</p>
              <input type="text" className='w-50 border bordre-gray-300  rounded-sm  focus:outline-none' />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Min Value</p>
              <input type="text" className='w-50 border bordre-gray-300  rounded-sm focus:outline-none' />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Max value</p>
              <input type="text" className='w-50 border bordre-gray-300  rounded-sm focus:outline-none' />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Minimum No.of Goals</p>
              <input type="text" className=' w-50 border bordre-gray-300  rounded-sm focus:outline-none' />
            </div>
          
          </div>

        <div className='flex w-full flex-col gap-2'>
             <div className="flex flex-col gap-2 items-start">
              <p className='text-xs '>Email Template </p>
              <textarea className='w-full rounded-sm h-50 border bordre-gray-300 focus:outline-none' name="" id=""></textarea>
             </div>
            <div className="flex flex-col gap-2 py-2">
                <div className="flex gap-2">
                  <input type="checkbox"  className='border bordre-gray-300'/>
                  <p className='text-xs '>Enable Goal Submission</p>
                </div>
                <div className="flex gap-2">
                  <input type="checkbox"  className='border bordre-gray-300'/>
                  <p className='text-xs '>Enable Goal Evaluation</p>
                </div>
            </div>
        </div>
            
        </form>



         <div className="border rounded-lg w-full mt-5">
          <table className="w-full text-left table-auto table-fixed">
            <thead className="bg-gray-100 text-gray-500 text-[11px]">
              <tr>
                <th className="py-2 px-2  w-[5%]"></th>
                <th className="py-2 px-2  w-[10%]">No</th>
                <th className="py-2 px-1   w-[30%]">Year</th>
                <th className="py-2 px-1  w-[20%]">From</th>
                <th className="py-2 px-1  w-[20%]">To</th>
                <th className="py-2 px-1  text-center  w-[15%]">Current</th>
              </tr>
            </thead>
           <tbody>
  {rows.map((row, index) => (
    <tr key={index} className="border-b text-xs align-top">
      <td className="text-center px-1 py-2">
        <input type="checkbox" />
      </td>

      <td className="px-2 py-2">{index + 1}</td>

      <td className="px-1 py-2">
        <input
          type="text"
          className="w-full rounded-sm px-2 py-1 border border-gray-300 focus:outline-none"
          value={row.year}
          onChange={(e) =>
            handleChange(index, 'year', e.target.value)
          }
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
          onChange={(e) =>
            handleChange(index, 'current', e.target.checked)
          }
        />
      </td>
    </tr>
  ))}
</tbody>

      <button
        type="button"
        className="bg-gray-200 text-nowrap text-gray-500 p-2 text-xs m-2 rounded-sm"
        onClick={AddRow}
      >
        Add Row
      </button>

   </table>
</div>


      </div>
      
  )
}

export default AdminSettings