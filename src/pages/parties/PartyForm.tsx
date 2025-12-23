import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useParties, useParty, PartyInsert, PartyUpdate } from '@/hooks/useParties';
import { useDistributorId } from '@/hooks/useDistributorProfile';

// NOTE: This file is deprecated. Use PartyDialog component instead.
// Inline constants to avoid import errors
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const partySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['customer', 'supplier', 'both']),
  gst_number: z.string().max(15).optional().or(z.literal('')),
  pan_number: z.string().max(10).optional().or(z.literal('')),
  state: z.string().min(1, 'State is required'),
  city: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  pincode: z.string().max(6).optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  opening_balance: z.coerce.number().default(0),
  credit_limit: z.coerce.number().default(0),
  credit_days: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

type PartyFormData = z.infer<typeof partySchema>;

export default function PartyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';

  // Hooks
  const { addParty, updateParty, isAdding, isUpdating } = useParties({ realtime: false });
  const { data: existingParty, isLoading: isLoadingParty } = useParty(isEdit ? id : undefined);
  const { data: distributorId, isLoading: isLoadingDistributor } = useDistributorId();

  const form = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: '',
      type: 'customer',
      gst_number: '',
      pan_number: '',
      state: '',
      city: '',
      address: '',
      pincode: '',
      phone: '',
      email: '',
      opening_balance: 0,
      credit_limit: 0,
      credit_days: 0,
      is_active: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existingParty) {
      form.reset({
        name: existingParty.name,
        type: existingParty.type as 'customer' | 'supplier' | 'both',
        gst_number: existingParty.gst_number || '',
        pan_number: existingParty.pan_number || '',
        state: existingParty.state,
        city: existingParty.city || '',
        address: existingParty.address || '',
        pincode: existingParty.pincode || '',
        phone: existingParty.phone || '',
        email: existingParty.email || '',
        opening_balance: existingParty.opening_balance,
        credit_limit: existingParty.credit_limit,
        credit_days: existingParty.credit_days,
        is_active: existingParty.is_active,
      });
    }
  }, [isEdit, existingParty, form]);

  const onSubmit = async (data: PartyFormData) => {
    try {
      if (isEdit) {
        const updates: PartyUpdate = {
          name: data.name,
          type: data.type,
          gst_number: data.gst_number || null,
          pan_number: data.pan_number || null,
          state: data.state,
          city: data.city || null,
          address: data.address || null,
          pincode: data.pincode || null,
          phone: data.phone || null,
          email: data.email || null,
          credit_limit: data.credit_limit,
          credit_days: data.credit_days,
          is_active: data.is_active,
        };

        await updateParty.mutateAsync({ id, updates });
      } else {
        if (!distributorId) {
          throw new Error('Distributor profile not found');
        }

        const partyData: Omit<PartyInsert, 'id' | 'created_at' | 'updated_at'> = {
          distributor_id: distributorId,
          name: data.name,
          type: data.type,
          gst_number: data.gst_number || null,
          pan_number: data.pan_number || null,
          state: data.state,
          city: data.city || null,
          address: data.address || null,
          pincode: data.pincode || null,
          phone: data.phone || null,
          email: data.email || null,
          opening_balance: data.opening_balance,
          current_balance: data.opening_balance,
          credit_limit: data.credit_limit,
          credit_days: data.credit_days,
          is_active: data.is_active,
        };

        await addParty.mutateAsync(partyData);
      }
      navigate('/parties');
    } catch (error) {
      console.error('Error saving party:', error);
    }
  };

  const isLoading = isLoadingParty || isLoadingDistributor;
  const isSaving = isAdding || isUpdating;

  // Loading state for edit mode
  if (isEdit && isLoading) {
    return (
      <PageContainer title="Edit Party">
        <Button variant="ghost" disabled className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parties
        </Button>
        <div className="max-w-2xl space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={isEdit ? 'Edit Party' : 'New Party'}>
      <Button variant="ghost" onClick={() => navigate('/parties')} className="mb-4 rounded-lg">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Parties
      </Button>

      <div className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold tracking-tight mb-4">Basic Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter party name" className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="both">Both (Customer & Supplier)</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <Input placeholder="27AABCU9603R1ZM" className="rounded-lg uppercase" {...field} />
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
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ABCDE1234F" className="rounded-lg uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold tracking-tight mb-4">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" className="rounded-lg" {...field} />
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
                        <Input type="email" placeholder="email@example.com" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter full address" className="rounded-lg resize-none" {...field} />
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
                        <Input placeholder="City" className="rounded-lg" {...field} />
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
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="380001" className="rounded-lg" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold tracking-tight mb-4">Financial Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="opening_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" className="rounded-lg" {...field} disabled={isEdit} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {isEdit ? 'Cannot change after creation' : 'Positive = Receivable, Negative = Payable'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credit_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Maximum allowed credit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credit_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Days</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Payment due period</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Inactive parties won't appear in transaction dropdowns
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" className="rounded-lg" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? 'Update Party' : 'Create Party'}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/parties')} className="rounded-lg">
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
}
