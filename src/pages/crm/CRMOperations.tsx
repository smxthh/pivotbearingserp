import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Bell,
    ChevronDown,
    Moon,
    Sun,
    MoreVertical,
    ArrowUp,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessIntelligence } from '@/hooks/useBusinessIntelligence';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMeetingContext } from '@/contexts/MeetingContext';
import { Meeting } from '@/hooks/useMeetings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function CRMOperations() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { pulse, fetchBusinessPulse, setMonthlyTarget } = useBusinessIntelligence();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Meeting System Integration - Global
    const { meetings, createMeeting, updateMeeting, cancelMeeting, permission, requestPermission } = useMeetingContext();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [newMeeting, setNewMeeting] = useState({
        title: '',
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        location: ''
    });

    const openCreateDialog = () => {
        setEditingMeetingId(null);
        setNewMeeting({
            title: '',
            description: '',
            startTime: '09:00',
            endTime: '10:00',
            location: ''
        });
        setIsCreateOpen(true);
    };

    const openEditDialog = (meeting: Meeting) => {
        setEditingMeetingId(meeting.id);
        const start = new Date(meeting.start_time);
        const end = new Date(meeting.end_time);
        setNewMeeting({
            title: meeting.title,
            description: meeting.description || '',
            startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            location: meeting.location || ''
        });
        setIsCreateOpen(true);
    };

    const handleCreateOrUpdateMeeting = async () => {
        if (!newMeeting.title) {
            toast.error("Please enter a title");
            return;
        }

        const startDateTime = new Date(selectedDate);
        const [startHour, startMinute] = newMeeting.startTime.split(':').map(Number);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(selectedDate);
        const [endHour, endMinute] = newMeeting.endTime.split(':').map(Number);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        if (endDateTime <= startDateTime) {
            toast.error("End time must be after start time");
            return;
        }

        const meetingData = {
            title: newMeeting.title,
            description: newMeeting.description,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            location: newMeeting.location
        };

        if (editingMeetingId) {
            const success = await updateMeeting(editingMeetingId, meetingData);
            if (success) {
                setIsCreateOpen(false);
                setNewMeeting({
                    title: '',
                    description: '',
                    startTime: '09:00',
                    endTime: '10:00',
                    location: ''
                });
                setEditingMeetingId(null);
            }
        } else {
            const res = await createMeeting(meetingData);
            if (res) {
                setIsCreateOpen(false);
                setNewMeeting({
                    title: '',
                    description: '',
                    startTime: '09:00',
                    endTime: '10:00',
                    location: ''
                });
            }
        }
    };

    // Target Setting
    const [isTargetEditOpen, setIsTargetEditOpen] = useState(false);
    const [targetInput, setTargetInput] = useState('');

    const openTargetDialog = () => {
        setTargetInput(pulse?.monthly_sales_target?.toString() || '');
        setIsTargetEditOpen(true);
    };

    const handleUpdateTarget = async () => {
        const val = parseFloat(targetInput);
        if (isNaN(val) || val <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        await setMonthlyTarget(val);
        setIsTargetEditOpen(false);
        toast.success("Monthly target updated");
    };

    useEffect(() => {
        fetchBusinessPulse();
    }, [fetchBusinessPulse]);

    const [displayDate, setDisplayDate] = useState(new Date());

    const nextMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
    };

    const toggleTheme = (dark: boolean) => {
        setIsDarkMode(dark);
        if (dark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const formatCurrency = (val: number) => {
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val}`;
    };

    // Calculate engagement/target percentages
    const targetProgress = pulse?.monthly_sales_target && pulse.monthly_sales_target > 0
        ? Math.min(100, Math.round((pulse.revenue_mtd / pulse.monthly_sales_target) * 100))
        : 0;

    // Mock historical data for charts if real data isn't available
    const revenueHistory = [
        { val: 55, date: 'Jan' },
        { val: 40, date: 'Feb' },
        { val: 28, date: 'Mar' },
        { val: 48, date: 'Apr' },
        { val: 68, date: 'May' },
        { val: 39, date: 'Jun' },
        { val: targetProgress, date: 'Now' },
    ];

    return (
        <div className={cn(
            "w-full h-full min-h-screen overflow-y-auto font-sans transition-colors duration-300",
            isDarkMode ? "bg-[#0F172A] text-[#F8FAFC]" : "bg-[#F3F4F6] text-[#111827]"
        )}>
            {/* Header */}
            <header className={cn(
                "h-16 px-4 md:px-6 flex items-center justify-between top-0 z-20 backdrop-blur-md",
                isDarkMode ? "bg-[#0F172A]/80" : "bg-[#F3F4F6]/80"
            )}>
                <div>

                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button className={cn(
                        "p-2 rounded-full transition-all shadow-sm hover:text-[#7C3AED]",
                        isDarkMode ? "bg-[#1E293B] text-gray-400 hover:bg-gray-700" : "bg-white text-gray-500 hover:bg-white"
                    )}>
                        <MessageSquare size={18} />
                    </button>
                    <button
                        onClick={permission !== 'granted' ? requestPermission : undefined}
                        className={cn(
                            "p-2 rounded-full transition-all shadow-sm relative",
                            isDarkMode ? "bg-[#1E293B] text-gray-400 hover:bg-gray-700" : "bg-white text-gray-500 hover:bg-white",
                            permission !== 'granted' && "animate-pulse ring-2 ring-yellow-400"
                        )}>
                        <Bell size={18} className={cn(permission === 'granted' ? "" : "text-yellow-500")} />
                        {permission !== 'granted' && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                    </button>
                    <div className={cn("flex items-center gap-2 p-1 rounded-full shadow-sm", isDarkMode ? "bg-[#1E293B]" : "bg-white")}>
                        <button
                            onClick={() => toggleTheme(true)}
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                isDarkMode ? "bg-gray-700 text-yellow-500 shadow-sm" : "bg-transparent text-gray-400 hover:text-[#7C3AED]"
                            )}
                        >
                            <Moon size={12} />
                        </button>
                        <button
                            onClick={() => toggleTheme(false)}
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                !isDarkMode ? "bg-white text-yellow-500 shadow-sm" : "bg-transparent text-gray-400 hover:text-[#7C3AED]"
                            )}
                        >
                            <Sun size={12} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Bento Grid Layout */}
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
                {/* First Row - Main Cards (Above the fold) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                    {/* Monthly Target Achievement */}
                    <div className={cn("lg:col-span-4 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>
                                Monthly Target Achievement
                            </h3>
                            <button onClick={openTargetDialog} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <p className={cn("text-sm mb-6", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            Revenue progress against your set goal.
                        </p>

                        <div className="h-16 flex items-end gap-1 mb-2">
                            {/* Visual Bar Chart mimicking the design */}
                            {Array.from({ length: 40 }).map((_, i) => {
                                // continuous sine wave aesthetic
                                const height = 20 + Math.sin(i * 0.2) * 15 + (i / 40) * 40;
                                // if current progress is past this bar, color it
                                const isFilled = (i / 40) * 100 <= targetProgress;

                                return (
                                    <div
                                        key={i}
                                        className={cn("flex-1 rounded-t-[1px]", isFilled ? "bg-[#7C3AED]" : "bg-gray-100 dark:bg-gray-800")}
                                        style={{ height: `${height}%`, opacity: isFilled ? 1 : 0.3 }}
                                    ></div>
                                );
                            })}
                            <div className="absolute top-[50%] right-[10%] w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-pulse"></div>
                        </div>

                        <div className="flex justify-between text-[11px] text-gray-400 mb-6 font-medium">
                            <span>0%</span>
                            <span>100%</span>
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn("text-4xl font-light", isDarkMode ? "text-white" : "text-gray-900")}>
                                        {targetProgress}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium mt-1">Active Performance</p>
                            </div>
                            <button className="bg-[#7C3AED] text-white text-sm font-medium px-5 py-2 rounded-xl shadow-lg shadow-purple-200 dark:shadow-none hover:bg-[#6D28D9] transition-colors">
                                {targetProgress >= 80 ? 'Great' : targetProgress >= 50 ? 'Good' : 'Push'}
                            </button>
                        </div>
                    </div>

                    {/* CRM Activity */}
                    <div className={cn("lg:col-span-4 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>CRM Activity</h3>
                            <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
                        </div>
                        <div className="mb-4">
                            <span className={cn("text-3xl font-light", isDarkMode ? "text-white" : "text-gray-900")}>
                                {pulse?.deals_this_month || 0}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">Deals Closed</span>
                        </div>
                        <div className="flex h-10 rounded-lg overflow-hidden mb-4">
                            <div className="w-[60%] bg-[#7C3AED]"></div>
                            <div className="w-[25%] bg-blue-400 ml-1"></div>
                            <div className="w-[15%] bg-[#7C3AED]/20 ml-1"></div>
                        </div>
                        <div className="flex justify-between text-xs">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-[#7C3AED] rounded-sm"></span>
                                    <span className={cn("font-medium text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>Customers</span>
                                </div>
                                <span className="text-gray-500 ml-3.5 text-xs">{pulse?.customers_this_month || 0}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-blue-400 rounded-sm"></span>
                                    <span className={cn("font-medium text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>Pending</span>
                                </div>
                                <span className="text-gray-500 ml-3.5 text-xs">{pulse?.pending_quotes_count || 0}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-[#7C3AED]/20 rounded-sm"></span>
                                    <span className={cn("font-medium text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>Today</span>
                                </div>
                                <span className="text-gray-500 ml-3.5 text-xs">{pulse?.deals_today || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Priorities */}
                    <div className={cn("lg:col-span-4 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>Strategic Priorities</h3>
                            <button
                                onClick={() => navigate('/crm/planner')}
                                className={cn("text-xs text-gray-500 border px-2 py-0.5 rounded hover:bg-slate-100", isDarkMode ? "border-gray-700 bg-gray-800 hover:bg-gray-700" : "border-gray-200 bg-white")}
                            >
                                Planner <ChevronRight size={10} className="inline align-middle" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Revenue Growth', val: targetProgress, color: 'bg-[#7C3AED]/70' },
                                { label: 'Customer Retention', val: 85, color: 'bg-orange-300' },
                                { label: 'Market Expansion', val: 55, color: 'bg-blue-400' },
                                { label: 'Operational Efficiency', val: 92, color: 'bg-green-400' }
                            ].map((item, index) => {
                                const totalSegments = 40;
                                const filledSegments = Math.round((item.val / 100) * totalSegments);
                                const pendingSegments = totalSegments - filledSegments;

                                return (
                                    <div key={index}>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className={cn(isDarkMode ? "text-gray-300" : "text-gray-700")}>{item.label}</span>
                                            <span className="text-gray-500">{item.val}/100%</span>
                                        </div>
                                        <div className="h-5 w-full flex gap-[2px]">
                                            {/* Filled segments */}
                                            {[...Array(filledSegments)].map((_, i) => (
                                                <div key={`filled-${i}`} className={cn("w-1 h-full rounded-[1px]", item.color)}></div>
                                            ))}
                                            {/* Pending segments (gray) */}
                                            {[...Array(pendingSegments)].map((_, i) => (
                                                <div key={`pending-${i}`} className={cn("w-1 h-full rounded-[1px]", isDarkMode ? "bg-gray-800" : "bg-gray-100")}></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Second Row - Average Deal Value & Schedule (Side by Side like reference) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                    {/* Average Deal Value Chart - Left Side */}
                    <div className={cn("lg:col-span-7 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>Average Deal Value</h3>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className={cn("text-3xl font-light", isDarkMode ? "text-white" : "text-gray-900")}>
                                        {formatCurrency(pulse?.avg_deal_value || 0)}
                                    </span>
                                    <span className="text-sm text-gray-400">avg</span>
                                    <span className={cn("flex items-center text-green-500 text-xs font-medium px-1.5 py-0.5 rounded", isDarkMode ? "bg-green-900/20" : "bg-green-50")}>
                                        <ArrowUp size={10} className="mr-0.5" /> 6%
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/crm/revenue')}
                                className={cn("flex items-center gap-1 text-xs text-gray-500 border px-2 py-1 rounded-lg hover:bg-slate-100", isDarkMode ? "bg-[#1E293B] border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200")}
                            >
                                Last Month <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="h-48 w-full flex items-end justify-between gap-1 md:gap-2 px-2">
                            {revenueHistory.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className={cn("w-full rounded-t-lg relative h-36 transition-colors", isDarkMode ? "bg-[#7C3AED]/10 group-hover:bg-[#7C3AED]/20" : "bg-[#7C3AED]/5 group-hover:bg-[#7C3AED]/10")}>
                                        <div className="absolute bottom-0 left-0 right-0 bg-[#7C3AED]/30 rounded-t-lg" style={{ height: `${item.val}%` }}></div>
                                        <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-medium" style={{ top: `${100 - item.val - 12}%` }}>{item.val}%</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{item.date}</span>
                                </div>
                            ))}
                            <div className="flex flex-col items-center gap-2 flex-1 group">
                                <div className={cn("w-full rounded-t-lg relative h-36 transition-colors border border-b-0 border-[#7C3AED]/30", isDarkMode ? "bg-[#7C3AED]/20" : "bg-[#7C3AED]/10")}>
                                    <div className="absolute bottom-0 left-0 right-0 bg-[#7C3AED] rounded-t-lg shadow-lg shadow-[#7C3AED]/30" style={{ height: `${targetProgress}%` }}></div>
                                    <span className="absolute top-[2%] left-1/2 -translate-x-1/2 text-[10px] text-[#7C3AED] font-bold z-10">{targetProgress}%</span>
                                </div>
                                <span className="text-xs font-semibold text-[#7C3AED]">Now</span>
                            </div>
                        </div>
                    </div>

                    {/* Your Schedule - Right Side */}
                    <div className={cn("lg:col-span-5 p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>Your Schedule</h3>
                            <button className={cn("flex items-center gap-1 text-xs text-gray-500 border px-2 py-1 rounded-lg", isDarkMode ? "border-gray-700" : "border-gray-200")}>
                                Month <ChevronDown size={12} />
                            </button>
                        </div>

                        {/* Tabs like reference */}
                        <div className="flex gap-2 mb-3">
                            <button className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors", isDarkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900")}>
                                Meetings <span className="bg-[#7C3AED]/20 text-[#7C3AED] text-xs px-1.5 rounded">{meetings.length}+</span>
                            </button>
                            <button className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                                Task <span className="bg-gray-200 text-gray-500 text-xs px-1.5 rounded">0+</span>
                            </button>
                        </div>

                        <div className={cn("flex items-center justify-between mb-2 p-1.5 rounded-lg", isDarkMode ? "bg-gray-800/50" : "bg-slate-50")}>
                            <button onClick={prevMonth} className={cn("w-6 h-6 flex items-center justify-center rounded-full transition-colors", isDarkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-white text-gray-600")}><ChevronLeft size={14} /></button>
                            <span className={cn("text-sm font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                                {displayDate.toLocaleString('default', { month: 'long' })} {displayDate.getFullYear()}
                            </span>
                            <button onClick={nextMonth} className={cn("w-6 h-6 flex items-center justify-center rounded-full transition-colors", isDarkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-white text-gray-600")}><ChevronRight size={14} /></button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                <div key={d} className="text-xs font-medium text-gray-400">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center">
                            {Array.from({ length: new Date(displayDate.getFullYear(), displayDate.getMonth(), 1).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
                                const isSelected = selectedDate.toDateString() === date.toDateString();
                                const isToday = new Date().toDateString() === date.toDateString();
                                const dayMeetings = meetings.filter(m => new Date(m.start_time).toDateString() === date.toDateString());
                                const hasEvent = dayMeetings.length > 0;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            "h-7 w-7 flex items-center justify-center rounded-lg text-xs transition-all cursor-pointer mx-auto relative group",
                                            isSelected
                                                ? "bg-[#7C3AED] text-white font-bold shadow-md shadow-purple-200 dark:shadow-none"
                                                : isToday
                                                    ? "bg-[#7C3AED]/10 text-[#7C3AED] font-bold ring-1 ring-[#7C3AED]"
                                                    : isDarkMode
                                                        ? "text-gray-300 hover:bg-gray-800"
                                                        : "text-gray-700 hover:bg-slate-100",
                                            hasEvent && !isSelected && "font-semibold"
                                        )}
                                    >
                                        {day}
                                        {hasEvent && !isSelected && (
                                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#7C3AED] rounded-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={cn("mt-2 pt-2 border-t border-dashed min-h-[50px]", isDarkMode ? "border-gray-700" : "border-gray-200")}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={cn("text-xs font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                                    {selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 text-[#7C3AED] hover:text-[#7C3AED] hover:bg-[#7C3AED]/10"
                                    onClick={openCreateDialog}
                                >
                                    + Add
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[140px] overflow-y-auto">
                                {meetings
                                    .filter(m => new Date(m.start_time).toDateString() === selectedDate.toDateString())
                                    .map(meeting => (
                                        <div
                                            key={meeting.id}
                                            className={cn("flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all", isDarkMode ? "bg-gray-800/50 hover:bg-gray-800" : "bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10")}
                                            onClick={() => openEditDialog(meeting)}
                                        >
                                            <div className="w-1 h-10 bg-[#7C3AED] rounded-full"></div>
                                            <div className="flex-1 min-w-0">
                                                <span className={cn("text-sm font-medium block truncate", isDarkMode ? "text-white" : "text-gray-900")}>{meeting.title}</span>
                                                <span className="text-gray-500 text-xs">
                                                    {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); cancelMeeting(meeting.id); }}
                                                className="text-xs text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                {meetings.filter(m => new Date(m.start_time).toDateString() === selectedDate.toDateString()).length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm">No meetings scheduled</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Third Row - Pending Items & Quick Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                    {/* Pending Action Items */}
                    <div
                        onClick={() => navigate('/crm/tasks')}
                        className={cn("lg:col-span-6 p-5 rounded-3xl shadow-sm transition-all hover:shadow-md border flex items-center justify-between cursor-pointer", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}
                    >
                        <div>
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>Pending Action Items</h3>
                            <p className="text-sm text-gray-500 mt-1">{pulse?.pending_quotes_count || 0} quotes need follow-up</p>
                        </div>
                        <button className={cn("w-8 h-8 flex items-center justify-center rounded-full", isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600")}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Quick Revenue Summary */}
                    <div className={cn("lg:col-span-6 p-5 rounded-3xl shadow-sm transition-all hover:shadow-md border", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <h3 className={cn("text-lg font-normal tracking-wide mb-4", isDarkMode ? "text-white" : "text-gray-900")}>Quick Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className={cn("text-2xl font-light", isDarkMode ? "text-white" : "text-gray-900")}>{formatCurrency(pulse?.daily_sales_target || 0)}</div>
                                <div className="text-sm text-gray-500">Daily Target</div>
                            </div>
                            <div>
                                <div className={cn("text-2xl font-light", isDarkMode ? "text-white" : "text-gray-900")}>{formatCurrency(pulse?.avg_deal_value || 0)}</div>
                                <div className="text-sm text-gray-500">Avg Deal</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fourth Row - Revenue Analytics */}
                <div className="grid grid-cols-1 gap-4">
                    <div className={cn("p-6 rounded-3xl shadow-sm transition-all hover:shadow-md border relative overflow-hidden", isDarkMode ? "bg-[#1E293B] border-gray-800" : "bg-white border-white")}>
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <h3 className={cn("text-lg font-normal tracking-wide", isDarkMode ? "text-white" : "text-gray-900")}>Revenue Analytics</h3>
                            <button className={cn("flex items-center gap-1 text-xs text-gray-500 border px-2 py-1 rounded-lg", isDarkMode ? "bg-[#1E293B] border-gray-700" : "bg-white border-gray-200")}>
                                This Year <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-4 mb-4 text-xs relative z-10">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-[#7C3AED] rounded-full"></span>
                                <span className={cn(isDarkMode ? "text-gray-300" : "text-gray-600")}>Revenue</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
                                <span className={cn(isDarkMode ? "text-gray-300" : "text-gray-600")}>Target</span>
                            </div>
                        </div>
                        <div className="relative h-40 w-full">
                            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 z-10 h-full pb-6">
                                <span>₹{(pulse?.monthly_sales_target || 100000) / 1000}k</span>
                                <span>₹{(pulse?.monthly_sales_target || 100000) * 0.8 / 1000}k</span>
                                <span>₹{(pulse?.monthly_sales_target || 100000) * 0.6 / 1000}k</span>
                                <span>₹{(pulse?.monthly_sales_target || 100000) * 0.4 / 1000}k</span>
                                <span>₹{(pulse?.monthly_sales_target || 100000) * 0.2 / 1000}k</span>
                                <span>₹0</span>
                            </div>
                            <div className="absolute left-8 right-0 top-2 bottom-0">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={cn("border-b border-dashed h-1/6 w-full", isDarkMode ? "border-gray-700" : "border-gray-200")}></div>
                                ))}

                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path d="M0,80 Q20,70 40,85 T80,75 T100,80 L100,100 L0,100 Z" fill="rgba(253, 186, 116, 0.2)" stroke="none"></path>
                                    <path d="M0,70 Q25,85 50,65 T100,75 L100,100 L0,100 Z" fill="rgba(96, 165, 250, 0.2)" stroke="none"></path>
                                    <path d="M0,70 Q25,85 50,65 T100,75" fill="none" stroke="#60A5FA" strokeWidth="2"></path>
                                    <path d="M0,60 Q30,40 50,60 T80,30 T100,50 L100,100 L0,100 Z" fill="url(#grad1)" stroke="none"></path>
                                    <path d="M0,60 Q30,40 50,60 T80,30 T100,50" fill="none" stroke="#7C3AED" strokeWidth="2"></path>
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                                            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2"></stop>
                                            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                </svg>

                                <div className="absolute left-[80%] top-[30%] h-[70%] border-l border-dashed border-[#7C3AED] z-20 flex flex-col items-center">
                                    <div className={cn("w-3 h-3 bg-[#7C3AED] rounded-full -ml-[6.5px] border-2", isDarkMode ? "border-gray-800" : "border-white")}></div>
                                    <div className={cn("mt-4 shadow-xl rounded-lg p-3 w-36 border", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100")}>
                                        <p className="text-[10px] text-gray-400 mb-1">Current Month</p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full"></span> Revenue</span>
                                                <span className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                                                    {formatCurrency(pulse?.revenue_mtd || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Target</span>
                                                <span className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                                                    {formatCurrency(pulse?.monthly_sales_target || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className={cn("sm:max-w-[425px]", isDarkMode ? "bg-[#1E293B] border-gray-700 text-white" : "bg-white")}>
                    <DialogHeader>
                        <DialogTitle>{editingMeetingId ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right text-xs">Title</Label>
                            <Input
                                id="title"
                                value={newMeeting.title}
                                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                className="col-span-3 h-8 text-xs"
                                placeholder="Meeting title"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right text-xs">Agenda</Label>
                            <Textarea
                                id="desc"
                                value={newMeeting.description}
                                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                                className="col-span-3 min-h-[60px] text-xs resize-none"
                                placeholder="Description"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Date</Label>
                            <div className="col-span-3 text-xs font-medium">
                                {selectedDate.toDateString()}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start" className="text-right text-xs">Time</Label>
                            <div className="col-span-3">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {['30 min', '1 hour', '2 hours'].map((duration) => (
                                        <button
                                            key={duration}
                                            type="button"
                                            onClick={() => {
                                                const [h, m] = newMeeting.startTime.split(':').map(Number);
                                                let endH = h, endM = m;
                                                if (duration === '30 min') { endM += 30; if (endM >= 60) { endH++; endM -= 60; } }
                                                else if (duration === '1 hour') endH++;
                                                else if (duration === '2 hours') endH += 2;
                                                if (endH > 23) endH = 23;
                                                setNewMeeting({ ...newMeeting, endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}` });
                                            }}
                                            className="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-[#7C3AED]/10 hover:border-[#7C3AED] transition-colors"
                                        >
                                            {duration}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="time"
                                        value={newMeeting.startTime}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                                        className="h-9 w-32 text-sm"
                                    />
                                    <span className="text-sm text-gray-400">→</span>
                                    <Input
                                        type="time"
                                        value={newMeeting.endTime}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                                        className="h-9 w-32 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="loc" className="text-right text-xs">Location</Label>
                            <Input
                                id="loc"
                                value={newMeeting.location}
                                onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                                className="col-span-3 h-8 text-xs"
                                placeholder="Online / Office"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleCreateOrUpdateMeeting} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                            {editingMeetingId ? 'Update' : 'Schedule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Target Edit Dialog */}
            <Dialog open={isTargetEditOpen} onOpenChange={setIsTargetEditOpen}>
                <DialogContent className={cn("sm:max-w-[425px]", isDarkMode ? "bg-[#1E293B] border-gray-700 text-white" : "bg-white")}>
                    <DialogHeader>
                        <DialogTitle>Set Monthly Target</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="target" className="text-right text-xs">Target Amount</Label>
                            <Input
                                id="target"
                                type="number"
                                value={targetInput}
                                onChange={(e) => setTargetInput(e.target.value)}
                                className="col-span-3 h-8 text-xs"
                                placeholder="Enter amount"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsTargetEditOpen(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleUpdateTarget} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                            Save Target
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
