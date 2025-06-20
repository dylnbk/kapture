const fs = require('fs').promises;
const path = require('path');

// Enhanced helper function to clean filenames for filesystem safety (same as server.js)
function cleanFilename(filename) {
  if (!filename) return 'media';
  
  return filename
    // Remove emojis and unicode symbols (more comprehensive)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
    // Remove other problematic Unicode characters
    .replace(/[\u{0000}-\u{001F}\u{007F}-\u{009F}]/gu, '') // Control characters
    .replace(/[\u{2000}-\u{206F}]/gu, '') // General punctuation
    .replace(/[\u{FFF0}-\u{FFFF}]/gu, '') // Specials
    // Replace filesystem-unsafe characters with safe alternatives
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Additional control characters
    // Clean up parentheses and brackets that might cause issues
    .replace(/[()[\]{}]/g, '-')
    // Replace multiple spaces/dashes with single dash
    .replace(/[-\s]+/g, '-')
    // Remove quotes and other problematic punctuation
    .replace(/['"´`]/g, '')
    // Remove leading/trailing dashes, spaces, and dots
    .trim()
    .replace(/^[-.\s]+|[-.\s]+$/g, '')
    // Limit length to 180 characters (leaving room for extension)
    .substring(0, 180)
    // Ensure it's not empty and doesn't end with dot
    .replace(/\.$/, '') || 'media';
}

// Helper function to get clean filename with extension
function getCleanFilenameWithExt(title, originalExt) {
  const cleanTitle = cleanFilename(title);
  const ext = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
  return `${cleanTitle}${ext}`;
}

// Check if filename has problematic characters
function hasProblematicCharacters(filename) {
  const problematicChars = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{0000}-\u{001F}\u{007F}-\u{009F}]|[\u{2000}-\u{206F}]|[\u{FFF0}-\u{FFFF}]|[<>:"/\\|?*()[\]{}'"´`]/gu;
  return problematicChars.test(filename);
}

// Check if filename is UUID pattern (already clean)
function isUUIDPattern(filename, jobId) {
  return filename.startsWith(jobId) && filename.includes('.');
}

async function migrateDownloadFilenames() {
  const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
  
  console.log('🔍 Starting filename migration...');
  console.log(`📁 Download directory: ${DOWNLOAD_DIR}`);
  
  try {
    const jobDirs = await fs.readdir(DOWNLOAD_DIR);
    let totalProcessed = 0;
    let totalRenamed = 0;
    let errors = [];
    
    for (const jobId of jobDirs) {
      const jobDir = path.join(DOWNLOAD_DIR, jobId);
      
      try {
        const stat = await fs.stat(jobDir);
        if (!stat.isDirectory()) continue;
        
        console.log(`\n📂 Processing job: ${jobId}`);
        
        const files = await fs.readdir(jobDir);
        let jobMetadata = null;
        
        // First, try to read metadata from info.json
        const infoFile = files.find(f => f.endsWith('.info.json'));
        if (infoFile) {
          try {
            const infoContent = await fs.readFile(path.join(jobDir, infoFile), 'utf-8');
            jobMetadata = JSON.parse(infoContent);
            console.log(`   📄 Found metadata: "${jobMetadata.title}"`);
          } catch (metaError) {
            console.warn(`   ⚠️  Could not read metadata: ${metaError.message}`);
          }
        }
        
        // Process each file in the directory
        for (const filename of files) {
          totalProcessed++;
          
          // Skip .info.json files
          if (filename.endsWith('.info.json')) {
            console.log(`   ℹ️  Skipping info file: ${filename}`);
            continue;
          }
          
          // Skip files that already follow UUID pattern
          if (isUUIDPattern(filename, jobId)) {
            console.log(`   ✅ Already clean (UUID pattern): ${filename}`);
            continue;
          }
          
          // Check if filename has problematic characters
          if (!hasProblematicCharacters(filename)) {
            console.log(`   ✅ Already clean (no problematic chars): ${filename}`);
            continue;
          }
          
          // Generate clean filename
          const ext = path.extname(filename);
          let cleanedName;
          
          if (jobMetadata && jobMetadata.title) {
            // Use metadata title for clean name
            cleanedName = getCleanFilenameWithExt(jobMetadata.title, ext);
          } else {
            // Use existing filename but cleaned
            const baseName = path.basename(filename, ext);
            cleanedName = getCleanFilenameWithExt(baseName, ext);
          }
          
          const oldPath = path.join(jobDir, filename);
          const newPath = path.join(jobDir, cleanedName);
          
          // Avoid renaming if names are the same
          if (filename === cleanedName) {
            console.log(`   ✅ No change needed: ${filename}`);
            continue;
          }
          
          // Check if target filename already exists
          let finalCleanedName = cleanedName;
          let counter = 1;
          while (files.includes(finalCleanedName) && finalCleanedName !== filename) {
            const nameWithoutExt = path.basename(cleanedName, ext);
            finalCleanedName = `${nameWithoutExt}-${counter}${ext}`;
            counter++;
          }
          
          const finalNewPath = path.join(jobDir, finalCleanedName);
          
          try {
            await fs.rename(oldPath, finalNewPath);
            totalRenamed++;
            console.log(`   🔄 Renamed: "${filename}" → "${finalCleanedName}"`);
          } catch (renameError) {
            const error = `Failed to rename ${filename}: ${renameError.message}`;
            errors.push(error);
            console.error(`   ❌ ${error}`);
          }
        }
        
      } catch (jobError) {
        const error = `Failed to process job ${jobId}: ${jobError.message}`;
        errors.push(error);
        console.error(`❌ ${error}`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   📁 Jobs processed: ${jobDirs.length}`);
    console.log(`   📄 Files processed: ${totalProcessed}`);
    console.log(`   🔄 Files renamed: ${totalRenamed}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDownloadFilenames().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateDownloadFilenames, cleanFilename, getCleanFilenameWithExt };