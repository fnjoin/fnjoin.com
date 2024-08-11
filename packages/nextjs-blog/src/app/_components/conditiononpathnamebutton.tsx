"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { MyPost } from "@/interfaces/mypost";

export interface HeaderButtonProps {
    post: MyPost;
}
export default function HeaderButton({ post }: HeaderButtonProps) {
    const pathname = usePathname();
    if (pathname === `/${post.slug}`) {
        return (
            <button
                className="bg-gray-300 px-4 py-2 rounded-md cursor-not-allowed opacity-50"
                disabled
            >
                {post.title}
            </button>
        );
    } else {
        return (
            <Link
                href={`/${post.slug}`}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
                {post.title}
            </Link>
        );
    }
}
