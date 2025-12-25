import { useEffect } from 'react';
import { useBusinessIntelligence } from '@/hooks/useBusinessIntelligence';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, IndianRupee, PieChart } from 'lucide-react';

export default function RevenueGrowth() {
    const { pulse, isLoading, fetchBusinessPulse, cityPerformance } = useBusinessIntelligence();

    useEffect(() => {
        fetchBusinessPulse();
    }, [fetchBusinessPulse]);

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Calculating Growth Metrics...</div>;
    }

    // Get top performing zone from city performance
    const topZone = cityPerformance.length > 0 ? cityPerformance[0].city : 'N/A';

    return (
        <PageContainer title="Revenue & Growth" description="Performance Trends & Forecasts">
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Revenue (MTD)</CardTitle>
                            <IndianRupee className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ₹{(pulse?.revenue_mtd || 0).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Avg Deal Value</CardTitle>
                            <PieChart className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ₹{(pulse?.avg_deal_value || 0).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Sales Velocity</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                {Math.round(pulse?.avg_days_to_close || 0)} Days
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Average time to close</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Insights Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="bg-slate-50 p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Performance</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-slate-600">Best Zone</span>
                                <span className="font-medium text-slate-900">{topZone}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-slate-600">Top Performer</span>
                                <span className="font-medium text-slate-900">{pulse?.top_performer_name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <span className="text-slate-600">Deals This Month</span>
                                <span className="font-medium text-slate-900">{pulse?.deals_this_month || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
