import React, { useEffect, useState } from 'react';
import { useBusinessIntelligence } from '@/hooks/useBusinessIntelligence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Target, AlertTriangle, Package, MapPin, Users, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
        style: 'currency',
        currency: 'INR'
    }).format(value);
};

export const CRMIntelligence = () => {
    const currentYear = new Date().getFullYear();
    const [isDarkMode, setIsDarkMode] = useState(false); // Kept for class compatibility, defaults to Light as per standard view

    const {
        intelligenceReport,
        goalProgress,
        isLoading,
        fetchIntelligenceReport,
        fetchGoalProgress,
        setYearlyGoal
    } = useBusinessIntelligence(currentYear);

    const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
    const [newTarget, setNewTarget] = useState('');

    useEffect(() => {
        fetchIntelligenceReport();
        fetchGoalProgress(currentYear);
    }, [fetchIntelligenceReport, fetchGoalProgress, currentYear]);

    const handleSetGoal = async () => {
        const amount = parseFloat(newTarget);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            await setYearlyGoal(currentYear, amount);
            setIsSetGoalOpen(false);
            setNewTarget('');
            toast.success("Goal updated");
        } catch (err: any) {
            toast.error(err.message || "Failed to set goal");
        }
    };

    const getStatusColor = () => {
        if (!goalProgress) return 'text-gray-500';
        if (goalProgress.goal_achieved) return 'text-green-600';
        if (goalProgress.progress_percentage >= 80) return 'text-[#7C3AED]'; // Violet
        if (goalProgress.progress_percentage >= 50) return 'text-blue-500';
        return 'text-orange-500';
    };

    const getStatusText = () => {
        if (!goalProgress) return '';
        if (goalProgress.goal_achieved) return 'Goal achieved';
        if (goalProgress.progress_percentage >= 80) return 'On track';
        if (goalProgress.progress_percentage >= 50) return 'Attention needed';
        return 'At risk';
    };

    if (isLoading && !intelligenceReport) {
        return <div className="p-8 text-center text-gray-500">Loading intelligence...</div>;
    }

    // Common card classes matching CRMOperations
    const cardClass = cn(
        "p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border",
        isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white"
    );

    const textPrimary = isDarkMode ? "text-white" : "text-gray-900";
    const textSecondary = isDarkMode ? "text-gray-400" : "text-gray-500";
    const headingClass = cn("text-lg font-normal tracking-wide", textPrimary);

    return (
        <div className={cn(
            "min-h-screen font-sans transition-colors duration-300 p-6 overflow-y-auto",
            isDarkMode ? "bg-[#0F172A] text-[#F8FAFC]" : "bg-[#F3F4F6] text-[#111827]"
        )}>
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header Zone */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className={cn("text-2xl font-normal tracking-wide", textPrimary)}>Strategic Intelligence</h1>
                        <p className={cn("text-sm mt-1", textSecondary)}>Performance radar for {currentYear}</p>
                    </div>
                    <div>
                        <Dialog open={isSetGoalOpen} onOpenChange={setIsSetGoalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("rounded-xl border", isDarkMode ? "bg-[#1E293B] border-gray-700 text-gray-300 hover:bg-[#1E293B]" : "bg-white border-gray-200 text-gray-600")}>
                                    {goalProgress?.success ? 'Adjust Goal' : 'Set Target'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className={cn("rounded-3xl", isDarkMode ? "bg-[#1E293B] border-gray-700 text-white" : "bg-white")}>
                                <DialogHeader>
                                    <DialogTitle className="font-normal">Yearly Revenue Goal</DialogTitle>
                                    <DialogDescription>Set target for {currentYear}</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="target">Annual Target (₹)</Label>
                                    <Input
                                        id="target"
                                        type="number"
                                        value={newTarget}
                                        onChange={(e) => setNewTarget(e.target.value)}
                                        placeholder="5000000"
                                        className={cn("mt-2 rounded-xl", isDarkMode ? "bg-gray-800 border-gray-700" : "")}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsSetGoalOpen(false)} className="rounded-xl">Cancel</Button>
                                    <Button onClick={handleSetGoal} className="rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9]">Save</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Primary Focus Zone - Hero Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Yearly Goal Progress (Target Style) */}
                    <div className={cn(cardClass, "lg:col-span-8")}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>
                                Annual Goal Progress
                            </h3>
                            <button className={cn("hover:bg-gray-100 rounded-full p-1 transition-colors", textSecondary)}>
                                <MoreVertical size={16} />
                            </button>
                        </div>

                        {goalProgress && goalProgress.success ? (
                            <div>
                                <div className="flex items-end justify-between mb-2">
                                    <div>
                                        <span className={cn("text-5xl font-light", textPrimary)}>
                                            {goalProgress.progress_percentage.toFixed(1)}%
                                        </span>
                                        <p className={cn("text-sm mt-2", textSecondary)}>
                                            {formatCurrency(goalProgress.actual_revenue)} of {formatCurrency(goalProgress.target_amount)}
                                        </p>
                                    </div>
                                    <div className={cn("text-sm font-medium px-4 py-2 rounded-xl bg-[#7C3AED]/10", getStatusColor())}>
                                        {getStatusText()}
                                    </div>
                                </div>

                                {/* Sine Wave / Bar Aesthetic Placeholder - Simplified to Progress Bar for Clarity but styled */}
                                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-6 flex">
                                    <div
                                        className="h-full bg-[#7C3AED] rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(goalProgress.progress_percentage, 100)}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-6 pt-8 mt-4">
                                    <div>
                                        <p className={cn("text-xs uppercase tracking-wider mb-1", textSecondary)}>Days Passed</p>
                                        <p className={cn("text-2xl font-light", textPrimary)}>{goalProgress.days_passed}</p>
                                    </div>
                                    <div>
                                        <p className={cn("text-xs uppercase tracking-wider mb-1", textSecondary)}>Days Remaining</p>
                                        <p className={cn("text-2xl font-light", textPrimary)}>{goalProgress.days_remaining}</p>
                                    </div>
                                    <div>
                                        <p className={cn("text-xs uppercase tracking-wider mb-1", textSecondary)}>Run Rate Required</p>
                                        <p className={cn("text-2xl font-light text-orange-500")}>
                                            {formatCurrency(goalProgress.required_daily_run_rate)}<span className="text-sm text-gray-400">/day</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Target size={40} className="text-gray-300 mx-auto mb-4" />
                                <p className={textSecondary}>No goal set for {currentYear}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Needed Action / Insight */}
                    <div className={cn(cardClass, "lg:col-span-4 flex flex-col justify-center")}>
                        <h3 className={cn("text-lg font-normal mb-6", textPrimary)}>Action Required</h3>

                        {goalProgress?.goal_achieved ? (
                            <div className="text-center">
                                <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                    <TrendingUp size={32} />
                                </span>
                                <p className="text-xl font-medium text-green-600">Goal Achieved!</p>
                                <p className={cn("text-sm mt-2", textSecondary)}>Great work this year.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-6">
                                    <span className={cn("text-4xl font-light block mb-2", textPrimary)}>
                                        {formatCurrency(goalProgress?.required_daily_run_rate || 0)}
                                    </span>
                                    <span className={cn("text-sm", textSecondary)}>Daily revenue needed to hit target</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                                        <AlertTriangle size={20} className="text-orange-500" />
                                        <p className="text-sm text-orange-700 dark:text-orange-300">Gap is widening. Focus on closing high-value deals this week.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Intelligence Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dormant Risks */}
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Retention Alert</h3>
                            <button className={textSecondary}><MoreVertical size={16} /></button>
                        </div>

                        {intelligenceReport?.churn_risks && intelligenceReport.churn_risks.length > 0 ? (
                            <div className="space-y-4">
                                {intelligenceReport.churn_risks.slice(0, 3).map((risk: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                                                <Users size={18} />
                                            </div>
                                            <div>
                                                <p className={cn("text-sm font-medium", textPrimary)}>{risk.party_name}</p>
                                                <p className={cn("text-xs", textSecondary)}>{risk.days_since_last_order} days inactive</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-sm font-medium", textPrimary)}>{formatCurrency(risk.total_spent)}</p>
                                            <p className="text-xs text-red-500">At Risk</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={textSecondary}>No dormant high-value customers.</p>
                        )}
                    </div>

                    {/* Supply Chain / Inventory */}
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Stock Velocity</h3>
                            <button className={textSecondary}><MoreVertical size={16} /></button>
                        </div>

                        {intelligenceReport?.stockout_risks && intelligenceReport.stockout_risks.length > 0 ? (
                            <div className="space-y-4">
                                {intelligenceReport.stockout_risks.slice(0, 3).map((risk: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <p className={cn("text-sm font-medium", textPrimary)}>{risk.item_name}</p>
                                                <p className={cn("text-xs", textSecondary)}>{risk.velocity_30d} units/mo</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-orange-600">{risk.days_of_cover} Days</p>
                                            <p className={cn("text-xs", textSecondary)}>Cover</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={textSecondary}>Inventory levels appear healthy.</p>
                        )}
                    </div>
                </div>

                {/* Performance Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {/* Top Performers */}
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Top Performers</h3>
                        </div>
                        {intelligenceReport?.salesman_performance && (
                            <div className="space-y-5">
                                {intelligenceReport.salesman_performance.slice(0, 5).map((agent: any, idx: number) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={textPrimary}>{agent.agent_name}</span>
                                            <span className="font-medium text-[#7C3AED]">{formatCurrency(agent.total_revenue)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#7C3AED] rounded-full"
                                                style={{ width: `${(agent.total_revenue / intelligenceReport.salesman_performance[0].total_revenue) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Geo Performance */}
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Territory Performance</h3>
                        </div>
                        {intelligenceReport?.geo_insights && (
                            <div className="space-y-4">
                                {intelligenceReport.geo_insights.map((geo: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between border-b last:border-0 border-gray-100 dark:border-gray-800 pb-3 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <MapPin size={16} className="text-blue-400" />
                                            <span className={cn("text-sm", textPrimary)}>{geo.city_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn("text-sm block font-medium", textPrimary)}>{formatCurrency(geo.total_revenue)}</span>
                                            <span className="text-xs text-blue-400">{geo.deal_count} deals</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Matrix - Full Width */}
                {intelligenceReport?.product_matrix && intelligenceReport.product_matrix.length > 0 && (
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Product Matrix</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={cn("text-left text-xs uppercase tracking-wider border-b", isDarkMode ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400")}>
                                        <th className="pb-3 font-medium pl-2">Product</th>
                                        <th className="pb-3 font-medium text-right">Revenue</th>
                                        <th className="pb-3 font-medium text-right">Volume</th>
                                        <th className="pb-3 font-medium text-right pr-2">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className={cn("text-sm", textPrimary)}>
                                    {intelligenceReport.product_matrix.slice(0, 8).map((product: any, idx: number) => (
                                        <tr key={idx} className={cn("border-b last:border-0 transition-colors", isDarkMode ? "border-gray-800 hover:bg-gray-800/50" : "border-gray-50 hover:bg-gray-50")}>
                                            <td className="py-3 pl-2">{product.item_name}</td>
                                            <td className="py-3 text-right">{formatCurrency(product.revenue)}</td>
                                            <td className={cn("py-3 text-right", textSecondary)}>{product.volume}</td>
                                            <td className="py-3 text-right pr-2">
                                                <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", product.margin_pct > 20 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                                                    {product.margin_pct.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Gap Analysis - Full Width */}
                {intelligenceReport?.gap_analysis && intelligenceReport.gap_analysis.length > 0 && (
                    <div className={cardClass}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={headingClass}>Unsold Inventory (Capital Lock)</h3>
                            <p className={cn("text-xs px-2 py-1 rounded bg-orange-100 text-orange-700")}>Needs Action</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {intelligenceReport.gap_analysis.map((item: any, idx: number) => (
                                <div key={idx} className={cn("p-4 rounded-2xl border", isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-orange-50/50 border-orange-100")}>
                                    <p className={cn("text-sm font-medium mb-1 truncate", textPrimary)} title={item.item_name}>{item.item_name}</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className={cn("text-xs mb-0.5", textSecondary)}>Stock Level</p>
                                            <p className={cn("text-sm", textPrimary)}>{item.current_stock}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xs mb-0.5", textSecondary)}>Capital</p>
                                            <p className="text-sm font-medium text-orange-600">{formatCurrency(item.tied_capital_value)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CRMIntelligence;
