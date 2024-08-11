import * as path from "path";
import imageSize from "image-size";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import DateFormatter from "./_components/date-formatter";
import Container from "@/app/_components/container";
import { HeroPost } from "@/app/_components/hero-post";
import { Intro } from "@/app/_components/intro";
import { MyPost } from "@/interfaces/mypost";
import { BlogRepository } from "@/lib/repository";

interface BlogPostsProps {
    posts: MyPost[];
}

const projectRoot = process.cwd();
function getSize(src: string) {
    const size = imageSize(path.join(projectRoot, "../../content", src));
    return {
        width: size.width,
        height: size.height,
    };
}

const BlogPosts: React.FC<BlogPostsProps> = ({ posts }) => {
    return (
        <div className="space-y-8">
            <h2 className="mb-8 text-5xl md:text-7xl font-bold tracking-tighter leading-tight">
                More ...
            </h2>
            {posts.map((post) => (
                <div
                    key={post.slug}
                    className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-4"
                >
                    <div className="md:w-2/3">
                        <p className="text-gray-600">
                            <DateFormatter dateString={post.date} />
                        </p>
                        <h2 className="text-2xl font-bold text-black">
                            <Link
                                as={`/${post.slug}`}
                                href="/[slug]"
                                className="hover:underline"
                            >
                                {post.title}
                            </Link>
                        </h2>
                        <p className="text-gray-700">{post.excerpt}</p>
                        <p className="mt-2 text-gray-500 text-sm">
                            {post.tags.map((tag) => `#${tag} `)}
                        </p>
                    </div>
                    <div className="md:w-1/3">
                        {post.coverImage?.imageSrc && (
                            <Image
                                src={post.coverImage?.imageSrc}
                                alt={post.coverImage?.caption}
                                {...getSize(post.coverImage?.imageSrc)}
                                className="w-full h-auto object-cover"
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function Index() {
    const repository = BlogRepository.fromCwd();
    const allPosts = repository.getAllPosts();
    const heroPost = allPosts[0];
    const morePosts = allPosts.slice(1);

    return (
        <main>
            <Container>
                <Intro />
                <HeroPost
                    title={heroPost.title}
                    coverImage={heroPost.coverImage?.imageSrc}
                    date={heroPost.date}
                    author={heroPost.author_detail}
                    slug={heroPost.slug}
                    excerpt={heroPost.excerpt || ""}
                />

                <BlogPosts posts={morePosts} />
            </Container>
        </main>
    );
}
