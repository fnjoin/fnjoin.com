import path from "path";
import express from "express";
import { glob } from "glob"; // Install with `npm install @types/glob glob`
import sharp from "sharp";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option("root-dir", {
            type: "string",
            description: "Root directory for images",
            demandOption: true, // Make the root argument required
        })
        .option("port", {
            type: "number",
            description: "Port to listen on",
            default: 3000,
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

    // Extract the root folder path from the startup arguments
    const rootFolder: string = argv.rootDir;

    const app: express.Application = express();
    const port: number = argv.port;

    app.get("/*", async (req, res) => {
        const { w, q } = req.query;
        const width: number = parseInt(w as string, 10) || argv.defaultWidth;
        const quality: number = parseInt(q as string, 10) || argv.quality;

        const requestedPath: string = path.join(rootFolder, req.path);
        const baseName: string = path.basename(
            requestedPath,
            path.extname(requestedPath),
        );

        // Use glob to find any file with the same basename but different extension
        const files = await glob(
            `${path.dirname(requestedPath)}/${baseName}.*`,
        );

        if (!files.length) {
            console.log("File not found:", requestedPath);
            console.log("Base name:", baseName);
            console.log("Files:", files);
            return res.status(404).send("File not found");
        }

        // Assume the first match is the correct file
        const originalImagePath: string = files[0];

        return sharp(originalImagePath)
            .resize(width)
            .webp({ quality })
            .toBuffer()
            .then((data) => res.type("webp").send(data))
            .catch((sharperr) => res.status(500).send(sharperr.message));
    });

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

main()
    .then(() => console.log("done"))
    .catch((err) => console.error("error", err));
