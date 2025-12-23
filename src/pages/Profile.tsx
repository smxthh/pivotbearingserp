import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useDistributorProfile } from '@/hooks/useDistributorProfile';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Building2,
  Save,
  Loader2,
  Settings,
  LogOut,
} from 'lucide-react';
import { format } from 'date-fns';
import { INDIAN_STATES } from '@/lib/constants';

const companySchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  company_alias: z.string().max(50).optional().or(z.literal('')),
  company_email: z.string().email('Invalid email').optional().or(z.literal('')),
  company_slogan: z.string().max(200).optional().or(z.literal('')),
  contact_person: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  company_country: z.string().default('India'),
  state: z.string().min(1, 'State is required'),
  company_district: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  pincode: z.string().max(6).optional().or(z.literal('')),
  msme_reg_no: z.string().max(50).optional().or(z.literal('')),
  gst_number: z.string().max(15).optional().or(z.literal('')),
  pan_number: z.string().max(10).optional().or(z.literal('')),
  lic_no: z.string().max(50).optional().or(z.literal('')),
  bank_name: z.string().max(100).optional().or(z.literal('')),
  bank_branch: z.string().max(100).optional().or(z.literal('')),
  account_name: z.string().max(100).optional().or(z.literal('')),
  account_no: z.string().max(30).optional().or(z.literal('')),
  ifsc_code: z.string().max(15).optional().or(z.literal('')),
  swift_code: z.string().max(15).optional().or(z.literal('')),
  invoice_prefix: z.string().max(10).default('INV'),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const { profile, saveProfile, isLoading, isSaving } = useDistributorProfile();
  const [activeTab, setActiveTab] = useState('profile');

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      company_alias: '',
      company_email: '',
      company_slogan: '',
      contact_person: '',
      phone: '',
      company_country: 'India',
      state: 'Gujarat',
      company_district: '',
      city: '',
      address: '',
      pincode: '',
      msme_reg_no: '',
      gst_number: '',
      pan_number: '',
      lic_no: '',
      bank_name: '',
      bank_branch: '',
      account_name: '',
      account_no: '',
      ifsc_code: '',
      swift_code: '',
      invoice_prefix: 'INV',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        company_name: profile.company_name || '',
        company_alias: profile.company_alias || '',
        company_email: profile.company_email || '',
        company_slogan: profile.company_slogan || '',
        contact_person: profile.contact_person || '',
        phone: profile.phone || '',
        company_country: profile.company_country || 'India',
        state: profile.state || 'Gujarat',
        company_district: profile.company_district || '',
        city: profile.city || '',
        address: profile.address || '',
        pincode: profile.pincode || '',
        msme_reg_no: profile.msme_reg_no || '',
        gst_number: profile.gst_number || '',
        pan_number: profile.pan_number || '',
        lic_no: profile.lic_no || '',
        bank_name: profile.bank_name || '',
        bank_branch: profile.bank_branch || '',
        account_name: profile.account_name || '',
        account_no: profile.account_no || '',
        ifsc_code: profile.ifsc_code || '',
        swift_code: profile.swift_code || '',
        invoice_prefix: profile.invoice_prefix || 'INV',
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: CompanyFormData) => {
    try {
      await saveProfile.mutateAsync({
        company_name: data.company_name,
        company_alias: data.company_alias || null,
        company_email: data.company_email || null,
        company_slogan: data.company_slogan || null,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        company_country: data.company_country || 'India',
        state: data.state || null,
        company_district: data.company_district || null,
        city: data.city || null,
        address: data.address || null,
        pincode: data.pincode || null,
        msme_reg_no: data.msme_reg_no || null,
        gst_number: data.gst_number || null,
        pan_number: data.pan_number || null,
        lic_no: data.lic_no || null,
        bank_name: data.bank_name || null,
        bank_branch: data.bank_branch || null,
        account_name: data.account_name || null,
        account_no: data.account_no || null,
        ifsc_code: data.ifsc_code || null,
        swift_code: data.swift_code || null,
        invoice_prefix: data.invoice_prefix || 'INV',
      });
    } catch (error) {
      console.error('Error saving company info:', error);
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'distributor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'salesperson':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'Not Assigned';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const canEditCompany = role === 'admin' || role === 'superadmin';

  return (
    <PageContainer title="My Profile">
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-10 p-1 bg-muted/60 rounded-lg mb-8">
            <TabsTrigger
              value="profile"
              className="rounded-md px-6 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {canEditCompany && (
              <TabsTrigger
                value="configuration"
                className="rounded-md px-6 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-0 space-y-6">
            {/* User Card */}
            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <Avatar className="w-16 h-16 border-2 border-border">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {getInitials(user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground truncate">{user?.email}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`${getRoleBadgeColor(role)} text-xs font-medium`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {formatRole(role)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Joined {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                  </div>
                  <p className="text-sm font-medium">{user?.email}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                  </div>
                  <p className="text-sm font-medium">
                    {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Logout Section */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Sign Out</p>
                      <p className="text-xs text-muted-foreground">Log out of your account</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Company Preview for non-editors */}
            {!canEditCompany && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Assignment</span>
                  </div>
                  <p className="text-sm font-medium text-emerald-600">Active Salesperson</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          {canEditCompany && (
            <TabsContent value="configuration" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Company Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="RM Enterprise" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="company_alias"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Alias</FormLabel>
                                <FormControl>
                                  <Input placeholder="RME" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="company_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="info@company.com" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="9876543210" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="contact_person"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Contact Person</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="company_slogan"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Slogan</FormLabel>
                                <FormControl>
                                  <Input placeholder="Quality First" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Address */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Address</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <FormField
                            control={form.control}
                            name="company_country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Country</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9 bg-muted/40 border-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="India">India</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">State *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9 bg-muted/40 border-0">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {INDIAN_STATES.map((state) => (
                                      <SelectItem key={state} value={state}>{state}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="company_district"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">District</FormLabel>
                                <FormControl>
                                  <Input placeholder="Surat" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Surat" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="pincode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Pincode</FormLabel>
                                <FormControl>
                                  <Input placeholder="394220" maxLength={6} className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Full Address</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Street address, Building name, etc."
                                    className="resize-none bg-muted/40 border-0 min-h-[70px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tax & Registration */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Tax & Registration</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="gst_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">GST No.</FormLabel>
                                <FormControl>
                                  <Input placeholder="24ABJFR2240A1ZU" maxLength={15} className="h-9 bg-muted/40 border-0 uppercase" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="pan_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">PAN No.</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABJFR2240A" maxLength={10} className="h-9 bg-muted/40 border-0 uppercase" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="msme_reg_no"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">MSME No.</FormLabel>
                                <FormControl>
                                  <Input placeholder="MSME123456" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lic_no"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">LIC No.</FormLabel>
                                <FormControl>
                                  <Input placeholder="LIC123" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bank Details */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Bank Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="bank_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Bank Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="State Bank of India" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bank_branch"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Branch</FormLabel>
                                <FormControl>
                                  <Input placeholder="Main Branch" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="account_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Account Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="RM Enterprise" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="account_no"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Account No.</FormLabel>
                                <FormControl>
                                  <Input placeholder="1234567890" className="h-9 bg-muted/40 border-0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ifsc_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">IFSC Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="SBIN0001234" className="h-9 bg-muted/40 border-0 uppercase" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="swift_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Swift Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="SBININBB" className="h-9 bg-muted/40 border-0 uppercase" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Invoice Settings */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Invoice Settings</h3>
                        <FormField
                          control={form.control}
                          name="invoice_prefix"
                          render={({ field }) => (
                            <FormItem className="max-w-[200px]">
                              <FormLabel className="text-xs text-muted-foreground">Invoice Prefix</FormLabel>
                              <FormControl>
                                <Input placeholder="INV" maxLength={10} className="h-9 bg-muted/40 border-0 uppercase" {...field} />
                              </FormControl>
                              <p className="text-[11px] text-muted-foreground mt-1">e.g., INV-2024-001</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="h-9 px-6"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PageContainer>
  );
}
