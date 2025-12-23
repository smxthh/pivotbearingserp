import { useState } from 'react';
import { ShoppingBag, Package, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
    id: string;
    invoice_number: string;
    invoice_date: string;
    party_name: string;
    grand_total: number;
    status: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading = false }: RecentActivityProps) {
    const navigate = useNavigate();
    const [showAllDialog, setShowAllDialog] = useState(false);

    const formatCurrency = (value: number | null | undefined) => {
        if (value == null || isNaN(value)) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
        } catch {
            return '-';
        }
    };

    const formatFullDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '-';
        }
    };

    // Get style based on status
    const getStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return { 
                    icon: CheckCircle, 
                    bg: 'bg-green-50', 
                    text: 'text-green-500', 
                    badgeBg: 'bg-green-50', 
                    badgeText: 'text-green-600', 
                    label: 'Confirmed' 
                };
            case 'cancelled':
                return { 
                    icon: XCircle, 
                    bg: 'bg-red-50', 
                    text: 'text-red-500', 
                    badgeBg: 'bg-red-50', 
                    badgeText: 'text-red-600', 
                    label: 'Cancelled' 
                };
            case 'pending':
                return { 
                    icon: Clock, 
                    bg: 'bg-amber-50', 
                    text: 'text-amber-500', 
                    badgeBg: 'bg-amber-50', 
                    badgeText: 'text-amber-600', 
                    label: 'Pending' 
                };
            case 'draft':
                return { 
                    icon: FileText, 
                    bg: 'bg-gray-100', 
                    text: 'text-gray-500', 
                    badgeBg: 'bg-gray-100', 
                    badgeText: 'text-gray-600', 
                    label: 'Draft' 
                };
            default:
                return { 
                    icon: FileText, 
                    bg: 'bg-blue-50', 
                    text: 'text-blue-500', 
                    badgeBg: 'bg-blue-50', 
                    badgeText: 'text-blue-600', 
                    label: 'Invoice' 
                };
        }
    };

    const handleSeeAll = () => {
        navigate('/accounting/tax-invoice');
    };

    const handleViewInvoice = (invoiceId: string) => {
        if (!invoiceId) return;
        navigate('/accounting/tax-invoice');
        setShowAllDialog(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-5 h-5 rounded" />
                        <Skeleton className="w-32 h-5 rounded" />
                    </div>
                    <Skeleton className="w-16 h-4 rounded" />
                </div>
                <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="w-24 h-4 rounded" />
                                <Skeleton className="w-32 h-3 rounded" />
                            </div>
                            <Skeleton className="w-16 h-6 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Safely handle activities array
    const safeActivities = Array.isArray(activities) ? activities : [];

    return (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <button
                        onClick={handleSeeAll}
                        className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        See All
                    </button>
                </div>

                <div className="space-y-6">
                    {safeActivities.length > 0 ? safeActivities.slice(0, 5).map((item) => {
                        const style = getStyle(item?.status || 'draft');
                        const Icon = style.icon;

                        return (
                            <div
                                key={item?.id || Math.random()}
                                className="flex items-start gap-4 group cursor-pointer"
                                onClick={() => handleViewInvoice(item?.id)}
                            >
                                <div className={`p-2 rounded-full shrink-0 mt-1 ${style.bg} ${style.text}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                        Invoice #{item?.invoice_number || '-'}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {item?.party_name || 'Unknown'} • {formatDate(item?.invoice_date)}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${style.badgeBg} ${style.badgeText}`}>
                                    {formatCurrency(item?.grand_total)}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            No recent activity
                        </div>
                    )}
                </div>
            </div>

            {/* See All Dialog */}
            <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Recent Activity - All Invoices
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                        {safeActivities.map((item) => {
                            const style = getStyle(item?.status || 'draft');
                            const Icon = style.icon;

                            return (
                                <div
                                    key={item?.id || Math.random()}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleViewInvoice(item?.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${style.bg} ${style.text}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">#{item?.invoice_number || '-'}</p>
                                            <p className="text-xs text-gray-500">{item?.party_name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">{formatCurrency(item?.grand_total)}</p>
                                        <p className="text-xs text-gray-400">{formatFullDate(item?.invoice_date)}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {safeActivities.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No activity to show</p>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <Button onClick={handleSeeAll} className="w-full">
                            View All Tax Invoices
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
