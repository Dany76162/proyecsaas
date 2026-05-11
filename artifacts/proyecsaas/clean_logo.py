from PIL import Image

# Open the image and convert to grayscale
img = Image.open('public/brand/raices_pilot_logo_clean.png').convert('L')
img_data = list(img.getdata())

# Create a new image with the same size
new_img = Image.new('RGBA', img.size)
new_data = []

# The checkerboard has values up to ~115.
# Let's map anything below 120 to alpha=0, and anything above 120 to a smooth alpha transition.
for val in img_data:
    if val < 120:
        new_data.append((255, 255, 255, 0))
    else:
        # Map 120-255 to 0-255
        alpha = int((val - 120) * (255.0 / (255 - 120)))
        new_data.append((255, 255, 255, alpha))

new_img.putdata(new_data)
new_img.save('public/brand/raices_pilot_logo_transparent.png')
print("Image cleaned and saved.")
