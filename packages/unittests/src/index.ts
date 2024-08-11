import { h } from "hastscript";
import { Element } from "hastscript/lib/create-h";
import { Root } from "remark-parse/lib";

import { Node } from "unified/lib";
import { visit } from "unist-util-visit";

export class Hello {
    public sayHello() {
        return "hello, world!";
    }
}

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
