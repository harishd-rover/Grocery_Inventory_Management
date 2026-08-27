from pathlib import Path
from pptx import Presentation
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.pagesizes import landscape, letter

PPTX = Path('grocery_inventory_explanation.pptx')
PDF = Path('grocery_inventory_explanation.pdf')
prs = Presentation(str(PPTX))
page_w, page_h = landscape(letter)
slide_w = prs.slide_width / 914400
slide_h = prs.slide_height / 914400
scale_x = page_w / slide_w
scale_y = page_h / slide_h

BG = HexColor('#F7F9F6')
DARK = HexColor('#1C2B25')
INK = HexColor('#23322D')
MUTED = HexColor('#67776E')
WHITE = HexColor('#FFFFFF')
GREEN = HexColor('#267354')


def wrap(text, font, size, max_width):
    words = text.split()
    lines = []
    current = ''
    for word in words:
        candidate = word if not current else current + ' ' + word
        if stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or ['']


def draw_text_box(c, shape, dark_page=False):
    if not shape.has_text_frame or not shape.text.strip():
        return
    text = shape.text.strip()
    x = shape.left / 914400 * scale_x
    y = page_h - (shape.top / 914400 * scale_y) - (shape.height / 914400 * scale_y)
    w = shape.width / 914400 * scale_x
    h = shape.height / 914400 * scale_y
    size = 11
    bold = False
    font_name = 'Helvetica'
    paragraphs = shape.text_frame.paragraphs
    if paragraphs and paragraphs[0].runs:
        run = paragraphs[0].runs[0]
        if run.font.size:
            size = max(6, min(30, run.font.size.pt * scale_x))
        bold = bool(run.font.bold)
        if run.font.name and 'Consolas' in run.font.name:
            font_name = 'Courier-Bold' if bold else 'Courier'
        else:
            font_name = 'Helvetica-Bold' if bold else 'Helvetica'
    color = WHITE if dark_page else INK
    c.setFillColor(color)
    c.setFont(font_name, size)
    leading = size * 1.22
    lines = []
    for paragraph in paragraphs:
        raw = paragraph.text.strip()
        if not raw:
            lines.append('')
        else:
            lines.extend(wrap(raw, font_name, size, max(20, w - 8)))
    cursor = page_h - (shape.top / 914400 * scale_y) - size
    for line_text in lines:
        if cursor < y - 2:
            break
        c.drawString(x + 3, cursor, line_text)
        cursor -= leading


c = canvas.Canvas(str(PDF), pagesize=(page_w, page_h))
for slide_index, slide in enumerate(prs.slides):
    dark_page = slide_index in (0, len(prs.slides) - 1)
    c.setFillColor(DARK if dark_page else BG)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    # Render text in the same coordinate system as the source presentation.
    for shape in slide.shapes:
        if shape.has_text_frame and shape.text.strip():
            draw_text_box(c, shape, dark_page)
    c.setFillColor(GREEN if not dark_page else HexColor('#8FD2AA'))
    c.setFont('Helvetica-Bold', 7)
    c.drawRightString(page_w - 28, 18, f'{slide_index + 1} / {len(prs.slides)}')
    c.showPage()
c.save()
print(PDF)
