#!/usr/bin/env node

import { readdir } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment-specific project references
const PROJECT_REFS = {
  dev: "qbuynyxyemigtnvdujts",
  prod: "pbopcsmrcykdzbilpilf"
};

const EXCLUDED_FOLDERS = ['migrations', 'shared', '.vscode', 'dashboard'];

async function deployFunctions() {
  try {
    // Get the environment from command line args or default to development
    const environment = process.argv[2] || 'development';
    const projectRef = PROJECT_REFS[environment];

    if (!projectRef) {
      console.error(`❌ No project reference found for environment: ${environment}`);
      console.log('Available environments: dev, prod');   
      process.exit(1);
    }

    console.log(`🚀 Deploying functions to ${environment} environment (${projectRef})`);

    const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
    const folders = await readdir(functionsDir, { withFileTypes: true });
    
    // Filter out non-directories and excluded folders
    const functionFolders = folders
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => !EXCLUDED_FOLDERS.includes(name));

    console.log(`📦 Found ${functionFolders.length} functions to deploy:`);
    functionFolders.forEach(folder => console.log(`  - ${folder}`));
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const functionName of functionFolders) {
      try {
        console.log(`🔨 Deploying ${functionName}...`);
        
        const command = `supabase functions deploy ${functionName} --project-ref ${projectRef}`;
        const output = execSync(command, { 
          encoding: 'utf8',
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        
        console.log(`✅ ${functionName} deployed successfully`);
        successCount++;
        
        // Log any important output
        if (output && output.trim()) {
          console.log(`   Output: ${output.trim()}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to deploy ${functionName}:`);
        console.error(`   ${error.message}`);
        failCount++;
      }
      
      console.log(''); // Add spacing between deployments
    }

    console.log('📊 Deployment Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   🎯 Total: ${functionFolders.length}`);

    if (failCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All functions deployed successfully!');
    }

  } catch (error) {
    console.error('❌ Deployment script failed:', error.message);
    process.exit(1);
  }
}

deployFunctions();