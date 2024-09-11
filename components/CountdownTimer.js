import { useState, useEffect } from "react";

export const CountdownTimer = ({ endTime }) => {
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const timeleft = endTime - new Date().getTime();
            const totSecRemaining = timeleft / 1000;
            const minutesRemaining = totSecRemaining / 60;
            const min = Math.trunc(minutesRemaining);
            const sec = Math.trunc((minutesRemaining - min) * 60);

            if (min === 0 && sec <= 0) {
                setDone(true);
                clearInterval(interval); // Stop the timer when time is up
            } else {
                setMinutes(min);
                setSeconds(sec);
            }
        }, 1000); // update every second

        return () => clearInterval(interval); // Clear interval on component unmount
    }, [endTime]); // Only run effect when endTime changes

    return (
        <div className="flex flex-row items-center bg-yellow-100 p-2 rounded">
            {endTime !== 0 && !done && (
                <>
                    <span className="mr-2">Countdown:</span>
                    <span className="mr-2">{minutes} minutes</span>
                    <span>{seconds} seconds</span>
                </>
            )}
            {done && (
                <>
                    <span className="mr-2">Countdown:</span>
                    <span>Done</span>
                </>
            )}
        </div>
    );
};