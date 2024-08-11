/** app/sitemap.xml/route.ts **/
import { remark } from "remark";
import strip from "strip-markdown";
import * as xmljs from "xml-js";
import { MyPost } from "@/interfaces/mypost";
import { BlogRepository } from "@/lib/repository";

function getPostsForRSS(): MyPost[] {
    const posts = BlogRepository.fromCwd().getAllPosts();
    return posts;
}

function getFirstNWordsFromMarkdown(markdownString: string, n: number): string {
    // Convert markdown to plain text
    const plainText = remark()
        .use(strip)
        .processSync(markdownString)
        .toString();

    // Split the plain text into words
    const words = plainText.split(/\s+/);

    // Return the first n words
    return words.slice(0, n).join(" ");
}

function formatDateForRSS(date: Date): string {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    const formattedDate = `${weekday}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
    return formattedDate;
}

function getRSS() {
    const posts = getPostsForRSS();

    const rssObject = {
        _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
        rss: {
            _attributes: {
                "xmlns:atom": "http://www.w3.org/2005/Atom",
                version: "2.0",
                "data-google-analytics-opt-out": "",
            },
            channel: {
                title: { _text: "fn:join" },
                link: { _text: "https://fnjoin.com/" },
                description: { _text: "Recent content on fn:join" },
                managingEditor: {
                    _text: "contact@fnjoin.com (Salman Malik, Archie Cowan)",
                },
                webMaster: {
                    _text: "contact@fnjoin.com (Salman Malik, Archie Cowan)",
                },
                lastBuildDate: { _text: formatDateForRSS(new Date()) },
                "atom:link": {
                    _attributes: {
                        href: "https://fnjoin.com/index.xml",
                        rel: "self",
                        type: "application/rss+xml",
                    },
                },
                item: posts.map((post) => ({
                    title: { _text: post.title },
                    link: {
                        _text:
                            `https://fnjoin.com/${post.slug}` +
                            (post.slug.endsWith("/") ? "" : "/"),
                    },
                    description: {
                        _text:
                            post.excerpt ||
                            getFirstNWordsFromMarkdown(post.content, 100) +
                                "...",
                    },
                    author: { _text: post.author },
                    pubDate: { _text: formatDateForRSS(post.date) },
                    guid: {
                        _text:
                            `https://fnjoin.com/${post.slug}` +
                            (post.slug.endsWith("/") ? "" : "/"),
                    },
                })),
            },
        },
    };

    const options = { compact: true, ignoreComment: true, spaces: 4 };
    const rssXml = xmljs.js2xml(rssObject, options);

    return rssXml;
}

export async function GET() {
    return new Response(getRSS(), {
        headers: {
            "Content-Type": "text/xml",
        },
    });
}
