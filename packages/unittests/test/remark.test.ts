import { expect, test } from "@jest/globals";
import { h } from "hastscript";
import { Element } from "hastscript/lib/create-h";
import rehypeDocument from "rehype-document";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { Root } from "remark-parse/lib";
import remarkRehype from "remark-rehype";
// import { read } from "to-vfile";
import { unified } from "unified";
// import { reporter } from "vfile-reporter";

import { Node } from "unified/lib";
import { visit } from "unist-util-visit";

test("remark is easier than mdast?", async () => {
    const file = await unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(remarkRehype)
        // this encloses the html in a complete document
        .use(rehypeDocument)
        // this formats the html with indentation and whatnot
        .use(rehypeFormat)
        .use(rehypeStringify).process(`
# this is something

following something

:::identifier{key="value"} .foo
Inside of a container
:::

`);

    expect(file.data).toMatchSnapshot();
});

test("this is the example from remark-directive", async () => {
    const doc = `

Lorem:br
ipsum.

::hr{.red}

:::section{#blah}

A :i[lovely] language know as :abbr[HTML]{title="HyperText Markup Language"}.
:::
:::section{#blah2}

A little more 
:::
`;
    const file = await unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(myRemarkPlugin)
        .use(remarkRehype)
        // this encloses the html in a complete document
        .use(rehypeDocument)
        // this formats the html with indentation and whatnot
        .use(rehypeFormat)
        .use(rehypeStringify)
        .process(doc);

    expect(file.data).toMatchSnapshot();
});

// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
interface DirectiveNode extends Node {
    type: "containerDirective" | "leafDirective" | "textDirective";
    name: string;
    data?: { hName?: string; hProperties?: Record<string, unknown> };
    attributes?: Record<string, any> | null;
}

export function myRemarkPlugin() {
    let sections = 0;

    return function transformer(tree: Root): void {
        // Correctly specify each type to visit in separate calls or a workaround
        const typesToVisit: DirectiveNode["type"][] = [
            "containerDirective",
            "leafDirective",
            "textDirective",
        ];

        typesToVisit.forEach((type) => {
            visit<Root, typeof type>(tree, type, (node: DirectiveNode) => {
                const data = node.data || (node.data = {});
                const hast: Element = h(node.name, node.attributes || {});
                data.hName = hast.tagName;
                data.hProperties = hast.properties;
                data.hProperties.dtype = type;
                if (type === "containerDirective") {
                    sections++;
                    data.hProperties.sections = sections;
                }
            });
        });
    };
}
