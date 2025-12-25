import { useEffect, useRef, useState, useCallback } from 'react';
import { Meeting } from './useMeetings';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useMeetingNotifications = (meetings: Meeting[]) => {
    const { user } = useAuth();
    // Track which notifications have been sent: meetingId-stage (e.g., "abc-2min" or "abc-now")
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
                new Notification("Notifications Active", { body: "You will be alerted 2 minutes before and at meeting time." });
            } catch (e) {
                console.error("Test notification failed:", e);
            }
        }
    }, []);

    const triggerNotification = useCallback((meeting: Meeting, stage: 'warning' | 'now') => {
        const startTime = new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const title = stage === 'warning'
            ? `⏰ Meeting in 2 Minutes: ${meeting.title}`
            : `🔔 Meeting Starting Now: ${meeting.title}`;

        const body = stage === 'warning'
            ? `Get ready! Starting at ${startTime}`
            : `Your meeting is starting right now at ${startTime}`;

        console.log(`[NOTIFICATION ${stage}]`, title);

        const options = {
            body,
            icon: '/pwa-192x192.png',
            requireInteraction: true,
            tag: `${meeting.id}-${stage}`,
            vibrate: [200, 100, 200], // Vibration pattern for mobile (if supported)
        };

        // Browser Notification
        if (permission === 'granted') {
            try {
                const notification = new Notification(title, options);
                console.log('Browser notification created:', notification);
            } catch (e) {
                console.error("Notification creation failed:", e);
            }
        } else {
            console.warn('Notification permission not granted. Current status:', permission);
        }

        // In-App Toast (always show as fallback)
        const toastFn = stage === 'now' ? toast.error : toast.warning;
        toastFn(title, {
            description: body,
            duration: 15000, // Longer duration for important alerts
        });

        // Play LOUD system sound
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.9; // LOUD (was 0.5)
            audio.play().catch(e => console.log('Audio autoplay blocked:', e));
        } catch (e) {
            console.error('Audio playback error:', e);
        }
    }, [permission]);

    useEffect(() => {
        const checkMeetings = () => {
            const now = new Date();

            meetings.forEach(meeting => {
                if (meeting.status === 'canceled') return;

                // Strict check: Only notify the creator
                if (user && meeting.created_by !== user.id) return;

                const startTime = new Date(meeting.start_time);
                const timeDiff = startTime.getTime() - now.getTime();
                const minutesUntilStart = timeDiff / (60 * 1000);

                // STAGE A: 2 minutes before (trigger when between 1:50 and 2:10 before)
                const warningKey = `${meeting.id}-warning`;
                if (minutesUntilStart >= 1.83 && minutesUntilStart <= 2.17 && !notifiedRef.current.has(warningKey)) {
                    triggerNotification(meeting, 'warning');
                    notifiedRef.current.add(warningKey);
                    console.log(`[ALERT] 2-minute warning sent for: ${meeting.title}`);
                }

                // STAGE B: At exact time (trigger when within 30 seconds of start)
                const nowKey = `${meeting.id}-now`;
                if (Math.abs(minutesUntilStart) <= 0.5 && !notifiedRef.current.has(nowKey)) {
                    triggerNotification(meeting, 'now');
                    notifiedRef.current.add(nowKey);
                    console.log(`[ALERT] On-time notification sent for: ${meeting.title}`);
                }
            });
        };

        // Check every 10 seconds for precision
        const interval = setInterval(checkMeetings, 10000);

        // Initial check
        checkMeetings();

        return () => clearInterval(interval);
    }, [meetings, triggerNotification, user]);

    return { permission, requestPermission };
};
