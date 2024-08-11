import * as fs from "fs";
import * as path from "path";

export interface CrawlInput {
    dir: string;
    filter?: (file: string) => boolean;
}

export function* crawlDirectories({
    dir,
    filter,
}: CrawlInput): Generator<string, void, string[]> {
    for (let file of fs.readdirSync(dir)) {
        let p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            yield* crawlDirectories({ dir: p, filter });
        } else if (filter && filter(p)) {
            yield p;
        } else if (!filter) {
            yield p;
        }
    }
}
