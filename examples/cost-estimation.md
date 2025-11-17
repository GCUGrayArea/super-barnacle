# Cost Estimation and Pricing Exploration Scenario

## Overview
This scenario demonstrates how to explore and compare pricing for different types of satellite imagery products. Understanding pricing helps you make informed decisions about which imagery products best balance quality requirements with budget constraints.

## Scenario: Multi-Site Environmental Monitoring Budget Planning

### Real-World Use Case
An environmental NGO is planning a year-long project to monitor deforestation across multiple sites in the Amazon rainforest. They need to determine the most cost-effective approach for acquiring satellite imagery while meeting their quality requirements. They're evaluating different combinations of resolution, product types, and monitoring frequencies to optimize their limited budget.

### Goals
- Understand SkyFi pricing structure for different product types
- Compare costs between archive and tasking imagery
- Estimate monthly/annual monitoring costs for multiple sites
- Optimize imagery acquisition strategy within budget constraints
- Identify cost-saving opportunities and trade-offs

## Prerequisites

### Environment Setup
Ensure you have the following environment variables configured:
```bash
SKYFI_API_KEY=your_skyfi_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Project Parameters
For this scenario, the NGO has:
- **Budget**: $5,000/month for imagery acquisition
- **Monitoring Sites**: 5 locations across the Amazon
- **Frequency**: Monthly monitoring (12 captures per year per site)
- **Priority**: Detect deforestation (need reasonable resolution)
- **Constraint**: Cloud cover is a major challenge in tropical regions

## Step-by-Step Walkthrough

### Step 1: Get General Pricing Information

**User Message to Agent**:
```
I'm planning a satellite imagery monitoring project and need to understand the
pricing for different types of imagery products. Can you explain the pricing
structure and show me the current rates?
```

**Expected Agent Response**:
```
I'll get you comprehensive pricing information for SkyFi's satellite imagery products.

[Executing: get_pricing_info]

SkyFi Satellite Imagery Pricing Structure:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARCHIVE IMAGERY (Pre-existing imagery)
Pricing is per square kilometer (km²)

Optical Imagery:
- Very High Resolution (0.3-1m):    $5.00 - $10.00 per km²
- High Resolution (1-5m):           $2.00 - $5.00 per km²
- Medium Resolution (5-30m):        $0.50 - $2.00 per km²
- Low Resolution (>30m):            $0.10 - $0.50 per km²

SAR (Synthetic Aperture Radar):
- Very High Resolution (1-3m):      $6.00 - $12.00 per km²
- High Resolution (3-10m):          $3.00 - $6.00 per km²
- Medium Resolution (10-30m):       $1.00 - $3.00 per km²

Multispectral/Hyperspectral:
- Very High Resolution (0.5-2m):    $8.00 - $15.00 per km²
- High Resolution (2-10m):          $4.00 - $8.00 per km²
- Medium Resolution (10-30m):       $1.50 - $4.00 per km²

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASKING IMAGERY (New captures)
Pricing is 7-10x higher than archive due to satellite tasking costs

Optical Imagery:
- Very High Resolution (0.3-1m):    $70 - $90 per km²
- High Resolution (1-5m):           $30 - $50 per km²
- Medium Resolution (5-30m):        $10 - $25 per km²

SAR Imagery:
- Very High Resolution (1-3m):      $80 - $100 per km²
- High Resolution (3-10m):          $40 - $65 per km²
- Medium Resolution (10-30m):       $15 - $35 per km²

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIVERY & PROCESSING
- Standard delivery (4-24 hours): Included
- Rush delivery (1-4 hours): +$200 per order
- Basic processing: Included
- Advanced processing (pansharpening, orthorectification): +$50-200
- Cloud storage delivery: Included (S3, GCS, Azure)
- Redelivery: $25 per redelivery

VOLUME DISCOUNTS
- 1,000-5,000 km²/month: 10% discount
- 5,000-20,000 km²/month: 15% discount
- 20,000+ km²/month: 20% discount
- Annual contracts: Additional 5-10% discount

