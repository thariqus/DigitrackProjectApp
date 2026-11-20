import { useState } from "react";

type SelectedNamesProps = { names: string[]; collapsedLimit?: number };

/** Plain-text list of the selected employees, shown below a multi-select.
 * Long lists are cut to the first few names with a "Show all" toggle. */
export function SelectedNames({ names, collapsedLimit = 4 }: SelectedNamesProps) {
  const [expanded, setExpanded] = useState(false);
  if (!names.length) return null;
  const canCollapse = names.length > collapsedLimit;
  const shown = expanded || !canCollapse ? names : names.slice(0, collapsedLimit);
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground">Selected ({names.length}):</span> {shown.join(", ")}
      {canCollapse && (
        <>
          {!expanded && ` and ${names.length - collapsedLimit} more`}{" "}
          <button type="button" className="font-medium text-[#972e26] hover:underline" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Show all"}
          </button>
        </>
      )}
    </p>
  );
}
