import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart as BarChartIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data?: MonthlyData[];
}

type ViewMode = 'monthly' | 'quarterly' | 'yearly';

// Quarter mapping (FY order)
const QUARTERS = [
  { name: 'Q1', months: ['Apr', 'May', 'Jun'] },
  { name: 'Q2', months: ['Jul', 'Aug', 'Sep'] },
  { name: 'Q3', months: ['Oct', 'Nov', 'Dec'] },
  { name: 'Q4', months: ['Jan', 'Feb', 'Mar'] },
];

// Default data
const defaultData: MonthlyData[] = [
  { month: 'Apr', income: 0, expense: 0 },
  { month: 'May', income: 0, expense: 0 },
  { month: 'Jun', income: 0, expense: 0 },
  { month: 'Jul', income: 0, expense: 0 },
  { month: 'Aug', income: 0, expense: 0 },
  { month: 'Sep', income: 0, expense: 0 },
  { month: 'Oct', income: 0, expense: 0 },
  { month: 'Nov', income: 0, expense: 0 },
  { month: 'Dec', income: 0, expense: 0 },
  { month: 'Jan', income: 0, expense: 0 },
  { month: 'Feb', income: 0, expense: 0 },
  { month: 'Mar', income: 0, expense: 0 },
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
    const netProfit = income - expense;
    const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : '0';

    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-100 min-w-[180px]">
        <p className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"></span>
              <span className="text-xs text-gray-600">Income</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(income)}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-200 to-indigo-100"></span>
              <span className="text-xs text-gray-600">Expense</span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(expense)}
            </p>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {netProfit >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className="text-xs text-gray-600">Net Profit</span>
              </div>
              <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(netProfit)}
              </p>
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">
              Margin: {profitMargin}%
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function IncomeExpenseChart({ data = defaultData }: IncomeExpenseChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  // Transform data based on view mode
  const chartData = useMemo(() => {
    let baseData = data;

    if (viewMode === 'quarterly') {
      baseData = QUARTERS.map(q => {
        const quarterData = data.filter(d => q.months.includes(d.month));
        return {
          month: q.name,
          income: quarterData.reduce((sum, d) => sum + d.income, 0),
          expense: quarterData.reduce((sum, d) => sum + d.expense, 0),
        };
      });
    } else if (viewMode === 'yearly') {
      const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
      const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
      baseData = [{ month: 'FY Total', income: totalIncome, expense: totalExpense }];
    }

    return baseData;
  }, [data, viewMode]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
    const netProfit = totalIncome - totalExpense;
    const bestMonth = data.reduce((best, d) =>
      (d.income - d.expense) > (best.income - best.expense) ? d : best
      , data[0]);

    return { totalIncome, totalExpense, netProfit, bestMonth };
  }, [data]);

  const hasData = data.some(d => d.income > 0 || d.expense > 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChartIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Income vs Expense</h3>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs ml-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-sm"></span>
              <span className="text-gray-500">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-200 to-indigo-100 shadow-sm"></span>
              <span className="text-gray-500">Expense</span>
            </div>
          </div>
        </div>
        <div className="flex bg-gray-50 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'monthly'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('quarterly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'quarterly'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            Quarterly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'yearly'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-[280px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0f4ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e0e7ff" stopOpacity={1} />
                </linearGradient>
                {/* Glow effect for bars */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(99, 102, 241, 0.04)', radius: 8 }}
                offset={20}
              />
              {/* Income Bar - Bottom of stack (Dark Indigo) */}
              <Bar
                dataKey="income"
                stackId="stack"
                fill="url(#incomeGradient)"
                radius={[0, 0, 8, 8]}
                barSize={viewMode === 'yearly' ? 60 : viewMode === 'quarterly' ? 40 : 20}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-income-${index}`}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Bar>
              {/* Expense Bar - Top of stack (Light Indigo) */}
              <Bar
                dataKey="expense"
                stackId="stack"
                fill="url(#expenseGradient)"
                radius={[8, 8, 0, 0]}
                barSize={viewMode === 'yearly' ? 60 : viewMode === 'quarterly' ? 40 : 20}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-expense-${index}`}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChartIcon className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium">No data available</p>
            <p className="text-xs text-gray-300 mt-1">Start creating invoices to see insights</p>
          </div>
        )}
      </div>
    </div>
  );
}
