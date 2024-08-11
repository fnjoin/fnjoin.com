import Link from "next/link";
import React from "react";
import DateFormatter from "./date-formatter";
import Avatar from "@/app/_components/avatar";
import CoverImage from "@/app/_components/cover-image";
import { type Author } from "@/interfaces/author";

type Props = {
    title: string;
    coverImage?: string;
    date: string | Date;
    excerpt: string;
    author?: Author;
    slug: string;
};

export function HeroPost({
    title,
    coverImage,
    date,
    excerpt,
    author,
    slug,
}: Props) {
    console.log("slug", slug);
    return (
        <section>
            <div className="mb-8 md:mb-16">
                {coverImage && (
                    <CoverImage title={title} src={coverImage} slug={slug} />
                )}
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-x-16 lg:gap-x-8 mb-20 md:mb-28">
                <div>
                    <h3 className="mb-4 text-4xl lg:text-5xl leading-tight">
                        <Link
                            as={`/${slug}`}
                            href="/[slug]"
                            className="hover:underline"
                        >
                            {title}
                        </Link>
                    </h3>
                    <div className="mb-4 md:mb-0 text-lg">
                        <DateFormatter dateString={date} />
                    </div>
                </div>
                <div>
                    <p className="text-lg leading-relaxed mb-4">{excerpt}</p>
                    {author && <Avatar {...author} />}
                </div>
            </div>
        </section>
    );
}