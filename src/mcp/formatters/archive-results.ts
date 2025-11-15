/**
 * Archive Results Formatter
 *
 * This module provides formatting functions to convert SkyFi archive search
 * results into AI-friendly markdown format for MCP tool responses.
 *
 * @packageDocumentation
 */

import type { ArchiveSearchResponse, Archive } from '../../types/archives.js';

/**
 * Format archive search results as markdown for AI consumption
 *
 * @param data - Archive search response from SkyFi API
 * @returns Formatted markdown string
 */
export function formatArchiveResults(data: ArchiveSearchResponse): string {
  const { archives, nextPage, total } = data;

  if (archives.length === 0) {
    return `## Archive Search Results

No satellite imagery found matching your criteria.

### Suggestions to find imagery:
1. **Expand your date range** - Try searching over a longer time period
2. **Reduce filters** - Remove or relax cloud coverage, resolution, or product type filters
3. **Increase AOI size** - Consider a slightly larger area of interest
4. **Try different product types** - Some areas may have better coverage with SAR or multispectral imagery

### Available Product Types:
- **DAY** - Standard optical daytime imagery
- **NIGHT** - Nighttime imagery with low-light sensors
- **SAR** - Synthetic Aperture Radar (weather-independent)
- **MULTISPECTRAL** - Multiple spectral bands for analysis
- **VIDEO** - Video capture from satellite

To search again, use \`search_satellite_archives\` with modified parameters.`;
  }

  // Build header with count
  let result = `## Archive Search Results\n\n`;
  result += `Found **${archives.length}** satellite image${archives.length === 1 ? '' : 's'}`;

  if (total !== undefined && total > archives.length) {
    result += ` (showing ${archives.length} of ${total} total)`;
  }

  result += ` matching your criteria.\n\n`;

  // Add pagination notice if applicable
  if (nextPage) {
    result += `*Note: More results available. This page shows ${archives.length} results.*\n\n`;
  }

  result += `---\n\n`;

  // Format each archive
  archives.forEach((archive, index) => {
    result += formatSingleArchive(archive, index + 1);
    if (index < archives.length - 1) {
      result += `\n---\n\n`;
    }
  });

  // Add instructions for next steps
  result += `\n\n## Next Steps\n\n`;
  result += `### To order an image:\n`;
  result += `Use the \`order_archive_imagery\` tool with the desired \`archive_id\` from above.\n\n`;
  result += `**Example:**\n`;
  result += `\`\`\`json\n`;
  result += `{\n`;
  result += `  "archive_id": "${archives[0]?.archiveId ?? 'ARCHIVE_ID'}",\n`;
  result += `  "aoi": "POLYGON((...))"\n`;
  result += `}\n`;
  result += `\`\`\`\n\n`;

  if (nextPage) {
    result += `### To see more results:\n`;
    result += `The search returned more than ${archives.length} results. `;
    result += `To implement pagination, you would need to call the API again with the nextPage URL.\n\n`;
  }

  result += `### Need more details?\n`;
  result += `Use \`get_archive_details\` with an \`archive_id\` to see complete information about a specific image.`;

  return result;
}

/**
 * Format a single archive result
 *
 * @param archive - Archive data
 * @param index - Position in results (1-based)
 * @returns Formatted markdown string
 */
function formatSingleArchive(archive: Archive, index: number): string {
  let result = `### ${index}. Archive ID: ${archive.archiveId}\n\n`;

  // Key information table
  result += `| Property | Value |\n`;
  result += `|----------|-------|\n`;
  result += `| **Provider** | ${archive.provider} |\n`;
  result += `| **Constellation** | ${archive.constellation} |\n`;
  result += `| **Product Type** | ${archive.productType} |\n`;
  result += `| **Resolution** | ${archive.resolution} (${archive.platformResolution}cm GSD) |\n`;
  result += `| **Capture Date** | ${formatDate(archive.captureTimestamp)} |\n`;

  if (archive.cloudCoveragePercent !== undefined) {
    result += `| **Cloud Coverage** | ${archive.cloudCoveragePercent.toFixed(1)}% |\n`;
  }

  if (archive.offNadirAngle !== undefined) {
    result += `| **Off-Nadir Angle** | ${archive.offNadirAngle.toFixed(1)}° |\n`;
  }

  result += `| **Total Area** | ${archive.totalAreaSquareKm.toFixed(2)} km² |\n`;

  // Pricing information
  result += `\n**Pricing:**\n`;
  result += `- Per km²: $${archive.priceForOneSquareKm.toFixed(2)}\n`;
  result += `- Full scene: $${archive.priceFullScene.toFixed(2)}\n`;
  result += `- Min order: ${archive.minSqKm} km²\n`;
  result += `- Max order: ${archive.maxSqKm} km²\n`;

  if (archive.openData) {
    result += `- ✅ **Open Data** (Free to order)\n`;
  }

  // Delivery information
  result += `\n**Delivery:**\n`;
  result += `- Estimated delivery time: ${archive.deliveryTimeHours} hours\n`;

  // Thumbnail if available
  if (archive.thumbnailUrls && Object.keys(archive.thumbnailUrls).length > 0) {
    const thumbnailKey = Object.keys(archive.thumbnailUrls)[0];
    if (thumbnailKey) {
      result += `\n**Preview:** [Thumbnail](${archive.thumbnailUrls[thumbnailKey]})\n`;
    }
  }

  return result;
}

