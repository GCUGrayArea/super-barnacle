/**
 * Feasibility Result Formatters for MCP Tools
 *
 * Formats feasibility check and pass prediction results into human-readable
 * MCP tool responses with clear ordering instructions.
 */

import type {
  FeasibilityCheckResponse,
  PassPredictionResponse,
  SatellitePass,
  Opportunity,
  ProviderScore,
} from '../../types/feasibility.js';
import { ProductType } from '../../types/skyfi-api.js';

/**
 * Format a feasibility check response for MCP output
 */
export function formatFeasibilityCheckResult(
  result: FeasibilityCheckResponse,
): string {
  const lines: string[] = [];

  lines.push('# Tasking Feasibility Check Results');
  lines.push('');

  // Overall feasibility score
  if (result.overallScore) {
    const score = result.overallScore.feasibility;
    const scorePercent = (score * 100).toFixed(0);
    const scoreLevel =
      score >= 0.8 ? 'EXCELLENT' : score >= 0.6 ? 'GOOD' : score >= 0.4 ? 'MODERATE' : 'LOW';

    lines.push(`## Overall Feasibility: ${scorePercent}% (${scoreLevel})`);
    lines.push('');

    // Weather information
    if (result.overallScore.weatherScore) {
      const weatherScore = result.overallScore.weatherScore.weatherScore;
      const weatherPercent = (weatherScore * 100).toFixed(0);
      lines.push(`### Weather Conditions: ${weatherPercent}%`);

      if (result.overallScore.weatherScore.weatherDetails?.clouds) {
        lines.push('');
        lines.push('**Cloud Coverage Forecast:**');
        result.overallScore.weatherScore.weatherDetails.clouds.forEach((cloud) => {
          const date = new Date(cloud.date).toLocaleDateString();
          lines.push(`- ${date}: ${cloud.coverage}% cloud coverage`);
        });
      }
      lines.push('');
    }

    // Provider scores and opportunities
    if (result.overallScore.providerScore.providerScores) {
      lines.push('## Capture Opportunities by Provider');
      lines.push('');

      result.overallScore.providerScore.providerScores.forEach((providerScore) => {
        lines.push(formatProviderScore(providerScore));
      });
    }
  } else {
    lines.push('**Status:** Feasibility check in progress or no results available.');
    lines.push('');
  }

  // Ordering instructions
  lines.push('## How to Place an Order');
  lines.push('');
  lines.push('To place a tasking order, you will need:');
  lines.push('1. **Provider Window ID** - Use the `providerWindowId` from one of the opportunities above');
  lines.push('2. **Area of Interest** - Your AOI in WKT POLYGON format');
  lines.push('3. **Product Type & Resolution** - From your feasibility check parameters');
  lines.push('');
  lines.push('**IMPORTANT:** For Planet orders, the `providerWindowId` is **required** and must match one of the opportunities listed above.');
  lines.push('');

  // Additional metadata
  lines.push('---');
  lines.push(`**Feasibility ID:** ${result.id}`);
  lines.push(`**Valid Until:** ${new Date(result.validUntil).toLocaleString()}`);

  return lines.join('\n');
}

/**
 * Format a provider score with opportunities
 */
