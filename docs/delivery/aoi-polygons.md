# AOI Polygon Generation Guide

## Overview

An **Area of Interest (AOI)** defines the geographic region for satellite imagery capture. When placing a SkyFi order, you specify your AOI as a polygon in Well-Known Text (WKT) format. This guide explains how to create, validate, and use AOI polygons effectively.

## What is an AOI?

An Area of Interest (AOI) is a polygon that defines the geographic boundary of the area you want captured in satellite imagery. Think of it as drawing a shape on a map to indicate exactly where you want photos taken from space.

**Key characteristics:**
- Defined as a series of coordinate points
- Forms a closed polygon shape
- Specified in longitude/latitude coordinates
- Expressed in WKT (Well-Known Text) format

## WKT (Well-Known Text) Format

WKT is a text-based format for representing vector geometry. For AOI polygons, you'll use the `POLYGON` type.

### Basic Structure

```
POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))
```

### Key Points

1. **Coordinate Order:** Longitude first, then latitude (lon, lat)
   - ⚠️ This is opposite of how coordinates are often written!
   - Example: `-122.4194 37.7749` (San Francisco)

2. **Closing the Polygon:** First and last coordinate must be identical
   - Creates a closed shape
   - Example: If you start at point A, you must end at point A

3. **Double Parentheses:** Required for WKT polygon syntax
   - Outer parentheses: Define the geometry type
   - Inner parentheses: Define the coordinate ring

4. **Comma Separation:** Coordinates separated by commas
   - Space separates lon and lat within a point
   - Comma separates different points

### Example: Simple Rectangle

```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

**Breakdown:**
- Point 1: (-122.5, 37.7) - Southwest corner
- Point 2: (-122.3, 37.7) - Southeast corner
- Point 3: (-122.3, 37.9) - Northeast corner
- Point 4: (-122.5, 37.9) - Northwest corner
- Point 5: (-122.5, 37.7) - Closes the polygon (same as Point 1)

## AOI Requirements and Constraints

### SkyFi Platform Limits

When creating AOIs for SkyFi orders, adhere to these constraints:

| Constraint | Limit | Notes |
|------------|-------|-------|
| **Maximum Vertices** | 500 | Keeps polygon complexity manageable |
| **Maximum Area** | 500,000 km² | Approximately the size of Spain |
| **Minimum Area** | ~0.01 km² | About 100m x 100m |
| **Vertex Order** | Counterclockwise | For exterior ring |
| **Self-Intersection** | Not allowed | Polygon cannot cross itself |
| **Coordinate Range** | Longitude: -180 to 180<br>Latitude: -90 to 90 | Standard geographic bounds |

### Validation Rules

A valid AOI polygon must:

1. ✅ Form a closed ring (first point = last point)
2. ✅ Have at least 4 points (including closing point)
3. ✅ Not self-intersect or have overlapping edges
4. ✅ Have vertices in counterclockwise order
5. ✅ Stay within 500 vertices
6. ✅ Not exceed 500,000 km² in area
7. ✅ Use valid longitude/latitude coordinates

## Methods to Create AOI Polygons

### Method 1: Interactive Drawing Tools

#### Option A: geojson.io (Recommended for Beginners)

**geojson.io** is a free, web-based tool for drawing shapes on a map.

**Steps:**
1. Navigate to [geojson.io](https://geojson.io)
2. Use the polygon tool (pentagon icon) to draw your AOI
3. Click on the map to add vertices
4. Double-click to complete the polygon
5. Copy the GeoJSON from the right panel
6. Convert to WKT using a converter (see below)

**GeoJSON to WKT Conversion:**

You can use online converters or Python:

```python
from shapely.geometry import shape
import json

# Your GeoJSON from geojson.io
geojson = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7]
        ]]
    }
}

# Convert to WKT
polygon = shape(geojson['geometry'])
wkt = polygon.wkt
print(wkt)
# Output: POLYGON ((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

#### Option B: Google Earth

**Google Earth** allows drawing polygons and exporting to KML.

**Steps:**
1. Open Google Earth (web or desktop)
2. Click the **"Add Polygon"** button
3. Draw your AOI by clicking points on the map
4. Name your polygon
5. Save as KML file
6. Convert KML to WKT using online tools or Python

