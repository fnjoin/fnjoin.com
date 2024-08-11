import React from "react";

interface CopyrightProps {
    author: string;
    startDate: Date;
}

const Copyright: React.FC<CopyrightProps> = ({ author, startDate }) => {
    const currentYear = new Date().getFullYear();
    const startYear = new Date(startDate).getFullYear();
    const yearRange =
        startYear < currentYear
            ? `${startYear} - ${currentYear}`
            : `${currentYear}`;

    return (
        <div className="text-center">
            <p>
                &copy; {yearRange} {author}
            </p>
        </div>
    );
};

export default Copyright;
