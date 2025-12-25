
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/shared/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, ExternalLink } from 'lucide-react';

export default function CustomerIntelligence() {
    const { data: insights, isLoading } = useQuery({
        queryKey: ['crm-customer-intelligence'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('crm_get_customer_intelligence');
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading Customer Insights...</div>;
    }

    return (
        <PageContainer title="Customer Insights" description="Buying Patterns & Retention Risks">
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Customer Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {insights?.map((customer) => (
                        <div
                            key={customer.party_name}
                            className="group flex flex-col md:flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-slate-200"
                        >
                            {/* Left: Info */}
                            <div className="flex-1 mb-4 md:mb-0 w-full">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-slate-800 text-lg">{customer.party_name}</h3>
                                    <Badge variant={
                                        customer.segment === 'VIP' ? 'default' :
                                            customer.segment === 'Dormant' ? 'destructive' : 'secondary'
                                    }>
                                        {customer.segment}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-6 mt-2 text-sm text-slate-500">
                                    <span>Last Order: <strong className="text-slate-700">{customer.last_order_days_ago} days ago</strong></span>
                                    <span>Lifetime Val: <strong className="text-slate-700">₹{(customer.total_revenue || 0).toLocaleString()}</strong></span>
                                </div>
                            </div>

                            {/* Right: Action */}
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="text-right hidden md:block mr-2">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Action</p>
                                    <p className="text-sm font-medium text-slate-800">{customer.action_needed}</p>
                                </div>

                                <div className="flex gap-2">
                                    <Button size="icon" variant="outline" className="h-9 w-9 text-slate-400 hover:text-blue-600">
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="outline" className="h-9 w-9 text-slate-400 hover:text-green-600">
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                                        View Profile
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {insights?.length === 0 && (
                        <div className="p-8 text-center bg-slate-50 rounded-lg text-slate-500">
                            No customer insights available yet. Process more invoices to generate patterns.
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
