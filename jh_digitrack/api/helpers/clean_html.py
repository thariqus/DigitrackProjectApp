import re
from html import unescape


def clean_html(html_string):
    """
    Cleans HTML string by removing all tags and attributes.

    Args:
        html_string (str): The HTML string to clean.

    Returns:
        str: The cleaned HTML string.
    """

    
    # Replace all other tags with a space
    html_string = re.sub(r'<[^>]*>', '\n', html_string)
    
    # Collapse multiple spaces into one
    html_string = re.sub(r' +', ' ', html_string)
    
    # Remove spaces before/after newlines and trim
    html_string = re.sub(r' *\n *', '\n', html_string)
    html_string = re.sub(r'\n\n+', '\n', html_string)
    return html_string.strip()


def clean_html_for_reportlab(html_string):
    """
    Cleans HTML string and converts it to ReportLab-compatible format.
    ReportLab Paragraph supports: <b>, <i>, <u>, <font>, <br/>, <a>, <link>
    
    Args:
        html_string (str): The HTML string to clean.
        
    Returns:
        str: The cleaned HTML string compatible with ReportLab Paragraph.
    """
    
    if not html_string or html_string.strip() in ['-', '']:
        return '-'
    
    # Decode HTML entities first
    html_string = unescape(html_string)
    
    # Convert common HTML tags to ReportLab-supported equivalents
    conversions = {
        # Headers - convert to bold text with line breaks
        r'<h[1-6][^>]*>(.*?)</h[1-6]>': r'<br/><b>\1</b><br/>',
        
        # Paragraphs - convert to line breaks
        r'<p[^>]*>(.*?)</p>': r'\1<br/>',
        r'<div[^>]*>(.*?)</div>': r'\1<br/>',
        
        # Line breaks
        r'<br[^>]*>': '<br/>',
        
        # Strong/Bold - keep as is (ReportLab supports <b>)
        r'<strong[^>]*>(.*?)</strong>': r'<b>\1</b>',
        
        # Emphasis/Italic - keep as is (ReportLab supports <i>)
        r'<em[^>]*>(.*?)</em>': r'<i>\1</i>',
        
        # Underline - keep as is (ReportLab supports <u>)
        r'<u[^>]*>(.*?)</u>': r'<u>\1</u>',
        
        # Lists - convert to simple text with bullets
        r'<ul[^>]*>(.*?)</ul>': r'\1',
        r'<ol[^>]*>(.*?)</ol>': r'\1',
        r'<li[^>]*>(.*?)</li>': r'• \1<br/>',
        
        # Code - convert to monospace font
        r'<code[^>]*>(.*?)</code>': r'<font name="Courier">\1</font>',
        r'<pre[^>]*>(.*?)</pre>': r'<br/><font name="Courier">\1</font><br/>',
        
        # Links - ReportLab supports <a> tags
        # Keep them as is, but clean attributes except href
        r'<a\s+[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>': r'<a href="\1"><font color="blue"><u>\2</u></font></a>',
        
        # Tables - convert to simple text (ReportLab Paragraph doesn't support tables)
        r'<table[^>]*>(.*?)</table>': r'\1',
        r'<tr[^>]*>(.*?)</tr>': r'\1<br/>',
        r'<td[^>]*>(.*?)</td>': r'\1 | ',
        r'<th[^>]*>(.*?)</th>': r'<b>\1</b> | ',
        
        # Blockquotes
        r'<blockquote[^>]*>(.*?)</blockquote>': r'<i>"\1"</i>',
    }
    
    # Apply conversions
    for pattern, replacement in conversions.items():
        html_string = re.sub(pattern, replacement, html_string, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove any remaining HTML tags that aren't supported by ReportLab
    # Keep only: b, i, u, font, br, a, link
    allowed_tags = r'(?:b|i|u|font|br|a|link)'
    html_string = re.sub(rf'<(?!/?{allowed_tags}\b)[^>]*>', '', html_string, flags=re.IGNORECASE)
    
    # Clean up multiple line breaks
    html_string = re.sub(r'(<br/>){3,}', '<br/><br/>', html_string)
    html_string = re.sub(r'^(<br/>)+|(<br/>)+$', '', html_string)
    
    # Clean up multiple spaces
    html_string = re.sub(r'[ \t]+', ' ', html_string)
    
    # Clean up pipe separators from table conversion
    html_string = re.sub(r'\s*\|\s*<br/>', '<br/>', html_string)
    html_string = re.sub(r'\s*\|\s*$', '', html_string, flags=re.MULTILINE)
    
    return html_string.strip() or '-'


def wrap_text_with_html(text, width):
    """
    Wraps text while preserving HTML tags for ReportLab.
    
    Args:
        text (str): Text to wrap (may contain HTML)
        width (int): Maximum line width
        
    Returns:
        str: Wrapped text with HTML preserved
    """
    if not text or len(text) <= width:
        return text
    
    # Split text into HTML tags and text content
    parts = re.split(r'(<[^>]*>)', text)
    
    lines = []
    current_line = []
    current_length = 0
    
    i = 0
    while i < len(parts):
        part = parts[i]
        
        # If it's an HTML tag, add it without counting towards length
        if part.startswith('<') and part.endswith('>'):
            current_line.append(part)
        else:
            # It's text content, split by words
            words = part.split()
            for word in words:
                word_length = len(word)
                
                # Check if adding this word would exceed width
                if current_length + word_length + (1 if current_line and not current_line[-1].startswith('<') else 0) > width:
                    # Start new line if current line has content
                    if current_line:
                        # Filter out empty strings and join
                        line_content = ''.join(current_line)
                        if line_content.strip():
                            lines.append(line_content)
                        current_line = []
                        current_length = 0
                
                # Add word to current line
                if current_line and not current_line[-1].startswith('<') and not word.startswith('<'):
                    current_line.append(' ')
                    current_length += 1
                
                current_line.append(word)
                current_length += word_length
        
        i += 1
    
    # Add remaining content
    if current_line:
        line_content = ''.join(current_line)
        if line_content.strip():
            lines.append(line_content)
    
    return '<br/>'.join(lines)

