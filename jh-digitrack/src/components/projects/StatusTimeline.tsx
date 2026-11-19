import { format } from "date-fns";
import { StatusStep } from "./statusSteps";

function Gap({ current }: { current?: boolean }) {
  return <div className="flex h-[22px] w-6 shrink-0 items-center">
    <div className={`h-0.5 w-full ${current ? "border-t-2 border-dashed border-blue-300" : "bg-slate-300"}`}/>
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
  if (!steps.length) return <p className="text-xs text-muted-foreground">No status history yet.</p>;
  return <div className="flex flex-wrap items-start gap-y-2">
    {steps.map((step, index) => {
      const next = steps[index + 1];
      return <div key={`${step.status}-${step.at}`} className="flex items-start">
        <Step step={step} label={statusLabel(step.status)} current={!next}/>
        {next
          ? <Gap/>
          : <><Gap current/><span className="shrink-0 pt-1 text-[10px] text-muted-foreground">Today</span></>}
      </div>;
    })}
  </div>;
}
