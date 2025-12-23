import { useEffect } from 'react';
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
import { useItems, useItem, useCategories, ItemInsert, ItemUpdate } from '@/hooks/useItems';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { UNITS, DEFAULT_GST_RATES } from '@/lib/constants';

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sku: z.string().min(1, 'SKU is required').max(50),
  hsn_code: z.string().max(8).optional().or(z.literal('')),
  category_id: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  unit: z.string().default('PCS'),
  sale_price: z.coerce.number().min(0, 'Sale price must be positive'),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be positive'),
  mrp: z.coerce.number().min(0).default(0),
  gst_percent: z.coerce.number().min(0).max(100),
  cess_percent: z.coerce.number().min(0).max(100).default(0),
  stock_quantity: z.coerce.number().min(0, 'Stock cannot be negative'),
  min_stock_level: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function ItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';

  // Hooks
  const { addItem, updateItem, isAdding, isUpdating } = useItems({ realtime: false });
  const { data: existingItem, isLoading: isLoadingItem } = useItem(isEdit ? id : undefined);
  const { data: distributorId, isLoading: isLoadingDistributor } = useDistributorId();
  const { categories } = useCategories();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      sku: '',
      hsn_code: '',
      category_id: '',
      description: '',
      unit: 'PCS',
      sale_price: 0,
      purchase_price: 0,
      mrp: 0,
      gst_percent: 18,
      cess_percent: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      is_active: true,
    },
  });

  // Calculate profit margin
  const salePrice = form.watch('sale_price');
  const purchasePrice = form.watch('purchase_price');
  const profitMargin = salePrice && purchasePrice
    ? ((salePrice - purchasePrice) / salePrice * 100).toFixed(1)
    : '0';

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existingItem) {
      form.reset({
        name: existingItem.name,
        sku: existingItem.sku,
        hsn_code: existingItem.hsn_code || '',
        category_id: existingItem.category_id || '',
        description: existingItem.description || '',
        unit: existingItem.unit,
        sale_price: existingItem.sale_price,
        purchase_price: existingItem.purchase_price,
        mrp: existingItem.mrp,
        gst_percent: existingItem.gst_percent,
        cess_percent: existingItem.cess_percent,
        stock_quantity: existingItem.stock_quantity,
        min_stock_level: existingItem.min_stock_level,
        is_active: existingItem.is_active,
      });
    }
  }, [isEdit, existingItem, form]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (isEdit) {
        const updates: ItemUpdate = {
          name: data.name,
          sku: data.sku,
          hsn_code: data.hsn_code || null,
          category_id: data.category_id || null,
          description: data.description || null,
          unit: data.unit,
          sale_price: data.sale_price,
          purchase_price: data.purchase_price,
          mrp: data.mrp,
          gst_percent: data.gst_percent,
          cess_percent: data.cess_percent,
          min_stock_level: data.min_stock_level,
          is_active: data.is_active,
        };

        await updateItem.mutateAsync({ id, updates });
      } else {
        if (!distributorId) {
          throw new Error('Distributor profile not found');
        }

        const itemData: Omit<ItemInsert, 'id' | 'created_at' | 'updated_at'> = {
          distributor_id: distributorId,
          name: data.name,
          sku: data.sku,
          hsn_code: data.hsn_code || null,
          category_id: data.category_id || null,
          description: data.description || null,
          unit: data.unit,
          sale_price: data.sale_price,
          purchase_price: data.purchase_price,
          mrp: data.mrp,
          gst_percent: data.gst_percent,
          cess_percent: data.cess_percent,
          stock_quantity: data.stock_quantity,
          min_stock_level: data.min_stock_level,
          is_active: data.is_active,
        };

        await addItem.mutateAsync(itemData);
      }
      navigate('/items');
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const isLoading = isLoadingItem || isLoadingDistributor;
  const isSaving = isAdding || isUpdating;

  // Loading state for edit mode
  if (isEdit && isLoading) {
    return (
      <PageContainer title="Edit Item">
        <Button variant="ghost" disabled className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Items
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
    <PageContainer title={isEdit ? 'Edit Item' : 'New Item'}>
      <Button variant="ghost" onClick={() => navigate('/items')} className="mb-4 rounded-lg">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Items
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
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="PROD-001" className="rounded-lg uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hsn_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HSN Code</FormLabel>
                      <FormControl>
                        <Input placeholder="84821010" className="rounded-lg" maxLength={8} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter item description" className="rounded-lg resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold tracking-tight">Pricing</h3>
                {Number(profitMargin) > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Margin: <span className="text-green-600 font-medium">{profitMargin}%</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price (₹) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price (₹) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MRP (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gst_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Rate (%)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select GST rate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_GST_RATES.map((rate) => (
                            <SelectItem key={rate} value={rate.toString()}>
                              {rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Standard GST rates: 0%, 5%, 12%, 18%, 28%
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cess_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cess (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Additional cess if applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Stock */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold tracking-tight mb-4">Stock</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0"
                          className="rounded-lg"
                          disabled={isEdit}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {isEdit ? 'Stock is managed through transactions' : 'Initial stock quantity'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_stock_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock Level</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" placeholder="0" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Alert when stock falls below this level
                      </FormDescription>
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
                        Inactive items won't appear in invoice dropdowns
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
                    {isEdit ? 'Update Item' : 'Create Item'}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/items')} className="rounded-lg">
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
}
