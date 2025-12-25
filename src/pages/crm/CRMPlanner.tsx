import React, { useEffect } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { useBusinessIntelligence } from '@/hooks/useBusinessIntelligence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, MapPin, Zap, AlertCircle, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function CRMPlanner() {
    const {
        fetchBusinessPulse,
        pulse,
        salespersonRankings,
        cityPerformance,
        isLoading,
        lastUpdated,
        generateInsights,
        generateActions
    } = useBusinessIntelligence();
    const navigate = useNavigate();

    useEffect(() => {
        fetchBusinessPulse();
    }, [fetchBusinessPulse]);

    const insights = generateInsights();
    const actions = generateActions();

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${val.toFixed(0)}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading && !pulse) {
        return (
            <PageContainer title="Business Intelligence" description="Analyzing your business data...">
                <div className="space-y-6 max-w-4xl">
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Business Intelligence"
            description={
                <span className="flex items-center gap-2 text-slate-500">
                    Live analysis
                    {lastUpdated && <span>• Updated {formatTime(lastUpdated)}</span>}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchBusinessPulse}
                        disabled={isLoading}
                        className="h-6 px-2"
                    >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </span>
            }
        >
            <div className="space-y-10 max-w-4xl animate-in fade-in duration-500">

                {/* SECTION 1: Executive Summary */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                        <Target className="h-4 w-4" />
                        Executive Summary
                    </div>

                    {pulse && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-b border-slate-100 pb-6">
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(pulse.revenue_mtd)}</div>
                                    <div className="text-xs text-slate-500 mt-1">Revenue MTD</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{pulse.deals_this_month}</div>
                                    <div className="text-xs text-slate-500 mt-1">Deals Closed</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{pulse.customers_this_month}</div>
                                    <div className="text-xs text-slate-500 mt-1">Customers</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(pulse.avg_deal_value)}</div>
                                    <div className="text-xs text-slate-500 mt-1">Avg Deal</div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Monthly Target</span>
                                    <span className="font-medium">{formatCurrency(pulse.revenue_mtd)} / {formatCurrency(pulse.monthly_sales_target)}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (pulse.revenue_mtd / pulse.monthly_sales_target) * 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-500">
                                    Daily target: {formatCurrency(pulse.daily_sales_target)} • {Math.round((pulse.revenue_mtd / pulse.monthly_sales_target) * 100)}% complete
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* SECTION 2: AI Insights */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                        <Zap className="h-4 w-4" />
                        Analysis
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="space-y-3">
                            {insights.map((insight, idx) => (
                                <p key={idx} className="text-slate-700 leading-relaxed text-[15px]">
                                    {insight}
                                </p>
                            ))}
                            {insights.length === 0 && (
                                <p className="text-slate-500 italic">No data available for analysis yet. Start creating invoices to see insights.</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: Team Performance */}
                {salespersonRankings.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                            <Users className="h-4 w-4" />
                            Sales Velocity by Team
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {salespersonRankings.slice(0, 5).map((sp, idx) => (
                                <div key={sp.salesperson_id} className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                idx === 1 ? 'bg-slate-100 text-slate-600' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-50 text-slate-500'
                                            }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className="font-medium text-slate-900">{sp.salesperson_name}</div>
                                            <div className="text-xs text-slate-500">
                                                {sp.deals_this_month} deals • Avg {Math.round(sp.avg_days_to_close)} days to close
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900">{formatCurrency(sp.revenue_this_month)}</div>
                                        <div className="text-xs text-slate-500">this month</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 4: Geographic Distribution */}
                {cityPerformance.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                            <MapPin className="h-4 w-4" />
                            Geographic Distribution
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {cityPerformance.slice(0, 5).map((city, idx) => (
                                    <div key={city.city} className="text-center p-3 rounded-lg bg-slate-50">
                                        <div className="font-semibold text-slate-900">{city.city}</div>
                                        <div className="text-lg font-bold text-primary mt-1">{formatCurrency(city.total_revenue)}</div>
                                        <div className="text-xs text-slate-500">{city.customer_count} customers</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* SECTION 5: Priority Actions */}
                {actions.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                            <AlertCircle className="h-4 w-4" />
                            Priority Actions
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {actions.map((action) => (
                                <div key={action.priority} className="flex items-center gap-4 p-4">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${action.type === 'urgent' ? 'bg-red-100 text-red-700' :
                                            action.type === 'growth' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>
                                        {action.priority}
                                    </span>
                                    <span className="flex-1 text-slate-700">{action.action}</span>
                                    <Badge variant="outline" className={`text-xs ${action.type === 'urgent' ? 'border-red-200 text-red-600' :
                                            action.type === 'growth' ? 'border-emerald-200 text-emerald-600' :
                                                'border-blue-200 text-blue-600'
                                        }`}>
                                        {action.type}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Quick Links */}
                <section className="pt-4 border-t border-slate-200">
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => navigate('/sales')} className="text-sm">
                            View Invoices <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/crm/pipeline')} className="text-sm">
                            Pipeline <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/parties')} className="text-sm">
                            Customers <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                    </div>
                </section>

            </div>
        </PageContainer>
    );
}
