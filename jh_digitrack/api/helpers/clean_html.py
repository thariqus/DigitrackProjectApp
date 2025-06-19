import re


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