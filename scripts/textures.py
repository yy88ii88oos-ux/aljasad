"""Turn the source images in assets/ into web assets in public/.

Square tiles (assets/textures) → public/tex/<name>[.m].webp  (detail albedo) and <name>_n[.m].webp (normal map)
  * detail albedo = tile / its own large-scale blur, stored at half intensity (shader multiplies by 2): the hue comes
    from the site's medical palette, the texture only brings local light/dark and colour variation
  * painted specular highlights are compressed (liver, skin, cartilage, …) so they don't fight the real lighting
  * normal map from the luminance height field (Sobel), tangent space, OpenGL convention
  * 2048 px for desktop, 1024 px (.m) for phones
Portrait panels (assets/panels) → public/panels/<name>.webp ≤ 300 KB; the knee is mirrored to a LEFT knee.
Run: python3 scripts/textures.py
"""
import io, os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_T, SRC_P = os.path.join(ROOT, 'assets/textures'), os.path.join(ROOT, 'assets/panels')
OUT_T, OUT_P = os.path.join(ROOT, 'public/tex'), os.path.join(ROOT, 'public/panels')
os.makedirs(OUT_T, exist_ok=True); os.makedirs(OUT_P, exist_ok=True)

# name: (highlight compression 0..1, normal strength, chroma kept 0..1 — the rest is luminance-only detail)
TILES = {
    'muscle': (0.3, 3.0, 0.9), 'bone': (0.2, 4.0, 0.6), 'skin': (0.7, 2.5, 0.3), 'liver': (0.85, 3.0, 0.25), 'brain': (0.6, 3.0, 0.7),
    'lung': (0.6, 3.0, 0.6), 'cartilage': (0.8, 2.0, 0.2), 'fat': (0.6, 3.5, 0.6),
}


def blur(img, r):
    return np.asarray(Image.fromarray(np.uint8(np.clip(img, 0, 255))).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)


def tile_blur(a, r):
    # wrap-around blur keeps the tile seamless: blur a 3×3 mosaic and take the centre
    h, w = a.shape[:2]
    big = np.tile(a, (3, 3, 1))
    b = blur(big, r)
    return b[h:2 * h, w:2 * w]


def process_tile(name, hl, ns, chroma):
    src = Image.open(os.path.join(SRC_T, name + '.png')).convert('RGB')
    a = np.asarray(src, dtype=np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # compress painted highlights: luminance above the 80th percentile is pulled back
    p80 = np.percentile(lum, 80)
    over = np.clip(lum - p80, 0, None)
    k = 1 - hl * over / (over + 40.0)
    a = a * k[..., None]
    lum = lum * k
    base = tile_blur(a, max(8, a.shape[0] // 24))
    ratio = a / np.maximum(base, 1.0)
    lr = (lum / np.maximum(base @ np.array([0.299, 0.587, 0.114], dtype=np.float32), 1.0))[..., None]
    detail = np.clip(lr + (ratio - lr) * chroma, 0.0, 2.0) * 0.5  # mean ≈ 0.5
    # height → normal (Sobel on the wrapped luminance, fine detail only)
    h = lum / 255.0
    h = h - tile_blur(np.repeat(h[..., None] * 255, 3, 2), max(6, h.shape[0] // 40))[..., 0] / 255.0
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    n = np.dstack([-dx * ns * 8, dy * ns * 8, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    nrm = (n * 0.5 + 0.5)
    for suffix, size in (('', 2048), ('.m', 1024)):
        for kind, arr, q in (('', detail, 78), ('_n', nrm, 80)):
            im = Image.fromarray(np.uint8(np.clip(arr * 255, 0, 255))).resize((size, size), Image.LANCZOS)
            im.save(os.path.join(OUT_T, f'{name}{kind}{suffix}.webp'), 'WEBP', quality=q, method=6)


def process_iris():
    src = Image.open(os.path.join(SRC_T, 'iris.png')).convert('RGB')
    w = min(src.size)
    src = src.crop(((src.width - w) // 2, (src.height - w) // 2, (src.width + w) // 2, (src.height + w) // 2))
    for suffix, size in (('', 1024), ('.m', 512)):
        src.resize((size, size), Image.LANCZOS).save(os.path.join(OUT_T, f'iris{suffix}.webp'), 'WEBP', quality=85, method=6)


def save_under(im, path, limit=300_000):
    for q in (86, 80, 74, 68, 60, 52, 45):
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
        if buf.tell() <= limit:
            break
    open(path, 'wb').write(buf.getvalue())
    return buf.tell(), q


PANELS = {
    'heart': 'heart.png', 'digestive': 'digestive.png', 'kidney': 'kidney.png', 'eye': 'eye.png', 'brain': 'brain.png',
    'lungs': 'lungs.png', 'clavicle': 'clavicle-plate.png', 'knee-left': 'knee-right-source.png',
}


def process_panels():
    for out, src in PANELS.items():
        im = Image.open(os.path.join(SRC_P, src)).convert('RGB')
        if out == 'knee-left':
            im = ImageOps.mirror(im)  # the source shows a right knee (fibula on the viewer's left)
        im.thumbnail((720, 1280), Image.LANCZOS)
        size, q = save_under(im, os.path.join(OUT_P, out + '.webp'))
        print(f'panel {out}: {size // 1024} KB (q{q})')


if __name__ == '__main__':
    for n, (hl, ns, ch) in TILES.items():
        process_tile(n, hl, ns, ch); print('tile', n)
    process_iris(); print('iris')
    process_panels()
