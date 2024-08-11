import { expect, test } from "@jest/globals";
import { toHtml } from "hast-util-to-html";
import {
    directiveFromMarkdown,
    directiveToMarkdown,
} from "mdast-util-directive";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { toMarkdown } from "mdast-util-to-markdown";
import { directive } from "micromark-extension-directive";

/**
 * @typedef {import('mdast-util-to-hast')}
 */

test("mdast", () => {
    // read a file synchronously
    // const doc = fs.readFileSync("example.md", "utf8");
    // const doc = await fs.readF("example.md");
    const doc = `A lovely language know as :abbr[HTML]{title="HyperText Markup Language"}.`;

    const tree = fromMarkdown(doc, {
        extensions: [directive()],
        mdastExtensions: [directiveFromMarkdown()],
    });

    expect(removePositionKeys(tree)).toMatchSnapshot();
    // console.log(tree);
    // console.log(JSON.stringify(removePositionKeys(tree), null, 2));

    toMarkdown(tree, { extensions: [directiveToMarkdown()] });

    // console.log(out);
});

test("mdast has text directives but how flexible are they?", () => {
    const doc = `A lovely language known as :anything[stuff]{title="This is something"}.`;

    const tree = fromMarkdown(doc, {
        extensions: [directive()],
        mdastExtensions: [directiveFromMarkdown()],
    });

    expect(removePositionKeys(tree)).toMatchSnapshot();

    const out = toMarkdown(tree, { extensions: [directiveToMarkdown()] });

    expect(out).toMatchSnapshot();
});

interface AnyObject {
    [key: string]: any;
}
function removePositionKeys(obj: AnyObject): AnyObject {
    if (Array.isArray(obj)) {
        return obj.map(removePositionKeys);
    } else if (typeof obj === "object" && obj !== null) {
        const { position, ...rest } = obj; // Destructure to remove `position` key if it exists
        return Object.keys(rest).reduce((acc, key) => {
            // Recursively apply to all properties
            acc[key] = removePositionKeys(rest[key]);
            return acc;
        }, {} as AnyObject);
    }
    return obj;
}

test("does mdast have block level elements like pandoc?", () => {
    const doc = `
:::spoiler{key="value"}
He dies.
:::
    `;

    const tree = fromMarkdown(doc, {
        extensions: [directive()],
        mdastExtensions: [directiveFromMarkdown()],
    });

    // take a snapshot of tree and expect
    expect(removePositionKeys(tree)).toMatchSnapshot();

    // const out = toMarkdown(tree, { extensions: [directiveToMarkdown()] });
});

test("mdast to html", () => {
    const doc = `
Maybe needs to be longer than a single thing?

:::spoiler{key="value" class="foo"}
He dies.
:::

I don't know.

Some \`backticks\` for inline code.
    `;

    const tree = fromMarkdown(doc, {
        extensions: [directive()],
        mdastExtensions: [directiveFromMarkdown()],
    });

    const h = toHast(tree, {
        handlers: {
            containerDirective(state, node) {
                return {
                    type: "element",
                    tagName: "div",
                    properties: {
                        id: node.name,
                        anything: "foo",
                        className: ["blah", node.attributes.key],
                    },
                    children: state.all(node),
                };
            },
        },
    });
    const html = toHtml(h);

    expect(tree).toMatchSnapshot();
    expect(h).toMatchSnapshot();
    expect(html).toMatchSnapshot();
});
