import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                        <ShieldX className="w-10 h-10 text-destructive" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Access Denied
                    </h1>

                    {/* Description */}
                    <p className="text-slate-500 mb-6">
                        You don't have permission to access this page. If you believe this is an error, please contact your administrator.
                    </p>

                    {/* Error Code */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 mb-8">
                        <span className="font-mono font-medium">403</span>
                        <span className="text-slate-400">|</span>
                        <span>Forbidden</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                        <Button asChild className="rounded-xl">
                            <Link to="/">
                                <Home className="w-4 h-4 mr-2" />
                                Go to Dashboard
                            </Link>
                        </Button>
                    </div>

                    {/* Contact Admin */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2">Need access?</p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80"
                            onClick={() => {
                                // Could open a mailto or support dialog
                                window.location.href = 'mailto:admin@example.com?subject=Access Request';
                            }}
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Contact Administrator
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
