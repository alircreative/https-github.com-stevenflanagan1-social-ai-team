#!/usr/bin/env python3
"""
HTML optimizer for CK website files.
- Replaces embedded base64 fonts with Google Fonts CDN links
- Strips CSS default values from inline style attributes
- Extracts embedded base64 images to separate files
- Reports file size reduction
"""

import os
import re
import sys
import base64
import argparse
from pathlib import Path

GOOGLE_FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:'
    'ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700'
    '&family=JetBrains+Mono:wght@400;500;700'
    '&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
)

# CSS properties that are browser defaults - safe to remove from inline styles
CSS_DEFAULTS = {
    'accent-color': 'auto', 'align-content': 'normal', 'align-items': 'normal',
    'align-self': 'auto', 'alignment-baseline': 'auto', 'animation-composition': 'replace',
    'animation-delay': '0s', 'animation-direction': 'normal', 'animation-duration': '0s',
    'animation-fill-mode': 'none', 'animation-iteration-count': '1', 'animation-name': 'none',
    'animation-play-state': 'running', 'animation-timeline': 'auto',
    'animation-timing-function': 'ease', 'appearance': 'none', 'backface-visibility': 'visible',
    'background-attachment': 'scroll', 'background-blend-mode': 'normal',
    'background-clip': 'border-box', 'background-origin': 'padding-box',
    'background-repeat': 'repeat', 'border-collapse': 'separate',
    'border-image-outset': '0', 'border-image-repeat': 'stretch',
    'border-image-slice': '100%', 'border-image-width': '1',
    'box-decoration-break': 'slice', 'box-sizing': 'content-box',
    'break-after': 'auto', 'break-before': 'auto', 'break-inside': 'auto',
    'caption-side': 'top', 'caret-color': 'auto', 'clear': 'none',
    'clip': 'auto', 'color-interpolation': 'srgb', 'column-count': 'auto',
    'column-fill': 'balance', 'column-gap': 'normal', 'column-rule-style': 'none',
    'column-rule-width': 'medium', 'column-span': 'none', 'column-width': 'auto',
    'cursor': 'auto', 'direction': 'ltr', 'empty-cells': 'show',
    'float': 'none', 'font-kerning': 'auto', 'font-optical-sizing': 'auto',
    'font-synthesis-small-caps': 'auto', 'font-synthesis-style': 'auto',
    'font-synthesis-weight': 'auto', 'font-variant-caps': 'normal',
    'font-variant-east-asian': 'normal', 'font-variant-ligatures': 'normal',
    'font-variant-numeric': 'normal', 'isolation': 'auto',
    'letter-spacing': 'normal', 'line-break': 'auto',
    'list-style-image': 'none', 'list-style-position': 'outside',
    'list-style-type': 'disc', 'mix-blend-mode': 'normal',
    'object-fit': 'fill', 'object-position': '50% 50%',
    'opacity': '1', 'orphans': '2', 'outline-offset': '0px',
    'outline-style': 'none', 'overflow-anchor': 'auto', 'overflow-wrap': 'normal',
    'overflow-x': 'visible', 'overflow-y': 'visible',
    'overscroll-behavior-x': 'auto', 'overscroll-behavior-y': 'auto',
    'page-break-after': 'auto', 'page-break-before': 'auto',
    'page-break-inside': 'auto', 'pointer-events': 'auto',
    'position': 'static', 'quotes': 'auto', 'resize': 'none',
    'row-gap': 'normal', 'scroll-behavior': 'auto', 'table-layout': 'auto',
    'text-align-last': 'auto', 'text-combine-upright': 'none',
    'text-decoration-skip-ink': 'auto', 'text-decoration-style': 'solid',
    'text-emphasis-position': 'over right', 'text-emphasis-style': 'none',
    'text-justify': 'auto', 'text-orientation': 'mixed',
    'text-overflow': 'clip', 'text-rendering': 'auto', 'text-transform': 'none',
    'touch-action': 'auto', 'transform': 'none', 'unicode-bidi': 'normal',
    'vertical-align': 'baseline', 'visibility': 'visible',
    'white-space': 'normal', 'widows': '2', 'will-change': 'auto',
    'word-break': 'normal', 'word-spacing': 'normal',
    'writing-mode': 'horizontal-tb', 'z-index': 'auto',
}


