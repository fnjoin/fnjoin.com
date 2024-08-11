# Using this repository

## Setup

-   install nvm
-   from the root of the project, run `nvm use`
    -   this reads the .nvmrc file to determine the version of node to install and installs it
-   install `pnpm` by running `npm install -g pnpm`
-   run `pnpm install`

## Local writing

Build

```
npx nx run nextjs-blog:build
```

Start the image server

```
npx nx run nextjs-blog:image-server
```

Run the local dev server

```
npx nx run nextjs-blog:dev
```

## Local dev

Same as above, but here is how to run tests.

Running tests (only needed to make updates to code):

```
npx nx run nextjs-blog:test -- --watch
```
