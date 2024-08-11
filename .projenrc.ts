import { javascript } from "projen";
import { monorepo } from "@aws/pdk";
import { NextJsBlogTypescriptAppProject } from "./blueprints/NextjsBlogStarter";
import { TypeScriptAppProject } from "projen/lib/typescript";
import { TypeScriptModuleResolution } from "projen/lib/javascript";

const packageManager = javascript.NodePackageManager.PNPM;
const defaultReleaseBranch = "main";
const prettier = {
    prettier: true,
    prettierOptions: {
        settings: {
            tabWidth: 4,
            singleQuote: false,
        },
    },
};
const parent = new monorepo.MonorepoTsProject({
    devDeps: ["@aws/pdk"],
    name: "trypandocandgatsby",
    packageManager,
    projenrcTs: true,
    defaultReleaseBranch,
    eslint: false,
    ...prettier,
});
parent.gitignore.addPatterns("packages/gatsby-remark-tufte");
parent.gitignore.addPatterns(".DS_Store");

parent.package.file.addOverride("pnpm.overrides", {
    "@types/babel__traverse": "7.18.2",
    "@zkochan/js-yaml": "npm:js-yaml@4.1.0",
    "wrap-ansi": "^7.0.0",
    trim: ">=0.0.3",
    "html-parse-stringify": ">=2.0.1",
    "nth-check": ">=2.0.1",
    semver: ">=7.5.2",
    axios: ">=0.28.0",
    "tough-cookie": ">=4.1.3",
    "webpack-dev-middleware": ">=5.3.4",
    express: ">=4.19.2",
    tar: ">=6.2.1",
    ws: ">=8.17.1",
    braces: ">=3.0.3",
});

const nextjsBlog = new NextJsBlogTypescriptAppProject({
    name: "nextjs-blog",
    outdir: "packages/nextjs-blog",
    packageManager,
    defaultReleaseBranch,
    parent,
    deps: [
        "react-markdown@latest",
        "sharp@latest",
        "mdast-util-directive",
        "mdast-util-to-markdown",
        "mdast-util-from-markdown",
        "mdast-util-to-hast@^13",
        "hast-util-to-html@^9",
        "micromark-extension-directive",
        "rehype-document@^7",
        "rehype-format@^5",
        "rehype-stringify@^10",
        "remark-parse@^11",
        "remark-rehype@^11",
        "remark-frontmatter@latest",
        "remark-stringify@latest",
        "vfile-matter",
        "to-vfile",
        "unified@^11",
        "remark-directive@^3",
        "hastscript",
        "unist-util-visit@^5",
        "image-size",
        "mdast-util-toc",
        "remark-gfm@latest",
        "d3-shape",
        "@types/d3-shape",
        "xml-js",
        "strip-markdown",
        "@next/third-parties", // google analytics
    ],
    devDeps: [
        "critters",
        "@types/eslint@^8",
        "@archieco/static-website-image-gen@workspace:*",
        "@archieco/image-server",
        "@jest/globals",
        "@types/hast",
        "@types/unist",
        "@types/node",
    ],

    sampleCode: true,
    ...prettier,
    jestOptions: {
        jestConfig: {
            verbose: true,
            extensionsToTreatAsEsm: [".ts"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
                "@/(.*)": "<rootDir>/src/$1",
            },
        },
    },
    tsJestOptions: {
        transformPattern: "^.+\\.ts$",
        transformOptions: {
            useESM: true,
        },
    },
});
nextjsBlog.addGitIgnore("out");

