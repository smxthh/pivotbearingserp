import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ExportFormat = 'json' | 'csv' | 'excel';
export type ExportType = 'all' | 'parties' | 'invoices' | 'items' | 'vouchers';

interface ExportOptions {
  targetUserId: string;
  targetUserEmail: string;
  exportType: ExportType;
  exportFormat: ExportFormat;
}

export function useDataExport() {
  const { user, role, tenantId } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canExport = role === 'superadmin';

  const exportUserData = async (options: ExportOptions) => {
    if (!canExport) {
      toast.error('Only SuperAdmins can export data');
      return null;
    }

    if (!tenantId || !user?.id) {
      toast.error('Unable to verify tenant');
      return null;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Get the distributor_id for the target user
      const { data: targetProfile, error: profileError } = await supabase
        .from('distributor_profiles')
        .select('id')
        .eq('user_id', options.targetUserId)
        .maybeSingle();

      if (profileError) {
        throw new Error('Failed to find user profile');
      }

      const distributorId = targetProfile?.id;
      let exportData: Record<string, any[]> = {};
      let totalRecords = 0;

      setExportProgress(10);

      // Export based on type
      if (options.exportType === 'all' || options.exportType === 'parties') {
        const { data: parties } = await supabase
          .from('parties')
          .select('*')
          .eq('distributor_id', distributorId || '');
        exportData.parties = parties || [];
        totalRecords += exportData.parties.length;
      }
      setExportProgress(30);

      if (options.exportType === 'all' || options.exportType === 'items') {
        const { data: items } = await supabase
          .from('items')
          .select('*')
          .eq('distributor_id', distributorId || '');
        exportData.items = items || [];
        totalRecords += exportData.items.length;
      }
      setExportProgress(50);

      if (options.exportType === 'all' || options.exportType === 'invoices') {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('distributor_id', distributorId || '');
        exportData.invoices = invoices || [];
        totalRecords += exportData.invoices.length;
      }
      setExportProgress(70);

      if (options.exportType === 'all' || options.exportType === 'vouchers') {
        const { data: vouchers } = await supabase
          .from('vouchers')
          .select('*, voucher_items(*)')
          .eq('distributor_id', distributorId || '');
        exportData.vouchers = vouchers || [];
        totalRecords += exportData.vouchers.length;
      }
      setExportProgress(90);

      // Log the export
      await supabase.from('data_export_logs').insert({
        tenant_id: tenantId,
        superadmin_id: user.id,
        target_user_email: options.targetUserEmail,
        target_user_id: options.targetUserId,
        export_type: options.exportType,
        export_format: options.exportFormat,
        record_count: totalRecords,
        metadata: { tables: Object.keys(exportData) }
      });

      // Generate file based on format
      let fileContent: string;
      let mimeType: string;
      let fileName: string;

      const timestamp = new Date().toISOString().slice(0, 10);

      if (options.exportFormat === 'json') {
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileName = `export_${options.targetUserEmail}_${timestamp}.json`;
      } else if (options.exportFormat === 'csv') {
        // Simple CSV for the first available data type
        const firstKey = Object.keys(exportData)[0];
        const data = exportData[firstKey] || [];
        if (data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => 
            Object.values(row).map(v => 
              typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
            ).join(',')
          ).join('\n');
          fileContent = `${headers}\n${rows}`;
        } else {
          fileContent = 'No data';
        }
        mimeType = 'text/csv';
        fileName = `export_${options.targetUserEmail}_${timestamp}.csv`;
      } else {
        // Default to JSON for excel (would need xlsx library for proper Excel)
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileName = `export_${options.targetUserEmail}_${timestamp}.json`;
      }

      // Trigger download
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      toast.success(`Exported ${totalRecords} records successfully`);

      return { success: true, recordCount: totalRecords };
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
      return null;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return {
    canExport,
    isExporting,
    exportProgress,
    exportUserData,
  };
}