def strip_inline_defaults(style_str):
    props = [p.strip() for p in style_str.split(';') if p.strip()]
    kept = []
    for prop in props:
        if ':' not in prop:
            continue
        name, _, val = prop.partition(':')
        name, val = name.strip(), val.strip()
        if CSS_DEFAULTS.get(name) != val:
            kept.append(f'{name}: {val}')
    return '; '.join(kept)


def extract_images(html, images_dir, base_name):
    """Extract base64 images to files, replace with src references."""
    img_count = [0]
    os.makedirs(images_dir, exist_ok=True)

    def replace_img(m):
        mime = m.group(1)  # e.g. image/png
        data = m.group(2)
        ext = mime.split('/')[-1].replace('jpeg', 'jpg')
        img_count[0] += 1
        filename = f'{base_name}_img{img_count[0]:03d}.{ext}'
        filepath = os.path.join(images_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(data))
        return f'images/{filename}'

    optimized = re.sub(
        r'data:(image/[^;]+);base64,([A-Za-z0-9+/=]+)',
        replace_img, html
    )
    return optimized, img_count[0]


def optimize_file(input_path, output_path):
    print(f'\nProcessing: {os.path.basename(input_path)}')
    with open(input_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    original_size = len(html)
    print(f'  Original size: {original_size / 1024 / 1024:.2f} MB')

    # 1. Remove embedded @font-face blocks and add Google Fonts CDN
    style_start = html.find('<style>')
    style_end = html.find('</style>')
    if style_start != -1 and style_end != -1:
        html = html[:style_start] + GOOGLE_FONTS_LINK + html[style_end + 8:]
        print('  ✓ Removed embedded fonts, added Google Fonts CDN link')

    # 2. Strip CSS default values from inline style attributes
    html = re.sub(
        r'style="([^"]*)"',
        lambda m: (f'style="{s}"' if (s := strip_inline_defaults(m.group(1))) else ''),
        html
    )
    print('  ✓ Stripped CSS default values from inline styles')

    # 3. Extract base64 images to separate files
    images_dir = os.path.join(os.path.dirname(output_path), 'images')
    base_name = Path(input_path).stem.replace(' ', '_')[:20]
    html, img_count = extract_images(html, images_dir, base_name)
    if img_count:
        print(f'  ✓ Extracted {img_count} embedded image(s) to images/ folder')

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    new_size = len(html)
    reduction = (1 - new_size / original_size) * 100
    print(f'  Optimized size: {new_size / 1024 / 1024:.2f} MB')
    print(f'  Reduction: {reduction:.1f}%')

    return original_size, new_size


def main():
    parser = argparse.ArgumentParser(description='Optimize HTML files for GitHub upload')
    parser.add_argument('input', nargs='+', help='HTML file(s) or directory to optimize')
    parser.add_argument('--output-dir', '-o', default='optimized',
                        help='Output directory (default: ./optimized)')
    args = parser.parse_args()

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    files = []
    for path in args.input:
        if os.path.isdir(path):
            files.extend(Path(path).glob('*.html'))
        else:
            files.append(Path(path))

    if not files:
        print('No HTML files found.')
        sys.exit(1)

    total_before = total_after = 0
    for f in files:
        out = os.path.join(output_dir, f.name)
        before, after = optimize_file(str(f), out)
        total_before += before
        total_after += after

    print(f'\n{"="*50}')
    print(f'Total original:  {total_before / 1024 / 1024:.2f} MB')
    print(f'Total optimized: {total_after / 1024 / 1024:.2f} MB')
    print(f'Total reduction: {(1 - total_after / total_before) * 100:.1f}%')
    print(f'\nOptimized files saved to: {os.path.abspath(output_dir)}/')
    print('Any extracted images are in: images/')


if __name__ == '__main__':
    main()
