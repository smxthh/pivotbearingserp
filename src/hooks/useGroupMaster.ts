import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface GroupMaster {
    id: string;
    distributor_id: string;
    group_code: string;
    group_name: string;
    parent_group_id: string | null;
    nature: string | null;
    effect_in: string | null;
    sequence: number | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    parent_group_name?: string;
}

export interface CreateGroupData {
    group_code: string;
    group_name: string;
    parent_group_id?: string;
    nature?: string;
    effect_in?: string;
    sequence?: number;
}

interface UseGroupMasterOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useGroupMaster(options: UseGroupMasterOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['group_master', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('group_master')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('sequence', { ascending: true });

            if (search) {
                query = query.or(`group_code.ilike.%${search}%,group_name.ilike.%${search}%,nature.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            // Fetch parent group names
            const groupsWithParents = await Promise.all(
                (data as GroupMaster[]).map(async (group) => {
                    if (group.parent_group_id) {
                        const { data: parentData } = await supabase
                            .from('group_master')
                            .select('group_name')
                            .eq('id', group.parent_group_id)
                            .single();
                        return { ...group, parent_group_name: parentData?.group_name || '-' };
                    }
                    return { ...group, parent_group_name: group.group_name };
                })
            );

            return { data: groupsWithParents, count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    // Fetch all groups for parent dropdown
    const { data: allGroups } = useQuery({
        queryKey: ['group_master_all', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];

            const { data, error } = await supabase
                .from('group_master')
                .select('id, group_name, group_code')
                .eq('distributor_id', profile.id)
                .order('group_name', { ascending: true });

            if (error) throw error;
            return data as { id: string; group_name: string; group_code: string }[];
        },
        enabled: isEnabled,
    });

    const createGroup = useMutation({
        mutationFn: async (formData: CreateGroupData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('group_master')
                .insert([{
                    distributor_id: profile.id,
                    group_code: formData.group_code,
                    group_name: formData.group_name,
                    parent_group_id: formData.parent_group_id || null,
                    nature: formData.nature || null,
                    effect_in: formData.effect_in || null,
                    sequence: formData.sequence || 0,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group_master'] });
            queryClient.invalidateQueries({ queryKey: ['group_master_all'] });
            toast.success('Group created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create group');
        },
    });

    const deleteGroup = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('group_master')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group_master'] });
            queryClient.invalidateQueries({ queryKey: ['group_master_all'] });
            toast.success('Group deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete group');
        },
    });

    return {
        groupList: data?.data || [],
        totalCount: data?.count || 0,
        allGroups: allGroups || [],
        isLoading: isLoading || isProfileLoading,
        refetch,
        createGroup,
        deleteGroup,
        profile,
    };
}
