const path = require("path");

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
    output: "export",
    trailingSlash: true,
    // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
    // trailingSlash: true,
    // Optional: Prevent automatic `/me` -> `/me/`, instead preserve `href`
    // skipTrailingSlashRedirect: true,
    // Optional: Change the output directory `out` -> `dist`
    // distDir: 'dist',
    // this basically enables images to be served from a local static web server rather than some nextjs api
    images: {
        formats: ["image/webp"],
        loader: "custom",
        loaderFile:
            process.env.NODE_ENV === "development"
                ? "./my-image-server-loader.ts"
                : "my-simple-loader.ts",
    },
};

module.exports = nextConfig;