const imageServer = new TypeScriptAppProject({
    name: "@archieco/image-server",
    outdir: "packages/image-server",
    packageManager,
    defaultReleaseBranch,
    parent,
    sampleCode: true,
    ...prettier,
    deps: ["sharp@latest", "express@latest", "yargs", "glob"],
    devDeps: [
        "@jest/globals",
        "@types/express",
        "@types/node",
        "@types/yargs",
        "@types/eslint@^8",
        "@types/glob",
    ],
    minNodeVersion: "v20.11.1",
    eslintOptions: {
        dirs: ["src"],
        ignorePatterns: ["**/node_modules/**"],
    },
    bin: {
        "image-server": "./lib/index.js",
    },
    tsconfig: {
        compilerOptions: {
            target: "esnext",
            module: "nodenext",
            moduleResolution: TypeScriptModuleResolution.NODE_NEXT,
        },
    },
});
imageServer.tasks.addTask("serve", {
    steps: [
        {
            spawn: "build",
        },
        {
            exec: "node lib/index.js",
            receiveArgs: true,
        },
    ],
});

nextjsBlog.addTask("image-server", {
    steps: [
        {
            spawn: "build",
        },
        {
            exec: "image-server --port 8081 --root-dir ../../content",
        },
    ],
});

const staticImageGen = new TypeScriptAppProject({
    parent,
    name: "@archieco/static-website-image-gen",
    outdir: "packages/static-website-image-gen",
    packageManager,
    defaultReleaseBranch,
    sampleCode: true,
    ...prettier,
    deps: ["sharp@latest", "glob@latest", "jsdom@latest", "yargs"],
    bin: {
        "static-website-image-gen": "./lib/cli.js",
    },
    tsconfig: {
        compilerOptions: {
            target: "esnext",
            module: "nodenext",
            esModuleInterop: true,
            lib: ["esnext"],
        },
    },
    devDeps: [
        "@types/yargs",
        "@types/node",
        "@types/glob",
        "@types/jsdom",
        "@jest/globals",
    ],
});
staticImageGen.addTask("image-gen", {
    steps: [
        {
            spawn: "build",
        },
        {
            exec: "./lib/cli.js",
            receiveArgs: true,
        },
    ],
});

const tests = new TypeScriptAppProject({
    name: "unittests",
    outdir: "packages/unittests",
    packageManager,
    defaultReleaseBranch,
    parent,
    sampleCode: true,
    tsconfig: {
        compilerOptions: {
            target: "esnext",
            module: "esnext",
            types: ["node", "jest"],
            esModuleInterop: true,
            moduleResolution: TypeScriptModuleResolution.NODE,
            // lib: ["esnext", "es2019", "es2020", "es2018"],
            paths: {
                "@/*": ["./src/*"],
            },
        },
    },
    ...prettier,
    devDeps: ["@jest/globals", "@types/hast", "@types/node"],
    deps: [
        "mdast-util-directive",
        "mdast-util-to-markdown",
        "mdast-util-from-markdown",
        "mdast-util-to-hast@^13",
        "hast-util-to-html@^9",
        "micromark-extension-directive",
        "rehype-document@^7",
        "rehype-format@^5",
        "rehype-stringify@^10",
        "remark-parse@^11",
        "remark-rehype@^11",
        "remark-frontmatter@latest",
        "remark-stringify@latest",
        "vfile-matter",
        "to-vfile",
        "unified@^11",
        "remark-directive@^3",
        "hastscript",
        "unist-util-visit@^5",
    ],
    jestOptions: {
        jestConfig: {
            extensionsToTreatAsEsm: [".ts"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1",
            },
        },
    },
    tsJestOptions: {
        transformPattern: "^.+\\.ts$",
        transformOptions: {
            useESM: true,
        },
    },
});

tests.tsconfig?.file.addOverride("ts-node", {
    transpileOnly: true,
    files: true,
    experimentalResolver: true,
});

//  --updateSnapshot removed from default settings
tests.testTask.reset("jest --passWithNoTests", {
    receiveArgs: true,
});
tests.testTask.spawn(tests.tasks.tryFind("eslint")!);
tests.testTask.env("NODE_OPTIONS", "--inspect --experimental-vm-modules");
tests.package.file.addOverride("type", "module");
const [{ exec: projenrcCommand = "" }] = tests.defaultTask!.steps;
tests.defaultTask!.reset(projenrcCommand.replace("ts-node", "ts-node-esm"));

// https://gist.github.com/doublecompile/324afb33b6038526705dfebb3b529e42

parent.synth();
