import toc from "mdast-util-toc";

export interface TocOptions {
    tight?: boolean;
    heading?: string;
}

export function extractToc(options: TocOptions) {
    const settings = {
        ...options,
        tight:
            options && typeof options.tight === "boolean"
                ? options.tight
                : true,
    };

    return function (tree: any): void {
        const result = toc(tree, settings);
        if (
            result.endIndex === undefined ||
            result.endIndex === -1 ||
            result.index === undefined ||
            result.index === -1 ||
            !result.map
        ) {
            return;
        }

        tree.children = [result.map];
    };
}
