import { Blog, BlogTag } from "@/components/blogs/blogs.typing";

const HARD_SUBREDDIT = "monekobudget";
const HARD_AUTHOR = "Plus_Journalist_8665";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const FALLBACK_AUTHOR_AVATAR =
  "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png";
const FALLBACK_COVER_IMAGE =
  "https://lh3.googleusercontent.com/uDanMwuotwC6ikrr41UP5jELZ7iQuWDNVH0d-xrn6DKeC_y_KROF5TsE-gBhkqqNZS-uYP9Ln6PdtivDXKNpeqQ=s1024";

interface FetchSubredditBlogsOptions {
  limit?: number;
}

interface RedditListingResponse {
  data?: {
    children?: Array<{
      kind?: string;
      data?: RedditPost;
    }>;
  };
}

interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  author?: string;
  created_utc?: number;
  permalink?: string;
  url?: string;
  is_self?: boolean;
  thumbnail?: string;
  link_flair_text?: string | null;
  subreddit?: string;
  preview?: {
    images?: Array<{
      source?: {
        url?: string;
      };
    }>;
  };
  gallery_data?: {
    items?: Array<{
      media_id?: string;
    }>;
  };
  media_metadata?: Record<
    string,
    {
      s?: {
        u?: string;
        x?: number;
        y?: number;
      };
    }
  >;
}

export async function fetchSubredditBlogs(
  options: FetchSubredditBlogsOptions = {},
): Promise<Blog[]> {
  const limit = getSafeLimit(options.limit);
  const response = await fetchSubredditListing(limit);
  const children = response.data?.children || [];

  const posts = children
    .filter((child) => child.kind === "t3" && child.data)
    .map((child) => child.data as RedditPost)
    .filter(
      (post) =>
        (post.author || "").trim().toLowerCase() === HARD_AUTHOR.toLowerCase(),
    );

  return posts.map((post, index) => mapRedditPostToBlog(post, index === 0));
}

export async function fetchSubredditBlogBySlug(
  slug: string,
): Promise<Blog | null> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) {
    return null;
  }

  const blogs = await fetchSubredditBlogs({ limit: MAX_LIMIT });
  return blogs.find((blog) => blog.slug === cleanSlug) || null;
}

function mapRedditPostToBlog(post: RedditPost, featured: boolean): Blog {
  const safeTitle = sanitizeUserText(post.title || "Untitled post");
  const safeAuthor = sanitizeUserText(post.author || HARD_AUTHOR);
  const safeSubreddit = sanitizeUserText(HARD_SUBREDDIT);
  const content = createPostContent(post);
  const tags = createTags(post, safeSubreddit);

  return {
    id: `reddit-${post.id}`,
    slug: createRedditSlug(post.id, safeTitle),
    title: safeTitle,
    excerpt: createExcerpt(post),
    content,
    coverImage: selectCoverImage(post),
    author: {
      id: `reddit-author-${toSlug(safeAuthor) || "unknown"}`,
      name: safeAuthor,
      avatar: FALLBACK_AUTHOR_AVATAR,
      title: "Reddit Contributor",
      bio: `Shared on r/${safeSubreddit}`,
    },
    hideCreditLabel:true,
    tags,
    publishedAt: post.created_utc
      ? new Date(post.created_utc * 1000).toISOString()
      : new Date().toISOString(),
    readTime: estimateReadTimeMinutes(content),
    featured,
    seo: {
      metaTitle: `${safeTitle} | r/${safeSubreddit} | Moneko`,
      metaDescription: createExcerpt(post),
      keywords: tags.map((tag) => tag.name).join(", "),
    },
  };
}

