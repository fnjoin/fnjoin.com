export default function ImageLoader({ src, width, quality }: any) {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        console.log("browser", src, width, quality);
        return `${src}`;
    } else {
        console.log("yo", src);
        const sharp = require("sharp");
        const path = require("path");
        quality = quality ?? 85;
        const ext = src.split(".").pop();
        const basename = path.basename(src, ext);
        const dirname = path.dirname(src);
        const outsrc =
            dirname + "/" + basename + "w" + width + "q" + quality + ".webp";
        sharp("./public" + src)
            .resize({ width: width })
            .webp({ quality: quality })
            .toFile("./out" + outsrc)
            .then((_x: any) => console.log("complete"));
        console.log("server", src, outsrc, width, quality);
        return `${outsrc}`;
    }
}
