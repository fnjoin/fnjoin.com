import Link from "next/link";
import React from "react";
import HeaderButton from "./conditiononpathnamebutton";
import { PageRepository } from "@/lib/repository";

// more nav options https://flowbite.com/docs/components/navbar/
const Header = () => {
    const pages = PageRepository.fromCwd().getAllPosts();

    return (
        <nav className="bg-white border-gray-200 dark:bg-gray-900 mb-20">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight md:tracking-tighter leading-tight">
                    <Link href="/" className="hover:underline">
                        Join::Function
                    </Link>
                </h2>
                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                    {pages
                        .filter((p) =>
                            p.content_flags?.includes("top-nav-call-to-action"),
                        )
                        .map((p, idx) => (
                            <HeaderButton key={idx} post={p} />
                        ))}
                </div>
                <div
                    className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1"
                    id="navbar-cta"
                >
                    <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
                        {pages

                            .filter(
                                (p) =>
                                    !p.content_flags?.includes(
                                        "top-nav-call-to-action",
                                    ),
                            )
                            .map((page) => (
                                <li key={page.slug}>
                                    <Link
                                        href={`/${page.slug}`}
                                        className="block py-2 px-3 md:p-0 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:dark:text-blue-500"
                                        aria-current="page"
                                    >
                                        {page.title}
                                    </Link>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Header;
