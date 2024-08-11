import { test, expect } from "@jest/globals";
// import rehypeDocument from "rehype-document";
// import rehypeFormat from "rehype-format";
// import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
// import remarkDirective from "remark-directive";

import { read } from "to-vfile";
import { matter } from "vfile-matter";

/**
 * Parse YAML frontmatter and expose it at `file.data.matter`.
 *
 * @returns
 *   Transform.
 */
export default function myUnifiedPluginHandlingYamlMatter() {
    /**
     * Transform.
     *
     * @param {Node} tree
     *   Tree.
     * @param {VFile} file
     *   File.
     * @returns {undefined}
     *   Nothing.
     */
    return function (_: any, file: VFile) {
        matter(file);
    };
}

// import { read } from "to-vfile";
import { unified } from "unified";
import { VFile } from "vfile-matter/lib";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import { myRemarkPlugin } from "../src";
// import { myRemarkPlugin } from "../src/index"; // TODO why doesn't @/ work?
// import { reporter } from "vfile-reporter";

// import * as path from "path";

test("how to make frontmatter work", async () => {
    const file = await unified()
        .use(remarkParse)
        .use(rehypeStringify)
        .use(remarkFrontmatter, ["yaml"])
        .use(myUnifiedPluginHandlingYamlMatter)
        .use(remarkDirective)
        .use(myRemarkPlugin)
        .use(remarkRehype)
        .process(await read("test/remarkfrontmatter.test.md"));

    expect(file.data).toMatchSnapshot();
});
