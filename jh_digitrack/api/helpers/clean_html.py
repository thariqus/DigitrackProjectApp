import re


def clean_html(html_string):
    """
    Cleans HTML string by removing all tags and attributes.

    Args:
        html_string (str): The HTML string to clean.

    Returns:
        str: The cleaned HTML string.
    """
    return re.sub(r"<[^>]*>", "", html_string)
