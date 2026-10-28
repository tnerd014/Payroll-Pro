import os
from PIL import Image

def generate_splashes():
    icon_path = os.path.join("public", "icon.png")
    icon = Image.open(icon_path).convert("RGBA")

    splash_specs = [
        ("drawable", 480, 320),
        ("drawable-land-hdpi", 800, 480),
        ("drawable-land-mdpi", 480, 320),
        ("drawable-land-xhdpi", 1280, 720),
        ("drawable-land-xxhdpi", 1600, 960),
        ("drawable-land-xxxhdpi", 1920, 1280),
        ("drawable-port-hdpi", 480, 800),
        ("drawable-port-mdpi", 320, 480),
        ("drawable-port-xhdpi", 720, 1280),
        ("drawable-port-xxhdpi", 960, 1600),
        ("drawable-port-xxxhdpi", 1280, 1920),
    ]

    base_res = os.path.join("android", "app", "src", "main", "res")

    for folder, w, h in splash_specs:
        target_dir = os.path.join(base_res, folder)
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, "splash.png")

        # Create white background canvas
        canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))

        # Determine icon size: ~32% of min dimension
        min_dim = min(w, h)
        logo_size = int(min_dim * 0.35)
        resized_icon = icon.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Center position
        x = (w - logo_size) // 2
        y = (h - logo_size) // 2

        # Paste icon with alpha mask
        canvas.paste(resized_icon, (x, y), resized_icon)

        # Save as PNG
        canvas.save(target_path, "PNG")
        print(f"Generated {target_path} ({w}x{h}, logo {logo_size}x{logo_size})")

if __name__ == "__main__":
    generate_splashes()
