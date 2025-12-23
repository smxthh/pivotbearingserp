import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

// Types - Compatible with current database schema
export interface Category {
    id: string;
    distributor_id: string;
    name: string;
    description?: string;
    parent_id?: string | null;
    is_active: boolean;
    created_at: string;
    // Extended fields (will work after migration)
    category_type?: 'product' | 'service' | 'both';
    is_final?: boolean;
    is_returnable?: boolean;
    remark?: string;
    sort_order?: number;
    updated_at?: string;
    // Computed fields
    children_count?: number;
    items_count?: number;
    parent_name?: string;
}

export interface CategoryInsert {
    distributor_id: string;
    name: string;
    description?: string;
    parent_id?: string | null;
    is_final?: boolean;
    is_returnable?: boolean;
    category_type?: 'product' | 'service' | 'both';
    remark?: string;
}

export interface CategoryUpdate {
    name?: string;
    description?: string;
    parent_id?: string | null;
    is_active?: boolean;
    is_final?: boolean;
    is_returnable?: boolean;
    category_type?: 'product' | 'service' | 'both';
    remark?: string;
}

interface UseCategoriesOptions {
    realtime?: boolean;
    parentId?: string | null;
    categoryType?: 'product' | 'service' | 'both';
    onlyFinal?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
    const { realtime = true, parentId } = options;
    const queryClient = useQueryClient();
    const { data: distributorId } = useDistributorId();

    // Enable realtime updates
    useRealtimeSubscription(
        'categories',
        ['categories', distributorId || 'none'],
        {
            filterColumn: 'distributor_id',
            filterValue: distributorId || undefined,
        }
    );