/**
 * Format archive details for a single archive (used by get_archive_details tool)
 *
 * @param archive - Archive data
 * @returns Formatted markdown string
 */
export function formatArchiveDetails(archive: Archive): string {
  let result = `## Archive Details\n\n`;
  result += `# ${archive.archiveId}\n\n`;

  // Basic information
  result += `## Basic Information\n\n`;
  result += `| Property | Value |\n`;
  result += `|----------|-------|\n`;
  result += `| **Archive ID** | ${archive.archiveId} |\n`;
  result += `| **Provider** | ${archive.provider} |\n`;
  result += `| **Constellation** | ${archive.constellation} |\n`;
  result += `| **Product Type** | ${archive.productType} |\n`;
  result += `| **Resolution Category** | ${archive.resolution} |\n`;
  result += `| **Platform Resolution** | ${archive.platformResolution}cm |\n`;
  result += `| **Ground Sample Distance** | ${archive.gsd}m |\n`;
  result += `| **Capture Timestamp** | ${formatDate(archive.captureTimestamp)} |\n`;

  if (archive.cloudCoveragePercent !== undefined) {
    result += `| **Cloud Coverage** | ${archive.cloudCoveragePercent.toFixed(1)}% |\n`;
  }

  if (archive.offNadirAngle !== undefined) {
    result += `| **Off-Nadir Angle** | ${archive.offNadirAngle.toFixed(1)}° |\n`;
  }

  result += `| **Open Data** | ${archive.openData ? 'Yes (Free)' : 'No (Paid)'} |\n`;

  // Coverage information
  result += `\n## Coverage\n\n`;
  result += `- **Total Area:** ${archive.totalAreaSquareKm.toFixed(2)} km²\n`;
  result += `- **Footprint:** \`${archive.footprint.substring(0, 100)}${archive.footprint.length > 100 ? '...' : ''}\`\n`;

  // Pricing information
  result += `\n## Pricing\n\n`;
  result += `| Item | Price |\n`;
  result += `|------|-------|\n`;
  result += `| **Per km²** | $${archive.priceForOneSquareKm.toFixed(2)} |\n`;
  result += `| **Full Scene** | $${archive.priceFullScene.toFixed(2)} |\n`;
  result += `| **Minimum Order** | ${archive.minSqKm} km² |\n`;
  result += `| **Maximum Order** | ${archive.maxSqKm} km² |\n`;

  if (archive.openData) {
    result += `\n*This is open data and is free to order.*\n`;
  }

  // Delivery information
  result += `\n## Delivery\n\n`;
  result += `- **Estimated Delivery Time:** ${archive.deliveryTimeHours} hours after order\n`;

  // Thumbnails
  if (archive.thumbnailUrls && Object.keys(archive.thumbnailUrls).length > 0) {
    result += `\n## Preview Thumbnails\n\n`;
    Object.entries(archive.thumbnailUrls).forEach(([size, url]) => {
      result += `- **${size}:** [View Thumbnail](${url})\n`;
    });
  }

  // Tiles URL
  if (archive.tilesUrl) {
    result += `\n## Map Tiles\n\n`;
    result += `- **Tiles URL:** ${archive.tilesUrl}\n`;
  }

  // Order instructions
  result += `\n## How to Order\n\n`;
  result += `To order this archive image, use the \`order_archive_imagery\` tool:\n\n`;
  result += `\`\`\`json\n`;
  result += `{\n`;
  result += `  "archive_id": "${archive.archiveId}",\n`;
  result += `  "aoi": "POLYGON((...))"\n`;
  result += `}\n`;
  result += `\`\`\`\n\n`;
  result += `**Note:** The AOI (Area of Interest) must be within the footprint shown above `;
  result += `and between ${archive.minSqKm} and ${archive.maxSqKm} km².`;

  return result;
}

/**
 * Format ISO 8601 date to human-readable format
 *
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date string
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0] + ' ' + date.toISOString().split('T')[1]?.split('.')[0];
  } catch {
    return isoDate;
  }
}
