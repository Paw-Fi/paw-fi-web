// Sitemap Generator Supabase Function
// This function handles the generation of XML sitemaps for the Moneko website
// including all programmatic SEO pages.

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


// Types
interface StaticRoute {
  path: string;
  priority: number;
  changefreq: string;
  lastmod?: string;
}

// Create a Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Define static routes for the sitemap
const staticRoutes: StaticRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'daily', lastmod: '2025-06-21' },
  { path: '/budgeting-app', priority: 0.9, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.8, changefreq: 'monthly', lastmod: '2025-06-19' },
  { path: '/cookie-policy', priority: 0.3, changefreq: 'yearly', lastmod: '2025-06-19' },
  { path: '/privacy-policy', priority: 0.3, changefreq: 'yearly', lastmod: '2025-06-19' },
  { path: '/terms-of-service', priority: 0.3, changefreq: 'yearly', lastmod: '2025-06-19' },
  { path: '/blogs', priority: 0.8, changefreq: 'weekly', lastmod: '2025-06-19' },
  { path: '/team', priority: 0.8, changefreq: 'yearly', lastmod: '2025-06-19' },
  { path: '/dashboard', priority: 0.9, changefreq: 'daily', lastmod: '2025-06-21' },
  { path: '/dashboard/learning', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/invest-L1', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/behavfin-L2', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/moneymarket-L3', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/bondmarket-L4', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/equitymarket-L5', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/derivatives-L6', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/tvm-L7', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/stats-L8', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/econbasics-L9', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/essentials/your-2025-guide-to-investing/lesson/finstatements-L10', priority: 0.8, changefreq: 'weekly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/auto-loan-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/compound-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/investment-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/mortgage-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/retirement-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
  { path: '/dashboard/calculators/saving-goals-calculator', priority: 0.7, changefreq: 'monthly', lastmod: '2025-05-30' },
];

// Generate the sitemap XML
async function generateSitemap(baseUrl: string) {
  try {
    const supabase = getSupabaseClient();
    
    // Get all SEO page slugs from the database
    const { data: slugs, error } = await supabase
      .from('seo_pages_data')
      .select('slug, updated_at')
      .order('slug');
    
    if (error) throw error;
    
    // Start building the XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
    xml += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
    xml += 'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 ';
    xml += 'http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';
    
    // Add static routes
    for (const route of staticRoutes) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
      
      // Add lastmod if available
      if (route.lastmod) {
        xml += `    <lastmod>${route.lastmod}</lastmod>\n`;
      }
      
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += '  </url>\n';
    }
    
    // Add dynamic SEO pages
    if (slugs && slugs.length > 0) {
      for (const { slug, updated_at } of slugs) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/budgeting-app/${slug}</loc>\n`;
        
        // Add lastmod if we have an updated_at timestamp
        if (updated_at) {
          const lastmod = new Date(updated_at).toISOString().split('T')[0];
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
        }
        
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    }
    
    xml += '</urlset>';
    
    return new Response(xml, { 
      headers: { 
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders
      } 
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Generate robots.txt content
function generateRobotsTxt() {
  const robotsTxt = `# robots.txt for Moneko
User-agent: *
Allow: /

# Sitemap location
Sitemap: https://pbopcsmrcykdzbilpilf.supabase.co/functions/v1/sitemap-generator/sitemap.xml
`;
  
  return new Response(robotsTxt, { 
    headers: { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
      ...corsHeaders
    } 
  });
}

// Main handler for all routes
serve(async (req) => {
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  const baseUrl = 'https://moneko.io';
  
  // Route handling
  if (req.method === 'GET') {
    // Generate sitemap.xml
    if (path === '/sitemap-generator/sitemap.xml') {
      return await generateSitemap(baseUrl);
    }
    
    // Generate robots.txt
    if (path === '/sitemap-generator/robots.txt') {
      return generateRobotsTxt();
    }
  }
  
  // Default response for undefined routes
  return new Response(
    JSON.stringify({ error: 'Not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
});
