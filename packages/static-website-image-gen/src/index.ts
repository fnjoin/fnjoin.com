import fs from "fs";
import path from "path";
import { glob } from "glob";
import { JSDOM } from "jsdom";
import sharp, { FormatEnum } from "sharp";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Function to process each HTML file
async function processHtmlFiles(
    htmlDirectory: string,
    originDirectory: string,
    outputDirectory: string,
    websiteBasePath?: string,
) {
    // Find all HTML files in the given directory
    const htmlFiles = await glob.glob(`${htmlDirectory}/**/*.html`);

    // Process each HTML file
    for (const file of htmlFiles) {
        console.log("found file", file);
        const htmlContent = fs.readFileSync(file, "utf-8");
        const dom = new JSDOM(htmlContent);
        const images = dom.window.document.querySelectorAll("img");

        // Process each img tag
        for (const img of images) {
            console.log("found img", img);
            const src = img.getAttribute("src");
            const srcset = img.getAttribute("srcset");

            const imageSources = new Set<string>();

            if (src) imageSources.add(src);
            if (srcset) {
                srcset.split(",").forEach((part) => {
                    const srcInfo = part.trim().split(" ")[0];
                    imageSources.add(srcInfo);
                });
            }

            // Process each image source
            for (const source of imageSources) {
                await processImageSource(
                    source,
                    originDirectory,
                    outputDirectory,
                    websiteBasePath,
                );
            }
        }
    }
}

// Function to process each image source
async function processImageSource(
    source: string,
    originDirectory: string,
    outputDirectory: string,
    websiteBasePath?: string,
) {
    console.log("processing image source", source);
    const { dir, name } = path.parse(source);
    const match = name.match(/(.*?)\.w(\d+)q(\d+)$/);
    if (!match) {
        console.warn(`Invalid image name: ${name}`);
        console.warn(`Skipping image ${source}`);
        return;
    }

    // get ext from source
    const format = path.extname(source).slice(1);
    console.log("format", format);
    const [, baseName, width, quality] = match;
    const originPath = path.join(
        originDirectory,
        websiteBasePath && websiteBasePath.startsWith("/")
            ? dir.replace(websiteBasePath, "")
            : dir,
        baseName,
    );
    const outputPath = path.join(
        outputDirectory,
        websiteBasePath && websiteBasePath.startsWith("/")
            ? source.replace(websiteBasePath, "")
            : source,
    );

    // Find the original file with extension jpg, png, etc.
    const originalFile = glob.sync(`${originPath}.{jpg,jpeg,png,webp}`)[0];
    if (!originalFile) {
        console.warn(
            "Broken image!",
            `original file not found for ${source} at ${originPath}.{jpg,jpeg,png,webp}`,
            "origin dir",
            originDirectory,
            "baseName",
            baseName,
            "dir",
            dir,
        );
        return;
    }
    console.log("origin file found", originalFile);

    // return if the output file exists already
    if (fs.existsSync(outputPath)) {
        // console.log("output file exists", outputPath);
        return;
    }

    // Ensure the output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Convert and save the image
    await sharp(originalFile)
        .resize(parseInt(width), null)
        .toFormat(format as keyof FormatEnum, { quality: parseInt(quality) })
        .toFile(outputPath);
}

export default async function main(): Promise<void> {
    // Example usage

    const argv = await yargs(hideBin(process.argv))
        .option("html-dir", {
            type: "string",
            description: "HTML files directory",
            demandOption: true,
        })
        .option("origin-dir", {
            type: "string",
            description: "Root directory for images",
            demandOption: true, // Make the root argument required
        })
        .option("target-dir", {
            type: "string",
            description: "Target directory for images",
            demandOption: true,
        })
        .option("website-base-path", {
            type: "string",
            description: "If your website is not on /, add your basePath here",
        })
        .option("quality", {
            type: "number",
            description: "Quality of webp images",
            default: 85,
        })
        .option("default-width", {
            type: "number",
            description: "Default width for images",
            default: 800,
        }).argv;

    processHtmlFiles(
        argv.htmlDir,
        argv.originDir,
        argv.targetDir,
        argv.websiteBasePath,
    )
        .then(() => console.log("Image processing completed."))
        .catch((err) => console.error(err));
}
