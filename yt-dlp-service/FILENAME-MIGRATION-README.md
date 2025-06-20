# Filename Migration and Unicode Fix

This document describes the solution implemented to fix Unicode and problematic character issues in downloaded filenames.

## Problem Summary

The yt-dlp downloader was experiencing issues with:
- Files saved with Unicode characters, emojis, and special symbols
- Inconsistent naming (some UUID-based, some original names)
- Download failures due to filesystem-unsafe characters
- Encoding issues when serving files to users

## Solution Implemented

### 1. Enhanced Filename Cleaning (`cleanFilename` function)

**Removes/Replaces:**
- Emojis and Unicode symbols (🎵, 🎬, etc.)
- Control characters and special Unicode ranges
- Filesystem-unsafe characters (`<>:"/\|?*`)
- Problematic punctuation and brackets
- Leading/trailing spaces, dashes, and dots

**Features:**
- Preserves original titles while making them filesystem-safe
- Limits length to 180 characters (leaving room for extensions)
- Provides fallback to 'media' if cleaning results in empty string

### 2. Smart Download Process

**New Workflow:**
1. Extract metadata first to get video title
2. Clean the title using enhanced `cleanFilename()`
3. Use cleaned title as filename instead of UUID
4. Download with format: `{cleanedTitle}.{ext}`

**Benefits:**
- Users get meaningful filenames
- All new downloads are automatically safe
- Backwards compatible with existing system

### 3. Robust File Serving with Fallback

**Fallback Logic:**
1. Try exact filename match first
2. If not found, search for any media file in directory
3. Serve first available media file
4. Always return cleaned filename to user

**Features:**
- Handles both legacy and new naming conventions
- Proper Unicode encoding in HTTP headers (RFC 5987)
- Comprehensive error handling and logging

### 4. Migration Script for Legacy Files

**Script: `migrate-filenames.js`**
- Scans all existing download directories
- Identifies files with problematic characters
- Renames files using metadata or cleaned existing names
- Avoids conflicts with duplicate names
- Provides detailed migration report

## Usage Instructions

### Running the Migration

```bash
# Navigate to yt-dlp-service directory
cd yt-dlp-service

# Run the migration script
node migrate-filenames.js
```

### Migration Output Example
```
🔍 Starting filename migration...
📁 Download directory: ./downloads

📂 Processing job: 4a64d8c9-5f1d-4f4c-ad2a-954809d023a5
   📄 Found metadata: "Rick Astley - Never Gonna Give You Up (Official Video) [4K Remaster]"
   🔄 Renamed: "Rick-Astley-Never-Gonna-Give-You-Up-(Official-Video)-(4K-Remaster).mhtml" → "Rick-Astley-Never-Gonna-Give-You-Up-Official-Video-4K-Remaster.mhtml"

📊 Migration Summary:
   📁 Jobs processed: 45
   📄 Files processed: 87
   🔄 Files renamed: 12
   ❌ Errors: 0
```

### Verification Steps

1. **Test New Downloads:**
   ```bash
   # Download a video with Unicode characters in title
   curl -X POST http://localhost:3001/download \
     -H "Content-Type: application/json" \
     -d '{"url": "https://youtube.com/watch?v=example", "userId": "test"}'
   ```

2. **Test File Serving:**
   ```bash
   # Try downloading through the main app
   curl "http://localhost:3000/api/downloads/files/{download-id}"
   ```

3. **Check Logs:**
   - Look for `DEBUG - Download completion analysis` in yt-dlp service logs
   - Verify `DEBUG - File serving analysis` shows proper fallback logic

## Technical Details

### Filename Cleaning Rules

```javascript
// Example transformations:
"🎵 Song Title (Official Video) 🎬" → "Song-Title-Official-Video"
"Artist: Song "Name" [2024]" → "Artist-Song-Name-2024"
"Video<>Title|Part*1" → "Video-Title-Part-1"
```

### Character Ranges Cleaned

- **Emojis:** `\u{1F600}-\u{1F64F}` (faces), `\u{1F300}-\u{1F5FF}` (symbols), etc.
- **Control:** `\u{0000}-\u{001F}`, `\u{007F}-\u{009F}`
- **Punctuation:** `\u{2000}-\u{206F}`
- **Filesystem:** `<>:"/\|?*`
- **Brackets:** `()[]{}"`

### HTTP Headers for Unicode Support

```javascript
// RFC 5987 compliant encoding
res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedDisplayName}`);
```

## Monitoring and Maintenance

### Log Monitoring
Watch for these debug messages:
- `DEBUG - Download completion analysis` - Shows filename generation
- `DEBUG - File serving analysis` - Shows fallback logic execution
- `Using cleaned filename:` - Confirms title cleaning works

### Regular Maintenance
- Run migration script after major title format changes
- Monitor logs for encoding errors
- Check filesystem for orphaned files

## Troubleshooting

### Common Issues

1. **"File not found" errors:**
   - Check migration ran successfully
   - Verify fallback logic in logs
   - Ensure file permissions are correct

2. **Strange characters in download:**
   - Update `cleanFilename()` function for new character ranges
   - Test with problematic titles first

3. **Duplicate filenames:**
   - Migration script adds `-1`, `-2` suffixes
   - Check for conflicts in job metadata

### Debug Commands

```bash
# List files in specific job directory
ls -la downloads/{job-id}/

# Test filename cleaning
node -e "
const { cleanFilename } = require('./migrate-filenames.js');
console.log(cleanFilename('🎵 Test Title (2024) 🎬'));
"

# Check for problematic files
find downloads/ -name "*[<>:\"/\\|?*]*" -type f
```

## Future Improvements

1. **Real-time Monitoring:** Add metrics for filename cleaning success rates
2. **Character Set Expansion:** Monitor for new problematic Unicode ranges
3. **Batch Processing:** Optimize migration for large file sets
4. **Validation:** Add filename validation before download starts

---

**Implementation Date:** June 20, 2025  
**Version:** 1.0  
**Compatibility:** All existing downloads, backwards compatible