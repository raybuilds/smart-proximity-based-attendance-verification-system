import os
from PIL import Image, ImageDraw, ImageFont

# Target dimensions
WIDTH = 1080
HEIGHT = 1920

# Create cream background image
img = Image.new("RGB", (WIDTH, HEIGHT), "#FAF7F0")
draw = ImageDraw.Draw(img)

# Paths for fonts on Windows
FONT_BOLD_PATH = "C:\\Windows\\Fonts\\arialbd.ttf"
FONT_REGULAR_PATH = "C:\\Windows\\Fonts\\arial.ttf"

# Check if fonts exist, otherwise use default
if os.path.exists(FONT_BOLD_PATH):
    font_title = ImageFont.truetype(FONT_BOLD_PATH, 60)
    font_footer = ImageFont.truetype(FONT_BOLD_PATH, 28)
else:
    font_title = ImageFont.load_default()
    font_footer = ImageFont.load_default()

if os.path.exists(FONT_REGULAR_PATH):
    font_subtitle = ImageFont.truetype(FONT_REGULAR_PATH, 32)
else:
    font_subtitle = ImageFont.load_default()

# Draw Logo: 320x320 square
logo_size = 320
logo_x = (WIDTH - logo_size) // 2
logo_y = 350 # Top safe margin area

# Outer green box
draw.rounded_rectangle(
    [logo_x, logo_y, logo_x + logo_size, logo_y + logo_size],
    radius=45,
    fill="#2D7555"
)

# Inner white box
inner_padding = 25
logo_inner_size = logo_size - (inner_padding * 2)
inner_x = logo_x + inner_padding
inner_y = logo_y + inner_padding
draw.rounded_rectangle(
    [inner_x, inner_y, inner_x + logo_inner_size, inner_y + logo_inner_size],
    radius=35,
    fill="#FFFFFF"
)

# Draw central green symbol
symbol_size = 140
sym_x = logo_x + (logo_size - symbol_size) // 2
sym_y = logo_y + (logo_size - symbol_size) // 2
draw.rectangle(
    [sym_x, sym_y, sym_x + symbol_size, sym_y + symbol_size],
    fill="#2D7555"
)

# Draw Title
title_y_1 = 800
title_y_2 = 880
text_title_1 = "Digital Proximity"
text_title_2 = "Attendance"

# Center and draw Title lines
w1 = draw.textlength(text_title_1, font=font_title)
draw.text(((WIDTH - w1) // 2, title_y_1), text_title_1, font=font_title, fill="#1A1A1A")

w2 = draw.textlength(text_title_2, font=font_title)
draw.text(((WIDTH - w2) // 2, title_y_2), text_title_2, font=font_title, fill="#1A1A1A")

# Draw Subtitle
subtitle_y = 990
text_subtitle = "Secure Classroom Verification"
w_sub = draw.textlength(text_subtitle, font=font_subtitle)
draw.text(((WIDTH - w_sub) // 2, subtitle_y), text_subtitle, font=font_subtitle, fill="#666666")

# Draw Footer
footer_y = 1750
text_footer = "Powered by raybuilds"
w_foot = draw.textlength(text_footer, font=font_footer)
draw.text(((WIDTH - w_foot) // 2, footer_y), text_footer, font=font_footer, fill="#2D7555")

# Save the image
output_path = os.path.join(os.path.dirname(__file__), "splash.png")
img.save(output_path)
print(f"Generated splash image at: {output_path}")
