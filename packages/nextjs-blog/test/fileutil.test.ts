import * as path from "path";
import { crawlDirectories } from "@/lib/fileutil";

const cwd = process.cwd();

test("with filtering", () => {
    const result = crawlDirectories({
        dir: path.join(cwd, "../../content"),
        filter: (file) => file.endsWith(".md"),
    });
    const results = collect(result);
    expect(results).toMatchSnapshot();
});

test("without filtering", () => {
    const result = crawlDirectories({ dir: path.join(cwd, "../../content") });
    const results = collect(result);
    expect(results).toMatchSnapshot();
});

function collect(result: Generator<string, void, string[]>) {
    const results = [];
    let x: IteratorResult<string> = result.next();
    while (!x.done) {
        results.push(x.value);
        x = result.next();
    }
    return results;
}
