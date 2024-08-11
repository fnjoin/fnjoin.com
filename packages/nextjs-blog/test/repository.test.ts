import * as path from "path";
import { BlogRepository } from "@/lib/repository";

const cwd = process.cwd();

test("repository sort order", () => {
    const repository = new BlogRepository({
        dir: path.join(cwd, "../../content"),
    });
    expect(repository.getAllPosts().length).toBeGreaterThan(0);

    // expect the post at position 0 to have a date later than position 1
    expect(
        new Date(repository.getAllPosts()[0].date).getTime(),
    ).toBeGreaterThan(new Date(repository.getAllPosts()[1].date).getTime());
});
