
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowUpRight, CheckCircle2, Target, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CRMDashboard() {
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['crm-command-dashboard'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('crm_get_command_dashboard', {
                target_monthly_revenue: 5000000 // Default target, could be dynamic later
            });
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Command Center...</div>;
    }

    // Calculate pacing percentage
    const pacing = dashboardData?.revenue_target_mtd
        ? ((dashboardData.revenue_mtd || 0) / dashboardData.revenue_target_mtd) * 100
        : 0;

    return (
        <PageContainer title="Command Center" description="Daily Pulse & Execution Priorities">
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Top Blocker Alert */}
                {dashboardData?.top_blocker && (
                    <Alert variant={dashboardData.pending_followups && dashboardData.pending_followups > 5 ? "destructive" : "default"} className="border-l-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Critical Focus for Today</AlertTitle>
                        <AlertDescription>
                            {dashboardData.top_blocker}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Metric 1: Today's Leads */}
                    <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">New Leads Today</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">{dashboardData?.todays_leads || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Requires immediate response</p>
                        </CardContent>
                    </Card>

                    {/* Metric 2: Pending Followups */}
                    <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Pending Actions</CardTitle>
                            <Target className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">{dashboardData?.pending_followups || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Quotes awaiting closure</p>
                        </CardContent>
                    </Card>

                    {/* Metric 3: Revenue MTD */}
                    <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Revenue (MTD)</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ₹{(dashboardData?.revenue_mtd || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.min(pacing, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{pacing.toFixed(1)}% of Target</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Strategic Explanation */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        Execution Protocol
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                        <li>Check <strong>Execution Tasks</strong> for high-value quotes that need a push.</li>
                        <li>Review <strong>Pipeline Health</strong> to unstick stalled deals.</li>
                        <li>Use <strong>Expansion Planner</strong> to simulate next month's growth strategy.</li>
                    </ul>
                </div>
            </div>
        </PageContainer>
    );
}

