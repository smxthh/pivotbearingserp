import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, BadgeCheck, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useParties, Party, PartyInsert, PartyUpdate } from '@/hooks/useParties';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { INDIAN_STATES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Gujarat Districts
const GUJARAT_DISTRICTS = [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
    'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi',
    'Vadodara', 'Valsad',
];

const REGISTRATION_TYPES = [
    { value: 'registered', label: 'Registered' },
    { value: 'composition', label: 'Composition' },
    { value: 'overseas', label: 'Overseas' },
    { value: 'unregistered', label: 'Un-Registered' },
];

const partySchema = z.object({
    name: z.string().min(1, 'Company name is required').max(200),
    party_code: z.string().optional(),
    type: z.enum(['customer', 'supplier', 'both']),
    legal_name: z.string().optional().or(z.literal('')),
    contact_person: z.string().optional().or(z.literal('')),
    mobile: z.string().max(15).optional().or(z.literal('')),
    whatsapp: z.string().max(15).optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    currency: z.string().default('INR'),
    credit_days: z.coerce.number().int().min(0).default(0),
    credit_limit: z.coerce.number().min(0).default(0),
    distance_km: z.coerce.number().min(0).default(0),
    registration_type: z.string().default('registered'),
    gst_number: z.string().max(15).optional().or(z.literal('')),
    gst_reg_date: z.string().optional().or(z.literal('')),
    pan_number: z.string().max(10).optional().or(z.literal('')),
    country: z.string().default('India'),
    state: z.string().min(1, 'State is required'),
    district: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    pincode: z.string().max(6).optional().or(z.literal('')),
    group_name: z.string().default('Sundry Debtors'),
    opening_balance: z.coerce.number().default(0),
});

type PartyFormData = z.infer<typeof partySchema>;

interface PartyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    party?: Party | null;
    onSuccess?: () => void;
}

