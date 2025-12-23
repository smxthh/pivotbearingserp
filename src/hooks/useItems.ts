import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Item = Tables<'items'>;
export type ItemInsert = TablesInsert<'items'>;
export type ItemUpdate = TablesUpdate<'items'>;

export type Category = Tables<'categories'>;
export type CategoryInsert = TablesInsert<'categories'>;

interface UseItemsOptions {
    /** Filter by category ID */
    categoryId?: string;
    /** Filter by active status */
    isActive?: boolean;
    /** Only show items with low stock */
    lowStock?: boolean;
    /** Enable real-time subscription */
    realtime?: boolean;
}

/**
 * Hook for managing items (inventory)
 * Provides CRUD operations with real-time sync
 */
export function useItems(options: UseItemsOptions = { realtime: true }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['items', options.categoryId || 'all', options.isActive?.toString() || 'all'];

    // Real-time subscription
    if (options.realtime !== false) {
        useRealtimeSubscription('items', queryKey);
    }

    // Fetch all items
    const {
        data: items = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('items')
                .select(`
          *,
          category:categories(id, name)
        `)
                .order('name', { ascending: true });

            if (options.categoryId) {
                query = query.eq('category_id', options.categoryId);
            }

            if (options.isActive !== undefined) {
                query = query.eq('is_active', options.isActive);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching items:', error);
                throw error;
            }

            return data as (Item & { category: { id: string; name: string } | null })[];
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Get single item by ID
    const getItemById = async (id: string): Promise<Item | null> => {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching item:', error);
            return null;
        }

        return data as Item;
    };

    // Add item mutation
    const addItem = useMutation({
        mutationFn: async (item: Omit<ItemInsert, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('items')
                .insert(item)
                .select()
                .single();

            if (error) {
                console.error('Error adding item:', error);
                throw error;
            }

            return data as Item;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success(`${data.name} added successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add item');
        },
    });

    // Update item mutation
    const updateItem = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: ItemUpdate }) => {
            const { data, error } = await supabase
                .from('items')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating item:', error);
                throw error;
            }

            return data as Item;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success(`${data.name} updated successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update item');
        },
    });

    // Delete item mutation
    const deleteItem = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting item:', error);
                throw error;
            }

            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success('Item deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete item');
        },
    });

    // Update stock quantity
    const updateStock = useMutation({
        mutationFn: async ({ id, quantity, reason }: { id: string; quantity: number; reason?: string }) => {
            // Get current stock first
            const { data: currentItem } = await supabase
                .from('items')
                .select('stock_quantity, name')
                .eq('id', id)
                .single();

            if (!currentItem) throw new Error('Item not found');

            const newStock = currentItem.stock_quantity + quantity;

            const { data, error } = await supabase
                .from('items')
                .update({ stock_quantity: newStock })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Item;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success(`Stock updated for ${data.name}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update stock');
        },
    });

    // Computed values
    const activeItems = items.filter(i => i.is_active);
    const lowStockItems = items.filter(i => i.stock_quantity <= i.min_stock_level);
    const outOfStockItems = items.filter(i => i.stock_quantity <= 0);
    const totalStockValue = items.reduce((sum, i) => sum + (i.stock_quantity * i.purchase_price), 0);

    return {
        // Data
        items,
        activeItems,
        lowStockItems,
        outOfStockItems,
        totalStockValue,

        // Status
        isLoading,
        error,

        // Actions
        refetch,
        getItemById,
        addItem,
        updateItem,
        deleteItem,
        updateStock,

        // Mutation states
        isAdding: addItem.isPending,
        isUpdating: updateItem.isPending,
        isDeleting: deleteItem.isPending,
    };
}

/**
 * Hook to get a single item by ID with caching
 */
export function useItem(id: string | undefined) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['item', id],
        queryFn: async () => {
            if (!id) return null;

            const { data, error } = await supabase
                .from('items')
                .select(`
          *,
          category:categories(id, name)
        `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching item:', error);
                throw error;
            }

            return data as Item & { category: { id: string; name: string } | null };
        },
        enabled: !!user && !!id,
    });
}

/**
 * Hook for managing categories
 */
export function useCategories() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['categories'];

    useRealtimeSubscription('categories', queryKey);

    const {
        data: categories = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return data as Category[];
        },
        enabled: !!user,
        staleTime: 60000, // Categories don't change often
    });

    const addCategory = useMutation({
        mutationFn: async (category: Omit<CategoryInsert, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('categories')
                .insert(category)
                .select()
                .single();

            if (error) throw error;
            return data as Category;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Category added');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add category');
        },
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Category deleted');
        },
    });

    return {
        categories,
        isLoading,
        error,
        refetch,
        addCategory,
        deleteCategory,
    };
}
