import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  getRowAriaLabel?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyState,
  onRowClick,
  getRowAriaLabel,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return (
      <div className="glass-card overflow-hidden rounded-2xl">{emptyState}</div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="dashboard-table w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5 ${
                    col.hideOnMobile ? "hidden md:table-cell" : ""
                  } ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "link" : undefined}
                aria-label={onRowClick ? getRowAriaLabel?.(row) : undefined}
                className={
                  onRowClick
                    ? "cursor-pointer transition-colors hover:bg-white/5 active:bg-white/[0.07]"
                    : "transition-colors hover:bg-surface-hover/50"
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-foreground/90 sm:px-5 ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${col.className ?? ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
