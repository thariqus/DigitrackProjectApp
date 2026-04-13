function PropertyAutomationDashboard() {
  return (
    <div>
        <div className="grid grid-rows-2">
            <div className="grid grid-cols-5 gap-5 items-center">
                <div className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold text-lg">142</span>
                            <span className={`font-semibold`}>Total Props</span>
                    </div>
                </div>
                 <div className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold">30</span>
                            <span className={`font-semibold`}>Renewals ≤ 30 Days</span>
                    </div>
                </div>
                 <div className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold">30</span>
                            <span className={`font-semibold`}>Renewals ≤ 60 Days</span>
                    </div>
                </div>
                 <div className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold">30</span>
                            <span className={`font-semibold`}>Renewals ≤ 90 Days</span>
                    </div>
                </div>
                 <div className="relative cursor-pointer bg-rose-100/60 backdrop-blur border border-rose-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
                    <div className="flex flex-col gap-1 text-gray-500 text-center">
                            <span className="font-bold">30</span>
                            <span className={`font-semibold`}>Overdue</span>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
  )
}

export default PropertyAutomationDashboard