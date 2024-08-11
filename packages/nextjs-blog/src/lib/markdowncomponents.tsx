import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import imageSize from "image-size";
import Image from "next/image";
import React, { PropsWithChildren } from "react";
import ReactMarkdown from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import markdownStyles from "@/app/_components/markdown-styles.module.css";
import { AuthorProps, MyPost } from "@/interfaces/mypost";
import { myRemarkPlugin } from "@/lib/mydirective";
import { extractToc } from "@/lib/myToc";

const projectRoot = process.cwd();

// Note!! Headings are set in markdown-styles.module.css
const gridStyle = ""; // "col-start-4 col-end-10 col-span-7";
const marginStyle = ""; // "md:col-start-11 md:col-end-13 md:col-span-3";
const extraWideStyle = ""; // "md:col-start-2 md:col-end-10 md:col-span-10";

export function getMarkdown(): MyPost {
    const fullPath = path.join(projectRoot, `src/app/hellomarkdown/file.md`);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return { ...data, slug: "/hellomarkdown", content } as MyPost;
}

export function Article({ children }: PropsWithChildren) {
    return <div className={markdownStyles.article}>{children}</div>;
}

export function Paragraph({ children }: any) {
    return (
        // TODO if this a p tag, then we can't have nested divs under it, also figures aren't allowed
        // maybe we can check the children and conditionally render as a paragraph if the children are just text, does this matter?
        <div className={`m-2 ${gridStyle}`}>{children}</div>
    );
}

export function MarginNote({ children }: any) {
    return (
        <div
            className={`m-2 ${gridStyle} row-span-4 ${marginStyle} text-sm ${markdownStyles["margin-note"]}`}
        >
            {children}
        </div>
    );
}

