import { useState } from "react";

export const CountdownTimer = ({ endTime }) => {
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [done, setDone] = useState(false);

    setTimeout(() => {
        const timeleft = endTime - new Date().getTime();
        const totSecRemaining = timeleft / 1000;
        const minutesRemaining = totSecRemaining / 60;
        const min = Math.trunc(minutesRemaining);
        const sec = Math.trunc((minutesRemaining - Math.trunc(minutesRemaining)) * 60);
        if (min === 0 && sec <= 0) {
            setDone(true)
        } else {
            setMinutes(min);
            setSeconds(sec);
        }
    }, 1000) // update every second

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
    )
}