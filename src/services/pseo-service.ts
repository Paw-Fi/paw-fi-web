/**
 * pSEO Service
 * 
 * This service provides client-side methods to interact with the pSEO Supabase functions.
 * It handles fetching SEO page data, related pages, and provides utilities for sitemap access.
 */

import { createClient } from '@supabase/supabase-js';

// Define the SEO page data interface to match our database schema
export interface SEOPageData {
  slug: string;
  target_group: string;
  financial_goal: string;
  region?: string;
  title: string;
  meta_description: string;
  keywords: string[];
  intro_content: string;
  feature_benefit_snippet: string;
  cta_snippet: string;
  secondary_content: string;
  benefits: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  related_article_slugs: string[];
  created_at?: Date;
  updated_at?: Date;
}

// Related page interface (simplified version of SEOPageData)
export interface RelatedPage {
  slug: string;
  title: string;
  meta_description: string;
  target_group: string;
  financial_goal: string;
  region?: string;
}

// Type definition for Supabase Function invoke options
interface FunctionInvokeOptions {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

// Ensure environment variables are loaded
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch SEO page data by slug
 * @param slug The unique page slug
 * @returns Promise resolving to SEO page data
 */
export const fetchSEOPageBySlug = async (slug: string): Promise<SEOPageData | null> => {
  try {
    const options: FunctionInvokeOptions = {
      method: 'GET',
      headers: { 'X-Slug': slug },
    };
    const { data, error } = await supabase.functions.invoke('pseo-manager', options);

    if (error) throw new Error(error.message);
    if (!data?.data) throw new Error('No SEO page data found');
    
    return data.data as SEOPageData;
  } catch (error) {
    console.error('Error fetching SEO page data:', error);
    throw error;
  }
}

/**
 * Fetch all SEO page slugs (for sitemap generation)
 * @returns Promise resolving to an array of page slugs
 */
export const fetchAllSEOPageSlugs = async (): Promise<string[]> => {
  try {
    const options: FunctionInvokeOptions = {
      method: 'GET',
      headers: { 'X-Action': 'get-slugs' },
    };
    const { data, error } = await supabase.functions.invoke('pseo-manager', options);

    if (error) throw new Error(error.message);
    if (!data?.data) return [];
    
    return data.data as string[];
  } catch (error) {
    console.error('Error fetching all SEO page slugs:', error);
    return [];
  }
}

/**
 * Fetch related pages for a given slug
 * @param slug The unique page slug
 * @returns Promise resolving to an array of related pages
 */
export const fetchRelatedPages = async (slug: string): Promise<RelatedPage[]> => {
  try {
    const options: FunctionInvokeOptions = {
      method: 'GET',
      headers: { 'X-Action': 'related', 'X-Slug': slug },
    };
    const { data, error } = await supabase.functions.invoke('pseo-manager', options);

    if (error) throw new Error(error.message);
    if (!data?.data) return [];
    
    return data.data as RelatedPage[];
  } catch (error) {
    console.error('Error fetching related SEO pages:', error);
    return [];
  }
}

/**
 * Generate SEO page data (admin function)
 * This should only be called by administrators
 * @returns Promise resolving to the generation results
 */
export const generateSEOData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // This should be an admin-only operation in a real app
    const options: FunctionInvokeOptions = {
      method: 'POST',
      headers: { 'X-Action': 'generate' },
    };
    const { data, error } = await supabase.functions.invoke('pseo-manager', options);

    if (error) throw new Error(error.message);
    if (!data) throw new Error('No response data');
    
    return { 
      success: true,
      message: 'SEO data generated successfully',
    };
  } catch (error) {
    console.error('Error generating SEO data:', error);
    throw error;
  }
}

/**
 * Get the sitemap URL for the site
 * @returns The URL to the sitemap.xml file
 */
export function getSitemapUrl(): string {
  // If we're in development, use the Supabase function URL
  if (import.meta.env.DEV) {
    return `${SUPABASE_URL}/functions/v1/sitemap-generator/sitemap.xml`;
  }
  
  // In production, use the root URL
  return '/sitemap.xml';
}

/**
 * Get the robots.txt URL for the site
 * @returns The URL to the robots.txt file
 */
export function getRobotsUrl(): string {
  // If we're in development, use the Supabase function URL
  if (import.meta.env.DEV) {
    return `${SUPABASE_URL}/functions/v1/sitemap-generator/robots.txt`;
  }
  
  // In production, use the root URL
  return '/robots.txt';
}
