import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import Header from "../../_components/header";
import Copyright from "@/app/_components/copy";
import { PostBody } from "@/app/_components/post-body";
import {
    Article,
    Author,
    FigureFence,
    Heading1,
    ImageWithinFigure,
    Tags,
} from "@/lib/markdowncomponents";
import { BlogRepository } from "@/lib/repository";

export default async function Post({ params }: Params) {
    const repository = BlogRepository.fromCwd();
    const post = repository.getPostByPath(["post", ...params.slug].join("/"));

    if (!post) {
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

                <Copyright
                    author={post.author_detail.name ?? "Author"}
                    startDate={post.date}
                />
            </Article>
        </main>
    );
}

type Params = {
    params: {
        slug: string[];
    };
};

export function generateMetadata({ params }: Params): Metadata {
    const repository = BlogRepository.fromCwd();
    const post = repository.getPostByPath(["post", ...params.slug].join("/"));

    if (!post) {
        return notFound();
    }

    const title = `${post.title} | Join Function`;

    // if this is empty, no description is included
    const description = post.excerpt;

    return {
        metadataBase: new URL("https://www.fnjoin.com"),
        title,
        description, // note, if this is empty, no description is included
        alternates: {
            canonical: `https://fnjoin.com/${post.slug}`,
        },

        robots: {
            follow: true,
            index: true,
        },
        openGraph: {
            title,
            description,
            images: post.ogImage ? [post.ogImage?.url] : [],
        },
        twitter: {
            card: "summary_large_image",
            creator: post.author_detail.twitter,
            title,
            description,
        },
    };
}

export async function generateStaticParams() {
    const repository = BlogRepository.fromCwd();
    const posts = repository.getAllPosts();
    return posts.map((post) => ({
        slug: post.slug.split("/").slice(1),
    }));
}
