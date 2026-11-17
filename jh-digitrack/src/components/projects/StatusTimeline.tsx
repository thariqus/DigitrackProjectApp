import { differenceInCalendarDays, format } from "date-fns";
import { StatusStep } from "./statusSteps";

const daysLabel = (from: string, to: Date) => {
  const days = differenceInCalendarDays(to, new Date(from));
  return days <= 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"}`;
};

function Gap({ label, current }: { label: string; current?: boolean }) {
  return <div className="group relative flex h-[22px] w-20 shrink-0 items-center" aria-label={label}>
    <div className={`h-0.5 w-full ${current ? "border-t-2 border-dashed border-blue-300" : "bg-slate-300 group-hover:bg-[#972e26]"}`}/>
    <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{label}</span>
  </div>;
}

function Step({ step, label, current }: { step: StatusStep; label: string; current: boolean }) {
  return <div className="flex shrink-0 flex-col items-center gap-0.5">
    <span className={`whitespace-nowrap rounded-md px-3 py-0.5 text-[11px] ${current ? "bg-[#972e26] text-white" : "bg-blue-50 text-blue-700"}`}>{label}</span>
    <span className="text-[10px] leading-none text-muted-foreground">{format(new Date(step.at), "d MMM yy")}</span>
  </div>;
}

/** Compact one-line status timeline shown in the row under an Item. */
export default function StatusTimeline({ steps, statusLabel }: { steps: StatusStep[]; statusLabel: (status: string) => string }) {
  const today = new Date();
  if (!steps.length) return <p className="text-xs text-muted-foreground">No status history yet.</p>;
  // flex-wrap (not overflow scroll) so the hover label above a line is not clipped.
  return <div className="flex flex-wrap items-start gap-y-2">
    {steps.map((step, index) => {
      const next = steps[index + 1];
      return <div key={`${step.status}-${step.at}`} className="flex items-start">
        <Step step={step} label={statusLabel(step.status)} current={!next}/>
        {next
          ? <Gap label={daysLabel(step.at, new Date(next.at))}/>
          : <><Gap current label={`${daysLabel(step.at, today)} so far`}/><span className="shrink-0 pt-1 text-[10px] text-muted-foreground">Today</span></>}
      </div>;
    })}
  </div>;
}
