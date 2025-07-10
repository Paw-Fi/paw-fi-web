// pSEO Manager Supabase Function
// This function handles programmatic SEO data operations including:
// - Reading SEO page data by slug
// - Fetching related pages for internal linking
// - Getting all slugs for sitemap generation

// Deno and Supabase type declarations
declare global {
  interface Window {
    Deno: any;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Import required modules for Supabase Edge Functions
// @ts-ignore - These modules will be available in the Deno runtime environment
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - These modules will be available in the Deno runtime environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";
// Import CORS headers from shared utility
import { corsHeaders } from "../shared/cors.ts";

// Create a single Supabase client for all functions
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  console.log('🔧 Creating Supabase client with URL:', supabaseUrl.substring(0, 20) + '...');
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Handler for GET /seo-page-data/:slug
async function getSeoPageData(slug: string) {
  try {
    console.log('🔍 Searching for slug:', slug);
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('seo_pages_data')
      .select('*')
      .eq('slug', slug)
      .single();
    
    console.log('📊 Database query result:', { data, error });
    
    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    
    if (!data) {
      console.log('❌ No data found for slug:', slug);
      return new Response(
        JSON.stringify({ error: 'Page not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    console.log('✅ Found data for slug:', slug);
    
    return new Response(
      JSON.stringify({ data }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('💥 Error in getSeoPageData:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handler for GET /all-slugs (for sitemap)
async function getAllSlugs() {
  try {
    console.log('📋 Fetching all slugs for sitemap');
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('seo_pages_data')
      .select('slug')
      .order('slug');
    
    console.log('📊 All slugs result:', { data, error });
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ data: data.map(item => item.slug) }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('💥 Error in getAllSlugs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handler for GET /related-pages/:slug
async function getRelatedPages(slug: string) {
  try {
    console.log('🔗 Fetching related pages for slug:', slug);
    
    const supabase = getSupabaseClient();
    
    // Get the current page's related article slugs
    const { data: currentPage, error: currentPageError } = await supabase
      .from('seo_pages_data')
      .select('related_article_slugs')
      .eq('slug', slug)
      .single();
    
    console.log('📊 Current page result:', { currentPage, currentPageError });
    
    if (currentPageError) throw currentPageError;
    
    if (!currentPage?.related_article_slugs?.length) {
      console.log('❌ No related articles found for slug:', slug);
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Get the related pages
    const { data: relatedPages, error: relatedError } = await supabase
      .from('seo_pages_data')
      .select('slug, title, meta_description, target_group, financial_goal, region')
      .in('slug', currentPage.related_article_slugs);
    
    console.log('📊 Related pages result:', { relatedPages, relatedError });
    
    if (relatedError) throw relatedError;
    
    return new Response(
      JSON.stringify({ data: relatedPages }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('💥 Error in getRelatedPages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Main handler for all routes
serve(async (req) => {
  console.log('🌐 Incoming request:', req.method, req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  
  // Get headers for alternative routing
  const actionHeader = req.headers.get('X-Action');
  const slugHeader = req.headers.get('X-Slug');
  
  console.log('🔍 Path:', path, 'Action:', actionHeader, 'Slug:', slugHeader);
  
  // Route handling for GET requests
  if (req.method === 'GET') {
    // Handle header-based routing (from frontend service)
    if (slugHeader && !actionHeader) {
      // Simple slug lookup
      console.log('📄 Header-based slug lookup:', slugHeader);
      return await getSeoPageData(slugHeader);
    }
    
    if (actionHeader === 'get-slugs') {
      console.log('📋 Getting all slugs');
      return await getAllSlugs();
    }
    
    if (actionHeader === 'related' && slugHeader) {
      console.log('🔗 Getting related pages for:', slugHeader);
      return await getRelatedPages(slugHeader);
    }
    
    // Handle path-based routing (legacy)
    if (path.startsWith('/seo-page-data/')) {
      const slug = path.replace('/seo-page-data/', '');
      console.log('📄 Path-based slug lookup:', slug);
      return await getSeoPageData(slug);
    }
    
    if (path === '/all-slugs' || path === '/pseo-manager/all-slugs') {
      console.log('📋 Path-based all slugs');
      return await getAllSlugs();
    }
    
    if (path.startsWith('/related-pages/')) {
      const slug = path.replace('/related-pages/', '');
      console.log('🔗 Path-based related pages for:', slug);
      return await getRelatedPages(slug);
    }
  } 
  
  console.log('❌ Route not found:', req.method, path, actionHeader);
  
  // Default response for undefined routes
  return new Response(
    JSON.stringify({ error: 'Not found', method: req.method, path, action: actionHeader }),
    { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
});