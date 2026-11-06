import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { IoMdClose } from "react-icons/io";
import { toast } from "sonner";
import frappeClient from "@/utils/frappe-client";

interface BellCurveRow {
  rating: number;
  // null until expected percentages are set in PMS Settings > Bell Curve
  expected_percentage: number | null;
  actual_percentage: number;
  count: number;
  gap: number | null;
}

type RatingType = "hr" | "skip_level";

const RATING_TYPES: { value: RatingType; label: string }[] = [
  { value: "hr", label: "HR Rating" },
  { value: "skip_level", label: "Skip Level Manager Rating" },
];

interface BusinessUnitOption {
  business_unit: string;
  entity: string;
}

interface BellCurveData {
  year: string;
  entity: string | null;
  business_unit: string | null;
  rating_type: RatingType;
  // Entities and business units in the admin's scope, for the filter dropdowns
  entities: string[];
  business_units: BusinessUnitOption[];
  configured: boolean;
  total: number;
  rows: BellCurveRow[];
}

interface BellCurveModalProps {
  open: boolean;
  onClose: () => void;
  years: string[];
  defaultYear: string;
}

const formatGap = (gap: number | null) =>
  gap === null ? "-" : gap > 0 ? `+${gap}%` : `${gap}%`;

// Over target = red, under target = amber, on target / not configured = gray
const gapClass = (gap: number | null) =>
  gap !== null && gap > 0 ? "text-red-600" : gap !== null && gap < 0 ? "text-amber-600" : "text-gray-500";

