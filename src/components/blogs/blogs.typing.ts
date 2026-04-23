// src/data/blogs.ts
export interface BlogAuthor {
    id: string;
    name: string;
    avatar: string;
    title: string;
    bio: string;
  }
  
  export interface BlogTag {
    id: string;
    name: string;
    slug: string;
  }
  
  export interface Blog {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string; // Markdown content
    coverImage: string;
    hideCreditLabel?:boolean;
    author: BlogAuthor;
    tags: BlogTag[];
    publishedAt: string; // ISO date string
    readTime: number; // in minutes
    featured: boolean;
    seo: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string;
    };
  }
  