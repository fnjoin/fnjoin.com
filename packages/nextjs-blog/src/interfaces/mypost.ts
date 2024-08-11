export interface PostWithAuthorHandles {
    author: string;
    slug: string;
    title: string;
    tags: string[];
    excerpt?: string;
    content: string;
    date: Date;
    coverImage?: {
        imageSrc: string;
        caption: string;
    };
    preview?: boolean;
    ogImage?: {
        url: string;
    };
    figurens?: {
        [ns: string]: string;
    };
    content_flags?: string[];
}

export interface MyPost extends PostWithAuthorHandles {
    author_detail: AuthorProps;
}

export interface AuthorProps {
    picture?: string;
    name?: string;
    bio?: string;
    twitter?: string;
}