KEY FACTORS AFFECTING COST:
1. Resolution (higher = more expensive)
2. Product type (multispectral > SAR > optical)
3. Archive vs tasking (tasking ~7-10x more)
4. Scene age (newer archive = more expensive)
5. Area size (larger = bulk discounts)
6. Cloud cover (doesn't affect price, but may need more attempts)

Would you like me to estimate costs for your specific monitoring project?
```

### Step 2: Define Project Requirements

**User Message**:
```
I need to monitor 5 deforestation sites in the Amazon, each about 100 km². I need
monthly imagery for a year (12 captures per site). What would be the most
cost-effective approach?

Sites:
1. Site A: POLYGON((-60.00 -3.00, -59.90 -3.00, -59.90 -2.90, -60.00 -2.90, -60.00 -3.00))
2. Site B: POLYGON((-61.50 -4.50, -61.40 -4.50, -61.40 -4.40, -61.50 -4.40, -61.50 -4.50))
3-5: Similar size areas

My budget is $5,000/month. What resolution and approach can I afford?
```

**Expected Agent Response**:
```
Let me analyze the cost options for your deforestation monitoring project.

Project Parameters:
- Sites: 5 locations
- Area per site: 100 km²
- Total area: 500 km²
- Frequency: Monthly (12 captures/year per site)
- Total annual captures: 60 (5 sites × 12 months)
- Monthly budget: $5,000
- Annual budget: $60,000
- Use case: Deforestation detection (need change detection capability)

Cost Analysis - Option 1: Archive Imagery Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Medium Resolution (10m Optical - Sentinel-2 class):
- Per capture cost: 100 km² × $1.00/km² = $100
- Monthly cost: 5 sites × $100 = $500
- Annual cost: $500 × 12 = $6,000
- Budget utilization: 10% ($500 / $5,000)
- Pros: Very affordable, frequent revisit
- Cons: 10m may miss small clearings (<1 hectare)

High Resolution (3m Optical):
- Per capture cost: 100 km² × $3.50/km² = $350
- Monthly cost: 5 sites × $350 = $1,750
- Annual cost: $1,750 × 12 = $21,000
- Budget utilization: 35% ($1,750 / $5,000)
- Pros: Good detail, affordable
- Cons: May not always be available

Very High Resolution (0.5m Optical):
- Per capture cost: 100 km² × $7.50/km² = $750
- Monthly cost: 5 sites × $750 = $3,750
- Annual cost: $3,750 × 12 = $45,000
- Budget utilization: 75% ($3,750 / $5,000)
- Pros: Excellent detail, individual trees visible
- Cons: Higher cost, less frequent coverage

Cost Analysis - Option 2: Tasking Imagery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Medium Resolution (5m Optical Tasking):
- Per capture cost: 100 km² × $17.50/km² = $1,750
- Monthly cost: 5 sites × $1,750 = $8,750
- Annual cost: $8,750 × 12 = $105,000
- Budget utilization: 175% ($8,750 / $5,000) ⚠️ OVER BUDGET

High Resolution (3m SAR Tasking):
- Per capture cost: 100 km² × $52.50/km² = $5,250
- Monthly cost: 5 sites × $5,250 = $26,250
- Annual cost: $26,250 × 12 = $315,000
- Budget utilization: 525% ⚠️ WAY OVER BUDGET

Recommendation: Hybrid Approach
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strategy: Combine archive imagery with selective high-resolution

Monthly Plan:
1. Archive medium-res (10m) for all 5 sites: $500/month
2. Archive high-res (3m) for 3 priority sites: $1,050/month
3. Reserve budget for ad-hoc tasking: $1,000/month
4. Emergency response fund: $500/month

Total Monthly Cost: $3,050 (61% of budget)
Annual Cost: $36,600

This leaves $1,950/month ($23,400/year) for:
- Tasking orders when archive unavailable
- Higher resolution for detected changes
- Expansion to additional sites
- Processing and analysis tools

Benefits:
✓ Stays well within budget
✓ Regular monitoring of all sites
✓ High-resolution coverage for priority areas
✓ Flexibility for special needs
✓ Can handle cloud cover challenges (tropical)

Would you like me to calculate costs for alternative strategies?
```

### Step 3: Explore Alternative Strategies

**User Message**:
```
What if I use SAR imagery to deal with cloud cover? How would that change the costs?
```

**Expected Agent Response**:
```
Excellent question! SAR imagery is ideal for tropical regions because it penetrates
clouds. Let me show you a SAR-focused cost analysis.

SAR Imagery Strategy - Cloud-Independent Monitoring
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option A: Archive SAR Medium Resolution (10-30m)
- Per capture cost: 100 km² × $2.00/km² = $200
- Monthly cost: 5 sites × $200 = $1,000
- Annual cost: $1,000 × 12 = $12,000
- Budget utilization: 20% ($1,000 / $5,000)

Advantages:
✓ Works through clouds (critical in Amazon!)
✓ Day/night capable
✓ Affordable for regular monitoring
✓ Good for change detection
✓ Reliable monthly coverage

Disadvantages:
✗ Different interpretation than optical (requires training)
✗ Lower resolution than optical at same price point
✗ Limited color information (single band)

Option B: Archive SAR High Resolution (3-10m)
- Per capture cost: 100 km² × $4.50/km² = $450
- Monthly cost: 5 sites × $450 = $2,250
- Annual cost: $2,250 × 12 = $27,000
- Budget utilization: 45% ($2,250 / $5,000)

Advantages:
✓ Better resolution for deforestation detection
✓ Still cloud-independent
✓ Reasonable cost
✓ Better tree detection

Recommended Hybrid Strategy: SAR + Optical
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Monthly Acquisition Plan:

1. Primary Monitoring (SAR Medium-Res):
   All 5 sites monthly with 10m SAR: $1,000/month
   → Reliable baseline monitoring, cloud-independent

2. Optical Validation (3m):
   3 sites monthly with high-res optical: $1,050/month
   → Visual confirmation, better for reporting

3. Change Detection Follow-up:
   When changes detected, order very high-res optical or SAR: $1,000/month
   → Detailed analysis of deforestation events

4. Reserve:
   Emergency tasking and special requests: $950/month

Total Monthly Budget: $4,000 (80% of budget)
Annual Cost: $48,000

Cost Breakdown by Category:
- Regular SAR monitoring: $12,000/year (25%)
- Regular optical monitoring: $12,600/year (26%)
- Change detection follow-up: $12,000/year (25%)
- Reserve/emergency: $11,400/year (24%)

Expected Results:
- 60 SAR captures/year (100% cloud-independent)
- 36 optical captures/year (weather-dependent)
- 12-15 high-res follow-up captures/year
- Near-complete temporal coverage
- Budget buffer for unexpected needs

This approach ensures you never miss monitoring windows due to clouds while
maintaining visual optical imagery for validation and reporting!

Would you like me to calculate the cost for specific time periods or analyze
cost-saving opportunities?
```

### Step 4: Analyze Cost-Saving Opportunities

**User Message**:
```
Are there ways to reduce costs further? Maybe through volume discounts or
choosing specific satellites?
```

**Expected Agent Response**:
```
Absolutely! Let me identify several cost-optimization strategies for your project.

Cost Optimization Opportunities
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Volume Discounts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your annual volume: 500 km² × 12 months = 6,000 km²/year

Current tier: 5,000-20,000 km²/month → 15% discount

With 15% volume discount applied:
- Current monthly cost: $4,000
- With discount: $3,400/month
- Annual savings: $7,200
- New annual cost: $40,800 (was $48,000)

2. Annual Contract Commitment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Committing to 12-month contract: Additional 10% discount

With both discounts (15% volume + 10% contract):
- Monthly cost: $3,000/month
- Annual cost: $36,000
- Total savings: $12,000/year (25% reduction!)

3. Satellite-Specific Pricing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Some satellites have lower pricing due to availability:

Sentinel-2 (10m, free from ESA but $$ to process/deliver):
- Cost: $0.50/km² (processing/delivery fee only)
- Monthly for 5 sites: $250
- Annual: $3,000
- Savings vs. standard medium-res: $9,000/year

Landsat 8/9 (15-30m, also free but $$ to process):
- Cost: $0.30/km²
- Monthly for 5 sites: $150
- Annual: $1,800

Planet SkySat (3m daily revisit):
- Standard cost: $3.50/km²
- Subscription pricing: $2.00/km²
- Monthly for 5 sites: $1,000
- Savings: $750/month = $9,000/year

4. Optimized Monitoring Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instead of equal monitoring, prioritize based on risk:

High-Risk Sites (3 sites - monthly monitoring):
- Sentinel-2 10m SAR: $150/month
- Planet SkySat 3m optical: $600/month

Medium-Risk Sites (2 sites - quarterly monitoring):
- Sentinel-2 10m: $100/quarter = $33/month
- High-res optical follow-up: $200/quarter = $67/month

Total monthly cost: $850
Annual cost: $10,200
Savings: $37,800/year (79% reduction!)

5. Smart Archive Selection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose older archive imagery (6+ months old):
- Older imagery discount: 30-50% cheaper
- Use for baseline/historical comparison
- Use fresh imagery only for current state

Example: Historical baseline (2023 imagery):
- Very high-res at 50% discount: $3.75/km²
- One-time cost for all 5 sites: $1,875
- Use for 2-year comparison baseline

Maximum Optimization Scenario
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Combining all strategies:

Base Monitoring (Sentinel-2 + Landsat):
- Monthly SAR/optical for all sites: $400/month
- Includes cloud-free SAR and periodic optical

Targeted High-Res (Planet SkySat subscription):
- 3 priority sites monthly at 3m: $600/month

Annual Contract Discounts:
- Volume discount (15%): -$150/month
- Contract discount (10%): -$100/month

Reserve for Special Needs:
- Change detection follow-up: $500/month
- Tasking for urgent needs: $250/month

Final Monthly Budget:
Base monitoring:          $400
Targeted high-res:        $600
Discounts:              -$250
Reserve:                 $750
━━━━━━━━━━━━━━━━━━━━━━━━
Total:                 $1,500/month

Annual Cost: $18,000
Savings: $30,000/year (62.5% reduction from original $48,000!)
Budget utilization: 30% ($1,500 / $5,000)

This leaves $3,500/month for:
- Expanding to additional sites (10+ more sites possible)
- Higher resolution for special events
- Ground truth validation missions
- Data processing and analysis tools
- Reporting and visualization

Recommendation: Start with optimized strategy, scale up as needed!

Would you like me to create a detailed month-by-month acquisition plan?
```

### Step 5: Compare Specific Product Types

**User Message**:
```
Show me a side-by-side comparison of different product types for a 100 km² area
```

**Expected Agent Response**:
```
[Executing: get_pricing_info]

Side-by-Side Comparison: 100 km² Area
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARCHIVE IMAGERY (existing imagery)

┌─────────────────────────────────────────────────────────────────────┐
│ Product Type           Resolution  Cost    Delivery  Best For      │
├─────────────────────────────────────────────────────────────────────┤
│ Optical - Very High    0.5m        $750    4-24h     Detailed      │
│ Optical - High         3m          $350    4-24h     General use   │
│ Optical - Medium       10m         $100    4-24h     Wide area     │
│ SAR - High             3m          $450    4-24h     Clouds/night  │
│ SAR - Medium           10m         $200    4-24h     Regular mon.  │
│ Multispectral - High   3m          $600    4-24h     Vegetation    │
│ Multispectral - Medium 10m         $300    4-24h     Agriculture   │
└─────────────────────────────────────────────────────────────────────┘

TASKING IMAGERY (new capture)

┌─────────────────────────────────────────────────────────────────────┐
│ Product Type           Resolution  Cost     Delivery  Best For     │
├─────────────────────────────────────────────────────────────────────┤
│ Optical - Very High    0.5m        $8,000   7-14d     Critical     │
│ Optical - High         3m          $4,000   7-14d     Fresh data   │
│ SAR - High             3m          $5,250   7-14d     All-weather  │
│ SAR - Medium           10m         $1,750   7-14d     Monitoring   │
└─────────────────────────────────────────────────────────────────────┘

DETAILED COMPARISON: Deforestation Detection Use Case

Sentinel-2 (10m Optical Archive):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: $100 per 100 km²
Resolution: 10 meters per pixel
Revisit: Every 5 days
Cloud penetration: No

Capabilities:
✓ Detect clearings >0.1 hectare (1,000 m²)
✓ Multispectral bands (good for vegetation analysis)
✓ Free data (only pay processing/delivery)
✓ Very frequent coverage
✗ Cloud cover blocks imagery (major issue in tropics)
✗ Cannot detect selective logging
✗ Limited detail for small-scale changes

Best for: Regular monitoring, change detection, budget-constrained projects
Monthly cost (5 sites): $500

PlanetScope (3m Optical Archive):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: $350 per 100 km²
Resolution: 3 meters per pixel
Revisit: Daily
Cloud penetration: No

Capabilities:
✓ Detect clearings >100 m² (smaller clearings)
✓ Daily revisit (catch changes faster)
✓ Good spatial detail
✓ 4-band multispectral
✗ Still affected by clouds
✗ Higher cost than Sentinel-2
✗ May not detect individual tree removal

Best for: Frequent monitoring, rapid change detection, moderate budget
Monthly cost (5 sites): $1,750

WorldView-3 (0.5m Optical Archive):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: $750 per 100 km²
Resolution: 0.5 meters per pixel
Revisit: ~3 days (tasking dependent)
Cloud penetration: No

Capabilities:
✓ Individual trees visible
✓ Detect selective logging
✓ Small clearings (<10 m²)
✓ Excellent detail for reporting/evidence
✓ 8-band multispectral
✗ Expensive for regular monitoring
✗ Cloud cover still an issue
✗ Less frequent coverage in archive

Best for: Detailed analysis, legal evidence, important areas
Monthly cost (5 sites): $3,750

Sentinel-1 (10m SAR Archive):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: $200 per 100 km²
Resolution: 10 meters per pixel
Revisit: Every 6 days
Cloud penetration: Yes (all-weather)

Capabilities:
✓ Works through clouds (critical!)
✓ Day and night imaging
✓ Good for forest structure changes
✓ Free data (processing/delivery fee)
✓ Reliable coverage
✗ Requires specialized interpretation
✗ Not as intuitive as optical
✗ Limited for species identification

Best for: Cloud-prone areas, reliable monitoring, forest structure
Monthly cost (5 sites): $1,000

CAPELLA SAR (3m SAR Archive):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cost: $450 per 100 km²
Resolution: 3 meters per pixel
Revisit: Several times per week
Cloud penetration: Yes

Capabilities:
✓ High resolution SAR
✓ All-weather, day/night
✓ Can detect smaller changes
✓ Good for structure/texture
✗ Expensive compared to Sentinel-1
✗ Still requires SAR expertise
✗ Limited archive availability

Best for: High-detail SAR, reliable high-res monitoring
Monthly cost (5 sites): $2,250

Cost vs. Capability Matrix:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For deforestation detection in Amazon (100 km² site):

Budget Tier (<$200/month per site):
→ Sentinel-2 (10m optical): $100
→ Sentinel-1 (10m SAR): $200
→ Combined: $300/site = Good coverage, all-weather

Mid Tier ($200-500/month per site):
→ Planet SkySat (3m optical): $350
→ Sentinel-1 (10m SAR) backup: $200
→ Combined: $550/site = Better detail, frequent coverage

Premium Tier ($500+/month per site):
→ WorldView-3 (0.5m optical): $750
→ CAPELLA SAR (3m): $450
→ Sentinel-1 backup: $200
→ Combined: $1,400/site = Maximum detail, all conditions

Recommendation for Your Project:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use tiered approach:
- 3 high-risk sites: Mid tier ($550 × 3 = $1,650/month)
- 2 low-risk sites: Budget tier ($300 × 2 = $600/month)
- Total: $2,250/month (45% of $5,000 budget)

This provides:
✓ Reliable all-weather monitoring (SAR)
✓ Good spatial detail (3m optical for priority areas)
✓ Budget headroom for tasking/follow-up
✓ Scalable to more sites if needed

Want me to create a detailed acquisition schedule?
```

### Step 6: Create Annual Budget Projection

**User Message**:
```
Create a month-by-month budget projection for the full year using the tiered approach
```

**Expected Agent Response**:
```
Annual Budget Projection - Deforestation Monitoring Project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Overview:
- Sites: 5 (3 high-risk, 2 low-risk)
- Budget: $5,000/month ($60,000/year)
- Strategy: Tiered monitoring with SAR + optical

Monthly Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Base Monitoring (Every Month):
High-Risk Sites (Sites 1, 2, 3):
  - Planet SkySat 3m optical: $350 × 3 = $1,050
  - Sentinel-1 10m SAR: $200 × 3 = $600

Low-Risk Sites (Sites 4, 5):
  - Sentinel-2 10m optical: $100 × 2 = $200
  - Sentinel-1 10m SAR: $200 × 2 = $400

Base Monthly Total: $2,250

Quarterly High-Resolution Follow-Up:
Months 3, 6, 9, 12:
  - WorldView-3 0.5m for all sites: $750 × 5 = $3,750
  - For detailed analysis and reporting

Annual One-Time Costs:
Month 1:
  - Historical baseline imagery (all sites): $1,875
  - Setup and processing infrastructure: $500

Month-by-Month Budget:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Month 1 (January):
  Base monitoring:              $2,250
  Historical baseline:          $1,875
  Setup costs:                    $500
  Reserve:                        $375
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                   $5,000

Month 2 (February):
  Base monitoring:              $2,250
  Ad-hoc tasking (1 site):      $1,750
  Reserve:                      $1,000
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $10,000

Month 3 (March) - Quarterly Review:
  Base monitoring:              $2,250
  Quarterly high-res (5 sites): $3,750
  Processing:                     $200
  ────────────────────────────────────
  Total:                        $6,200
  Cumulative:                  $16,200
  ⚠️ $1,200 over monthly budget (use reserve)

Month 4 (April):
  Base monitoring:              $2,250
  Reserve replenishment:        $2,750
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $21,200

Month 5 (May):
  Base monitoring:              $2,250
  Change detection follow-up:   $1,500
  Reserve:                      $1,250
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $26,200

Month 6 (June) - Quarterly Review:
  Base monitoring:              $2,250
  Quarterly high-res (5 sites): $3,750
  Processing:                     $200
  ────────────────────────────────────
  Total:                        $6,200
  Cumulative:                  $32,400

Month 7 (July):
  Base monitoring:              $2,250
  Reserve replenishment:        $2,750
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $37,400

Month 8 (August):
  Base monitoring:              $2,250
  Dry season intensive (2 sites): $1,500
  Reserve:                      $1,250
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $42,400

Month 9 (September) - Quarterly Review:
  Base monitoring:              $2,250
  Quarterly high-res (5 sites): $3,750
  Processing:                     $200
  ────────────────────────────────────
  Total:                        $6,200
  Cumulative:                  $48,600

Month 10 (October):
  Base monitoring:              $2,250
  Reserve replenishment:        $2,750
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $53,600

Month 11 (November):
  Base monitoring:              $2,250
  Pre-rainy season capture:     $1,750
  Reserve:                      $1,000
  ────────────────────────────────────
  Total:                        $5,000
  Cumulative:                  $58,600

Month 12 (December) - Annual Review:
  Base monitoring:              $2,250
  Quarterly high-res (5 sites): $3,750
  Annual report imagery:          $500
  Processing:                     $200
  ────────────────────────────────────
  Total:                        $6,700
  Cumulative:                  $65,300

Annual Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Budget: $60,000
Actual Spend: $65,300
Variance: +$5,300 (8.8% over budget)

Breakdown by Category:
- Base monthly monitoring: $27,000 (41%)
- Quarterly high-res reviews: $15,000 (23%)
- Ad-hoc tasking/follow-up: $5,500 (8%)
- Historical baseline: $1,875 (3%)
- Processing & setup: $1,400 (2%)
- Reserve/buffer: $14,525 (22%)

Total Imagery Acquired:
- Archive optical captures: 96
- Archive SAR captures: 60
- High-resolution captures: 20
- Tasking captures: 3
- Total captures: 179

Average cost per capture: $365
Average cost per km² monitored: $109/km²/year

Optimization Opportunities:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To stay within $60,000 budget:

Option 1: Reduce quarterly high-res
- Do high-res only 2x per year instead of 4x
- Savings: $7,500
- New annual cost: $57,800 (within budget!)

Option 2: Volume discount (commit to 12 months)
- Apply 10% annual contract discount
- Savings: $6,530
- New annual cost: $58,770 (within budget!)

Option 3: Reduce low-risk site frequency
- Monitor sites 4 & 5 quarterly instead of monthly
- Savings: $5,400
- New annual cost: $59,900 (within budget!)

Recommended: Option 2 (annual contract)
- Maintains monitoring quality
- Easy to implement
- Stays within budget
- Predictable costs

Would you like me to create a revised budget with the optimization applied?
```

## Expected Outcomes

### Successful Completion
- Comprehensive understanding of SkyFi pricing structure
- Cost comparisons across different product types and strategies
- Optimized monitoring approach within budget constraints
- Detailed annual budget projection
- Identification of cost-saving opportunities
- Understanding of trade-offs between cost and quality

### Deliverables
- Cost breakdown by product type and resolution
- Monthly and annual budget projections
- Comparison matrix for different monitoring strategies
- Cost optimization recommendations
- Detailed acquisition plan

## Troubleshooting Tips

### Budget Overruns
**Problem**: Actual costs exceeding projected budget.

**Solutions**:
- Implement stricter approval process for ad-hoc orders
- Increase time between monitoring cycles
- Use lower resolution imagery
- Reduce number of monitored sites
- Negotiate annual contract for discounts
- Switch to free/low-cost satellites (Sentinel, Landsat)

### Unexpected Costs
**Problem**: Hidden fees or unexpected charges.

**Solutions**:
- Clarify all costs upfront (delivery, processing, storage)
- Watch for rush delivery fees
- Account for redelivery fees
- Include processing costs in budget
- Monitor cloud storage costs
- Track API call costs if applicable

### Quality vs Cost Trade-offs
**Problem**: Desired quality exceeds budget.

**Solutions**:
- Prioritize critical areas for high-resolution
- Use lower resolution for less critical areas
- Mix archive and tasking strategically
- Implement tiered monitoring approach
- Extend time between captures
- Use free satellite data where appropriate

## Real-World Applications

### Budget Planning
- Annual project budgeting
- Grant proposal cost estimation
- Multi-year monitoring program design
- Cost-benefit analysis for different approaches

### Cost Optimization
- Identifying most cost-effective imagery sources
- Balancing quality requirements with budget
- Negotiating volume discounts
- Planning acquisition schedules

### Project Scaling
- Estimating costs to expand monitoring areas
- Planning for growth within budget constraints
- Identifying funding needs for improvements

## Additional Resources

### Pricing Tools
- [SkyFi Pricing Calculator](https://www.skyfi.com/pricing)
- [Satellite Comparison Tool](https://www.skyfi.com/satellites)

### Budget Templates
- Monthly monitoring budget template
- Annual project budget template
- Cost tracking spreadsheet

## Notes
- Prices are approximate and subject to change
- Volume discounts available for large projects
- Annual contracts provide additional savings
- Free satellite data (Sentinel, Landsat) can significantly reduce costs
- Cloud cover in tropical regions may require more capture attempts
- Budget 10-20% buffer for unexpected costs and opportunities