**KML to WKT (Python):**
```python
from fastkml import kml
from shapely.geometry import Polygon

# Read KML file
with open('aoi.kml', 'r') as f:
    kml_data = f.read()

# Parse KML
k = kml.KML()
k.from_string(kml_data.encode())

# Extract coordinates and convert to WKT
for document in k.features():
    for placemark in document.features():
        geometry = placemark.geometry
        print(geometry.wkt)
```

#### Option C: QGIS (For GIS Professionals)

**QGIS** is free, open-source GIS software with powerful geometry tools.

**Steps:**
1. Install [QGIS](https://qgis.org/)
2. Add a basemap (OpenStreetMap or similar)
3. Create a new Shapefile layer
4. Use the digitizing tools to draw polygon
5. Right-click layer → Export → Save Features As
6. Choose "CSV" format
7. Select "WKT" as geometry type
8. Copy WKT from exported file

### Method 2: Google Colab Notebooks (Recommended for Developers)

SkyFi provides example Google Colab notebooks for interactive AOI creation.

#### Notebook 1: Interactive Map Drawing

**Features:**
- Interactive map widget
- Draw polygons directly in notebook
- Automatic WKT generation
- Vertex and area validation
- Visual feedback

**Example Colab Notebook URL:**
```
https://colab.research.google.com/drive/skyfi-aoi-drawing-example
```

**Sample Notebook Code:**
```python
import ipyleaflet
from shapely.geometry import Polygon
from ipywidgets import Output

# Create interactive map
map_widget = ipyleaflet.Map(
    center=(37.7749, -122.4194),
    zoom=10,
    layout={'height': '600px'}
)

# Add drawing control
draw_control = ipyleaflet.DrawControl(
    polygon={'shapeOptions': {'color': '#0000FF'}},
    rectangle={'shapeOptions': {'color': '#FF0000'}},
    polyline={},
    circle={},
    marker={},
    circlemarker={}
)

# Output widget for WKT
output = Output()

def handle_draw(target, action, geo_json):
    with output:
        output.clear_output()
        coords = geo_json['geometry']['coordinates'][0]
        polygon = Polygon(coords)

        # Display WKT
        print("WKT:")
        print(polygon.wkt)

        # Validate
        print(f"\nVertices: {len(coords)}")
        print(f"Area: {polygon.area:.6f} square degrees")
        print(f"Valid: {polygon.is_valid}")

draw_control.on_draw(handle_draw)
map_widget.add_control(draw_control)

# Display
display(map_widget)
display(output)
```

#### Notebook 2: Coordinate List to Polygon

**Use case:** You have a list of coordinates and want to create a polygon.

**Example:**
```python
from shapely.geometry import Polygon

# Your coordinate pairs (longitude, latitude)
coordinates = [
    (-122.419, 37.775),  # San Francisco area
    (-122.419, 37.805),
    (-122.364, 37.805),
    (-122.364, 37.775),
    (-122.419, 37.775)   # Close the polygon
]

# Create polygon
polygon = Polygon(coordinates)

# Generate WKT
wkt = polygon.wkt
print(wkt)

# Validate
print(f"\nValid: {polygon.is_valid}")
print(f"Area (sq degrees): {polygon.area:.6f}")
print(f"Vertex count: {len(coordinates)}")

# Calculate approximate area in km²
from functools import partial
import pyproj
from shapely.ops import transform

# Create projection
project = partial(
    pyproj.transform,
    pyproj.Proj(init='epsg:4326'),  # WGS84
    pyproj.Proj(init='epsg:3857')   # Web Mercator
)

# Transform and calculate area
polygon_projected = transform(project, polygon)
area_km2 = polygon_projected.area / 1_000_000
print(f"Area (km²): {area_km2:.2f}")
```

### Method 3: Programmatic Generation

#### Python with Shapely

**Installation:**
```bash
pip install shapely
```

**Example 1: Create Rectangle from Bounding Box**
```python
from shapely.geometry import box

# Define bounding box (minx, miny, maxx, maxy)
# San Francisco area
bbox = (-122.52, 37.70, -122.35, 37.82)

# Create polygon
polygon = box(*bbox)

# Get WKT
wkt = polygon.wkt
print(wkt)
```

**Example 2: Create Circle (approximated)**
```python
from shapely.geometry import Point

# Center point (lon, lat)
center = Point(-122.4194, 37.7749)

# Radius in degrees (approximately)
# 1 degree ≈ 111 km at equator
# For more precise: use projection
radius_deg = 0.05  # About 5.5 km

# Create buffer (circle approximation)
circle = center.buffer(radius_deg)

# Get WKT
wkt = circle.wkt
print(wkt)
```

**Example 3: Load from CSV**
```python
import csv
from shapely.geometry import Polygon

# Read coordinates from CSV
coordinates = []
with open('coordinates.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        lon = float(row['longitude'])
        lat = float(row['latitude'])
        coordinates.append((lon, lat))

# Ensure polygon is closed
if coordinates[0] != coordinates[-1]:
    coordinates.append(coordinates[0])

# Create polygon
polygon = Polygon(coordinates)

# Get WKT
wkt = polygon.wkt
print(wkt)
```

#### JavaScript

**Using Turf.js:**
```javascript
const turf = require('@turf/turf');

// Define coordinates
const coordinates = [
  [-122.5, 37.7],
  [-122.3, 37.7],
  [-122.3, 37.9],
  [-122.5, 37.9],
  [-122.5, 37.7]
];

// Create polygon
const polygon = turf.polygon([coordinates]);

// Convert to WKT (manual)
const wkt = `POLYGON((${coordinates.map(c => c.join(' ')).join(', ')}))`;
console.log(wkt);

// Calculate area
const area = turf.area(polygon);
console.log(`Area: ${area} square meters`);
console.log(`Area: ${area / 1_000_000} square kilometers`);
```

#### Bounding Box to Polygon Conversion

**Quick conversion from bbox coordinates:**

```python
def bbox_to_wkt(min_lon, min_lat, max_lon, max_lat):
    """
    Convert bounding box to WKT polygon.

    Args:
        min_lon: Minimum longitude (west)
        min_lat: Minimum latitude (south)
        max_lon: Maximum longitude (east)
        max_lat: Maximum latitude (north)

    Returns:
        WKT string
    """
    return f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"

# Example: San Francisco bounding box
wkt = bbox_to_wkt(-122.52, 37.70, -122.35, 37.82)
print(wkt)
```

## Validation and Testing

### Validation Checklist

Before submitting your AOI, verify:

- [ ] Polygon is closed (first point = last point)
- [ ] Coordinate order is (longitude, latitude)
- [ ] Vertices are in counterclockwise order
- [ ] No self-intersections
- [ ] Vertex count ≤ 500
- [ ] Area ≤ 500,000 km²
- [ ] All coordinates within valid ranges

### Python Validation Script

```python
from shapely.geometry import Polygon
from shapely.validation import explain_validity
import pyproj
from shapely.ops import transform
from functools import partial

def validate_aoi(wkt_string):
    """
    Validate AOI polygon for SkyFi requirements.

    Args:
        wkt_string: WKT polygon string

    Returns:
        dict with validation results
    """
    try:
        # Parse WKT
        polygon = Polygon.from_wkt(wkt_string)
    except Exception as e:
        return {'valid': False, 'error': f'Invalid WKT: {e}'}

    results = {
        'valid': True,
        'checks': {}
    }

    # Check 1: Is polygon valid?
    if not polygon.is_valid:
        results['valid'] = False
        results['checks']['geometry'] = {
            'pass': False,
            'reason': explain_validity(polygon)
        }
    else:
        results['checks']['geometry'] = {'pass': True}

    # Check 2: Vertex count
    vertex_count = len(polygon.exterior.coords)
    if vertex_count > 500:
        results['valid'] = False
        results['checks']['vertex_count'] = {
            'pass': False,
            'count': vertex_count,
            'limit': 500
        }
    else:
        results['checks']['vertex_count'] = {
            'pass': True,
            'count': vertex_count
        }

    # Check 3: Calculate area
    # Project to calculate accurate area
    project = partial(
        pyproj.transform,
        pyproj.Proj(init='epsg:4326'),
        pyproj.Proj(init='epsg:3857')
    )
    polygon_projected = transform(project, polygon)
    area_km2 = polygon_projected.area / 1_000_000

    if area_km2 > 500_000:
        results['valid'] = False
        results['checks']['area'] = {
            'pass': False,
            'area_km2': area_km2,
            'limit_km2': 500_000
        }
    else:
        results['checks']['area'] = {
            'pass': True,
            'area_km2': area_km2
        }

    # Check 4: Coordinate ranges
    coords = list(polygon.exterior.coords)
    invalid_coords = []
    for lon, lat in coords:
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            invalid_coords.append((lon, lat))

    if invalid_coords:
        results['valid'] = False
        results['checks']['coordinates'] = {
            'pass': False,
            'invalid': invalid_coords
        }
    else:
        results['checks']['coordinates'] = {'pass': True}

    # Check 5: Counterclockwise order
    if not polygon.exterior.is_ccw:
        results['checks']['orientation'] = {
            'pass': False,
            'note': 'Vertices should be counterclockwise'
        }
        # This is often auto-corrected, so might not fail validation
    else:
        results['checks']['orientation'] = {'pass': True}

    return results

# Example usage
wkt = "POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))"
results = validate_aoi(wkt)

print(f"Valid: {results['valid']}")
for check, result in results['checks'].items():
    print(f"\n{check}:")
    print(f"  Pass: {result['pass']}")
    if not result['pass']:
        print(f"  Details: {result}")
    elif check == 'vertex_count':
        print(f"  Count: {result['count']}")
    elif check == 'area':
        print(f"  Area: {result['area_km2']:.2f} km²")
```

## Common Mistakes and How to Avoid Them

### Mistake 1: Latitude/Longitude Order

❌ **Wrong:**
```
POLYGON((37.7 -122.5, 37.7 -122.3, 37.9 -122.3, 37.9 -122.5, 37.7 -122.5))
```

✅ **Correct:**
```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

**Remember:** WKT uses (longitude, latitude), not (latitude, longitude)!

### Mistake 2: Open Polygon

❌ **Wrong:**
```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9))
```

✅ **Correct:**
```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

