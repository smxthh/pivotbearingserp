import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useDataExport, ExportFormat, ExportType } from '@/hooks/useDataExport';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileJson, FileSpreadsheet, FileText, Users, Shield, Loader2 } from 'lucide-react';

export default function DataExportPage() {
  const { role, loading } = useAuth();
  const { tenantUsers, isLoadingUsers, canDownloadData } = useTenant();
  const { isExporting, exportProgress, exportUserData } = useDataExport();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [exportType, setExportType] = useState<ExportType>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  // Only SuperAdmin can access this page
  if (loading) {
    return (
      <PageContainer title="Data Export">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const selectedUser = tenantUsers.find(u => u.user_id === selectedUserId);

  const handleExport = async () => {
    if (!selectedUserId || !selectedUser) return;

    await exportUserData({
      targetUserId: selectedUserId,
      targetUserEmail: selectedUser.email,
      exportType,
      exportFormat,
    });
  };

  const exportTypeOptions: { value: ExportType; label: string; description: string }[] = [
    { value: 'all', label: 'All Data', description: 'Export all user data' },
    { value: 'parties', label: 'Parties', description: 'Customer and supplier data' },
    { value: 'items', label: 'Items', description: 'Products and inventory' },
    { value: 'invoices', label: 'Invoices', description: 'All invoice records' },
    { value: 'vouchers', label: 'Vouchers', description: 'Transaction vouchers' },
  ];

  const formatOptions: { value: ExportFormat; label: string; icon: React.ElementType }[] = [
    { value: 'json', label: 'JSON', icon: FileJson },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { value: 'excel', label: 'Excel (JSON)', icon: FileText },
  ];

  return (
    <PageContainer title="Data Export" description="Download user data for compliance and backup purposes">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Selection Card */}
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select User
              </CardTitle>
              <CardDescription>
                Choose a user from your tenant to export their data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingUsers ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="user-select">User Email</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger id="user-select">
                        <SelectValue placeholder="Select a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantUsers.map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            <div className="flex items-center gap-2">
                              <span>{user.email}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser && (
                    <div className="p-3 rounded-lg bg-muted/50 animate-in slide-in-from-top duration-300">
                      <div className="text-sm space-y-1">
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Role:</strong> <span className="capitalize">{selectedUser.role}</span></p>
                        <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {tenantUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found in your tenant
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Export Options Card */}
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>
                Configure what data to export and in which format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="export-type">Data Type</Label>
                <Select value={exportType} onValueChange={(v: ExportType) => setExportType(v)}>
                  <SelectTrigger id="export-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            - {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Export Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={exportFormat === opt.value ? 'default' : 'outline'}
                        className="flex items-center gap-2 transition-all duration-200"
                        onClick={() => setExportFormat(opt.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exporting...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={!selectedUserId || isExporting || !canDownloadData}
                className="w-full transition-all duration-200 hover:scale-[1.02]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Shield className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="space-y-1">
                <h3 className="font-semibold">Data Export Compliance</h3>
                <p className="text-sm text-muted-foreground">
                  All data exports are logged for audit purposes. Only SuperAdmins can export data,
                  and only for users within their tenant. Export logs include timestamp, user email,
                  data type, and record count.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
