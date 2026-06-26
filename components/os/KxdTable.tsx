import type { ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { kxdOsCn } from "./utils";

export function KxdTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="kxd-os-table-wrap">
      <table className={kxdOsCn("kxd-os-table", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function KxdTableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function KxdTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function KxdTableRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

export function KxdTableHeaderCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  );
}

export function KxdTableCell({
  children,
  primary,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { primary?: boolean }) {
  return (
    <td
      className={kxdOsCn(primary && "kxd-os-table__primary", className)}
      {...props}
    >
      {children}
    </td>
  );
}
