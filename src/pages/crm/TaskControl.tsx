
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/shared/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TaskControl() {
    const navigate = useNavigate();
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['crm-tasks-execution'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('crm_get_tasks_execution');
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Execution Plan...</div>;
    }

    // Group by priority
    const highPriority = tasks?.filter(t => t.priority === 'High') || [];
    const otherTasks = tasks?.filter(t => t.priority !== 'High') || [];

    return (
        <PageContainer title="Execution Control" description="Revenue-Critical Actions">
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column: High Priority */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <h3 className="font-semibold text-slate-800">Critical Actions (Do Today)</h3>
                        </div>

                        {highPriority.length === 0 && (
                            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                                No critical tasks pending. Good job!
                            </div>
                        )}

                        {highPriority.map((task, i) => (
                            <Card key={i} className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Badge variant="destructive" className="mb-2">High Impact</Badge>
                                            <h4 className="font-semibold text-lg text-slate-800">{task.task_type}</h4>
                                            <p className="text-slate-600 mt-1">{task.description}</p>
                                        </div>
                                        <div className="text-right">
                                            {task.deal_value && task.deal_value > 0 && (
                                                <div className="text-lg font-bold text-slate-800">₹{(task.deal_value).toLocaleString()}</div>
                                            )}
                                            <Button size="sm" className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate('/sales')}>
                                                Execute Now
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Sidebar: Other Tasks */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                            <h3 className="font-semibold text-slate-800">Up Next (Backlog)</h3>
                        </div>

                        {otherTasks.map((task, i) => (
                            <div key={i} className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{task.task_type}</span>
                                    {task.priority === 'Medium' && <Clock className="h-3 w-3 text-amber-500" />}
                                </div>
                                <p className="text-sm font-medium text-slate-700 leading-snug">{task.description}</p>
                                <button className="text-xs text-blue-600 font-medium mt-3 hover:underline">
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

