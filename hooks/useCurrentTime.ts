import { useState, useEffect } from 'react';

export const useCurrentTime = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const formattedTime = time.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const formattedDate = time.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }).replace('.', '')
        .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter

    const dateString = `${time.getFullYear()}-${(time.getMonth() + 1).toString().padStart(2, '0')}-${time.getDate().toString().padStart(2, '0')}`;

    return {
        time,
        formattedTime,
        formattedDate,
        dateString
    };
};
