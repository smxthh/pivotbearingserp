import { useEffect, useState } from 'react';
import { Typewriter } from '@/components/ui/typewriter-text';
import businessQuotes from '@/data/business-quotes.json';

export function DailyQuote() {
    const [quote, setQuote] = useState('');

    useEffect(() => {
        // Get day of year (1-365)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        // Get quote for today (use modulo to handle leap years)
        const quoteIndex = (dayOfYear - 1) % businessQuotes.length;
        setQuote(businessQuotes[quoteIndex]);
    }, []);

    return (
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 p-12 rounded-3xl shadow-lg overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="relative max-w-5xl mx-auto text-center">
                {/* Quote text with animation */}
                <blockquote className="relative">
                    <Typewriter
                        text={quote}
                        speed={30}
                        cursor=""
                        loop={true}
                        delay={3000}
                        deleteSpeed={20}
                        className="text-2xl md:text-3xl lg:text-4xl font-light text-gray-800 leading-relaxed tracking-wide"
                    />
                </blockquote>

                {/* Decorative line */}
                <div className="mt-8 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
            </div>
        </div>
    );
}
