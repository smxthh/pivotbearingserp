
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/shared/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, BarChart3, Filter, AlertCircle } from 'lucide-react';

export default function PipelineIntelligence() {
    const { data: stages, isLoading } = useQuery({
        queryKey: ['crm-pipeline-intelligence'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('crm_get_pipeline_intelligence');
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Analyze Pipeline...</div>;
    }

    return (
        <PageContainer title="Pipeline Health" description="Funnel Analysis & Velocity Metrics">
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Funnel Visualisation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stages?.map((stage, index) => (
                        <Card key={stage.stage} className="relative overflow-hidden border-t-4 border-t-indigo-500">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <h1 className="text-9xl font-bold text-slate-900">{index + 1}</h1>
                            </div>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stage.stage}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-800 mb-1">{stage.count}</div>
                                <div className="text-sm text-slate-500 font-medium">
                                    ₹{(stage.value || 0).toLocaleString('en-IN')}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                    <span>Avg Age</span>
                                    <span className="font-semibold text-slate-600">{Math.round(stage.avg_age_days || 0)} Days</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bottleneck Analysis (Static logic for now based on typical patterns) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Filter className="h-5 w-5 text-indigo-500" />
                        Bottleneck Detection
                    </h3>
                    <div className="space-y-4">
                        {stages?.find(s => s.stage === 'Quotation' && (s.count || 0) > 10) && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-amber-900">High Volume of Pending Quotes</h4>
                                    <p className="text-sm text-amber-700 mt-1">
                                        You have {stages.find(s => s.stage === 'Quotation')?.count} pending quotations.
                                        This indicates a closing problem. Consider running a discount campaign or follow-up sprint.
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* General Healthy Message if no obvious issues */}
                        {!stages?.find(s => s.stage === 'Quotation' && (s.count || 0) > 10) && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-green-800 text-sm">
                                Pipeline flow looks healthy. Focus on adding more Enquiries.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
