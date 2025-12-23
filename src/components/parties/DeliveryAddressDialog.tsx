import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { INDIAN_STATES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';
import { Party } from '@/hooks/useParties';

// Gujarat Districts
const GUJARAT_DISTRICTS = [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
    'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi',
    'Vadodara', 'Valsad',
];

const deliveryAddressSchema = z.object({
    ship_to: z.string().min(1, 'Ship to location is required'),
    country: z.string().default('India'),
    state: z.string().min(1, 'State is required'),
    district: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    address: z.string().min(1, 'Address is required'),
    pincode: z.string().max(6).optional().or(z.literal('')),
    distance_km: z.coerce.number().min(0).default(0),
    is_default: z.boolean().default(false),
});

type DeliveryAddressFormData = z.infer<typeof deliveryAddressSchema>;

interface DeliveryAddress {
    id: string;
    party_id: string;
    distributor_id: string;
    ship_to: string;
    country: string;
    state: string;
    district?: string;
    city?: string;
    address: string;
    pincode?: string;
    distance_km: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

interface DeliveryAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    party: Party | null;
}

export function DeliveryAddressDialog({ open, onOpenChange, party }: DeliveryAddressDialogProps) {
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { data: distributorId } = useDistributorId();

    const form = useForm<DeliveryAddressFormData>({
        resolver: zodResolver(deliveryAddressSchema),
        defaultValues: {
            ship_to: '',
            country: 'India',
            state: 'Gujarat',
            district: '',
            city: '',
            address: '',
            pincode: '',
            distance_km: 0,
            is_default: false,
        },
    });

    // Load addresses when dialog opens
    useEffect(() => {
        if (open && party) {
            loadAddresses();
        }
    }, [open, party]);

    const loadAddresses = async () => {
        if (!party) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('party_delivery_addresses')
                .select('*')
                .eq('party_id', party.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAddresses(data || []);
        } catch (error) {
            console.error('Error loading delivery addresses:', error);
            toast.error('Failed to load delivery addresses');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: DeliveryAddressFormData) => {
        if (!party || !distributorId) {
            toast.error('Party or distributor information missing');
            return;
        }

        setIsSaving(true);
        try {
            const addressData = {
                party_id: party.id,
                distributor_id: distributorId,
                ship_to: data.ship_to,
                country: data.country,
                state: data.state,
                district: data.district || null,
                city: data.city || null,
                address: data.address,
                pincode: data.pincode || null,
                distance_km: data.distance_km,
                is_default: data.is_default,
            };

            if (editingId) {
                // Update existing address
                const { error } = await supabase
                    .from('party_delivery_addresses')
                    .update(addressData)
                    .eq('id', editingId);

                if (error) throw error;
                toast.success('Delivery address updated successfully');
            } else {
                // Insert new address
                const { error } = await supabase
                    .from('party_delivery_addresses')
                    .insert(addressData);

                if (error) throw error;
                toast.success('Delivery address added successfully');
            }

            // Reset form and reload addresses
            form.reset();
            setEditingId(null);
            loadAddresses();
        } catch (error) {
            console.error('Error saving delivery address:', error);
            toast.error('Failed to save delivery address');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (address: DeliveryAddress) => {
        setEditingId(address.id);
        form.reset({
            ship_to: address.ship_to,
            country: address.country,
            state: address.state,
            district: address.district || '',
            city: address.city || '',
            address: address.address,
            pincode: address.pincode || '',
            distance_km: address.distance_km,
            is_default: address.is_default,
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this delivery address?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('party_delivery_addresses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Delivery address deleted successfully');
            loadAddresses();
        } catch (error) {
            console.error('Error deleting delivery address:', error);
            toast.error('Failed to delete delivery address');
        }
    };

    const handleCancel = () => {
        form.reset();
        setEditingId(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">Delivery Address Detail</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Party Name: <span className="font-semibold text-foreground">{party?.name || 'N/A'}</span>
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Address Form */}
                <div className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border-2 border-primary/20 rounded-2xl p-6 my-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Delivery Country <span className="text-red-500">*</span>
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
                                        <FormItem>
                                            <FormLabel>
                                                Delivery State <span className="text-red-500">*</span>
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
                                        <FormItem>
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
                                    name="ship_to"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                City/Village (Ship To) <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="City/Village (Ship To)" className="rounded-lg" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Delivery Address <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Delivery Address"
                                                    className="rounded-lg resize-none"
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="pincode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Delivery Pincode <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Delivery Pincode"
                                                        className="rounded-lg"
                                                        maxLength={6}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="distance_km"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Distance (Km)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
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

                            {/* Default Address Checkbox */}
                            <FormField
                                control={form.control}
                                name="is_default"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-4 bg-muted/20">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="cursor-pointer">Set as default delivery address</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                This address will be auto-selected for new orders
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-end pt-4 border-t">
                                {editingId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCancel}
                                        className="rounded-lg"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                )}
                                <Button type="submit" disabled={isSaving} className="rounded-lg bg-teal-600 hover:bg-teal-700">
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>

                {/* Addresses Table */}
                <div className="bg-card rounded-2xl border-2 overflow-hidden">
                    <div className="bg-gray-900 text-white p-3">
                        <h3 className="font-semibold">Saved Delivery Addresses</h3>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : addresses.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No delivery addresses added yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Ship To</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">State</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">City</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Address</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Pincode</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Distance Km.</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addresses.map((address, index) => (
                                        <tr key={address.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                            <td className="px-4 py-3 text-sm">{index + 1}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    {address.ship_to}
                                                    {address.is_default && (
                                                        <Badge variant="default" className="text-xs">Default</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{address.country}</td>
                                            <td className="px-4 py-3 text-sm">{address.state}</td>
                                            <td className="px-4 py-3 text-sm">{address.city || '-'}</td>
                                            <td className="px-4 py-3 text-sm max-w-xs truncate">{address.address}</td>
                                            <td className="px-4 py-3 text-sm">{address.pincode || '-'}</td>
                                            <td className="px-4 py-3 text-sm">{address.distance_km}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                                        onClick={() => handleEdit(address)}
                                                    >
                                                        <Edit2 className="h-4 w-4 text-primary" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-red-50"
                                                        onClick={() => handleDelete(address.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
