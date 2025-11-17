# Feasibility Check Examples

Comprehensive examples for checking tasking feasibility and predicting satellite passes.

## Table of Contents

- [Why Check Feasibility](#why-check-feasibility)
- [Basic Feasibility Check](#basic-feasibility-check)
- [Predicting Satellite Passes](#predicting-satellite-passes)
- [Interpreting Feasibility Scores](#interpreting-feasibility-scores)
- [Understanding Provider Window ID](#understanding-provider-window-id)
- [Choosing Optimal Capture Time](#choosing-optimal-capture-time)
- [Provider Filtering](#provider-filtering)
- [Multi-Location Feasibility](#multi-location-feasibility)
- [Real-World Scenarios](#real-world-scenarios)

---

## Why Check Feasibility

**ALWAYS check feasibility before placing tasking orders.** Here's why:

### 1. Cost Savings
Tasking orders are expensive ($100s-$1000s). Feasibility checks:
- Are free
- Show success probability
- Help avoid wasted orders

### 2. Required Information
Feasibility checks provide:
- **providerWindowId** - Required for Planet orders
- Weather forecast - Predict cloud conditions
- Capture opportunities - When satellites pass over AOI

### 3. Better Planning
- Choose optimal capture window
- Set realistic expectations
- Plan backup options

### 4. Success Probability
- 80-100%: Excellent - order confidently
- 60-79%: Good - reasonable success
- 40-59%: Moderate - consider extending window
- 0-39%: Low - don't order, adjust parameters

---

## Basic Feasibility Check

Check if tasking is viable for a specific location and time.

### Scenario

Planning to order high-resolution imagery of downtown San Francisco for a 7-day window.

### Request

```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "maxCloudCoverage": 20,
  "maxOffNadirAngle": 30
}
```

### Parameters Explained

| Parameter | Value | Why |
|-----------|-------|-----|
| productType | Day | Standard optical daytime imagery |
| resolution | High | 2-5m/pixel - good for urban analysis |
| windowStart/End | 7 days | Longer window = higher success probability |
| maxCloudCoverage | 20% | Reasonable tolerance for urban area |
| maxOffNadirAngle | 30° | Allows more pass opportunities |

### Expected Response

```
# Tasking Feasibility Check Results

## Overall Feasibility: 78% (GOOD)

### Weather Conditions: 65%

**Cloud Coverage Forecast:**
- 1/20/2025: 15% cloud coverage
- 1/21/2025: 35% cloud coverage
- 1/22/2025: 10% cloud coverage  ← Best day
- 1/23/2025: 45% cloud coverage
- 1/24/2025: 20% cloud coverage
- 1/25/2025: 25% cloud coverage
- 1/26/2025: 30% cloud coverage

## Capture Opportunities by Provider

### PLANET
**Score:** 85% | **Status:** AVAILABLE

**Available Capture Windows:**

**Opportunity 1:**
- Window: 1/22/2025 10:15:00 AM to 1/22/2025 10:20:00 AM
- Duration: 5 minutes
- Satellite: DOVE-1234
- **Provider Window ID:** `abc123e4-5678-90ab-cdef-1234567890ab` ⚠️ Required for ordering

**Opportunity 2:**
- Window: 1/24/2025 10:18:00 AM to 1/24/2025 10:23:00 AM
- Duration: 5 minutes
- Satellite: DOVE-5678
- **Provider Window ID:** `def456e4-9012-34ab-cdef-5678901234ab`

### SATELLOGIC
**Score:** 72% | **Status:** AVAILABLE

**Available Capture Windows:**

**Opportunity 1:**
- Window: 1/21/2025 2:30:00 PM to 1/21/2025 2:35:00 PM
- Duration: 5 minutes
- Satellite: NEWSAT-03
- **Provider Window ID:** `ghi789e4-3456-78ab-cdef-9012345678ab`
```

### What to Do With Results

1. **Review feasibility score (78% = GOOD)**
   - Proceed with order
   - 78% probability of successful capture

2. **Check weather forecast**
   - Jan 22 has best conditions (10% clouds)
   - Plan order around this date

3. **Select capture opportunity**
   - Best choice: Planet Opportunity 1 (Jan 22, lowest clouds)
   - Save providerWindowId: `abc123e4-5678-90ab-cdef-1234567890ab`

4. **Place tasking order**
   - Use saved providerWindowId
   - Set windowStart/windowEnd around Jan 22
   - Expect capture on Jan 22 around 10:15 AM

---

## Predicting Satellite Passes

Get detailed predictions of all satellite passes over an area.

### Scenario

Planning a tasking order and want to see all available satellite pass opportunities to choose the best one.

### Request

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-30T23:59:59Z",
  "productTypes": ["Day"],
  "resolutions": ["High", "VeryHigh"],
  "maxOffNadirAngle": 25
}
```

### Parameters Explained

| Parameter | Value | Why |
|-----------|-------|-----|
| windowStart/End | 10 days | Longer window shows more passes |
| productTypes | [Day] | Only optical daytime imagery |
| resolutions | [High, VeryHigh] | 1-5m resolution range |
| maxOffNadirAngle | 25° | Lower angles for better quality |

### Expected Response

```
# Satellite Pass Predictions

Found **12** satellite pass opportunities

## Recommended Passes

### 1. DOVE-2345 (PLANET)
- **Date/Time:** 1/22/2025 10:15:30 AM
- **Product:** Day | **Resolution:** VeryHigh
- **Price:** $42.50/km²
- **Off-Nadir Angle:** 8.2° (lower is better)
- **Coverage:** 5.0 - 100.0 km²
- **Location:** 30.2711°, -97.7400°
- **Solar Elevation:** 45.5°
- **Why Recommended:** Excellent image quality (near-nadir), Competitive pricing

### 2. NEWSAT-05 (SATELLOGIC)
- **Date/Time:** 1/24/2025 2:45:15 PM
- **Product:** Day | **Resolution:** High
- **Price:** $28.30/km²
- **Off-Nadir Angle:** 12.5°
- **Coverage:** 10.0 - 250.0 km²
- **Location:** 30.2700°, -97.7390°
- **Solar Elevation:** 52.3°
- **Why Recommended:** Good image quality, Competitive pricing

### 3. DOVE-8901 (PLANET)
- **Date/Time:** 1/26/2025 10:20:00 AM
- **Product:** Day | **Resolution:** VeryHigh
- **Price:** $44.00/km²
- **Off-Nadir Angle:** 15.1°
- **Coverage:** 5.0 - 100.0 km²
- **Location:** 30.2705°, -97.7405°
- **Solar Elevation:** 46.2°
- **Why Recommended:** Good image quality

## All Available Passes

### PLANET (7 passes)

**1. DOVE-2345**
- **Date/Time:** 1/22/2025 10:15:30 AM
- **Product:** Day | **Resolution:** VeryHigh
- **Price:** $42.50/km²
- **Off-Nadir Angle:** 8.2°
- **Coverage:** 5.0 - 100.0 km²
- **Location:** 30.2711°, -97.7400°
- **Solar Elevation:** 45.5°

[... additional passes ...]

### SATELLOGIC (5 passes)

**1. NEWSAT-05**
- **Date/Time:** 1/24/2025 2:45:15 PM
- **Product:** Day | **Resolution:** High
- **Price:** $28.30/km²
- **Off-Nadir Angle:** 12.5°
- **Coverage:** 10.0 - 250.0 km²
- **Location:** 30.2700°, -97.7390°
- **Solar Elevation:** 52.3°

[... additional passes ...]
```

### Using Pass Predictions

#### 1. Compare Quality
- **Off-nadir angle:** Lower is better (less distortion)
  - < 10°: Excellent
  - 10-20°: Good
  - 20-30°: Acceptable
  - > 30°: Poor (avoid if possible)

- **Solar elevation:** Higher is better (better lighting)
  - > 50°: Excellent
  - 40-50°: Good
  - 30-40°: Acceptable
  - < 30°: Shadows may be an issue

#### 2. Compare Pricing
- PLANET: $42.50/km² (VeryHigh res)
- SATELLOGIC: $28.30/km² (High res)
- Consider resolution vs. cost trade-off

#### 3. Choose Best Pass
**Best choice: DOVE-2345 (Jan 22)**
- Lowest off-nadir angle (8.2°) = best quality
- Good solar elevation (45.5°)
- Reasonable price for VeryHigh resolution
- Early in window (sooner delivery)

#### 4. Place Order
Use pass timing in tasking order:
```json
{
  "windowStart": "2025-01-22T00:00:00Z",
  "windowEnd": "2025-01-23T23:59:59Z",
  "productType": "DAY",
  "resolution": "VERY HIGH"
  // ... other parameters
}
```

---

## Interpreting Feasibility Scores

### Overall Feasibility Score

The overall score combines weather and satellite availability.

| Score | Level | Meaning | Action |
|-------|-------|---------|--------|
| **80-100%** | EXCELLENT | Very high success probability | Order confidently |
| **60-79%** | GOOD | Good success probability | Order with reasonable confidence |
| **40-59%** | MODERATE | Mixed conditions | Consider extending window or adjusting parameters |
| **0-39%** | LOW | Poor success probability | Don't order - extend window or change requirements |

### Example Interpretations

#### Score: 92% (EXCELLENT)
```
Overall Feasibility: 92% (EXCELLENT)
Weather Score: 88%
Provider Score: 95%
```

**Interpretation:**
- Weather is favorable (88%)
- Multiple capture opportunities (95%)
- Very high probability of success
- **Action:** Place order immediately

#### Score: 68% (GOOD)
```
Overall Feasibility: 68% (GOOD)
Weather Score: 62%
Provider Score: 74%
```

**Interpretation:**
- Some cloud cover expected (62%)
- Good satellite availability (74%)
- Reasonable success probability
- **Action:** Place order, but have backup plan

#### Score: 45% (MODERATE)
```
Overall Feasibility: 45% (MODERATE)
Weather Score: 38%
Provider Score: 52%
```

**Interpretation:**
- Poor weather forecast (38%)
- Limited satellite opportunities (52%)
- 50/50 chance of success
- **Action:** Extend window from 7 to 14 days

#### Score: 22% (LOW)
```
Overall Feasibility: 22% (LOW)
Weather Score: 15%
Provider Score: 30%
```

**Interpretation:**
- Very poor weather (15%)
- Few satellite opportunities (30%)
- Low success probability
- **Action:** Don't order - try different time or location

### Weather Score Breakdown

The weather score predicts cloud conditions during capture window.

**High Weather Score (> 70%):**
- Clear skies predicted
- Good for optical imaging
- High success probability

**Medium Weather Score (40-70%):**
- Some clouds expected
- May get clear capture
- Success depends on timing

**Low Weather Score (< 40%):**
- Heavy clouds predicted
- Low success for optical
- Consider SAR instead

### Provider Score Breakdown

The provider score indicates satellite availability.

**High Provider Score (> 80%):**
- Many capture opportunities
- Multiple satellites available
- Good coverage of AOI
- Flexible scheduling

**Medium Provider Score (50-80%):**
- Several opportunities
- Adequate coverage
- May require specific window

**Low Provider Score (< 50%):**
- Few opportunities
- Limited satellite availability
- Difficult to schedule
- Extend window

---

## Understanding Provider Window ID

The `providerWindowId` is critical for Planet tasking orders.

### What is Provider Window ID?

- Unique identifier for a specific satellite pass opportunity
- Provided by Planet in feasibility check results
- **Required** for all Planet tasking orders
- Links your order to specific satellite pass

### Example from Feasibility Check

```
**Opportunity 1:**
- Window: 1/22/2025 10:15:00 AM to 1/22/2025 10:20:00 AM
- Satellite: DOVE-1234
- **Provider Window ID:** `abc123e4-5678-90ab-cdef-1234567890ab`
```

### Using Provider Window ID

**In tasking order:**
```json
{
  "aoi": "POLYGON((...)",
  "windowStart": "2025-01-22T00:00:00Z",
  "windowEnd": "2025-01-23T23:59:59Z",
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "providerWindowId": "abc123e4-5678-90ab-cdef-1234567890ab",
  // ... delivery config ...
}
```

### Important Notes

1. **Required for Planet only**
   - Other providers (Umbra, Satellogic): Not required
   - Planet: Must include or order will fail

2. **Match window dates**
   - windowStart/windowEnd should encompass opportunity window
   - Example: If opportunity is Jan 22, use Jan 22-23 window

3. **One ID per order**
   - Each providerWindowId is for one specific pass
   - Don't reuse IDs across orders
   - Get new ID from new feasibility check

4. **Expiration**
   - IDs expire after opportunity passes
   - Check feasibility again if delayed

### What If You Forget?

**Without providerWindowId on Planet order:**
```
Error: Provider Window ID is required for Planet tasking orders.
Please run check_tasking_feasibility to get providerWindowId.
```

**Solution:**
1. Run check_tasking_feasibility again
2. Get providerWindowId from opportunities
3. Include in order

---

## Choosing Optimal Capture Time

### Factors to Consider

#### 1. Off-Nadir Angle
**Impact:** Image distortion and quality

```
0-10°:  Excellent - minimal distortion
10-20°: Good - acceptable for most uses
20-30°: Fair - noticeable distortion
30-40°: Poor - significant distortion
40+°:   Avoid - severe distortion
```

**Example:**
```
Pass A: 8° off-nadir  ← Choose this
Pass B: 25° off-nadir
```

#### 2. Solar Elevation
**Impact:** Lighting and shadows (optical imagery only)

```
> 60°:  Excellent - minimal shadows
45-60°: Good - acceptable shadows
30-45°: Fair - longer shadows
< 30°:  Poor - very long shadows
```

**Example:**
```
Pass A: 52° solar elevation ← Choose this
Pass B: 35° solar elevation
```

#### 3. Weather Forecast
**Impact:** Cloud coverage

Check feasibility weather details:
```
1/22: 10% clouds  ← Best
1/23: 30% clouds
1/24: 45% clouds
```

Choose date with lowest predicted clouds.

#### 4. Pricing
**Impact:** Cost

```
Pass A: $42/km² (VeryHigh, 8° angle)
Pass B: $28/km² (High, 15° angle)
```

Balance cost vs. quality needs.

#### 5. Timing
**Impact:** How soon you need imagery

```
Pass A: Jan 22 ← Sooner
Pass B: Jan 28
```

Earlier passes = faster delivery.

### Decision Matrix

| Pass | Off-Nadir | Solar Elev | Weather | Price | Date | Score |
|------|-----------|------------|---------|-------|------|-------|
| A | 8° ⭐ | 45° ⭐ | 10% ⭐ | $42 | Jan 22 ⭐ | ⭐⭐⭐⭐⭐ |
| B | 15° ✓ | 52° ⭐ | 30% ✓ | $28 ⭐ | Jan 24 | ⭐⭐⭐⭐ |
| C | 25° ✓ | 38° ✓ | 45% ✗ | $35 ✓ | Jan 26 | ⭐⭐ |

**Best choice: Pass A** - Highest quality despite higher price.

---

## Provider Filtering

Filter feasibility checks to specific satellite providers.

### Available Providers

- **PLANET** - High revisit rate, consistent quality, global coverage
- **UMBRA** - SAR imaging, 25cm resolution, weather-independent

### Example: Planet Only

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productType": "Day",
  "resolution": "VeryHigh",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "providers": ["PLANET"]
}
```

**Why filter to Planet:**
- Need consistent image quality
- Want daily revisit capability
- Have providerWindowId requirement

### Example: Umbra Only (SAR)

```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "productType": "SAR",
  "resolution": "High",
  "windowStart": "2025-02-01T00:00:00Z",
  "windowEnd": "2025-02-14T23:59:59Z",
  "providers": ["UMBRA"]
}
```

**Why filter to Umbra:**
- Need SAR (radar) imaging
- Weather-independent required
- High resolution SAR (25cm)

### Comparing Providers

**Don't filter - compare all:**
```json
{
  "aoi": "POLYGON((...)",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z"
  // No provider filter - see all options
}
```

**Results will show:**
- Planet opportunities with pricing
- Satellogic opportunities with pricing
- Umbra opportunities (if SAR)
- Other providers

**Compare:**
- Quality (resolution, angles)
- Pricing
- Availability
- Your preferences

---

## Multi-Location Feasibility

Check feasibility for multiple locations.

### Scenario

Monitoring multiple sites - need to check feasibility for all.

### Approach

Run separate feasibility checks for each location:

**Location 1: Austin, TX**
```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z"
}
```

**Result:** 78% feasibility (GOOD)

**Location 2: San Francisco, CA**
```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z"
}
```

**Result:** 65% feasibility (GOOD)

**Location 3: Seattle, WA**
```json
{
  "aoi": "POLYGON((-122.3321 47.6062, -122.3321 47.6262, -122.3121 47.6262, -122.3121 47.6062, -122.3321 47.6062))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z"
}
```

**Result:** 42% feasibility (MODERATE)

### Prioritization Strategy

Based on scores:

1. **Austin (78%)** - Order immediately
2. **San Francisco (65%)** - Order with confidence
3. **Seattle (42%)** - Extend window to 14 days, then recheck

### Batch Processing

**For many locations:**
1. Check feasibility for all
2. Sort by feasibility score
3. Order high-scoring locations first
4. Adjust parameters for low-scoring locations
5. Recheck and order

---

## Real-World Scenarios

### Scenario 1: Emergency Response

**Situation:** Hurricane made landfall, need post-storm imagery ASAP.

**Requirements:**
- New imagery (not archive)
- Any weather conditions acceptable (SAR preferred)
- Fastest possible delivery
- Cost not primary concern

**Feasibility Check:**
```json
{
  "aoi": "POLYGON((-90.0715 29.9511, -90.0715 30.0511, -89.9715 30.0511, -89.9715 29.9511, -90.0715 29.9511))",
  "productType": "SAR",
  "resolution": "Medium",
  "windowStart": "2024-08-30T00:00:00Z",
  "windowEnd": "2024-09-02T23:59:59Z",
  "providers": ["UMBRA"]
}
```

**Why these parameters:**
- SAR: Works through clouds and rain
- Medium resolution: Faster processing
- Short window: ASAP delivery
- Umbra: Best SAR provider

**Expected Result:**
```
Feasibility: 85% (EXCELLENT)
Weather: N/A (SAR is weather-independent)
Opportunities: 3 passes in 3-day window
```

**Action:**
- Order immediately using first opportunity
- Set as priority order (higher cost, faster scheduling)
- Configure webhook for instant notification

---

### Scenario 2: Agricultural Monitoring

**Situation:** Monthly crop monitoring during growing season.

**Requirements:**
- Multispectral for NDVI
- Clear conditions (<15% clouds)
- Mid-month timing
- Budget-conscious

**Feasibility Check:**
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productType": "Day",
  "resolution": "Medium",
  "windowStart": "2024-06-10T00:00:00Z",
  "windowEnd": "2024-06-20T23:59:59Z",
  "maxCloudCoverage": 15,
  "providers": ["PLANET"]
}
```

**Result Analysis:**
```
Feasibility: 68% (GOOD)
Weather: 62% (some clouds expected)
Best capture days: June 12 (10% clouds), June 17 (12% clouds)
```

**Decision:**
- 68% is acceptable for non-critical monitoring
- June 12 is best option
- Place order with June 12 providerWindowId
- If fails due to clouds, use July archive instead

---

### Scenario 3: Construction Progress

**Situation:** Monthly construction site monitoring, high detail required.

**Requirements:**
- Very high resolution (building details)
- Low off-nadir angle (<15°)
- Clear skies essential
- Consistent monthly timing

**Feasibility Check:**
```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productType": "Day",
  "resolution": "VeryHigh",
  "windowStart": "2024-03-15T00:00:00Z",
  "windowEnd": "2024-03-25T23:59:59Z",
  "maxCloudCoverage": 5,
  "maxOffNadirAngle": 15
}
```

**Result Analysis:**
```
Feasibility: 45% (MODERATE)
Weather: 42% (clouds likely)
Low angle passes: Only 2 in window
```

**Decision:**
- 45% is risky for critical monitoring
- Extend window: March 10-30 (20 days)
- Recheck feasibility with longer window

**Rechecked with 20-day window:**
```
Feasibility: 72% (GOOD)
Weather: 68% (better conditions toward end of month)
Low angle passes: 5 opportunities
```

**Action:**
- Now acceptable (72%)
- Choose best opportunity (lowest angle, clearest weather)
- Place order

---

### Scenario 4: Maritime Monitoring

**Situation:** Ship tracking in port, need nighttime SAR imaging.

**Requirements:**
- SAR (works at night, through clouds)
- Specific time window when ships expected
- High resolution for vessel identification

**Feasibility Check:**
```json
{
  "aoi": "POLYGON((-122.3749 37.7749, -122.3749 37.8049, -122.3449 37.8049, -122.3449 37.7749, -122.3749 37.7749))",
  "productType": "SAR",
  "resolution": "High",
  "windowStart": "2024-12-01T00:00:00Z",
  "windowEnd": "2024-12-03T23:59:59Z",
  "providers": ["UMBRA"]
}
```

**Why SAR:**
- Works 24/7 (day or night)
- Weather-independent
- Detects metal vessels clearly

**Result:**
```
Feasibility: 88% (EXCELLENT)
Weather: N/A (SAR)
Opportunities: 2 passes (Dec 1 night, Dec 3 morning)
```

**Action:**
- Select Dec 1 nighttime pass
- Order with confidence (88% feasibility)
- SAR eliminates weather risk

---

## Common Patterns and Tips

### Pattern 1: Low Feasibility - Extend Window

**Problem:**
```
Feasibility: 35% (LOW)
Window: 7 days
```

**Solution:**
Extend to 14 days:
```json
{
  // Previous window: 7 days
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-02-03T23:59:59Z"  // Now 14 days
}
```

**New result:**
```
Feasibility: 68% (GOOD)
```

### Pattern 2: Weather Issues - Consider SAR

**Problem:**
```
Feasibility: 42% (MODERATE)
Weather Score: 25% (heavy clouds expected)
Product: Day (optical)
```

**Solution:**
Switch to SAR:
```json
{
  "productType": "SAR"  // Changed from Day
}
```

**New result:**
```
Feasibility: 82% (EXCELLENT)
Weather: N/A (SAR is weather-independent)
```

### Pattern 3: Too Strict - Relax Parameters

**Problem:**
```
Feasibility: 38% (LOW)
maxCloudCoverage: 5%
maxOffNadirAngle: 10°
```

**Solution:**
Relax constraints:
```json
{
  "maxCloudCoverage": 20,     // Was 5%
  "maxOffNadirAngle": 25      // Was 10°
}
```

**New result:**
```
Feasibility: 71% (GOOD)
```

### Pattern 4: Cost vs. Quality

**High quality, high cost:**
```json
{
  "resolution": "VeryHigh",      // $45/km²
  "maxOffNadirAngle": 10
}
```

**Balanced:**
```json
{
  "resolution": "High",          // $28/km²
  "maxOffNadirAngle": 20
}
```

**Budget:**
```json
{
  "resolution": "Medium",        // $12/km²
  "maxOffNadirAngle": 30
}
```

Choose based on needs and budget.

---

## Feasibility Checklist

### Before Running Check

- [ ] Define AOI (WKT POLYGON)
- [ ] Choose product type (Day, Night, SAR)
- [ ] Select resolution
- [ ] Determine acceptable window (7-14 days recommended)
- [ ] Set cloud tolerance
- [ ] Set angle tolerance

### After Receiving Results

- [ ] Review overall feasibility score
- [ ] Check weather forecast
- [ ] Identify best capture days
- [ ] Review capture opportunities
- [ ] Save providerWindowId (if Planet)
- [ ] Compare provider options
- [ ] Check pricing estimates

### Decision Making

- [ ] Score ≥ 80%: Order immediately
- [ ] Score 60-79%: Order with reasonable confidence
- [ ] Score 40-59%: Extend window and recheck
- [ ] Score < 40%: Adjust parameters significantly

### Before Ordering

- [ ] Have providerWindowId (Planet only)
- [ ] Understand weather risk
- [ ] Know expected capture date
- [ ] Confirm pricing
- [ ] Prepare delivery configuration
- [ ] Set up webhook for updates

---

## Quick Reference

### Good Feasibility Parameters

**Urban monitoring:**
```json
{
  "productType": "Day",
  "resolution": "VeryHigh",
  "maxCloudCoverage": 20,
  "maxOffNadirAngle": 20,
  "window": "7-14 days"
}
```

**Agriculture:**
```json
{
  "productType": "Day",
  "resolution": "Medium",
  "maxCloudCoverage": 15,
  "maxOffNadirAngle": 25,
  "window": "10-14 days"
}
```

**Emergency response:**
```json
{
  "productType": "SAR",
  "resolution": "Medium",
  "window": "2-5 days",
  "providers": ["UMBRA"]
}
```

**Construction monitoring:**
```json
{
  "productType": "Day",
  "resolution": "VeryHigh",
  "maxCloudCoverage": 10,
  "maxOffNadirAngle": 15,
  "window": "14-21 days"
}
```

---

**Related Documentation:**
- [MCP Tools Reference](../mcp-tools-reference.md) - Complete tool documentation
- [Search Archives Examples](search-archives.md) - Finding existing imagery
- [Order Imagery Examples](order-imagery.md) - Placing orders
- [Monitoring Examples](monitoring.md) - Automated imagery alerts
