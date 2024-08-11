import { h } from "hastscript";
import { Element } from "hastscript/lib/create-h";
import { Root } from "remark-parse/lib";

import { Node } from "unified/lib";
import { visit } from "unist-util-visit";

// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
interface DirectiveNode extends Node {
    type: "containerDirective" | "leafDirective" | "textDirective";
    name: string;
    data?: { hName?: string; hProperties?: Record<string, unknown> };
    attributes?: Record<string, any> | null;
}

interface ReferenceCounter {
    [type: string]: {
        [ref: string]: number;
    };
}
class ReferenceCounterByType {
    refs: ReferenceCounter = {};
    counters: { [type: string]: number } = {};
    constructor() {}
    get(type: string, ref: string | null | undefined) {
        if (!ref) {
            return null;
        }
        if (!this.counters[type]) {
            this.counters[type] = 1;
        }
        if (!this.refs[type]) {
            this.refs[type] = {};
        }
        if (!this.refs[type][ref]) {
            this.refs[type][ref] = this.counters[type]++;
        }
        return this.refs[type][ref];
    }
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
        const refsByType = new ReferenceCounterByType();

        typesToVisit.forEach((type) => {
            visit<Root, typeof type>(tree, type, (node: DirectiveNode) => {
                const data = node.data || (node.data = {});
                const hast: Element = h(node.name, node.attributes || {});
                // data.hName = hast.tagName;
                data.hProperties = hast.properties;
                data.hProperties.dtype = type;

                let ns = "global";
                if (
                    hast.properties.id &&
                    hast.properties.id.toString().indexOf(":") > -1
                ) {
                    ns = hast.properties.id.toString().split(":")[0];
                }
                data.hProperties.refns = ns;

                if (hast.tagName === "ref") {
                    // console.log("ref", data, hast);
                    const refnum = refsByType.get(
                        ns,
                        hast.properties.id as string,
                    );
                    data.hProperties["data-element"] = "ref";
                    data.hName = "span";
                    data.hProperties.refnum = refnum;
                    // console.log("refnum", refnum);
                }
                if (hast.tagName === "full-bleed") {
                    data.hProperties["data-element"] = "full-bleed";
                    data.hName = "div";
                }
                if (hast.tagName === "inline-callout") {
                    // console.log(hast, data);
                    data.hProperties["data-element"] = "inline-callout";
                    data.hName = "div";
                }
                if (hast.tagName === "callout") {
                    data.hProperties["data-element"] = "callout";
                    data.hName = "div";
                }
                if (hast.tagName === "margin-note") {
                    data.hProperties["data-element"] = "margin-note";
                    data.hName = "div";
                }
                if (hast.tagName === "figure-fence") {
                    data.hProperties["data-element"] = "figure-fence";
                    data.hProperties.refnum = refsByType.get(
                        ns,
                        hast.properties.id as string,
                    );
                    data.hName = "div";
                }
                if (type === "containerDirective") {
                    sections++;
                    data.hProperties.sections = sections;
                }
                // console.log("properties", hast.properties, data);
            });
        });
    };
}
