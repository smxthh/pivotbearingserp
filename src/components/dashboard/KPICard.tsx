import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'default' | 'indigo' | 'success' | 'warning' | 'purple' | 'indian-flag'; // Added indigo
  isCurrency?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KPICard({ title, value, icon: Icon, variant, isCurrency, trend }: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    return isCurrency
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
      : new Intl.NumberFormat('en-IN').format(val);
  };

  const variantStyles = {
    default: "bg-blue-50 text-blue-500", // Total Products (Blue)
    indigo: "bg-indigo-50 text-indigo-500", // Total Sales (Indigo)
    success: "bg-green-50 text-green-500", // Total Income (Green)
    warning: "bg-red-50 text-red-500", // Total Expenses (Red)
    purple: "bg-purple-50 text-purple-500", // Fallback
    "indian-flag": "bg-gradient-to-br from-orange-200 via-white to-green-200 text-blue-700", // Tricolor
  };

  const iconClass = variantStyles[variant] || variantStyles.default;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100">
      <div className={cn("p-3 rounded-xl", iconClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-xl font-bold mt-1 text-gray-900">{formatValue(value)}</h3>
      </div>
    </div>
  );
}
