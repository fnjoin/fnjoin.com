import React from "react";
import { MyPost } from "@/interfaces/mypost";
import { ArticleBodyFromMarkdown } from "@/lib/markdowncomponents";
export type Props = {
    content: MyPost;
};

export function PostBody({ content }: Props) {
    return <ArticleBodyFromMarkdown art={content} />;
}
