/**
 * Admin data table. Per DESIGN.md: hairline row rules rather than zebra
 * striping or heavy borders, `label-sm` uppercase tracked column headers, and
 * `body-sm` cells — dense enough for a fleet order table without falling
 * below the 11px floor.
 *
 * Deliberately a presentational shell rather than a data-grid abstraction:
 * the admin tables in this app are all different enough (sortable, paginated,
 * lazily expanded, XLSX-exportable) that a generic grid would end up with more
 * escape hatches than it saves.
 */
import { createContext, useContext } from "react";

const PAD = {
  default: "px-space-lg py-3.5",
  dense: "px-space-md py-2",
};

// Density belongs to the table, not the individual cell. Threading it through
// context means a cell does not have to repeat `dense` on every one of a
// 12-column table, and the two cannot drift apart.
const DensityContext = createContext("default");
const useDensity = () => useContext(DensityContext);

export default function Table({ columns, children, className = "", dense = false }) {
  const cellPad = PAD[dense ? "dense" : "default"];

  return (
    <DensityContext.Provider value={dense ? "dense" : "default"}>
      <div
        className={`w-full overflow-x-auto rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest shadow-c57-card ${className}`}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-c57-surface-variant">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={`${cellPad} font-label-sm uppercase tracking-widest text-c57-on-surface-variant whitespace-nowrap`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </DensityContext.Provider>
  );
}

export function TableRow({ children, className = "", ...rest }) {
  return (
    <tr
      className={`border-b border-c57-surface-variant last:border-0 hover:bg-c57-surface-container-low transition-colors ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "", ...rest }) {
  const cellPad = PAD[useDensity()];

  return (
    <td
      className={`${cellPad} text-body-sm text-c57-on-surface align-top ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
