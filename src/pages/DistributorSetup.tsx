import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Save, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useDistributorProfile } from '@/hooks/useDistributorProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const profileSchema = z.object({
    company_name: z.string().min(1, 'Company name is required').max(200),
    address: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    pincode: z.string().max(6).optional().or(z.literal('')),
    phone: z.string().max(15).optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    gst_number: z.string().max(15).optional().or(z.literal('')),
    invoice_prefix: z.string().max(10).default('INV'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function DistributorSetup() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, saveProfile, isLoading, isSaving } = useDistributorProfile();
    const [isEdit, setIsEdit] = useState(false);

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            company_name: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            email: '',
            gst_number: '',
            invoice_prefix: 'INV',
        },
    });

    useEffect(() => {
        if (profile) {
            setIsEdit(true);
            form.reset({
                company_name: profile.company_name,
                address: profile.address || '',
                city: profile.city || '',
                state: profile.state || '',
                pincode: profile.pincode || '',
                phone: profile.phone || '',
                email: '', // email not in current schema
                gst_number: profile.gst_number || '',
                invoice_prefix: profile.invoice_prefix || 'INV',
            });
        }
    }, [profile, form]);

    const onSubmit = async (data: ProfileFormData) => {
        try {
            await saveProfile.mutateAsync({
                company_name: data.company_name,
                address: data.address || null,
                city: data.city || null,
                state: data.state || null,
                pincode: data.pincode || null,
                phone: data.phone || null,
                gst_number: data.gst_number || null,
                invoice_prefix: data.invoice_prefix,
            });

            if (!isEdit) {
                toast.success('Profile created successfully! You can now add parties.');
                // Redirect to parties page after successful creation
                setTimeout(() => {
                    navigate('/parties');
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            // Error toast is handled by the mutation
        }
    };

    if (isLoading) {
        return (
            <PageContainer title="Distributor Setup">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title={isEdit ? 'Edit Profile' : 'Setup Your Profile'}>
            <div className="max-w-3xl mx-auto">
                <Card className="rounded-xl border-2">
                    <CardHeader className="bg-primary/5 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">
                                    {isEdit ? 'Company Profile' : 'Welcome! Let\'s set up your profile'}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {isEdit
                                        ? 'Update your company information and invoice settings'
                                        : 'Please provide your company details to get started with the ERP system'
                                    }
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Company Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">Company Information</h3>

                                    <FormField
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Company Name <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your company name"
                                                        className="rounded-lg"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="gst_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>GST Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="22AAAAA0000A1Z5"
                                                            className="rounded-lg uppercase"
                                                            maxLength={15}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="invoice_prefix"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Invoice Prefix</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="INV"
                                                            className="rounded-lg uppercase"
                                                            maxLength={10}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Used in invoice numbers (e.g., INV-2024-001)
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">Contact Information</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter phone number"
                                                            className="rounded-lg"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="company@example.com"
                                                            className="rounded-lg"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Address Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-primary">Address</h3>

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Street Address</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter complete address"
                                                        className="rounded-lg resize-none"
                                                        rows={3}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="City"
                                                            className="rounded-lg"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="State"
                                                            className="rounded-lg"
                                                            {...field}
                                                        />
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
                                                    <FormLabel>Pincode</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Pincode"
                                                            className="rounded-lg"
                                                            maxLength={6}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        type="submit"
                                        disabled={isSaving}
                                        className="rounded-lg"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                {isEdit ? 'Update Profile' : 'Create Profile'}
                                            </>
                                        )}
                                    </Button>
                                    {isEdit && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => navigate(-1)}
                                            className="rounded-lg"
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