export interface TagProps {
    tags?: string[];
}
export function Tags({ tags }: TagProps) {
    if (!tags) {
        return <></>;
    }
    return (
        <div className={`m-2 ${gridStyle}`}>
            <div className="flex gap-1 flex-wrap text-sm justify-center">
                <span>Tags:</span>
                {tags?.map((tag, idx) => (
                    <span
                        key={idx}
                        className="bg-gray-100 rounded-full px-3 font-semibold text-gray-600"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function InlineCallout({ children }: any) {
    return (
        <div
            className={`col-span-12 col-start-1 col-end-13 ${extraWideStyle} place-content-center`}
        >
            <div className="m-5 text-lg">{children}</div>
        </div>
    );
}
export function Callout({ children }: any) {
    return (
        <div
            className={`m-2 col-start-1 col-end-13 col-span-12 ${marginStyle} md:row-span-12 text-2xl`}
        >
            {children}
        </div>
    );
}

export function Author(props: AuthorProps) {
    if (!props.picture || !props.name) {
        console.log("missing required props in Author");
        return <></>;
    }
    const size = imageSize(
        path.join(projectRoot, "../../content", props.picture),
    );
    // console.log("markdown styles", markdownStyles);
    return (
        <div className={markdownStyles.author}>
            <Image
                src={props.picture}
                width={size.width}
                height={size.height}
                alt={props.name}
                className="rounded-xl p-1 w-full"
            />
            <div className="flex items-center">
                <div className="m-2 text-sm">
                    <div className="prose-h4 font-semibold">
                        By {props.name}
                    </div>
                    <div>{props.bio}</div>
                </div>
            </div>
        </div>
    );
}

export function Heading1({ children }: any) {
    let id = children;
    if (typeof children === "string") {
        id = children.toLowerCase().replaceAll(" ", "-");
    }
    return <h1 id={id}>{children}</h1>;
}

export function Heading2({ children }: any) {
    // lower case, - separated
    let id = children;
    if (typeof children === "string") {
        id = children.toLowerCase().replaceAll(" ", "-");
    }
    // children.map((x: string) => x.toLowerCase().replaceAll(" ", "-"));
    return <h2 id={id}>{children}</h2>;
}

export interface ImageWithinFigureProps {
    src?: string;
    width?: number;
    height?: number;
    alt?: string;
}
export function ImageWithinFigure({
    src,
    width,
    height,
    alt,
}: ImageWithinFigureProps) {
    if (!src || !alt) {
        return <span>Missing image properties</span>;
    }
    if (!width || !height) {
        const size = imageSize(path.join(projectRoot, "../../content", src));
        width = size.width;
        height = size.height;
    }
    return (
        <Image
            src={src}
            width={width || 1024}
            height={height || 1024}
            alt={alt}
            className="rounded-xl shadow-2xl"
        />
    );
}

export interface FigureFenceProps {
    children?: any;
    caption?: string;
    title?: string;
    id?: string;
    refnum?: number;
    refns?: string;
    reflabels?: {
        [label: string]: string;
    };
}
export function FigureFence(props: FigureFenceProps) {
    let refLabel = "Figure";
    if (props.refns && props.reflabels && props.reflabels[props.refns]) {
        refLabel = props.reflabels[props.refns];
    } else {
        logMissingFigureNS();
    }

    return (
        <>
            <figure className={gridStyle} id={props.id}>
                {props.title && (
                    <div className={`${gridStyle} text-center text-md`}>
                        {props.refnum && `${props.refnum}: `}
                        {props.title}
                    </div>
                )}
                <div className="col-start-1 col-end-13 col-span-12 ">
                    {props.children}
                </div>
                <figcaption className="m-4 col-span-4 text-sm text-center">
                    {props.refnum && `${refLabel} ${props.refnum}: `}
                    {props.caption}
                </figcaption>
            </figure>
        </>
    );
}

export interface RefLinkProps {
    refid?: string;
    refnum?: number;
    reflabels?: {
        [label: string]: string;
    };
    children?: any;
}
export function RefLink(props: RefLinkProps) {
    let refLabel = "Figure";
    let refns = props.refid?.split(":")[0];
    if (refns && props.reflabels && props.reflabels[refns]) {
        refLabel = props.reflabels[refns];
    } else {
        logMissingFigureNS();
    }

    return (
        <a href={`#${props.refid}`}>
            {refLabel} {props.refnum}
        </a>
    );
}

function logMissingFigureNS() {
    console.warn(
        `
Missing ref namespaces in the article frontmatter. Set figurens in your frontmatter
e.g.:
figurens:
    img: Image
    fig: Figure
    code: Code Excerpt
        `.trim(),
    );
}

export function FullBleedImage({
    src,
    width,
    height,
    alt,
}: ImageWithinFigureProps) {
    if (!src || !alt) {
        return <span>Missing image properties</span>;
    }
    if (!width || !height) {
        // TODO maybe it would be better to get this in the markdown plugin
        const size = imageSize(path.join(projectRoot, "../../content", src));
        // TODO height width seem to be reversed in image-size???
        width = size.height;
        height = size.width;
    }
    return (
        <div className="col-start-1 col-end-13 col-span-12">
            <div className="col-start-1 col-end-13 col-span-12 ">
                <figure>
                    <Image
                        src={src}
                        alt={alt}
                        width={height}
                        height={width}
                        className="col-start-1 col-end-13 col-span-12 w-full"
                    />
                    <figcaption className="text-center">{alt}</figcaption>
                </figure>
            </div>
        </div>
    );
}

export function TocFromMarkdown({ markdown }: { markdown: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkParse,
                remarkDirective,
                myRemarkPlugin,
                extractToc,
            ]}
        >
            {markdown}
        </ReactMarkdown>
    );
}

export function ArticleBodyFromMarkdown({ art }: { art: MyPost }) {
    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkParse,
                remarkGfm,
                remarkDirective,
                myRemarkPlugin,
            ]}
            // rehypePlugins={[]}
            urlTransform={(url) => {
                return url; // or return a new url string.
            }}
            // default is all
            // allowedElements={["img", "div", "p"]}
            components={{
                span: ({ node, ...rest }) => {
                    if (node?.properties["data-element"] === "ref") {
                        return (
                            // <a href={`#${node?.properties.id}`}>
                            //     Figure {node?.properties.refnum}
                            // </a>
                            <RefLink
                                reflabels={art.figurens}
                                refid={node?.properties.id as string}
                                refnum={node?.properties.refnum as number}
                            />
                        );
                    }
                    return <span {...rest} />;
                },
                ol: ({ node, className, ...rest }) => {
                    return (
                        <ol
                            className={`${className ?? ""} ${gridStyle} list-decimal`}
                            {...rest}
                        />
                    );
                },
                ul: ({ node, className, ...rest }) => {
                    return (
                        <ul
                            className={`${className ?? ""} ${gridStyle} list-disc`}
                            {...rest}
                        />
                    );
                },
                table: ({ node, className, ...rest }) => {
                    return (
                        <table
                            className={`${className} ${gridStyle}`}
                            {...rest}
                        />
                    );
                },
                section: ({ node, className, ...rest }) => {
                    return (
                        <section
                            className={`${className} ${gridStyle}`}
                            {...rest}
                        />
                    );
                },
                div: ({ node, ...rest }) => {
                    if (node?.properties["data-element"] === "inline-callout") {
                        // console.log("page.tsx", node, rest);
                        return <InlineCallout {...rest} />;
                    }
                    if (node?.properties["data-element"] === "callout") {
                        return <Callout {...rest} />;
                    }
                    if (node?.properties["data-element"] === "figure-fence") {
                        return (
                            <FigureFence
                                reflabels={art.figurens}
                                {...rest}
                                {...node.properties}
                            />
                        );
                    }
                    if (node?.properties["data-element"] === "full-bleed") {
                        return (
                            <FullBleedImage
                                src={(node?.properties.src as string) || ""}
                                alt={(node?.properties.alt as string) || ""}
                            />
                        );
                    }
                    if (node?.properties["data-element"] === "margin-note") {
                        return <MarginNote {...rest} />;
                    }
                    return <div {...rest} />;
                },
                h2: ({ node, ...rest }) => <Heading2 {...rest} />,
                h1: ({ node, ...rest }) => <Heading1 {...rest} />,
                blockquote: ({ node, ...rest }) => {
                    return <blockquote {...rest} className={gridStyle} />;
                },
                p: ({ node, ...rest }) => {
                    return <Paragraph {...rest} />;
                },
                img: ({ node }) => {
                    return (
                        <ImageWithinFigure
                            src={node?.properties.src as string}
                            alt={node?.properties.alt as string}
                        />
                    );
                },
                pre: ({ node, ...rest }) => {
                    return (
                        <pre className={`m-2 ${gridStyle}`}>
                            {rest.children}
                        </pre>
                    );
                },
            }}
        >
            {art.content}
        </ReactMarkdown>
    );
}
