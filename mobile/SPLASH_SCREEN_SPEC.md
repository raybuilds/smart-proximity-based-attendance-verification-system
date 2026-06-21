# Splash Screen Regeneration Specification

## Current Issue
The existing splash.png is TOO SMALL with excessive empty space. Current content occupies ~35% of screen height.

## Requirements for New Splash Asset
- **Canvas Size**: 1080 x 1920 pixels (Android standard splash dimensions)
- **Background Color**: #FAF7F0 (cream)
- **Content Should Occupy**: 65-75% of visual screen height

## Layout Structure

### 1. App Icon (Top-Center)
- **Size**: 280x280 pixels (was ~50px, now 5.6x larger)
- **Position**: Centered horizontally, at Y=400
- **Style**: 
  - Outer: Green rounded square (#2D7555) with 40px radius
  - Inner white background: 20px padding, 30px radius
  - Inner green icon: 80px margin from edges
- **Purpose**: Visual brand recognition

### 2. Main Title (Center)
- **Text**: "Digital Proximity" (line 1) + "Attendance" (line 2)
- **Font**: Bold, 56px, dark color (#1A1A1A)
- **Position**: Centered, Y=750 and Y=830
- **Line Height**: 80px

### 3. Subtitle (Below Title)
- **Text**: "v2.0.0"
- **Font**: Regular, 32px, gray (#666666)
- **Position**: Centered, Y=920

### 4. Footer Branding (Bottom)
- **Text**: "raybuilds"
- **Font**: Bold, 28px, green (#2D7555)
- **Position**: Centered, Y=1770 (150px from bottom)

## Generation Method

### Option A: Using Online Tools
- Visit: https://www.figma.com or https://www.canva.com
- Create 1080x1920 design with above specs
- Export as PNG
- Save to `mobile/assets/splash.png`

### Option B: Using ImageMagick (CLI)
```bash
convert -size 1080x1920 xc:'#FAF7F0' \
  -gravity Center -pointsize 56 -font Arial-Bold -fill '#1A1A1A' \
  -annotate +0-100 'Digital Proximity' \
  -annotate +0+50 'Attendance' \
  -pointsize 32 -font Arial -fill '#666666' \
  -annotate +0+150 'v2.0.0' \
  -pointsize 28 -font Arial-Bold -fill '#2D7555' \
  -gravity South -annotate +0+150 'raybuilds' \
  assets/splash.png
```

### Option C: Using Python PIL
```python
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (1080, 1920), '#FAF7F0')
draw = ImageDraw.Draw(img)
# ... draw icon, text elements ...
img.save('assets/splash.png')
```

### Option D: Using expo-splash-screen Generator
```bash
npx @react-native-async-storage/async-storage init
npx expo-splash-screen-assets-generator
```

## Validation Checklist
- [ ] Image dimensions: 1080x1920
- [ ] Background: #FAF7F0 (cream)
- [ ] Icon: 280x280 green rounded square
- [ ] Title readable (56px bold)
- [ ] Footer readable (28px bold)
- [ ] Content occupies 65-75% of height
- [ ] File saved: `mobile/assets/splash.png`

## app.json Configuration (Already Correct)
```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#FAF7F0"
}
```

## Testing After Regeneration
1. Run: `npx expo prebuild --clean`
2. Run: `eas build --platform android --profile preview --clear-cache`
3. Test on physical Android device
4. Verify: Content fills 65-75% of screen with minimal margins
