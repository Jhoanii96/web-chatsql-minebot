import re
import base64
from io import BytesIO
from datetime import datetime
from PIL import Image
from docx import Document
from docx.shared import Cm, Pt, Inches, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_PARAGRAPH_ALIGNMENT

def replace_headers(text, items):
    """
    Most precise version - handles the exact cases we need.
    """
    if not text or not items:
        return text
    
    # Process each potential header
    for idx, letter in enumerate("ABCDEFG"):
        if idx >= len(items):
            break
            
        new_item = items[idx]
        
        # Case 1: A. **Header Content** (original case)
        pattern1 = rf'^{letter}\.\s*\*\*(.*?)\*\*'
        text = re.sub(pattern1, new_item, text, flags=re.IGNORECASE | re.MULTILINE)
        
        # Case 2: **A. Header Content** (bold around entire header)
        pattern2 = rf'^\*\*\s*{letter}\.\s*(.*?)\*\*'
        text = re.sub(pattern2, f'**{new_item}**', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # Case 3: A. Header Content (plain)
        pattern3 = rf'^{letter}\.\s*(.*)'
        text = re.sub(pattern3, new_item, text, flags=re.IGNORECASE | re.MULTILINE)
        
        # Case 4: # A. Header (markdown header without bold)
        pattern4 = rf'^(#+)\s*{letter}\.\s*(.*)'
        text = re.sub(pattern4, rf'\1 {new_item}', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # Case 5: # **A. Header** (markdown header with bold - handles #, ##, ###, etc.)
        pattern5 = rf'^(#+)\s*\*\*\s*{letter}\.\s*(.*?)\*\*'
        text = re.sub(pattern5, rf'\1 **{new_item}**', text, flags=re.IGNORECASE | re.MULTILINE)
    
    return text

def split_into_main_sections(content, items, source_steps):
    """Split markdown content into sections based on headers"""
    sections = []
    lines = content.split('\n')
    current_section = None
    current_content = []

    for line in lines:
        if not line:
            continue
        
        is_matched = False
        for item in items:
            if item in line:
                is_matched = True
                break
            
        # Check if line is a header (starts with ## or ###)
        if is_matched:
            # Save previous section
            print(current_section)
            if current_section:
                if "4. Síntomas Operativos" in str(current_section).strip():
                    sections.append((current_section.strip(), '\n'.join(current_content), source_steps))
                    current_content = []
                else:
                    sections.append((current_section.strip(), '\n'.join(current_content), None))
                    current_content = []
            
            current_section = line
        else:
            if current_section:
                current_content.append(line)

        is_matched = False
    
    # Add the last section
    if current_section and current_content:
        sections.append((current_section.strip(), '\n'.join(current_content), None))
    
    return sections

def split_into_new_sections(content):
    """Split markdown content into sections based on headers"""
    sections = []
    lines = content.split('\n')

    for line in lines:
        if not line:
            continue

        sections.append((line))
    
    return sections

def needs_markdown_fix(response):
    problematic_patterns = [
        re.compile(r'```', re.MULTILINE)
    ]
    
    return any(pattern.search(response) for pattern in problematic_patterns)

def only_fix_specific_issues(response):
    if needs_markdown_fix(response):
        response = re.sub(r'```', '', response)
        response = re.sub(r'^([•\-]\s+)\*\*(.+?)\*\*\s*:', '#### \\2', response, flags=re.MULTILINE)
        response = re.sub(r'^(\d+\)\s+[A-Z])', '### \\1', response, flags=re.MULTILINE)
        response = re.sub(r'^([IVX]+\)\s+[A-Z])', '### \\1', response, flags=re.MULTILINE | re.IGNORECASE)
        response = re.sub(r'^([a-z]\)\s+[A-Z])', '#### \\1', response, flags=re.MULTILINE | re.IGNORECASE)
        return response
    else:
        return response


class ReportExecutive:
    def __init__(self):
        """
        Initialize the ReportExecutive with base64 encoded images.
        """
        self.logo_b64 = """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"""
        self.line_b64 = """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"""
        self.doc = None
        self.logo_stream = None
        self.line_stream = None
        
        self._decode_images()
        self._setup_document()
    
    def _decode_images(self):
        """Decode base64 images to BytesIO streams"""
        # Decode logo
        if self.logo_b64:
            logo_binary = base64.b64decode(self.logo_b64)
            self.logo_stream = BytesIO(logo_binary)
            self.logo_stream.name = "image.png"
            self.logo_stream.seek(0)
        
        # Decode line/footer image
        if self.line_b64:
            line_binary = base64.b64decode(self.line_b64)
            self.line_stream = BytesIO(line_binary)
            self.line_stream.name = "image.jpg"
            self.line_stream.seek(0)
    
    def _setup_document(self):
        """Initialize the document and set language settings"""
        self.doc = Document()
        
        # Set language for all styles
        for style_name in self.doc.styles:
            style = self.doc.styles[style_name.name]
            rpr = style.element.get_or_add_rPr()
            
            # Check if w:lang already exists, if not, create it
            lang_elements = rpr.xpath('w:lang')
            if not lang_elements:
                lang = OxmlElement('w:lang')
                rpr.append(lang)
            else:
                lang = lang_elements[0]  # Use existing w:lang element

            lang.set(qn('w:val'), 'es-ES')  # Set to Spanish (Spain)
            lang.set(qn('w:eastAsia'), 'es-ES')  # Optional: For East Asian languages
            lang.set(qn('w:bidi'), 'es-ES')  # Optional: For Bi-Directional text
    
    @staticmethod
    def cm_to_twips(cm):
        """Convert centimeters to twips"""
        return int(cm * 1440.0 / 2.54)
    
    @staticmethod
    def set_table_border(tbl, color="808080", size=4, space=0):
        """
        Set all borders for a table.
        
        Args:
            tbl: Table object
            color: hex without '#', e.g. "808080"
            size: border thickness in eighths of a point
            space: space attribute
        """
        tbl_pr = tbl._tbl.tblPr
        borders = OxmlElement('w:tblBorders')

        for name in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
            elem = OxmlElement(f'w:{name}')
            elem.set(qn('w:val'), 'single')
            elem.set(qn('w:sz'), str(size))
            elem.set(qn('w:space'), str(space))
            elem.set(qn('w:color'), color)
            borders.append(elem)

        # Remove old borders if exists
        for child in list(tbl_pr):
            if child.tag == qn('w:tblBorders'):
                tbl_pr.remove(child)
        tbl_pr.append(borders)
    
    @staticmethod
    def set_table_bottom_border(tbl, color='FFD700', size=4, space=0):
        """
        Set only the bottom border for a table.
        
        Args:
            tbl: Table object
            color: hex without '#', e.g. 'FFD700' (gold)
            size: border thickness in eighths of a point
            space: space attribute
        """
        tbl_pr = tbl._tbl.tblPr
        borders = OxmlElement('w:tblBorders')

        # Disable other borders explicitly (set to 'nil')
        for name in ('top', 'left', 'right', 'insideH', 'insideV'):
            el = OxmlElement(f'w:{name}')
            el.set(qn('w:val'), 'nil')
            borders.append(el)

        # Add only the bottom border
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')       # single line
        bottom.set(qn('w:sz'), str(size))       # thickness (eighths of a point)
        bottom.set(qn('w:space'), str(space))   # space
        bottom.set(qn('w:color'), color)        # hex color (no '#')
        borders.append(bottom)

        # Remove any existing tblBorders then append ours
        for child in list(tbl_pr):
            if child.tag == qn('w:tblBorders'):
                tbl_pr.remove(child)
        tbl_pr.append(borders)
    
    @staticmethod
    def set_cell_shading(cell, fill="F2F2F2"):
        """Set cell background color (fill without '#')"""
        tc = cell._tc
        tcpr = tc.get_or_add_tcPr()
        # Remove existing shd if present
        for child in list(tcpr):
            if child.tag == qn('w:shd'):
                tcpr.remove(child)
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), "auto")
        shd.set(qn('w:fill'), fill)
        tcpr.append(shd)
    
    def create_header(self, equipment="", phase_name=""):
        """Create the document header section"""
        section = self.doc.sections[0]
        section.header_distance = Cm(0.2)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)
        section.top_margin = Cm(3.5)
        header = section.header

        header_table = header.add_table(rows=1, cols=3, width=Inches(8))
        header_table.autofit = False
        header_table.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        self.set_table_bottom_border(header_table, color='a39161', size=15, space=0)
        
        # Configure cell widths
        left_cell = header_table.rows[0].cells[0]
        left_cell.width = Inches(2)
        center_cell = header_table.rows[0].cells[1]
        center_cell.width = Inches(4)
        right_cell = header_table.rows[0].cells[2]
        right_cell.width = Inches(2)

        # LEFT: logo (if provided)
        if self.logo_stream:
            try:
                # Verify image can be opened
                self.logo_stream.seek(0)
                Image.open(self.logo_stream).verify()
                self.logo_stream.seek(0)
                run = left_cell.paragraphs[0].add_run()
                run.add_picture(self.logo_stream, width=Inches(1.6))  # ~140px wide
            except Exception as e:
                left_cell.text = str(e)  # fallback: show error
        else:
            left_cell.text = ""

        # CENTER: title block (3 lines)
        p1 = center_cell.paragraphs[0]
        p1.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        p1.paragraph_format.line_spacing = 1.0
        run = p1.add_run("INFORME TÉCNICO")
        run.font.name = "Calibri"
        run.font.size = Pt(16)
        run.bold = True
        run.font.color.rgb = RGBColor(0x00, 0x54, 0x7D)

        p2 = center_cell.add_paragraph("Dpto. Ingeniería de Confiabilidad")
        p2.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(4)
        p2.paragraph_format.line_spacing = 1.0
        p2.runs[0].font.name = "Calibri"
        p2.runs[0]._element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
        p2.runs[0].font.size = Pt(14)
        p2.runs[0].italic = True
        p2.runs[0].font.color.rgb = RGBColor(0xA3, 0x91, 0x61)

        p3 = center_cell.add_paragraph(equipment + " - " + phase_name)
        p3.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        p3.paragraph_format.space_before = Pt(0)
        p3.paragraph_format.space_after = Pt(4)
        p3.paragraph_format.line_spacing = 1.0
        p3.runs[0].font.name = "Calibri"
        p3.runs[0].font.size = Pt(14)
        p3.runs[0].bold = True
        p3.runs[0].font.color.rgb = RGBColor(0x00, 0x54, 0x7D)

        # RIGHT: metadata small table (3x2)
        self._create_metadata_table(right_cell, equipment)
    
    def _create_metadata_table(self, right_cell, equipment=""):
        """Create the metadata table in the right cell of header"""
        # Clear existing paragraphs
        for p in right_cell.paragraphs:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
            p_element = p._element
            p_element.getparent().remove(p_element)
        
        right_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

        meta_tbl = right_cell.add_table(rows=3, cols=2)
        meta_tbl.autofit = False
        meta_tbl.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

        # Set shading for specific rows
        for row_idx in (0, 2):
            for cell in meta_tbl.rows[row_idx].cells:
                self.set_cell_shading(cell, fill="f1f1f0")

        self.set_table_border(meta_tbl, color="d9d9d9", size=6, space=0)

        # Populate table data
        meta_tbl.cell(0, 0).text = "Fecha"
        meta_tbl.cell(0, 1).text = datetime.now().strftime("%Y-%m-%d")
        meta_tbl.cell(1, 0).text = "Equipo"
        meta_tbl.cell(1, 1).text = equipment
        meta_tbl.cell(2, 0).text = "Horas Comp."
        meta_tbl.cell(2, 1).text = "    "

        # Format table cells
        for r in range(3):
            for c in range(2):
                meta_tbl.cell(r, c).width = Cm(2.25)
                for p in meta_tbl.cell(r, c).paragraphs:
                    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
                    p.paragraph_format.space_before = Cm(0.05)
                    p.paragraph_format.space_after = Cm(0.05)
                    p.paragraph_format.line_spacing = 1.0
                    # Ensure at least one run exists
                    if len(p.runs) == 0:
                        run = p.add_run("")  # create an empty run to receive formatting
                    else:
                        run = p.runs[0]
                    run.font.name = 'Arial'
                    run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
                    run.font.size = Pt(8)
                    for extra in p.runs:
                        extra.font.name = 'Arial'
                        extra._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
                        extra.font.size = Pt(8)
    
    def create_footer(self):
        """Create the document footer section"""
        section = self.doc.sections[0]
        footer = section.footer

        # Clear existing paragraphs
        p_element = footer.paragraphs[0]._element
        p_element.getparent().remove(p_element)
        
        # Add image (centered)
        p_img = footer.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_img = p_img.add_run()
        run_img.add_picture(self.line_stream, width=Cm(19))  # adjust width as needed

        # Add page number below image
        p_num = footer.add_paragraph()
        p_num.alignment = WD_ALIGN_PARAGRAPH.CENTER

        run_num = p_num.add_run()

        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')

        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = "PAGE"

        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')

        run_num._r.append(fldChar1)
        run_num._r.append(instrText)
        run_num._r.append(fldChar2)

        # Optional text style
        run_num.font.name = 'Arial'
        run_num._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
        run_num.font.size = Pt(11)
        run_num.font.color.rgb = RGBColor(0x00, 0x54, 0x7D)
    
    def format_paragraph(self, p, text=None):
        """Format main list number paragraph"""
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        
        if len(p.runs) == 0 and text:
            run = p.add_run(text)
        elif p.runs:
            run = p.runs[0]
        else:
            return
            
        run.font.name = 'Arial'
        run.font.size = Pt(12)
        run.bold = True

    def process_section_content(self, content, steps):
        """Process the content of a section including paragraphs, tables, bold text, etc."""
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i]
            if not line:
                i += 1
                continue

            # Check for horizontal line (---)
            if line == '---' or line.replace('-', '') == '' and len(line) >= 3:
                i += 1
                continue
            
            # Check for tables
            if line.startswith('|') and '|' in line:
                table_lines = []
                # Collect all lines that are part of the table
                while i < len(lines) and lines[i].strip().startswith('|'):
                    table_lines.append(lines[i].strip())
                    i += 1
                self.process_table(table_lines)
                continue
            
            

            # Check for headers (##, ###, ####, #)
            elif line.startswith('#'):
                header_level, header_text = self.parse_header_line(line)
                self.process_header(header_level, header_text)
                i += 1
                continue

            # Check for numbered lists (1., 2., etc.)
            elif self.is_numbered_list_item(line):
                list_items = []
                # Collect all consecutive numbered list items
                while i < len(lines) and self.is_numbered_list_item(lines[i].strip()):
                    list_items.append(lines[i].strip())
                    i += 1
                self.process_numbered_list(list_items)
                continue
            
            # Check for bullet lists (- item)
            elif self.is_bullet_list_item(line):
                list_items = []
                levels = []
                # Collect all consecutive bullet list items with their levels
                while i < len(lines) and (self.is_bullet_list_item(lines[i]) or 
                                        self.is_second_level_bullet(lines[i])):
                    current_line = lines[i]
                    if self.is_second_level_bullet(current_line):
                        levels.append(1)  # Second level
                        list_items.append(current_line)
                    else:
                        levels.append(0)  # First level
                        list_items.append(current_line)
                    i += 1
                self.process_bullet_list(list_items, levels)
                continue
            
            # Check for bold text using ** **
            elif '**' in line or '*' in line or '`' in line:
                self.process_formatted_text(line)
                i += 1
                continue
            
            # Regular paragraph
            else:
                # Combine consecutive non-empty lines into paragraphs
                paragraph_lines = [line]
                i += 1
                while i < len(lines) and lines[i].strip() and not any([
                    lines[i].strip().startswith('|'),
                    lines[i].strip().startswith('#'),
                    lines[i].strip() == '---',
                    '**' in lines[i].strip(),
                    self.is_numbered_list_item(lines[i].strip()),
                    self.is_bullet_list_item(lines[i].strip()),
                    self.is_second_level_bullet(lines[i])
                ]):
                    paragraph_lines.append(lines[i].strip())
                    i += 1
                
                if paragraph_lines:
                    p = self.doc.add_paragraph(' '.join(paragraph_lines))
                    self.format_regular_paragraph(p)
                continue
            
            
        
        #if steps is not None:
        #    for item in steps:
        #        new_sections = split_into_new_sections(item["conversation"])
        #        match = re.search(r'Hoja:\s*([^\n]+)', item["conversation"])
        #        if match:
        #            full_title = match.group(1).strip().replace("**", "")
        #            full_title_md = f'## {item["step_num"]}. {full_title}'
        #        else:
        #            full_title_md = f'## {item["step_num"]}. Análisis'
        #        self.process_section_content(full_title_md, None)
        #        for content in new_sections:
        #            # Process the content of this section
        #            content = only_fix_specific_issues(content)
        #            self.process_section_content(content, None)


    def parse_header_line(self, line):
        """Parse header line and return level and text"""
        # Count the number of # at the beginning
        level = 0
        for char in line:
            if char == '#':
                level += 1
            else:
                break
        
        # Extract the header text (remove # and strip)
        header_text = line[level:].strip()
        return level, header_text
    
    def process_header(self, level, text):
        """Process header with appropriate formatting based on level"""
        from docx.shared import Pt
        text = str(text).replace("*", "").strip()
        # Add paragraph with appropriate style
        if level == 1:
            p = self.doc.add_paragraph(text, style='Heading 1')
        elif level == 2:
            p = self.doc.add_paragraph(text, style='Heading 2')
        elif level == 3:
            p = self.doc.add_paragraph(text, style='Heading 3')
        elif level == 4:
            p = self.doc.add_paragraph(text, style='Heading 4')
        else:
            # For levels beyond 4, use Heading 4 style
            p = self.doc.add_paragraph(text, style='Heading 4')
        
        # Apply custom formatting if needed
        self.format_header_paragraph(p, level)

    def format_header_paragraph(self, paragraph, level):
        """Apply custom formatting to header paragraphs"""
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        # Font sizes for different header levels
        font_sizes = {
            1: Pt(16),  # Largest
            2: Pt(14),
            3: Pt(12),
            4: Pt(11)   # Smallest
        }
        
        # Alignment and spacing
        paragraph.paragraph_format.space_after = Pt(6)
        paragraph.paragraph_format.space_before = Pt(12 if level == 1 else 6)
        
        # Apply formatting to all runs in the paragraph
        for run in paragraph.runs:
            run.bold = True  # All headers are bold
            run.font.size = font_sizes.get(level, Pt(11))
            run.font.color.rgb = RGBColor(0, 0, 0)  # Black

    def is_numbered_list_item(self, line):
        """Check if a line starts with a numbered list pattern (1., 2., etc.)"""
        # Pattern: starts with digit(s), followed by period and space
        import re
        pattern = r'^\d+\.\s+'
        return re.match(pattern, line) is not None
    
    def is_bullet_list_item(self, line):
        """Check if a line starts with a bullet list pattern (-, *, •)"""
        # Pattern: starts with hyphen, asterisk, or bullet, followed by space
        import re
        pattern = r'^[-*•]\s+'
        return re.match(pattern, line) is not None
    
    def is_second_level_bullet(self, line):
        """Check if a line starts with a second-level bullet (2 spaces + bullet)"""
        import re
        pattern = r'^\s\s+[-*•]\s+'
        return re.match(pattern, line) is not None
    
    def process_bullet_list(self, list_items, levels=None):
        """Process a bullet list with proper formatting, supporting nested levels"""
        if levels is None:
            levels = [0] * len(list_items)  # Default all to level 0
        
        for i, item in enumerate(list_items):
            level = levels[i] if i < len(levels) else 0
            
            # Remove the bullet prefix (e.g., "- ")
            import re
            clean_text = re.sub(r'^[-*•]\s+', '', str(item).strip())
            
            # Choose style based on level
            if level == 0:
                style = 'List Bullet'
                left_indent = Cm(1.25)
            else:
                style = 'List Bullet 2'  # Second level style
                left_indent = Cm(2.25)
            
            # Create a paragraph with appropriate list style
            p = self.doc.add_paragraph(style=style)
            p.paragraph_format.left_indent = left_indent
            
            # Process any bold text within the list item
            if '**' in clean_text or '*' in clean_text or '`' in clean_text:
                self.process_mixed_formatting_in_paragraph(clean_text, p)
            else:
                p.add_run(clean_text)
            
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(12)
            

    def process_numbered_list(self, list_items):
        """Process a numbered list with proper formatting"""
        for item in list_items:
            # Remove the number prefix (e.g., "1. ")
            import re
            clean_text = re.sub(r'^\d+\.\s+', '', item)
            
            # Create a paragraph with list style
            p = self.doc.add_paragraph(style='List Number')
            #p.paragraph_format.first_line_indent = Cm(0.50)
            p.paragraph_format.left_indent = Cm(1.25)
            
            # Process any bold text within the list item
            if '**' in clean_text or '*' in clean_text or '`' in clean_text:
                self.process_mixed_formatting_in_paragraph(clean_text, p)
            else:
                p.add_run(clean_text)
            
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(12)


    def process_table(self, table_lines):
        """Process markdown table and add to document with formatted text"""
        import re
        from docx.shared import Pt
        
        if len(table_lines) < 2:
            return
        
        # Remove separator lines (|---|)
        table_lines = [line for line in table_lines if not re.match(r'^\|[-:| ]+\|$', line)]
        
        if not table_lines:
            return
        
        # Create table
        num_rows = len(table_lines)
        num_cols = len([cell for cell in table_lines[0].split('|') if cell.strip()])
        
        table = self.doc.add_table(rows=num_rows, cols=num_cols)
        table.style = 'Medium Shading 1'
        
        # Populate table
        for row_idx, line in enumerate(table_lines):
            cells = [cell.strip() for cell in line.split('|') if cell.strip()]
            for col_idx, cell_content in enumerate(cells):
                if col_idx >= num_cols:
                    continue  # Skip if we have more cells than columns
                    
                # Clear the default paragraph in the cell
                cell = table.rows[row_idx].cells[col_idx]
                cell.text = ''  # Clear default text
                
                # Create a new paragraph for the cell
                paragraph = cell.paragraphs[0] if cell.paragraphs else cell.add_paragraph()
                
                # Process formatted text in the table cell
                if '**' in cell_content or '*' in cell_content or '`' in cell_content:
                    self.process_mixed_formatting_in_paragraph(cell_content, paragraph)
                else:
                    # Add plain text
                    run = paragraph.add_run(cell_content)
                    run.font.name = 'Calibri'
                    run.font.size = Pt(11)
                
                # Apply table cell formatting
                self.format_table_cell(paragraph)

    def format_table_cell(self, paragraph):
        """Apply consistent formatting to table cells"""
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        # Set paragraph alignment
        paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
        
        # Set font for all runs in the paragraph
        for run in paragraph.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(10)  # Slightly smaller font for tables
            run.bold = False
            
            # If it's code, keep the monospace font but adjust size
            if run.font.name == 'Courier New':
                run.font.size = Pt(10)
                run.bold = False

    def process_mixed_formatting_in_paragraph(self, text, paragraph):
        """Process text with mixed formatting: **bold**, *italic*, `code`"""
        # We need to handle three types of formatting:
        # **bold**, *italic*, and `code`
        
        # Split by backticks first to handle code
        parts = text.split('`')
        for i, part in enumerate(parts):
            if i % 2 == 1:  # Code part (inside backticks)
                run = paragraph.add_run(part)
                run.font.name = 'Courier New'  # Monospace font for code
                run.font.size = Pt(9)  # Smaller size for code in tables
                run.italic = True
            else:  # Regular text that might contain bold/italic
                self.process_bold_italic_in_text(part, paragraph)
        
        # Apply table cell formatting to all runs
        self.format_table_cell_runs(paragraph)

    def format_table_cell_runs(self, paragraph):
        """Ensure consistent font family in table cells while preserving formatting"""
        from docx.shared import Pt
        
        for run in paragraph.runs:
            # Only change font if it's not code (monospace)
            if run.font.name != 'Courier New':
                run.font.name = 'Calibri'
                run.font.size = Pt(12)

    def process_bold_italic_in_text(self, text, paragraph):
        """Process bold and italic formatting within text"""
        # Handle both **bold** and *italic* in the same text
        # We'll process bold first, then italic
        
        # Split by double asterisks for bold
        bold_parts = text.split('**')
        for i, bold_part in enumerate(bold_parts):
            if i % 2 == 1:  # Bold text
                # Now check if this bold part contains italic
                italic_parts = bold_part.split('*')
                for j, italic_part in enumerate(italic_parts):
                    if j % 2 == 1:  # Italic within bold
                        run = paragraph.add_run(italic_part)
                        run.bold = True
                        run.italic = True
                    else:  # Regular within bold
                        if italic_part:
                            run = paragraph.add_run(italic_part)
                            run.bold = True
            else:  # Non-bold text
                # Check for italic in non-bold text
                italic_parts = bold_part.split('*')
                for j, italic_part in enumerate(italic_parts):
                    if j % 2 == 1:  # Italic text
                        run = paragraph.add_run(italic_part)
                        run.italic = True
                    else:  # Regular text
                        if italic_part:
                            paragraph.add_run(italic_part)

    def process_formatted_text(self, line):
        """Process a line containing formatted text (bold, italic, code)"""
        p = self.doc.add_paragraph()
        self.process_mixed_formatting_in_paragraph(line, p)

    def format_regular_paragraph(self, p):
        """Format regular paragraph"""
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.first_line_indent = Pt(0)  # Small indent
        
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(12)
    
    def generate_report(self, conversation=None):
        """
        Generate the complete report.
        """

        if len(conversation) == 0:
            raise Exception("Data empty")

        equipment_parameter = ""
        chatsql_phase_name = ""
        report_title = "Reporte Técnico"

        for item in conversation:
            param_equipment = item.get('equipment_parameter')
            param_phase = item.get('chatsql_phase_name')
            param_title = item.get('report_title_parameter')
            # Check if param exists, is not None, and not empty after stripping
            if param_equipment and str(param_equipment).strip():
                equipment_parameter = str(param_equipment).strip()
            if param_phase and str(param_phase).strip():
                chatsql_phase_name = str(param_phase).strip()
            if param_title and str(param_title).strip():
                report_title = str(param_title).strip()

        self.create_header(equipment_parameter, chatsql_phase_name)
        self.create_footer()

        p = self.doc.add_paragraph(report_title, style='Heading 1')
        if p.runs:
            run = p.runs[0]
            run.font.name = 'Arial'
            run.font.size = Pt(24)
            run.bold = True
            run.font.color.rgb = RGBColor(0, 0, 0)

        #self.format_paragraph(p, header)
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(12)

        report_str = conversation[0]["conversation"]

        items = [
            "1. Resumen Ejecutivo",
            "2. Integridad de Datos",
            "3. Hallazgos Detectados",
            "4. Síntomas Operativos",
            "5. Análisis Causal",
            "6. Plan Técnico",
            "7. Conclusión Ejecutiva"
        ]

        report_str = replace_headers(report_str, items)

        step_analysis = [item for item in conversation if item.get('type_chat') == 'SqlFlow - StepAnalysis']
        
        # Split content into sections using headers
        sections = split_into_main_sections(report_str, items, step_analysis)

        for header, content, steps in sections:
            if any(item in header for item in items):
                # Add the main header as numbered list item
                header = str(header).replace("#", "").replace("*", "").strip()
                p = self.doc.add_paragraph(header, style='Heading 1')
                if p.runs:
                    run = p.runs[0]
                    run.font.name = 'Arial'
                    run.font.size = Pt(18)
                    run.bold = True
                    run.font.color.rgb = RGBColor(0, 0, 0)

                #self.format_paragraph(p, header)
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(12)
                    
                # Process the content of this section
                self.process_section_content(content, steps)

        #self.add_numbered_list(items)
        
        doc_io = BytesIO()
        self.doc.save(doc_io)
        doc_io.seek(0)

        return doc_io