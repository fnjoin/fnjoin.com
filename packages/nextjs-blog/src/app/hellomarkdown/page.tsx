import React, { ReactNode } from "react";

import {
    Article,
    ArticleBodyFromMarkdown,
    Author,
    Heading1,
    MarginNote,
    Tags,
    TocFromMarkdown,
    getMarkdown,
} from "@/lib/markdowncomponents";

export default function HelloMarkdownPage(): ReactNode {
    const art = getMarkdown();
    return (
        <Article>
            <Tags tags={art.tags} />
            <Heading1>{art.title}</Heading1>
            <Author {...art.author_detail} />
            <MarginNote>
                Table of contents:
                <TocFromMarkdown markdown={art.content} />
            </MarginNote>
            <ArticleBodyFromMarkdown art={art} />
        </Article>
    );
}
