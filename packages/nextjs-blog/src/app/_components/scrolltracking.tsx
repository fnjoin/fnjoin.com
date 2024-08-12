"use client";
import { useEffect, useState } from "react";

export interface ScrollTrackerProps {
    postId: string;
}

const ScrollTracker = ({ postId }: ScrollTrackerProps) => {
    const [startTime, setStartTime] = useState<number | null>(null);

    useEffect(() => {
        // Set the start time when the component mounts
        setStartTime(Date.now());

        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight;
            const pageHeight = document.documentElement.scrollHeight;

            if (scrollPosition >= pageHeight) {
                // Calculate time spent on the page
                const timeSpent = Date.now() - startTime!;

                // Convert timeSpent to seconds
                const timeSpentSeconds = Math.floor(timeSpent / 1000);

                console.log("time spent", timeSpentSeconds);
                // Send an event to Google Analytics with the time spent
                window.gtag("event", "read_complete", {
                    event_category: "Blog",
                    event_label: postId,
                    value: timeSpentSeconds, // You can track the time spent in seconds
                });
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [postId, startTime]);

    return null;
};

export default ScrollTracker;