**Fix:** Last coordinate must match the first coordinate.

### Mistake 3: Self-Intersecting Polygon

❌ **Wrong:**
```
POLYGON((-122.5 37.7, -122.3 37.9, -122.5 37.9, -122.3 37.7, -122.5 37.7))
```
This creates a "bow-tie" shape that intersects itself.

✅ **Correct:**
```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

**Fix:** Ensure edges don't cross each other.

### Mistake 4: Too Many Vertices

❌ **Wrong:** Creating overly complex polygons with 600+ vertices

✅ **Correct:** Simplify polygon to ≤500 vertices

**Fix:** Use Douglas-Peucker algorithm to simplify:

```python
from shapely.geometry import Polygon

# Complex polygon with many vertices
complex_polygon = Polygon([...])  # 1000 vertices

# Simplify (tolerance in degrees, adjust as needed)
simplified = complex_polygon.simplify(tolerance=0.001, preserve_topology=True)

print(f"Original vertices: {len(complex_polygon.exterior.coords)}")
print(f"Simplified vertices: {len(simplified.exterior.coords)}")
```

### Mistake 5: Incorrect WKT Syntax

❌ **Wrong:**
```
POLYGON[-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7]
```

✅ **Correct:**
```
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.9, -122.5 37.9, -122.5 37.7))
```

**Fix:** Use double parentheses `(( ))`, not brackets or single parentheses.

## Example AOIs for Testing

### Small Area: Downtown San Francisco

**Description:** Approximately 3 km × 3 km area
**Area:** ~9 km²
**Use case:** Urban area, single building, small park

```
POLYGON((-122.419 37.775, -122.419 37.805, -122.364 37.805, -122.364 37.775, -122.419 37.775))
```

### Medium Area: San Francisco Bay Area

**Description:** Approximately 50 km × 50 km area
**Area:** ~2,500 km²
**Use case:** City-wide imagery, regional analysis

```
POLYGON((-122.6 37.3, -122.6 38.0, -121.8 38.0, -121.8 37.3, -122.6 37.3))
```

### Large Area: Northern California

**Description:** Approximately 300 km × 300 km area
**Area:** ~90,000 km²
**Use case:** State-level imagery, large region

```
POLYGON((-123.5 36.0, -123.5 39.5, -119.5 39.5, -119.5 36.0, -123.5 36.0))
```

### Circular Area: Approximate Circle Around NYC

**Description:** Circular area (approximated with polygon)
**Radius:** ~25 km
**Use case:** Area around a specific point

```python
from shapely.geometry import Point

