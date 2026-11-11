from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SVG = (ROOT / "assets" / "icon-02.svg").read_bytes()
INK = (38, 50, 58)

def render(size, output):
    png = cairosvg.svg2png(bytestring=SVG, output_width=size, output_height=size)
    image = Image.open(BytesIO(png)).convert("RGB")
    image.save(ROOT / output, "PNG", optimize=True)
    return image

render(192, "icon-192.png")
render(512, "icon-512.png")
render(180, "apple-touch-icon.png")
render(64, "favicon.png")
maskable = Image.new("RGB", (512, 512), INK)
safe = Image.open(ROOT / "icon-512.png").convert("RGB").resize((395, 395), Image.Resampling.LANCZOS)
maskable.paste(safe, ((512 - 395) // 2, (512 - 395) // 2))
maskable.save(ROOT / "icon-maskable-512.png", "PNG", optimize=True)

for name in ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "favicon.png", "apple-touch-icon.png"]:
    print(name, (ROOT / name).stat().st_size)
