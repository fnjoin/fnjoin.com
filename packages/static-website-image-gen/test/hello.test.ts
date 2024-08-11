import { test, expect } from "@jest/globals";
import { glob } from "glob";
test("hello", () => {
    expect(1 === 1);
});

test("glob", async () => {
    const files = await glob.glob("**/*.ts");
    expect(files.length).toBeGreaterThan(0);
});

test("glob sync", () => {
    const files = glob.sync("**/*.ts");
    expect(files.length).toBeGreaterThan(0);
});
