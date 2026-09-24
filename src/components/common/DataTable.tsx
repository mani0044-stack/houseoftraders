import React from 'react';
import { clsx } from 'clsx';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ children, className }) => {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs', className)}>
      <table className="w-full text-left text-xs text-slate-900 font-sans border-collapse min-w-full">
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <thead className={clsx("bg-slate-50/90 backdrop-blur-md text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200/80 sticky top-0 z-10", className)}>
    {children}
  </thead>
);

export const TableRow: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({
  children,
  onClick,
  className
}) => (
  <tr
    onClick={onClick}
    className={clsx(
      'border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors',
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </tr>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <td className={clsx('px-4 py-3 whitespace-nowrap text-slate-800 text-xs font-normal', className)}>
    {children}
  </td>
);
