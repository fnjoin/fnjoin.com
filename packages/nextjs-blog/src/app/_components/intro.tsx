import React from "react";

interface DefinitionProps {
    word: string;
    wordType: string;
    definitions: string[];
}

const Definition: React.FC<DefinitionProps> = ({
    word,
    wordType,
    definitions,
}) => {
    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-2">{word}</h2>
            <p className="text-gray-600 mb-4">{wordType}</p>
            <ol className="list-decimal list-inside">
                {definitions.map((definition, index) => (
                    <li key={index} className="mb-2">
                        {definition}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export function Intro() {
    return (
        <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
                Join Function
            </h1>
            <Definition
                word="fn::join"
                wordType="noun"
                definitions={[
                    "Takes a sequence of ideas and combines them, joined by a separator.",
                ]}
            />
        </section>
    );
}
