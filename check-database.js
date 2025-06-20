// Simple script to check database content
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking database content...\n');
    
    // Get all downloads
    const allDownloads = await prisma.mediaDownload.findMany({
      select: {
        id: true,
        downloadStatus: true,
        keepFile: true,
        fileCleanupAt: true,
        originalUrl: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`📊 Total downloads found: ${allDownloads.length}\n`);
    
    allDownloads.forEach((download, index) => {
      console.log(`${index + 1}. Download ${download.id.slice(0, 8)}...`);
      console.log(`   Status: ${download.downloadStatus}`);
      console.log(`   Keep File: ${download.keepFile}`);
      console.log(`   Cleanup At: ${download.fileCleanupAt}`);
      console.log(`   URL: ${download.originalUrl.slice(0, 50)}...`);
      console.log(`   Title: ${download.metadata?.title || 'No title'}`);
      console.log('');
    });

    // Check specifically for archived files
    const archivedFiles = await prisma.mediaDownload.findMany({
      where: {
        keepFile: true,
        downloadStatus: 'completed',
      },
    });

    console.log(`📚 Archived files (keepFile: true): ${archivedFiles.length}`);
    
    if (archivedFiles.length > 0) {
      console.log('Archived files:');
      archivedFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.metadata?.title || 'Untitled'} (${file.id.slice(0, 8)}...)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();