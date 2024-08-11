import * as path from "path";

export default function ImageLoader({ src, width, quality }: any) {
    quality = quality ?? 85;
    const ext = src.split(".").pop();
    const basename = path.basename(src, ext);
    const dirname = path.dirname(src);
    const outsrc =
        dirname + "/" + basename + "w" + width + "q" + quality + ".webp";
    return `${outsrc}`;
}
