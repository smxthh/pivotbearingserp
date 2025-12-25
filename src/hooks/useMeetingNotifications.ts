import { useEffect, useRef, useState, useCallback } from 'react';
import { Meeting } from './useMeetings';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useMeetingNotifications = (meetings: Meeting[]) => {
    const { user } = useAuth();
    const notifiedRef = useRef<Set<string>>(new Set());
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }

        console.log('Requesting notification permission...');
        const result = await Notification.requestPermission();
        console.log('Permission result:', result);
        setPermission(result);

        if (result === 'granted') {
            toast.success("Notifications enabled!");
            try {
                new Notification("Notifications Active", { body: "You will be alerted for upcoming meetings." });
            } catch (e) {
                console.error("Test notification failed:", e);
            }
        }
    }, []);

    const triggerNotification = useCallback((meeting: Meeting) => {
        console.log('Triggering notification for:', meeting.title);
        const title = `Upcoming Meeting: ${meeting.title}`;
        const startTime = new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const options = {
            body: `Starting at ${startTime}`,
            icon: '/favicon.ico',
            requireInteraction: true,
            tag: meeting.id // Prevent duplicate notifications for same meeting
        };

        // Browser Notification
        if (permission === 'granted') {
            try {
                new Notification(title, options);
            } catch (e) {
                console.error("Notification creation failed:", e);
            }
        } else {
            console.log('Notification permission not granted, fallback to toast only.');
        }

        // In-App Toast (always show as fallback)
        toast.info(title, {
            description: options.body,
            duration: 10000,
        });

        // Play system sound if possible (often blocked by autoplay, but worth a try)
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio autoplay blocked:', e));
        } catch (e) {
            // ignore
        }
    }, [permission]);

    useEffect(() => {
        const checkMeetings = () => {
            const now = new Date();
            // console.log('Checking meetings...', { now: now.toISOString(), count: meetings.length });

            meetings.forEach(meeting => {
                if (meeting.status === 'canceled') return;

                // Strict check: Only notify the creator
                if (user && meeting.created_by !== user.id) return;

                const startTime = new Date(meeting.start_time);
                const timeDiff = startTime.getTime() - now.getTime();

                // Logic:
                // 1. If meeting is in future but less than 5 mins away: Notify
                // 2. If meeting started less than 1 min ago (maybe user just opened tab): Notify
                const isUpcoming = timeDiff > -60000 && timeDiff <= 5 * 60 * 1000;

                if (isUpcoming && !notifiedRef.current.has(meeting.id)) {
                    triggerNotification(meeting);
                    notifiedRef.current.add(meeting.id);
                }
            });
        };

        // Check frequently (every 10 seconds)
        const interval = setInterval(checkMeetings, 10000);

        // Initial check
        checkMeetings();

        return () => clearInterval(interval);
    }, [meetings, triggerNotification]);

    return { permission, requestPermission };
};
