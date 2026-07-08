import json
import base64
import io
import os
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageColor
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import (
    SquareModuleDrawer,
    CircleModuleDrawer,
    RoundedModuleDrawer,
    GappedSquareModuleDrawer,
    HorizontalBarsDrawer,
    VerticalBarsDrawer,
)
from qrcode.image.styles.colormasks import (
    SolidFillColorMask,
    RadialGradiantColorMask,
    HorizontalGradiantColorMask,
    VerticalGradiantColorMask,
    SquareGradiantColorMask,
)
import qrcode.image.svg

try:
    import barcode
    from barcode.writer import ImageWriter, SVGWriter
    BARCODE_AVAILABLE = True
except ImportError:
    BARCODE_AVAILABLE = False


HOST = "0.0.0.0"
PORT = 8000
BASE_DIR = Path(__file__).resolve().parent

# Error correction mapping
EC_MAP = {
    "L": ERROR_CORRECT_L,
    "M": ERROR_CORRECT_M,
    "Q": ERROR_CORRECT_Q,
    "H": ERROR_CORRECT_H,
}

# Module drawers mapping for distinct styles (... or -- or || or rounded, etc.)
DRAWER_MAP = {
    "square": SquareModuleDrawer,
    "dots": CircleModuleDrawer,
    "circle": CircleModuleDrawer,
    "dashes": HorizontalBarsDrawer,
    "horizontal": HorizontalBarsDrawer,
    "vertical": VerticalBarsDrawer,
    "rounded": RoundedModuleDrawer,
    "gapped": GappedSquareModuleDrawer,
}


def parse_hex_color(color_val, default=(0, 0, 0)):
    """Parse color string (hex, named, or rgb) into RGB tuple."""
    if not color_val or not isinstance(color_val, str):
        return default
    color_val = color_val.strip()
    if color_val.startswith("#"):
        try:
            return ImageColor.getrgb(color_val)[:3]
        except Exception:
            return default
    try:
        return ImageColor.getrgb(color_val)[:3]
    except Exception:
        return default


def get_system_font(size=20, bold=True):
    """Load a clean system font for frame captions."""
    font_candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFCompact.ttf",
        "/System/Library/Fonts/Geneva.dfont",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for font_path in font_candidates:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_qr_image(config):
    """Generate styled QR code Image or SVG using Python qrcode & Pillow."""
    text = config.get("text", "")
    if not text:
        raise ValueError("No text provided for QR code generation.")

    ec_str = config.get("error_correction", "H").upper()
    error_correction = EC_MAP.get(ec_str, ERROR_CORRECT_H)
    box_size = max(4, min(int(config.get("box_size", 10)), 60))
    border = max(0, min(int(config.get("border", 4)), 20))
    out_format = config.get("format", "png").lower()

    # If vector SVG requested without complex logo/frames
    if out_format == "svg" and config.get("frame_style", "none") == "none" and not config.get("logo_data"):
        fill_color = config.get("fill_color", "#000000")
        back_color = config.get("back_color", "#ffffff")
        qr = qrcode.QRCode(
            version=None,
            error_correction=error_correction,
            box_size=box_size,
            border=border,
        )
        qr.add_data(text)
        qr.make(fit=True)
        svg_img = qr.make_image(
            image_factory=qrcode.image.svg.SvgPathImage,
            fill_color=fill_color,
            back_color=back_color,
        )
        buf = io.BytesIO()
        svg_img.save(buf)
        return buf.getvalue(), "image/svg+xml"

    # Pillow styled rendering
    qr = qrcode.QRCode(
        version=None,
        error_correction=error_correction,
        box_size=box_size,
        border=border,
    )
    qr.add_data(text)
    qr.make(fit=True)

    drawer_key = config.get("drawer", "square").lower()
    drawer_cls = DRAWER_MAP.get(drawer_key, SquareModuleDrawer)
    drawer_instance = drawer_cls()

    fill_rgb = parse_hex_color(config.get("fill_color", "#000000"), (0, 0, 0))
    back_rgb = parse_hex_color(config.get("back_color", "#ffffff"), (255, 255, 255))

    gradient_type = config.get("gradient_type", "none").lower()
