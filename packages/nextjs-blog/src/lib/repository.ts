import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { crawlDirectories } from "./fileutil";
import { AuthorProps, MyPost } from "@/interfaces/mypost";

function getAuthorMarkdown(fullPath: string): AuthorProps {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    return data as AuthorProps;
}

function getMarkdown(fullPath: string): MyPost {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);
    return { ...data, content } as MyPost;
}

export interface BlogRepositoryProps {
    dir: string;
}
export class BlogRepository {
    static fromCwd() {
        return new BlogRepository({
            dir: path.join(process.cwd(), "../../content"),
        });
    }
    private dir: string;
    private posts: MyPost[] = [];
    private postsByPath: Record<string, MyPost> = {};

    constructor({ dir }: BlogRepositoryProps) {
        this.dir = dir;
        const files = crawlDirectories({
            dir: this.dir,
            filter: (file) =>
                file.endsWith(".md") &&
                file.indexOf("/authors/") < 0 &&
                file.indexOf("post") > 0,
        });
        let x: IteratorResult<string> = files.next();
        while (!x.done) {
            const post = getMarkdown(x.value);
            if (post.author === "Salman Malik") {
                post.author_detail = getAuthorMarkdown(
                    path.join(dir, "authors/smalik.md"),
                );
            } else if (post.author === "Archie Cowan") {
                post.author_detail = getAuthorMarkdown(
                    path.join(dir, "authors/acowan.md"),
                );
            } else if (fs.existsSync(`authors/${post.author}.md`)) {
                post.author_detail = getAuthorMarkdown(
                    path.join(dir, `authors/${post.author}.md`),
                );
            }

            if (!post.coverImage) {
                // post.coverImage = {
                //     imageSrc: "/assets/astronaut.jpg",
                //     caption: "Placeholder image of an astronaut.",
                // };
            }

            post.slug = x.value.replace(this.dir + "/", "").replace(".md", "");
            // console.log("post slug:", post.slug);
            this.posts.push(post);
            this.postsByPath[post.slug] = post;
            x = files.next();
        }

        // sort posts in reverse chronological order
        this.posts.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }

    getAllPosts(): MyPost[] {
        return this.posts;
    }

    getPostByPath(slug: string): MyPost {
        return this.postsByPath[slug];
    }
}

export class PageRepository {
    static fromCwd() {
        return new PageRepository({
            dir: path.join(process.cwd(), "../../content"),
        });
    }
    private dir: string;
    private posts: MyPost[] = [];
    private postsByPath: Record<string, MyPost> = {};

    constructor({ dir }: BlogRepositoryProps) {
        this.dir = dir;
        const files = crawlDirectories({
            dir: this.dir,
            filter: (file) =>
                file.endsWith(".md") &&
                file.indexOf("/authors/") < 0 &&
                file.indexOf("/page/") > 0,
        });
        let x: IteratorResult<string> = files.next();
        while (!x.done) {
            const post = getMarkdown(x.value);

            post.slug = x.value.replace(this.dir + "/", "").replace(".md", "");
            // console.log("post slug:", post.slug);
            this.posts.push(post);
            this.postsByPath[post.slug] = post;
            x = files.next();
        }
    }
    getAllPosts(): MyPost[] {
        return this.posts;
    }

    getPostByPath(slug: string): MyPost {
        return this.postsByPath[slug];
    }
}
