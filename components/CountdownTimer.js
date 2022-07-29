import { HStack, Text } from "@chakra-ui/react";
import { useState } from "react";

export const CountdownTimer = ({ endTime }) => {
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);

    setTimeout(() => {
        const timeleft = endTime - new Date().getTime();
        const totSecRemaining = timeleft / 1000;
        const minutesRemaining = totSecRemaining / 60;
        setMinutes(Math.trunc(minutesRemaining));
        setSeconds(Math.trunc((minutesRemaining - Math.trunc(minutesRemaining)) * 60))
    }, [1000]) // update every second

    return (
        <HStack>
            {endTime !== 0 && <><Text>Countdown: </Text><Text>{minutes} minutes</Text><Text>{seconds} seconds</Text></>}
        </HStack>
    )
}