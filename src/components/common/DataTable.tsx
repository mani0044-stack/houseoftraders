import React from 'react';
import { clsx } from 'clsx';

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ children, className }) => {
  return (
    <div className={clsx('w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs', className)}>
      <table className="w-full text-left text-xs text-slate-800 font-sans border-collapse">
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 sticky top-0 z-10">
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
      'border-b border-slate-100 hover:bg-emerald-50/50 transition-colors',
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
  <td className={clsx('px-3.5 py-3 whitespace-nowrap font-mono-num text-slate-800', className)}>
    {children}
  </td>
);
