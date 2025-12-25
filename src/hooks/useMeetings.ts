import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    created_by: string;
    status: 'scheduled' | 'completed' | 'canceled';
    location?: string;
    created_at?: string;
}

export const useMeetings = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    // Cast to any to bypass type checks since crm_meetings table isn't in generated types yet
    const supabaseClient = supabase as any;

    const fetchMeetings = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from('crm_meetings')
                .select('*')
                .eq('created_by', user.id)
                .order('start_time', { ascending: true });

            if (error) {
                console.error('Error fetching meetings:', error);
                if (error.code === '42P01') { // undefined_table
                    toast.error("Database table missing. Please run the migration.");
                } else {
                    toast.error(`Failed to load meetings: ${error.message}`);
                }
                return;
            }

            if (data) {
                setMeetings(data as Meeting[]);
            }
        } catch (err) {
            console.error('Failed to fetch meetings:', err);
            toast.error("An unexpected error occurred while loading meetings.");
        } finally {
            setLoading(false);
        }
    }, [user, supabaseClient]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabaseClient
            .channel('crm_meetings_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'crm_meetings',
                    filter: `created_by=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setMeetings((prev) => [...prev, payload.new as Meeting].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
                    } else if (payload.eventType === 'UPDATE') {
                        setMeetings((prev) =>
                            prev.map((m) => (m.id === payload.new.id ? (payload.new as Meeting) : m))
                                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setMeetings((prev) => prev.filter((m) => m.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        fetchMeetings();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [user, fetchMeetings, supabaseClient]);

    const createMeeting = async (meeting: Omit<Meeting, 'id' | 'created_by' | 'created_at' | 'status'>) => {
        if (!user) return null;

        try {
            const { data, error } = await supabaseClient
                .from('crm_meetings')
                .insert([
                    {
                        ...meeting,
                        created_by: user.id,
                        status: 'scheduled'
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            toast.success('Meeting scheduled successfully');
            return data;
        } catch (error) {
            console.error('Error creating meeting:', error);
            toast.error('Failed to schedule meeting');
            return null;
        }
    };

    const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
        try {
            const { error } = await supabaseClient
                .from('crm_meetings')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            toast.success('Meeting updated');
            return true;
        } catch (error) {
            console.error('Error updating meeting:', error);
            toast.error('Failed to update meeting');
            return false;
        }
    };

    const cancelMeeting = async (id: string) => {
        return updateMeeting(id, { status: 'canceled' });
    };

    return {
        meetings,
        loading,
        createMeeting,
        updateMeeting,
        cancelMeeting,
        refreshMeetings: fetchMeetings
    };
};