export function PartyDialog({ open, onOpenChange, party, onSuccess }: PartyDialogProps) {
    const isEdit = !!party;
    const [isVerifyingGst, setIsVerifyingGst] = useState(false);
    const { user, role } = useAuth();

    const { addParty, updateParty, isAdding, isUpdating } = useParties({ realtime: false });
    const { data: distributorId } = useDistributorId();

    const form = useForm<PartyFormData>({
        resolver: zodResolver(partySchema),
        defaultValues: {
            name: '',
            party_code: '',
            type: 'customer',
            legal_name: '',
            contact_person: '',
            mobile: '',
            whatsapp: '',
            email: '',
            currency: 'INR',
            credit_days: 0,
            credit_limit: 0,
            distance_km: 0,
            registration_type: 'registered',
            gst_number: '',
            gst_reg_date: '',
            pan_number: '',
            country: 'India',
            state: 'Gujarat',
            district: '',
            city: '',
            address: '',
            pincode: '',
            group_name: 'Sundry Debtors',
            opening_balance: 0,
        },
    });

    // Generate party code on type change
    const partyType = form.watch('type');

    useEffect(() => {
        if (!isEdit && distributorId) {
            generatePartyCode(partyType);
        }
    }, [partyType, isEdit, distributorId]);

    // Populate form when editing
    useEffect(() => {
        if (party) {
            form.reset({
                name: party.name,
                party_code: (party as any).party_code || '',
                type: party.type as 'customer' | 'supplier' | 'both',
                legal_name: (party as any).legal_name || '',
                contact_person: (party as any).contact_person || '',
                mobile: (party as any).mobile || '',
                whatsapp: (party as any).whatsapp || '',
                email: party.email || '',
                currency: (party as any).currency || 'INR',
                credit_days: party.credit_days,
                credit_limit: party.credit_limit,
                distance_km: (party as any).distance_km || 0,
                registration_type: (party as any).registration_type || 'registered',
                gst_number: party.gst_number || '',
                gst_reg_date: (party as any).gst_reg_date || '',
                pan_number: party.pan_number || '',
                country: (party as any).country || 'India',
                state: party.state,
                district: (party as any).district || '',
                city: party.city || '',
                address: party.address || '',
                pincode: party.pincode || '',
                group_name: (party as any).group_name || 'Sundry Debtors',
                opening_balance: party.opening_balance,
            });
        }
    }, [party, form]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open, form]);

    const generatePartyCode = async (type: string) => {
        if (!distributorId) return;

        try {
            const { data, error } = await supabase.rpc('generate_party_code', {
                p_distributor_id: distributorId,
                p_party_type: type,
            });

            if (!error && data && typeof data === 'string') {
                form.setValue('party_code', data);
            }
        } catch (err) {
            // Fallback - generate simple code
            const prefix = type === 'customer' ? 'C' : type === 'supplier' ? 'S' : 'P';
            form.setValue('party_code', `${prefix}001`);
        }
    };

    const handleVerifyGst = async () => {
        const gst = form.getValues('gst_number');
        if (!gst || gst.length !== 15) {
            toast.error('Please enter a valid 15-character GSTIN');
            return;
        }

        setIsVerifyingGst(true);

        try {
            // Import GST API service
            const { fetchGSTDetails, extractPANFromGSTIN, extractStateFromGSTIN, getFullAddress } = await import('@/services/gstApi');

            // Validate and fetch GST details
            const result = await fetchGSTDetails(gst);

            if (!result.success || !result.data) {
                // Even if API fails, extract basic info
                const pan = extractPANFromGSTIN(gst);
                const state = extractStateFromGSTIN(gst);

                if (pan) form.setValue('pan_number', pan);
                if (state) form.setValue('state', state);

                toast.warning(result.error || 'Could not fetch complete details. PAN and State extracted from GSTIN.');
                setIsVerifyingGst(false);
                return;
            }

            // Successfully fetched GST details
            const gstData = result.data;

            // Auto-fill form fields
            if (gstData.tradeName || gstData.legalName) {
                const companyName = gstData.tradeName || gstData.legalName;
                form.setValue('name', companyName);

                // If trade name exists, use legal name as legal_name field
                if (gstData.tradeName && gstData.legalName && gstData.tradeName !== gstData.legalName) {
                    form.setValue('legal_name', gstData.legalName);
                }
            }

            // Extract PAN from GSTIN
            const pan = extractPANFromGSTIN(gst);
            if (pan) {
                form.setValue('pan_number', pan);
            }

            // Set registration date
            if (gstData.registrationDate) {
                // Convert date format if needed (DD/MM/YYYY to YYYY-MM-DD)
                try {
                    const dateParts = gstData.registrationDate.split('/');
                    if (dateParts.length === 3) {
                        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        form.setValue('gst_reg_date', formattedDate);
                    }
                } catch (e) {
                    console.warn('Could not parse GST registration date', e);
                }
            }

            // Set address details
            const addressInfo = getFullAddress(gstData.principalPlaceOfBusiness);

            if (addressInfo.addressLine) {
                form.setValue('address', addressInfo.addressLine);
            }

            if (addressInfo.state) {
                form.setValue('state', addressInfo.state);
            }

            if (addressInfo.district) {
                form.setValue('district', addressInfo.district);
            }

            if (addressInfo.pincode) {
                form.setValue('pincode', addressInfo.pincode);
            }

            // Set city/location
            if (gstData.principalPlaceOfBusiness.location) {
                form.setValue('city', gstData.principalPlaceOfBusiness.location);
            }

            // Set registration type based on taxpayer type
            if (gstData.taxpayerType) {
                const taxpayerType = gstData.taxpayerType.toLowerCase();
                if (taxpayerType.includes('composition')) {
                    form.setValue('registration_type', 'composition');
                } else if (taxpayerType.includes('regular')) {
                    form.setValue('registration_type', 'registered');
                }
            }

            toast.success(
                <div>
                    <p className="font-semibold">GSTIN Verified Successfully!</p>
                    <p className="text-sm">{gstData.tradeName || gstData.legalName}</p>
                    {gstData.status && <p className="text-xs text-muted-foreground">Status: {gstData.status}</p>}
                </div>
            );
        } catch (error) {
            console.error('GST verification error:', error);

            // Fallback: Extract basic info
            const { extractPANFromGSTIN, extractStateFromGSTIN } = await import('@/services/gstApi');
            const pan = extractPANFromGSTIN(gst);
            const state = extractStateFromGSTIN(gst);

            if (pan) form.setValue('pan_number', pan);
            if (state) form.setValue('state', state);

            toast.error('Failed to verify GSTIN. Please enter details manually.');
        } finally {
            setIsVerifyingGst(false);
        }
    };

    const onSubmit = async (data: PartyFormData) => {
        try {
            if (isEdit && party) {
                const updates: PartyUpdate = {
                    name: data.name,
                    type: data.type,
                    gst_number: data.gst_number || null,
                    pan_number: data.pan_number || null,
                    state: data.state,
                    city: data.city || null,
                    address: data.address || null,
                    pincode: data.pincode || null,
                    email: data.email || null,
                    credit_limit: data.credit_limit,
                    credit_days: data.credit_days,
                };

                await updateParty.mutateAsync({ id: party.id, updates });
            } else {
                if (!distributorId) {
                    // Fail-safe for admins: Try to create profile if missing
                    if (role === 'admin' && user) {
                        try {
                            const { data: createdProf, error: createError } = await supabase
                                .from('distributor_profiles')
                                .insert({
                                    user_id: user.id,
                                    company_name: 'Admin Company',
                                    invoice_prefix: 'INV'
                                })
                                .select('id')
                                .single();

                            if (!createError && createdProf) {
                                // proceed with new ID
                                const partyData: Omit<PartyInsert, 'id' | 'created_at' | 'updated_at'> = {
                                    distributor_id: createdProf.id,
                                    name: data.name,
                                    type: data.type,
                                    gst_number: data.gst_number || null,
                                    pan_number: data.pan_number || null,
                                    state: data.state,
                                    city: data.city || null,
                                    address: data.address || null,
                                    pincode: data.pincode || null,
                                    phone: data.mobile || null,
                                    email: data.email || null,
                                    opening_balance: data.opening_balance,
                                    current_balance: data.opening_balance,
                                    credit_limit: data.credit_limit,
                                    credit_days: data.credit_days,
                                    is_active: true,
                                    party_code: data.party_code || 'temp', // temporary, will be regenerated
                                    legal_name: data.legal_name || null,
                                    contact_person: data.contact_person || null,
                                    whatsapp: data.whatsapp || null,
                                    currency: data.currency || 'INR',
                                    distance_km: data.distance_km || null,
                                    registration_type: data.registration_type || 'registered',
                                    gst_reg_date: data.gst_reg_date || null,
                                    country: data.country || 'India',
                                    district: data.district || null,
                                    village: data.city || null,
                                    sales_zone: null, // Not in form schema yet
                                    price_structure: null, // Not in form schema yet
                                    group_name: data.group_name || 'Sundry Debtors',
                                };

                                await addParty.mutateAsync(partyData);
                                onOpenChange(false);
                                onSuccess?.();
                                return;
                            }
                        } catch (e) {
                            console.error('Auto-create profile failed', e);
                        }
                    }

                    toast.error(
                        <div className="space-y-2">
                            <p className="font-semibold">Distributor profile not found</p>
                            <p className="text-sm">Please set up your company profile first.</p>
                            <a
                                href="/setup"
                                className="text-primary hover:underline text-sm font-medium block mt-2"
                                onClick={() => onOpenChange(false)}
                            >
                                Go to Setup →
                            </a>
                        </div>,
                        { duration: 5000 }
                    );
                    return;
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
                    phone: data.mobile || null,
                    email: data.email || null,
                    opening_balance: data.opening_balance,
                    current_balance: data.opening_balance,
                    credit_limit: data.credit_limit,
                    credit_days: data.credit_days,
                    is_active: true,
                    party_code: data.party_code,
                    legal_name: data.legal_name || null,
                    contact_person: data.contact_person || null,
                    whatsapp: data.whatsapp || null,
                    currency: data.currency,
                    distance_km: data.distance_km || null,
                    registration_type: data.registration_type,
                    gst_reg_date: data.gst_reg_date || null,
                    country: data.country,
                    district: data.district || null,
                    village: data.city || null, // Map city to village as well
                    sales_zone: null, // Not in form schema yet
                    price_structure: null, // Not in form schema yet
                    group_name: data.group_name,
                };

                await addParty.mutateAsync(partyData);
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error saving party:', error);
        }
    };

    const isSaving = isAdding || isUpdating;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-xl font-semibold text-primary">
                        {isEdit ? 'Edit Party' : 'Add Customer'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        {/* Row 1: Company Name, Party Code, Industry Type */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-6">
                                        <FormLabel>
                                            Company/Trade Name <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Company/Trade Name" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="party_code"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Party Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="C001"
                                                className="rounded-lg bg-muted"
                                                readOnly
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Party Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="customer">Customer</SelectItem>
                                                <SelectItem value="supplier">Supplier</SelectItem>
                                                <SelectItem value="both">Both</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 2: Legal Name, Contact Person, Mobile, WhatsApp */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="legal_name"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-4">
                                        <FormLabel>Party Legal Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Party Legal Name" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contact_person"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Contact Person</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contact Person" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="mobile"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Mobile No.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Mobile No." className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="whatsapp"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>WhatsApp No.</FormLabel>
                                        <FormControl>
                                            <Input placeholder="WhatsApp No." className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 3: Email, Currency, Credit Days, Credit Limit, Distance */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Party Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="Party Email" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Currency</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="credit_days"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Credit Days</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="credit_limit"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Cr. Limit (In Amt.)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="distance_km"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Distance (Km)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 4: Registration Type, GSTIN, GST Date, PAN */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="registration_type"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Registration Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {REGISTRATION_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
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
                                name="gst_number"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel className="flex items-center justify-between">
                                            <span>
                                                Party GSTIN <span className="text-red-500">*</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleVerifyGst}
                                                disabled={isVerifyingGst}
                                                className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
                                            >
                                                {isVerifyingGst ? 'Verifying...' : 'Verify'}
                                            </button>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="PARTY GSTIN"
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
                                name="gst_reg_date"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>GST Reg. Date</FormLabel>
                                        <FormControl>
                                            <DatePicker
                                                value={field.value}
                                                onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className="rounded-lg"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="pan_number"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>Party PAN</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="PARTY PAN"
                                                className="rounded-lg uppercase"
                                                maxLength={10}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 5: Country, State, District, City/Village */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>
                                            Select Country <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
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
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>
                                            Select State <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue placeholder="Select State" />
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
                                name="district"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>
                                            Select District <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue placeholder="Select District" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {GUJARAT_DISTRICTS.map((district) => (
                                                    <SelectItem key={district} value={district}>
                                                        {district}
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
                                name="city"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>
                                            City/Village <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="City/Village" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 6: Address, Pincode */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-9">
                                        <FormLabel>
                                            Address <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Address"
                                                className="rounded-lg resize-none"
                                                rows={2}
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
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>
                                            Pincode <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Pincode" className="rounded-lg" maxLength={6} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 7: Group Name, Opening Balance (only for new) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <FormField
                                control={form.control}
                                name="group_name"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-4">
                                        <FormLabel>
                                            Group Name <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Sundry Debtors">Sundry Debtors</SelectItem>
                                                <SelectItem value="Sundry Creditors">Sundry Creditors</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {!isEdit && (
                                <FormField
                                    control={form.control}
                                    name="opening_balance"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-4">
                                            <FormLabel>Opening Balance (₹)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0" className="rounded-lg" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onOpenChange(false)}
                                className="rounded-lg px-6"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Close
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-lg px-6 bg-green-600 hover:bg-green-700"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <BadgeCheck className="h-4 w-4 mr-2" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