center = Point(-74.0060, 40.7128)  # NYC coordinates
circle = center.buffer(0.23)  # ~25km radius
wkt = circle.wkt
print(wkt)
```

### Complex Coastline: San Francisco Peninsula

**Description:** Following natural geographic features
**Use case:** Irregular boundary following coastline

```
POLYGON((-122.52 37.71, -122.38 37.71, -122.36 37.78, -122.39 37.81, -122.48 37.82, -122.52 37.80, -122.52 37.71))
```

## Tools and Resources

### Online Tools

1. **geojson.io** - https://geojson.io
   - Interactive map drawing
   - GeoJSON output (convert to WKT)
   - Free, no account required

2. **WKT Playground** - https://wktmap.com
   - Visualize WKT polygons
   - Edit WKT directly
   - Instant map preview

3. **Wicket** - https://arthur-e.github.io/Wicket/
   - WKT/GeoJSON converter
   - Map visualization
   - Drawing tools

4. **MyGeodata Converter** - https://mygeodata.cloud/converter/
   - Convert between formats
   - KML, GeoJSON, WKT, Shapefile
   - Batch processing

### Python Libraries

```bash
# Geometry operations
pip install shapely

# Coordinate transformations
pip install pyproj

# Jupyter notebook interactive maps
pip install ipyleaflet folium

