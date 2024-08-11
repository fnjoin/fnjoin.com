import Image from "next/image";
import { ReactNode } from "react";

type Props = {
    name?: string;
    picture?: string;
    bio?: string;
};

function Avatar({ name, picture, bio }: Props): ReactNode {
    if (!name || !picture || !bio) {
        console.log("missing required params in Avatar");
        return <></>;
    }
    return (
        <div className="flex items-center">
            <Image
                src={picture}
                fill={false}
                width={100}
                height={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="w-12 h-12 rounded-full mr-4"
                alt={name}
            />
            <div className="m-2 text-sm">
                <div className="prose-h4 font-semibold">By {name}</div>
                <div>{bio}</div>
            </div>
        </div>
    );
}

export default Avatar;
