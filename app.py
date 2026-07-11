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
    grad_color_rgb = parse_hex_color(config.get("gradient_color", "#000000"), (0, 0, 0))

    # Apply Color Mask
    if gradient_type == "radial":
        color_mask = RadialGradiantColorMask(
            back_color=back_rgb,
            center_color=fill_rgb,
            edge_color=grad_color_rgb,
        )
    elif gradient_type == "horizontal":
        color_mask = HorizontalGradiantColorMask(
            back_color=back_rgb,
            left_color=fill_rgb,
            right_color=grad_color_rgb,
        )
    elif gradient_type == "vertical":
        color_mask = VerticalGradiantColorMask(
            back_color=back_rgb,
            top_color=fill_rgb,
            bottom_color=grad_color_rgb,
        )
    elif gradient_type == "square":
        color_mask = SquareGradiantColorMask(
            back_color=back_rgb,
            center_color=fill_rgb,
            edge_color=grad_color_rgb,
        )
    else:
        color_mask = SolidFillColorMask(
            back_color=back_rgb,
            front_color=fill_rgb,
        )

    pil_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=drawer_instance,
        color_mask=color_mask,
    ).convert("RGBA")

    # Center Logo Overlay
    logo_data = config.get("logo_data")
    if logo_data and isinstance(logo_data, str):
        try:
            if "," in logo_data:
                logo_data = logo_data.split(",", 1)[1]
            logo_bytes = base64.b64decode(logo_data)
            logo_img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")

            qr_w, qr_h = pil_img.size
            logo_ratio = min(max(float(config.get("logo_size", 0.22)), 0.10), 0.35)
            target_logo_size = int(qr_w * logo_ratio)

            # Resize logo with high-quality filter
            logo_img.thumbnail((target_logo_size, target_logo_size), Image.Resampling.LANCZOS)
            lw, lh = logo_img.size

            # Create circular/rounded background pad for readability
            if config.get("logo_pad", True):
                pad = max(6, int(target_logo_size * 0.12))
                pad_size = (lw + pad * 2, lh + pad * 2)
                badge = Image.new("RGBA", pad_size, (0, 0, 0, 0))
                draw_badge = ImageDraw.Draw(badge)
                draw_badge.rounded_rectangle(
                    [(0, 0), (pad_size[0] - 1, pad_size[1] - 1)],
                    radius=int(pad_size[0] * 0.25),
                    fill=back_rgb + (255,),
                    outline=fill_rgb + (80,),
                    width=max(1, int(box_size / 4)),
                )
                badge.paste(logo_img, (pad, pad), mask=logo_img)
                paste_x = (qr_w - pad_size[0]) // 2
                paste_y = (qr_h - pad_size[1]) // 2
                pil_img.paste(badge, (paste_x, paste_y), mask=badge)
            else:
                paste_x = (qr_w - lw) // 2
                paste_y = (qr_h - lh) // 2
                pil_img.paste(logo_img, (paste_x, paste_y), mask=logo_img)
        except Exception as err:
            print(f"[app] Logo processing error: {err}")

    # Add Frame & Call To Action (CTA) if configured
    frame_style = config.get("frame_style", "none").lower()
    if frame_style != "none":
        pil_img = apply_frame(pil_img, config)

    # Output encoding
    output = io.BytesIO()
    if out_format in ("jpeg", "jpg"):
        pil_img = pil_img.convert("RGB")
        pil_img.save(output, format="JPEG", quality=95)
        return output.getvalue(), "image/jpeg"
    elif out_format == "webp":
        pil_img.save(output, format="WEBP", quality=95)
        return output.getvalue(), "image/webp"
    else:
        pil_img.save(output, format="PNG")
        return output.getvalue(), "image/png"


def generate_barcode_image(config):
    """Generate standard 1D Barcode with Pillow & python-barcode."""
    if not BARCODE_AVAILABLE:
        raise RuntimeError("python-barcode library is not installed.")

    text = config.get("text", "")
    if not text:
        raise ValueError("No text/data provided for barcode generation.")

    barcode_format = config.get("barcode_format", "code128").lower()
    if barcode_format not in barcode.PROVIDED_BARCODES:
        barcode_format = "code128"

    out_format = config.get("format", "png").lower()
    fill_hex = config.get("fill_color", "#000000")
    back_hex = config.get("back_color", "#ffffff")
    show_text = bool(config.get("show_text", True))

    try:
        barcode_cls = barcode.get_barcode_class(barcode_format)
    except Exception:
        barcode_cls = barcode.get_barcode_class("code128")

    if out_format == "svg":
        writer = SVGWriter()
        code_obj = barcode_cls(text, writer=writer)
        svg_bytes = code_obj.render(writer_options={
            "module_width": float(config.get("bar_width", 0.35)),
            "module_height": float(config.get("bar_height", 15.0)),
            "quiet_zone": 4.0,
            "font_size": 10 if show_text else 0,
            "text_distance": 5.0,
            "background": back_hex,
            "foreground": fill_hex,
            "write_text": show_text,
        })
        return svg_bytes, "image/svg+xml"

    # Pillow PNG rendering
    writer = ImageWriter()
    writer.format = "PNG"
    code_obj = barcode_cls(text, writer=writer)
    bar_img = code_obj.render(writer_options={
        "module_width": float(config.get("bar_width", 0.40)),
        "module_height": float(config.get("bar_height", 16.0)),
        "quiet_zone": 4.0,
        "font_size": 11 if show_text else 0,
        "text_distance": 5.0,
        "background": back_hex,
        "foreground": fill_hex,
        "write_text": show_text,
    }).convert("RGBA")