# GeoJSON support
pip install geojson

# Reading various formats
pip install fiona geopandas
```

### Desktop Software

1. **QGIS** - https://qgis.org
   - Free, open-source GIS
   - Advanced editing capabilities
   - Format conversion

2. **Google Earth Pro** - https://earth.google.com/web/
   - Free desktop version
   - KML export
   - 3D visualization

### API Services

1. **SkyFi API Documentation**
   - Endpoint: `/api/v1/validate-aoi`
   - Validate AOI before order placement
   - Returns detailed validation errors

2. **Polygon Simplification Services**
   - Mapshaper - https://mapshaper.org/
   - Simplify complex polygons
   - Reduce vertex count

## Best Practices

### 1. Start Simple

- Begin with simple rectangular or circular AOIs
- Test with small areas first
- Gradually increase complexity

### 2. Validate Early and Often

- Validate polygon before submitting order
- Use automated validation scripts
- Check vertex count and area

### 3. Consider Satellite Coverage

- Satellites capture in rectangular scenes
- Your polygon may be contained in larger scene
- Billing based on actual capture area

### 4. Buffer Important Features

- Add buffer around critical areas
- Account for positioning uncertainty
- Ensure complete coverage of target

### 5. Document Your AOIs

- Save WKT strings in version control
- Include metadata (creation date, purpose)
- Track changes over time

### 6. Use Coordinate Precision Appropriately

- 6 decimal places ≈ 0.1 meter precision
- 4 decimal places ≈ 11 meters precision
- Don't use excessive precision (no need for 10+ decimals)

## Troubleshooting

### "Invalid WKT Format" Error

**Check:**
- Double parentheses: `POLYGON((...))`
- Comma-separated coordinates
- Space between lon and lat
- Closing parenthesis

### "Polygon Not Closed" Error

**Fix:** Ensure first and last coordinates are identical

```python
from shapely.geometry import Polygon

coords = [(-122.5, 37.7), (-122.3, 37.7), (-122.3, 37.9), (-122.5, 37.9)]

# Add closing coordinate
coords.append(coords[0])

polygon = Polygon(coords)
```

### "Too Many Vertices" Error

**Fix:** Simplify polygon

```python
from shapely.geometry import Polygon

# Simplify to reduce vertices
simplified = polygon.simplify(tolerance=0.01, preserve_topology=True)
```

### "Self-Intersection Detected" Error

**Fix:** Use `buffer(0)` trick to fix topology

```python
from shapely.geometry import Polygon

# Fix self-intersecting polygon
fixed_polygon = polygon.buffer(0)
```

### "Area Exceeds Maximum" Error

**Fix:** Split into multiple smaller AOIs or reduce polygon size

```python
# Calculate area first
from shapely.geometry import Polygon
from pyproj import Transformer
from shapely.ops import transform

polygon = Polygon([...])

# Transform to projected CRS for accurate area
transformer = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
polygon_proj = transform(transformer.transform, polygon)

area_km2 = polygon_proj.area / 1_000_000
print(f"Area: {area_km2:.2f} km²")

if area_km2 > 500_000:
    print("Area too large! Consider splitting into multiple orders.")
```

## Support and Additional Help

For questions or issues with AOI creation:

1. Review this guide thoroughly
2. Test with provided example polygons
3. Use validation scripts to identify specific issues
4. Consult SkyFi API documentation
5. Contact SkyFi support with:
   - Your WKT string
   - Validation error messages
   - Intended capture area description

---

**Related Guides:**
- [Configure AWS S3 Delivery ←](./s3-setup.md)
- [Configure Google Cloud Storage ←](./gcs-setup.md)
- [Configure Azure Blob Storage ←](./azure-setup.md)
