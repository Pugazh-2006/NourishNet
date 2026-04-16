import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
export function CountdownTimer({ targetTime }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    useEffect(() => {
        const calculateTimeLeft = () => {
            const target = new Date(targetTime).getTime();
            const now = new Date().getTime();
            const difference = target - now;
            if (difference <= 0) {
                setTimeLeft('Expired');
                setIsUrgent(true);
                return;
            }
            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${hours}h ${minutes}m`);
            setIsUrgent(hours === 0 && minutes <= 30);
        };
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [targetTime]);
    return (_jsxs("div", { className: `flex items-center gap-1 ${isUrgent ? 'text-red-600' : 'text-gray-600'}`, children: [_jsx(Clock, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-medium", children: timeLeft })] }));
}
