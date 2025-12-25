import React, { createContext, useContext, ReactNode } from 'react';
import { useMeetings, Meeting } from '@/hooks/useMeetings';
import { useMeetingNotifications } from '@/hooks/useMeetingNotifications';

interface MeetingContextType {
    meetings: Meeting[];
    loading: boolean;
    createMeeting: (meeting: Omit<Meeting, 'id' | 'created_by' | 'created_at' | 'status'>) => Promise<any>;
    updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<boolean>;
    cancelMeeting: (id: string) => Promise<boolean>;
    refreshMeetings: () => Promise<void>;
    permission: NotificationPermission;
    requestPermission: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider = ({ children }: { children: ReactNode }) => {
    // Centralized meeting management
    const meetingsData = useMeetings();

    // Centralized notification management attached to the global meeting list
    const { permission, requestPermission } = useMeetingNotifications(meetingsData.meetings);

    return (
        <MeetingContext.Provider value={{
            ...meetingsData,
            permission,
            requestPermission
        }}>
            {children}
        </MeetingContext.Provider>
    );
};

export const useMeetingContext = () => {
    const context = useContext(MeetingContext);
    if (!context) {
        throw new Error('useMeetingContext must be used within a MeetingProvider');
    }
    return context;
};