    // Fetch categories
    const { data: categories = [], isLoading, error, refetch } = useQuery({
        queryKey: ['categories', distributorId, parentId],
        queryFn: async () => {
            if (!distributorId) return [];

            let query = supabase
                .from('categories')
                .select('*')
                .eq('distributor_id', distributorId)
                .eq('is_active', true)
                .order('name', { ascending: true });

            // Filter by parent
            if (parentId === null) {
                query = query.is('parent_id', null);
            } else if (parentId !== undefined) {
                query = query.eq('parent_id', parentId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Enrich with parent name and counts
            const enrichedData = await Promise.all(
                (data || []).map(async (cat: any) => {
                    // Get parent name
                    let parent_name = 'NA';
                    if (cat.parent_id) {
                        const { data: parentData } = await supabase
                            .from('categories')
                            .select('name')
                            .eq('id', cat.parent_id)
                            .single();
                        parent_name = parentData?.name || 'NA';
                    }

                    // Get children count
                    const { count: childrenCount } = await supabase
                        .from('categories')
                        .select('*', { count: 'exact', head: true })
                        .eq('distributor_id', distributorId)
                        .eq('is_active', true)
                        .eq('parent_id', cat.id);

                    // Get items count
                    const { count: itemsCount } = await supabase
                        .from('items')
                        .select('*', { count: 'exact', head: true })
                        .eq('distributor_id', distributorId)
                        .eq('is_active', true)
                        .eq('category_id', cat.id);

                    return {
                        ...cat,
                        parent_name,
                        children_count: childrenCount || 0,
                        items_count: itemsCount || 0,
                        // Default values for new fields until migration runs
                        is_final: cat.is_final ?? false,
                        is_returnable: cat.is_returnable ?? false,
                        category_type: cat.category_type ?? 'both',
                        sort_order: cat.sort_order ?? 0,
                    } as Category;
                })
            );

            return enrichedData;
        },
        enabled: !!distributorId,
    });

    // Get root categories (no parent)
    const rootCategories = categories.filter((c) => !c.parent_id);

    // Get final categories (can add items)
    const finalCategories = categories.filter((c) => c.is_final);

    // Get product categories
    const productCategories = categories.filter(
        (c) => c.category_type === 'product' || c.category_type === 'both'
    );

    // Get service categories
    const serviceCategories = categories.filter(
        (c) => c.category_type === 'service' || c.category_type === 'both'
    );

    // Add category mutation
    const addCategory = useMutation({
        mutationFn: async (category: Omit<CategoryInsert, 'distributor_id'>) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            const { data, error } = await supabase
                .from('categories')
                .insert({
                    name: category.name,
                    description: category.description || null,
                    parent_id: category.parent_id || null,
                    distributor_id: distributorId,
                    // New fields
                    is_final: category.is_final ?? false,
                    is_returnable: category.is_returnable ?? false,
                    category_type: category.category_type ?? 'product',
                    remark: category.remark || null,
                } as any)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Category added successfully');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to add category: ${error.message}`);
        },
    });

    // Update category mutation
    const updateCategory = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: CategoryUpdate }) => {
            const { data, error } = await supabase
                .from('categories')
                .update({
                    ...updates,
                    // Ensure undefined values are handled if needed, though pure updates usually work
                } as any)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Category updated successfully');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update category: ${error.message}`);
        },
    });

    // Delete category mutation
    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            // Soft delete by setting is_active to false
            const { error } = await supabase
                .from('categories')
                .update({ is_active: false } as any)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Category deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete category: ${error.message}`);
        },
    });

    // Get category by ID
    const getCategoryById = (id: string) => categories.find((c) => c.id === id);

    // Get category children
    const getCategoryChildren = (parentId: string) =>
        categories.filter((c) => c.parent_id === parentId);

    // Build category path (breadcrumb)
    const getCategoryPath = async (categoryId: string): Promise<Category[]> => {
        const path: Category[] = [];
        let currentId: string | null = categoryId;

        while (currentId) {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .eq('id', currentId)
                .single();

            if (data) {
                path.unshift(data as Category);
                currentId = (data as any).parent_id;
            } else {
                break;
            }
        }

        return path;
    };

    // Get descendant IDs helper
    const getDescendantIds = (rootId: string, allCategories: Category[]): Set<string> => {
        const descendants = new Set<string>();
        const stack = [rootId];
        descendants.add(rootId);

        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const children = allCategories.filter(c => c.parent_id === currentId);
            children.forEach(c => {
                descendants.add(c.id);
                stack.push(c.id);
            });
        }
        return descendants;
    };

    // Get product and service category IDs
    const getProductCategoryIds = () => {
        const root = categories.find(c => c.name.toLowerCase().includes('product'));
        if (!root) return new Set<string>();
        return getDescendantIds(root.id, categories);
    };

    const getServiceCategoryIds = () => {
        const root = categories.find(c => c.name.toLowerCase().includes('service'));
        if (!root) return new Set<string>();
        return getDescendantIds(root.id, categories);
    };

    return {
        categories,
        rootCategories,
        finalCategories,
        productCategories,
        serviceCategories,
        getProductCategoryIds,
        getServiceCategoryIds,
        isLoading,
        error,
        refetch,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
        getCategoryChildren,
        getCategoryPath,
        isAdding: addCategory.isPending,
        isUpdating: updateCategory.isPending,
        isDeleting: deleteCategory.isPending,
    };
}

// Hook to get all categories for dropdown (flattened with hierarchy indication)
export function useCategoryDropdown(categoryType?: 'product' | 'service' | 'both') {
    const { data: distributorId } = useDistributorId();

    const { data: options = [], isLoading } = useQuery({
        queryKey: ['category-dropdown', distributorId, categoryType],
        queryFn: async () => {
            if (!distributorId) return [];

            // Fetch ALL categories first to build the tree
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, parent_id, description')
                .eq('distributor_id', distributorId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            let filteredData = data || [];

            // Filter by hierarchy if type is specified
            if (categoryType && categoryType !== 'both') {
                const rootName = categoryType === 'product' ? 'product' : 'service';
                const root = filteredData.find((c: any) => c.name.toLowerCase().includes(rootName));

                if (root) {
                    // Get all descendants
                    const descendants = new Set<string>();
                    const stack = [root.id];
                    descendants.add(root.id);

                    while (stack.length > 0) {
                        const currentId = stack.pop()!;
                        const children = filteredData.filter((c: any) => c.parent_id === currentId);
                        children.forEach((c: any) => {
                            descendants.add(c.id);
                            stack.push(c.id);
                        });
                    }

                    filteredData = filteredData.filter((c: any) => descendants.has(c.id));
                }
            }

            // Determine which categories are "final" (have no children)
            const parentIds = new Set(data?.map((c: any) => c.parent_id).filter(Boolean));

            // Build hierarchy display with indentation
            const buildCategoryLabel = (cat: any, allCats: any[]): string => {
                const parents: string[] = [];
                let currentId = cat.parent_id;

                // Traverse up to build parent path
                while (currentId) {
                    const parent = allCats.find((c: any) => c.id === currentId);
                    if (parent) {
                        parents.unshift(parent.name);
                        currentId = parent.parent_id;
                    } else {
                        break;
                    }
                }

                // Create indented label based on depth
                const indent = '  '.repeat(parents.length);
                return indent + cat.name;
            };

            return filteredData.map((cat: any) => ({
                value: cat.id,
                label: buildCategoryLabel(cat, data || []),
                isFinal: !parentIds.has(cat.id),
                parentId: cat.parent_id,
            }));
        },
        enabled: !!distributorId,
    });

    // Only return final categories for item assignment
    const finalOptions = options.filter((o) => o.isFinal);

    return { options, finalOptions, isLoading };
}
