#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Canvas dimensions (1080x1920 for Android)
width, height = 1080, 1920

# Create image with cream background
img = Image.new('RGB', (width, height), '#FAF7F0')
draw = ImageDraw.Draw(img)

# Colors
cream = '#FAF7F0'
green = '#2D7555'
white = '#FFFFFF'
black = '#1A1A1A'
gray = '#666666'

# Draw green app icon background (large rounded square)
icon_size = 280
icon_x = (width - icon_size) // 2
icon_y = height // 2 - 400

# Green outer background
draw.rounded_rectangle(
    [(icon_x, icon_y), (icon_x + icon_size, icon_y + icon_size)],
    fill=green,
    radius=40
)

# White inner background
draw.rounded_rectangle(
    [(icon_x + 20, icon_y + 20), (icon_x + icon_size - 20, icon_y + icon_size - 20)],
    fill=white,
    radius=30
)

# Green inner icon representation
draw.rectangle(
    [(icon_x + 80, icon_y + 80), (icon_x + icon_size - 80, icon_y + icon_size - 80)],
    fill=green
)

# Try to use a nice font, fallback to default
try:
    title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
    subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    footer_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    footer_font = ImageFont.load_default()

# Title text
draw.text((width // 2, height // 2 + 150), "Digital Proximity", fill=black, font=title_font, anchor="mm")
draw.text((width // 2, height // 2 + 230), "Attendance", fill=black, font=title_font, anchor="mm")

# Subtitle
draw.text((width // 2, height // 2 + 320), "v2.0.0", fill=gray, font=subtitle_font, anchor="mm")

# Footer branding
draw.text((width // 2, height - 150), "raybuilds", fill=green, font=footer_font, anchor="mm")

# Save
output_path = os.path.join(os.path.dirname(__file__), 'assets', 'splash.png')
img.save(output_path, 'PNG')
print(f'✓ Splash screen generated successfully: {output_path}')
