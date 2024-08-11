import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import Header from "../../_components/header";
import { PostBody } from "@/app/_components/post-body";
import {
    Article,
    Author,
    FigureFence,
    Heading1,
    ImageWithinFigure,
    Tags,
} from "@/lib/markdowncomponents";
import { PageRepository } from "@/lib/repository";

type Params = {
    params: {
        path: string[];
    };
};

const repository = PageRepository.fromCwd();

export default async function Post({ params }: Params) {
    const post = repository.getPostByPath("page/" + params.path.join("/"));

    if (!post) {
        console.log("post not found", params);
        return notFound();
    }
    return (
        <main>
            <Header />
            <Article>
                <Tags tags={post.tags} />
                <Heading1>{post.title}</Heading1>
                <Author {...post.author_detail} />
                {post.coverImage && (
                    <FigureFence caption={post.coverImage.caption}>
                        <ImageWithinFigure
                            src={post.coverImage.imageSrc}
                            alt={post.coverImage.caption}
                        />
                    </FigureFence>
                )}
                <PostBody content={post} />
            </Article>
        </main>
    );
}

export function generateMetadata({ params }: Params): Metadata {
    const post = repository.getPostByPath("page/" + params.path.join("/"));

    if (!post) {
        return notFound();
    }

    const title = `${post.title} | Join Function`;

    if (post.ogImage?.url) {
        return {
            title,
            description: post.excerpt,
            openGraph: {
                title,
                images: [post.ogImage?.url],
            },
        };
    }

    return {
        title,
        description: post.excerpt,
        openGraph: {
            title,
        },
    };
}

export async function generateStaticParams() {
    const posts = repository.getAllPosts();

    console.log(
        "generate static params",
        posts.map((post) => ({
            path: post.slug.split("/").slice(1),
        })),
    );
    return posts.map((post) => ({
        path: post.slug.split("/").slice(1),
    }));
}
