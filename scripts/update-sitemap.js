#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL = 'https://pbopcsmrcykdzbilpilf.supabase.co/functions/v1/sitemap-generator/sitemap.xml';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

/**
 * Fetches XML content from a URL using HTTPS
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The response body
 */
function fetchXML(url) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Fetching sitemap from: ${url}`);
    
    const request = https.get(url, (response) => {
      let data = '';
      
      // Check if the response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      // Collect data chunks
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      // Handle response completion
      response.on('end', () => {
        console.log(`✅ Successfully fetched ${data.length} characters`);
        resolve(data);
      });
    });
    
    // Handle request errors
    request.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    // Set a timeout for the request
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout after 10 seconds'));
    });
  });
}

/**
 * Validates that the content is valid XML
 * @param {string} content - The XML content to validate
 * @returns {boolean} True if valid XML
 */
function validateXML(content) {
  // Basic XML validation - check for sitemap structure
  if (!content.includes('<urlset') || !content.includes('</urlset>')) {
    throw new Error('Invalid XML: Missing urlset tags');
  }
  
  if (!content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    throw new Error('Invalid XML: Missing sitemap namespace');
  }
  
  return true;
}

/**
 * Writes content to a file with backup
 * @param {string} filePath - Path to write the file
 * @param {string} content - Content to write
 */
function writeFileWithBackup(filePath, content) {
  console.log(`💾 Writing sitemap to: ${filePath}`);
  
  // Create backup if file exists
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`📋 Created backup: ${backupPath}`);
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the new content
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Successfully updated sitemap.xml`);
}

/**
 * Main function to update the sitemap
 */
async function updateSitemap() {
  try {
    console.log('🚀 Starting sitemap update process...');
    
    // Fetch the XML content from Supabase
    const xmlContent = await fetchXML(SITEMAP_URL);
    
    // Validate the XML content
    validateXML(xmlContent);
    console.log('✅ XML validation passed');
    
    // Write to the output file
    writeFileWithBackup(OUTPUT_PATH, xmlContent);
    
    // Count URLs in the sitemap
    const urlMatches = xmlContent.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;
    
    console.log(`🎉 Sitemap update completed successfully!`);
    console.log(`📊 Updated ${urlCount} URLs in sitemap.xml`);
    
  } catch (error) {
    console.error('❌ Sitemap update failed:', error.message);
    
    // If there's a backup file, restore it
    const backupPath = `${OUTPUT_PATH}.backup`;
    if (fs.existsSync(backupPath)) {
      console.log('🔄 Restoring from backup...');
      fs.copyFileSync(backupPath, OUTPUT_PATH);
      console.log('✅ Backup restored');
    }
    
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateSitemap();
}

export { updateSitemap };