function formatProviderScore(providerScore: ProviderScore): string {
  const lines: string[] = [];
  const provider = providerScore.provider || 'Unknown';
  const scorePercent = (providerScore.score * 100).toFixed(0);

  lines.push(`### ${provider}`);
  lines.push(`**Score:** ${scorePercent}% | **Status:** ${providerScore.status || 'N/A'}`);

  if (providerScore.reference) {
    lines.push(`**Reference:** ${providerScore.reference}`);
  }

  if (providerScore.opportunities && providerScore.opportunities.length > 0) {
    lines.push('');
    lines.push('**Available Capture Windows:**');
    lines.push('');

    providerScore.opportunities.forEach((opp, idx) => {
      lines.push(formatOpportunity(opp, idx + 1));
    });
  } else {
    lines.push('');
    lines.push('*No capture opportunities available for this provider.*');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Format a single capture opportunity
 */
function formatOpportunity(opportunity: Opportunity, index: number): string {
  const lines: string[] = [];
  const start = new Date(opportunity.windowStart);
  const end = new Date(opportunity.windowEnd);
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes

  lines.push(`**Opportunity ${index}:**`);
  lines.push(`- Window: ${start.toLocaleString()} to ${end.toLocaleString()}`);
  lines.push(`- Duration: ${duration} minutes`);

  if (opportunity.satelliteId) {
    lines.push(`- Satellite: ${opportunity.satelliteId}`);
  }

  if (opportunity.providerWindowId) {
    lines.push(`- **Provider Window ID:** \`${opportunity.providerWindowId}\` ⚠️ Required for ordering`);
  }

  if (opportunity.providerMetadata) {
    const metadata = JSON.stringify(opportunity.providerMetadata, null, 2);
    lines.push(`- Metadata: \`\`\`json\n${metadata}\n\`\`\``);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Format a satellite pass prediction response for MCP output
 */
export function formatPassPredictionResult(
  result: PassPredictionResponse,
): string {
  const lines: string[] = [];

  lines.push('# Satellite Pass Predictions');
  lines.push('');
  lines.push(`Found **${result.passes.length}** satellite pass opportunities`);
  lines.push('');

  if (result.passes.length === 0) {
    lines.push('No satellite passes found for the specified parameters.');
    lines.push('');
    lines.push('**Suggestions:**');
    lines.push('- Expand the time window');
    lines.push('- Increase the maximum off-nadir angle');
    lines.push('- Try different product types or resolutions');
    return lines.join('\n');
  }

  // Group passes by provider
  const passesByProvider = groupPassesByProvider(result.passes);

  // Recommendations
  const bestPasses = recommendBestPasses(result.passes);
  if (bestPasses.length > 0) {
    lines.push('## Recommended Passes');
    lines.push('');
    bestPasses.forEach((pass, idx) => {
      lines.push(`### ${idx + 1}. ${pass.satname} (${pass.provider})`);
      lines.push(formatSatellitePass(pass, true));
    });
    lines.push('');
  }

  // All passes by provider
  lines.push('## All Available Passes');
  lines.push('');

  Object.entries(passesByProvider).forEach(([provider, passes]) => {
    lines.push(`### ${provider} (${passes.length} passes)`);
    lines.push('');

    passes.forEach((pass, idx) => {
      lines.push(`**${idx + 1}. ${pass.satname}**`);
      lines.push(formatSatellitePass(pass, false));
    });

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format a single satellite pass
 */
function formatSatellitePass(pass: SatellitePass, includeReason: boolean): string {
  const lines: string[] = [];
  const passDate = new Date(pass.passDate);

  lines.push(`- **Date/Time:** ${passDate.toLocaleString()}`);
  lines.push(`- **Product:** ${pass.productType} | **Resolution:** ${pass.resolution}`);
  lines.push(`- **Price:** $${pass.priceForOneSquareKm.toFixed(2)}/km²`);
  lines.push(`- **Off-Nadir Angle:** ${pass.offNadirAngle.toFixed(1)}° (lower is better)`);
  lines.push(`- **Coverage:** ${pass.minSquareKms.toFixed(1)} - ${pass.maxSquareKms.toFixed(1)} km²`);
  lines.push(`- **Location:** ${pass.lat.toFixed(4)}°, ${pass.lon.toFixed(4)}°`);

  if (pass.productType === ProductType.Day || pass.productType === ProductType.Night) {
    lines.push(`- **Solar Elevation:** ${pass.solarElevationAngle.toFixed(1)}°`);
  }

  if (includeReason) {
    const reasons = getPassRecommendationReasons(pass);
    if (reasons.length > 0) {
      lines.push(`- **Why Recommended:** ${reasons.join(', ')}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Group satellite passes by provider
 */
function groupPassesByProvider(
  passes: SatellitePass[],
): Record<string, SatellitePass[]> {
  const grouped: Record<string, SatellitePass[]> = {};

  passes.forEach((pass) => {
    const provider = pass.provider;
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(pass);
  });

  // Sort passes within each provider by date
  Object.keys(grouped).forEach((provider) => {
    grouped[provider]?.sort(
      (a, b) => new Date(a.passDate).getTime() - new Date(b.passDate).getTime(),
    );
  });

  return grouped;
}

/**
 * Recommend the best satellite passes based on cost, timing, and quality
 */
function recommendBestPasses(passes: SatellitePass[]): SatellitePass[] {
  // Score each pass
  const scoredPasses = passes.map((pass) => ({
    pass,
    score: calculatePassScore(pass),
  }));

  // Sort by score (higher is better)
  scoredPasses.sort((a, b) => b.score - a.score);

  // Return top 3 passes
  return scoredPasses.slice(0, 3).map((sp) => sp.pass);
}

/**
 * Calculate a score for a satellite pass (0-100, higher is better)
 */
function calculatePassScore(pass: SatellitePass): number {
  let score = 100;

  // Penalize high off-nadir angles (0-30 degrees is ideal)
  // Each degree above 15 reduces score by 2 points
  if (pass.offNadirAngle > 15) {
    score -= (pass.offNadirAngle - 15) * 2;
  }

  // Penalize high prices
  // Price above $10/km² reduces score
  if (pass.priceForOneSquareKm > 10) {
    score -= Math.min(20, (pass.priceForOneSquareKm - 10) * 2);
  }

  // Bonus for near-nadir (very low angle)
  if (pass.offNadirAngle < 10) {
    score += 10;
  }

  // Bonus for good pricing
  if (pass.priceForOneSquareKm < 8) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get reasons why a pass is recommended
 */
function getPassRecommendationReasons(pass: SatellitePass): string[] {
  const reasons: string[] = [];

  if (pass.offNadirAngle < 10) {
    reasons.push('Excellent image quality (near-nadir)');
  } else if (pass.offNadirAngle < 20) {
    reasons.push('Good image quality');
  }

  if (pass.priceForOneSquareKm < 8) {
    reasons.push('Competitive pricing');
  }

  return reasons;
}