async function fetchSubredditListing(
  limit: number,
): Promise<RedditListingResponse> {
  const endpoint = new URL(
    `https://www.reddit.com/r/${HARD_SUBREDDIT}/new.json`,
  );
  endpoint.searchParams.set("raw_json", "1");
  endpoint.searchParams.set("limit", String(limit));

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subreddit posts: ${response.status}`);
  }

  return (await response.json()) as RedditListingResponse;
}

function getSafeLimit(limit?: number): number {
  const configuredLimit =
    limit ?? Number(import.meta.env.VITE_REDDIT_POST_LIMIT || DEFAULT_LIMIT);
  if (!Number.isFinite(configuredLimit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(configuredLimit)));
}

function createRedditSlug(postId: string, title: string): string {
  const titlePart = toSlug(title).slice(0, 80);
  return `reddit-${postId}-${titlePart || "post"}`;
}

function createPostContent(post: RedditPost): string {
  const textBody = sanitizeUserText(post.selftext?.trim() || "");
  const permalink = getPermalinkUrl(post.permalink);
  const externalUrl = getSafeExternalUrl(post.url);

  if (textBody) {
    return textBody;
  }

  if (externalUrl && !post.is_self) {
    return `This is a link post from Reddit.\n\n[Open original post](${permalink})\n\n[Open shared link](${externalUrl})`;
  }

  return `This post currently has no text body.\n\n[Open original post](${permalink})`;
}

function createExcerpt(post: RedditPost): string {
  const textBody = sanitizeUserText(
    post.selftext?.replace(/\s+/g, " ").trim() || "",
  );
  if (textBody) {
    return textBody.slice(0, 220);
  }

  if (getSafeExternalUrl(post.url) && !post.is_self) {
    return "Link post from the subreddit. Open the post for full context and discussion.";
  }

  return `Latest post from r/${HARD_SUBREDDIT}.`;
}

function createTags(post: RedditPost, subreddit: string): BlogTag[] {
  const tags: BlogTag[] = [
    {
      id: `subreddit-${toSlug(subreddit)}`,
      name: `r/${subreddit}`,
      slug: `r-${toSlug(subreddit)}`,
    },
  ];

  const flair = sanitizeUserText(post.link_flair_text || "");
  if (flair) {
    tags.push({
      id: `flair-${toSlug(flair)}`,
      name: flair,
      slug: toSlug(flair),
    });
  }

  return tags;
}

function selectCoverImage(post: RedditPost): string {
  const galleryImage = selectBestGalleryImage(post);
  if (galleryImage) {
    return galleryImage;
  }

  const previewUrl = decodeHtmlEntity(post.preview?.images?.[0]?.source?.url);
  const safePreviewUrl = getSafeExternalUrl(previewUrl);
  if (safePreviewUrl) {
    return safePreviewUrl;
  }

  const safeThumbnailUrl = getSafeExternalUrl(decodeHtmlEntity(post.thumbnail));
  if (safeThumbnailUrl) {
    return safeThumbnailUrl;
  }

  return FALLBACK_COVER_IMAGE;
}

function selectBestGalleryImage(post: RedditPost): string | null {
  const items = post.gallery_data?.items || [];
  const metadata = post.media_metadata || {};

  let bestImage: { url: string; score: number } | null = null;

  for (const item of items) {
    const mediaId = item.media_id;
    if (!mediaId) {
      continue;
    }

    const source = metadata[mediaId]?.s;
    const safeUrl = getSafeExternalUrl(decodeHtmlEntity(source?.u));
    if (!safeUrl) {
      continue;
    }

    const width = Number.isFinite(source?.x) ? Number(source?.x) : 0;
    const height = Number.isFinite(source?.y) ? Number(source?.y) : 0;
    const ratio = height > 0 ? width / height : 1;
    const area = width * height;
    const score = (ratio >= 1.2 ? 1_000_000_000 : 0) + area;

    if (!bestImage || score > bestImage.score) {
      bestImage = { url: safeUrl, score };
    }
  }

  return bestImage?.url || null;
}

function sanitizeUserText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\u2028\u2029]/g, " ")
    .trim();
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function estimateReadTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function decodeHtmlEntity(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/&amp;/g, "&");
}

function getPermalinkUrl(permalink: string | undefined): string {
  if (!permalink) {
    return "https://www.reddit.com";
  }

  return `https://www.reddit.com${permalink}`;
}

function getSafeExternalUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }

    return null;
  } catch {
    return null;
  }
}