function BellCurveModal({ open, onClose, years, defaultYear }: BellCurveModalProps) {
  const [year, setYear] = useState(defaultYear);
  const [entity, setEntity] = useState("All");
  const [businessUnit, setBusinessUnit] = useState("All");
  const [ratingType, setRatingType] = useState<RatingType>("hr");
  const [data, setData] = useState<BellCurveData | null>(null);
  const [loading, setLoading] = useState(false);

  // PMS Settings has one row per quarter, so the same year can repeat
  const uniqueYears = useMemo(() => Array.from(new Set(years)), [years]);

  // Business units narrow to the selected entity; a unit can sit under more than one entity
  const businessUnitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.business_units || [])
            .filter((o) => entity === "All" || o.entity === entity)
            .map((o) => o.business_unit)
        )
      ),
    [data, entity]
  );

  const fetchBellCurve = async (y: string, ent: string, bu: string, rt: RatingType) => {
    try {
      setLoading(true);
      const res = await frappeClient.api.get("jh_digitrack.api.pms_bell_curve.get_bell_curve", {
        year: y,
        entity: ent,
        business_unit: bu,
        rating_type: rt,
      });
      setData(res?.message || null);
    } catch (err) {
      console.error("Failed to fetch bell curve", err);
      toast.error((err as { message?: string })?.message || "Failed to load bell curve");
    } finally {
      setLoading(false);
    }
  };

  // Each time the popup opens, start from the current year, all entities / business units and HR rating
  useEffect(() => {
    if (!open) return;
    setYear(defaultYear);
    setEntity("All");
    setBusinessUnit("All");
    setRatingType("hr");
    fetchBellCurve(defaultYear, "All", "All", "hr");
  }, [open, defaultYear]);

  // Switching the rating basis reloads the chart straight away
  const handleRatingTypeChange = (rt: RatingType) => {
    setRatingType(rt);
    fetchBellCurve(year, entity, businessUnit, rt);
  };

  // Drop the selected unit when it doesn't belong to the newly chosen entity
  const handleEntityChange = (ent: string) => {
    setEntity(ent);
    const unitInEntity = (data?.business_units || []).some(
      (o) => o.business_unit === businessUnit && (ent === "All" || o.entity === ent)
    );
    if (!unitInEntity) setBusinessUnit("All");
  };

  const rows = data?.rows || [];
  const configured = !!data?.configured;
  // Label follows the loaded data, not the radio, so it never mismatches the chart mid-load
  const ratedLabel = data?.rating_type === "skip_level" ? "Skip Level Manager Rated" : "HR Rated";

  // Expected line is drawn only once the bell curve is set up in PMS Settings
  const series = [
    ...(configured
      ? [{ name: "Expected", data: rows.map((r) => r.expected_percentage ?? 0) }]
      : []),
    { name: "Actual", data: rows.map((r) => r.actual_percentage) },
  ];
  const actualIndex = series.length - 1;

  const options: ApexOptions = {
    chart: { type: "line", fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false } },
    colors: configured ? ["#64748b", "#972E26"] : ["#972E26"],
    stroke: {
      curve: "smooth",
      width: configured ? [2, 3] : [3],
      dashArray: configured ? [5, 0] : [0],
    },
    markers: { size: 4 },
    dataLabels: { enabled: true, formatter: (val) => `${val}%`, style: { fontSize: "10px" } },
    xaxis: {
      categories: rows.map((r) => String(r.rating)),
      title: { text: "Rating", style: { fontSize: "11px", fontWeight: 500 } },
    },
    yaxis: {
      min: 0,
      labels: { formatter: (val) => `${Math.round(val)}%` },
      title: { text: "Employees (%)", style: { fontSize: "11px", fontWeight: 500 } },
    },
    tooltip: {
      y: {
        formatter: (val, { seriesIndex, dataPointIndex }) =>
          seriesIndex === actualIndex ? `${val}% (${rows[dataPointIndex]?.count ?? 0} employees)` : `${val}%`,
      },
    },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    grid: { borderColor: "#e5e7eb" },
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-400 flex items-center justify-center">
      <div className="absolute top-13 inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-lg w-[760px] mt-25 max-w-full max-h-[85vh] flex flex-col z-50 overflow-hidden">
        <div className="flex justify-between items-center border-b px-5 py-4">
          <h2 className="font-semibold text-xs text-primary">Bell Curve</h2>
          <div className="ml-auto flex items-center gap-4">
            {data && (
              <div className="text-primary text-xs">Total {ratedLabel} Employees: {data.total}</div>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              <IoMdClose className="text-md" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          {/* Rating basis */}
          <div className="flex items-center gap-4 mb-3">
            {RATING_TYPES.map((rt) => (
              <label key={rt.value} className="flex items-center gap-1.5 text-[0.65rem] cursor-pointer">
                <input
                  type="radio"
                  name="bell-curve-rating-type"
                  value={rt.value}
                  checked={ratingType === rt.value}
                  onChange={() => handleRatingTypeChange(rt.value)}
                  disabled={loading}
                  className="accent-primary"
                />
                {rt.label}
              </label>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-3">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
            >
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
            >
              <option value="All">All Entities</option>
              {(data?.entities || []).map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>

            <select
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value)}
              className="px-2 py-1 border rounded-md text-[0.65rem] focus:outline-none"
            >
              <option value="All">All Business Units</option>
              {businessUnitOptions.map((bu) => (
                <option key={bu} value={bu}>
                  {bu}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchBellCurve(year, entity, businessUnit, ratingType)}
              disabled={loading}
              className="px-3 py-1 text-[0.65rem] bg-primary text-white rounded-md hover:bg-[#7d241f] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>

          {data && !configured && !loading && (
            <div className="text-center text-amber-600 text-xs mb-2">
              Bell curve is not configured. Add the expected percentages in PMS Settings &gt; Bell Curve.
            </div>
          )}

          {data && data.total === 0 && !loading && (
            <div className="text-center text-gray-500 italic text-xs mb-2">
              {data.rating_type === "skip_level"
                ? "No skip level manager ratings submitted yet for this selection."
                : "No HR ratings uploaded yet for this selection."}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <Chart options={options} series={series} type="line" height={300} />

              <table className="w-full text-xs mt-3 border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Rating</th>
                    <th className="px-3 py-2 text-right font-medium">Expected</th>
                    <th className="px-3 py-2 text-right font-medium">Actual</th>
                    <th className="px-3 py-2 text-right font-medium">Count</th>
                    <th className="px-3 py-2 text-right font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rating} className="border-t">
                      <td className="px-3 py-2">{r.rating}</td>
                      <td className="px-3 py-2 text-right">
                        {r.expected_percentage === null ? "-" : `${r.expected_percentage}%`}
                      </td>
                      <td className="px-3 py-2 text-right">{r.actual_percentage}%</td>
                      <td className="px-3 py-2 text-right">{r.count}</td>
                      <td className={`px-3 py-2 text-right font-medium ${gapClass(r.gap)}`}>
                        {formatGap(r.gap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">
                      {configured
                        ? `${Math.round(rows.reduce((sum, r) => sum + (r.expected_percentage ?? 0), 0))}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right">{data?.total ? "100%" : "0%"}</td>
                    <td className="px-3 py-2 text-right">{data?.total ?? 0}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BellCurveModal;
