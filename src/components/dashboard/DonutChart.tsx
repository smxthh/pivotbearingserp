import { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { Award } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface DataItem {
    name: string;
    value: number;
}

interface DonutChartProps {
    title: string;
    data: DataItem[];
    totalLabel?: string;
}

const COLORS = ['#7dd3fc', '#c4b5fd', '#fcd34d', '#f9a8d4', '#6ee7b7', '#fca5a5', '#a5f3fc', '#d8b4fe'];

export function DonutChart({ title, data, totalLabel = 'Total Sales' }: DonutChartProps) {
    const [showAllDialog, setShowAllDialog] = useState(false);
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
            notation: 'compact',
        }).format(value);

    // Smart Custom Tooltip with Radial Positioning
    const CustomTooltip = ({ active, payload, coordinate, viewBox }: any) => {
        if (active && payload && payload.length && coordinate) {
            // Chart dimensions
            const centerX = viewBox.width / 2;
            const centerY = viewBox.height / 2;

            // Calculate angle between center and cursor
            const dx = coordinate.x - centerX;
            const dy = coordinate.y - centerY;
            const angle = Math.atan2(dy, dx);

            // Fixed radius to place tooltip outside the chart
            // Outer radius is 80, we place it at 120 to give breathing room
            const tooltipRadius = 120;

            const tooltipX = centerX + Math.cos(angle) * tooltipRadius;
            const tooltipY = centerY + Math.sin(angle) * tooltipRadius;

            // Simple positioning: centered on that radial point
            const tooltipStyle: React.CSSProperties = {
                position: 'absolute',
                left: `${tooltipX}px`,
                top: `${tooltipY}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                pointerEvents: 'none',
                minWidth: 'max-content',
            };

            return (
                <div
                    className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-gray-100 transition-opacity duration-300 ease-in-out"
                    style={{ ...tooltipStyle, opacity: active ? 1 : 0 }}
                >
                    <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{payload[0].name}</p>
                    <p className="text-sm font-bold text-gray-500">
                        {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                        }).format(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const formatFullCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);

    return (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button
                        onClick={() => setShowAllDialog(true)}
                        className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        See All
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                    {data.length > 0 ? (
                        <>
                            {/* Added overflow-visible to ensure tooltip isn't clipped */}
                            <div className="relative w-48 h-48 mb-6 overflow-visible">
                                <ResponsiveContainer width="100%" height="100%" className="overflow-visible">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={4}
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomTooltip />}
                                            cursor={false}
                                            wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs text-gray-400">{totalLabel}</span>
                                    <span className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalValue)}</span>
                                </div>
                            </div>

                            <div className="w-full space-y-3 px-2">
                                {data.slice(0, 4).map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-gray-600 truncate max-w-[100px]">{item.name}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-gray-500">{formatCurrency(item.value)}</span>
                                            <span className="font-semibold text-gray-900 w-8 text-right">
                                                {totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">No data</p>
                    )}
                </div>
            </div>

            {/* See All Dialog */}
            <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-500" />
                            {title} - All Categories
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b">
                            <span className="text-sm text-gray-500">Total</span>
                            <span className="text-lg font-bold text-gray-900">{formatFullCurrency(totalValue)}</span>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {data.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-gray-700 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-600">{formatFullCurrency(item.value)}</span>
                                        <span className="font-semibold text-gray-900 w-12 text-right bg-gray-100 px-2 py-0.5 rounded">
                                            {totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {data.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No data available</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
