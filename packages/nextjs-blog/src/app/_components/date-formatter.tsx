import { parseISO, format } from "date-fns";
import React from "react";

type Props = {
    dateString?: string | Date;
};

const DateFormatter = ({ dateString }: Props) => {
    if (!dateString) {
        return <></>;
    }
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else {
        date = parseISO(dateString);
    }
    return (
        <time dateTime={dateString.toString()}>
            {format(date, "LLLL	d, yyyy")}
        </time>
    );
};

export default DateFormatter;
