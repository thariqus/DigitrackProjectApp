"""
File Upload Validation Helper

This module provides comprehensive server-side validation for file uploads to prevent:
- Malicious executable uploads (.exe, .bat, .sh, etc.)
- Double extension attacks (.php.jpg, .exe.pdf, etc.)
- MIME type spoofing by verifying magic bytes (file signatures)

Usage:
    from jh_digitrack.api.helpers.file_validation import validate_uploaded_file
    validate_uploaded_file(file_doc)  # Raises frappe.ValidationError if invalid
"""

import frappe
from frappe import _

# Whitelist of allowed file extensions (safe types)
ALLOWED_EXTENSIONS = {
    # Images
    "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif",
    # Documents
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
    "txt", "rtf", "csv",
    # Archives (if needed - can be removed for stricter security)
    "zip", "rar", "7z", "tar", "gz",
}

# Dangerous extensions that should NEVER be allowed
BLOCKED_EXTENSIONS = {
    # Executables
    "exe", "msi", "bat", "cmd", "com", "scr", "pif", "application",
    "gadget", "hta", "cpl", "msc", "jar",
    # Scripts
    "js", "jse", "ws", "wsf", "wsc", "wsh", "ps1", "ps1xml", "ps2",
    "ps2xml", "psc1", "psc2", "msh", "msh1", "msh2", "mshxml", "msh1xml",
    "msh2xml", "scf", "lnk", "inf", "reg",
    # Server-side scripts
    "php", "php3", "php4", "php5", "php7", "phtml", "pht", "phps",
    "asp", "aspx", "ascx", "ashx", "asmx", "cer", "asa", "cdx",
    "jsp", "jspx", "jsw", "jsv", "jspf", "wss", "do", "action",
    "cgi", "pl", "py", "pyc", "pyo", "rb", "rhtml", "shtml",
    "sh", "bash", "zsh", "csh", "ksh",
    # Other dangerous
    "vbs", "vbe", "vb", "swf", "dll", "so", "dylib",
    "htaccess", "htpasswd", "config",
}

# Magic bytes (file signatures) for common file types
# Format: extension -> (offset, magic_bytes_list)
# Magic bytes are checked at the beginning of the file (offset 0 unless specified)
MAGIC_BYTES = {
    # Images
    "jpg": [(0, [b"\xff\xd8\xff"])],
    "jpeg": [(0, [b"\xff\xd8\xff"])],
    "png": [(0, [b"\x89PNG\r\n\x1a\n"])],
    "gif": [(0, [b"GIF87a", b"GIF89a"])],
    "bmp": [(0, [b"BM"])],
    "webp": [(0, [b"RIFF"]), (8, [b"WEBP"])],  # RIFF....WEBP
    "ico": [(0, [b"\x00\x00\x01\x00"])],
    "tiff": [(0, [b"II*\x00", b"MM\x00*"])],  # Little/Big endian
    "tif": [(0, [b"II*\x00", b"MM\x00*"])],

    # Documents
    "pdf": [(0, [b"%PDF"])],
    # Office 2007+ (docx, xlsx, pptx) - ZIP format with specific structure
    "docx": [(0, [b"PK\x03\x04"])],
    "xlsx": [(0, [b"PK\x03\x04"])],
    "pptx": [(0, [b"PK\x03\x04"])],
    "odt": [(0, [b"PK\x03\x04"])],
    "ods": [(0, [b"PK\x03\x04"])],
    "odp": [(0, [b"PK\x03\x04"])],
    # Office 97-2003 (doc, xls, ppt) - OLE Compound Document
    "doc": [(0, [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"])],
    "xls": [(0, [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"])],
    "ppt": [(0, [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"])],
    "rtf": [(0, [b"{\\rtf"])],

    # Archives
    "zip": [(0, [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"])],
    "rar": [(0, [b"Rar!\x1a\x07\x00", b"Rar!\x1a\x07\x01\x00"])],
    "7z": [(0, [b"7z\xbc\xaf\x27\x1c"])],
    "gz": [(0, [b"\x1f\x8b"])],
    "tar": [(257, [b"ustar"])],  # "ustar" at offset 257
}

# Executable magic bytes to explicitly block
EXECUTABLE_MAGIC_BYTES = [
    b"MZ",              # Windows PE executable (.exe, .dll, .scr)
    b"\x7fELF",         # Linux ELF executable
    b"\xca\xfe\xba\xbe",  # Mach-O (macOS) fat binary
    b"\xfe\xed\xfa\xce",  # Mach-O 32-bit
    b"\xfe\xed\xfa\xcf",  # Mach-O 64-bit
    b"\xcf\xfa\xed\xfe",  # Mach-O 64-bit (reversed)
    b"\xce\xfa\xed\xfe",  # Mach-O 32-bit (reversed)
    b"#!/",             # Shell script shebang
    b"#!",              # Shell script shebang (alternative)
    b"<?php",           # PHP script
    b"<script",         # JavaScript in HTML
    b"<%",              # ASP/JSP
]


def get_file_extension(filename):
    """
    Extract the file extension from filename.
    Returns lowercase extension without the dot.
    """
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def get_all_extensions(filename):
    """
    Extract all extensions from a filename to detect double extensions.
    E.g., "malware.php.jpg" returns ["php", "jpg"]
    """
    if not filename:
        return []

    parts = filename.split(".")
    if len(parts) <= 1:
        return []

    # Return all parts after the first one (all extensions)
    return [ext.lower() for ext in parts[1:]]


def has_double_extension(filename):
    """
    Check if filename has a dangerous double extension pattern.
    E.g., "file.php.jpg", "file.exe.pdf"
    Returns tuple: (has_dangerous_double_ext, detected_dangerous_ext)
    """
    extensions = get_all_extensions(filename)

    if len(extensions) <= 1:
        return False, None

    # Check if any extension (except the last one) is dangerous
    for ext in extensions[:-1]:
        if ext in BLOCKED_EXTENSIONS:
            return True, ext

    return False, None


def is_extension_allowed(filename):
    """
    Check if the file extension is in the allowed whitelist.
    Returns tuple: (is_allowed, extension)
    """
    ext = get_file_extension(filename)

    if not ext:
        return False, ""

    # First check if it's explicitly blocked
    if ext in BLOCKED_EXTENSIONS:
        return False, ext

    # Then check if it's in the allowed whitelist
    if ext in ALLOWED_EXTENSIONS:
        return True, ext

    return False, ext


def verify_magic_bytes(file_content, extension):
    """
    Verify that file content matches expected magic bytes for the extension.
    Returns tuple: (is_valid, reason)
    """
    if not file_content:
        return False, "Empty file content"

    # First, check if the file starts with executable magic bytes
    # This catches cases where someone tries to upload an exe with a safe extension
    for exe_magic in EXECUTABLE_MAGIC_BYTES:
        if file_content[:len(exe_magic)] == exe_magic:
            return False, f"File content appears to be an executable (detected signature)"

    # If we don't have magic bytes defined for this extension, allow it
    # but log for monitoring
    if extension not in MAGIC_BYTES:
        return True, "No magic bytes check available for this extension"

    # Verify magic bytes for known extensions
    magic_checks = MAGIC_BYTES[extension]

    for offset, valid_signatures in magic_checks:
        found_match = False
        for signature in valid_signatures:
            end_pos = offset + len(signature)
            if len(file_content) >= end_pos:
                if file_content[offset:end_pos] == signature:
                    found_match = True
                    break

        if not found_match:
            return False, f"File signature does not match expected format for .{extension}"

    return True, "Magic bytes verified"


def validate_uploaded_file(file_doc):
    """
    Main validation function for uploaded files.

    Args:
        file_doc: Frappe File document

    Raises:
        frappe.ValidationError: If the file fails validation
    """
    filename = file_doc.file_name

    if not filename:
        frappe.throw(_("File name is required"), frappe.ValidationError)

    # Check for double extension attacks
    has_double_ext, dangerous_ext = has_double_extension(filename)
    if has_double_ext:
        frappe.log_error(
            title="Blocked Double Extension Upload",
            message=f"Blocked file upload with double extension: {filename} (detected: .{dangerous_ext})"
        )
        frappe.throw(
            _("File upload blocked: Double extension detected (.{0}). This is not allowed for security reasons.").format(dangerous_ext),
            frappe.ValidationError
        )

    if file_doc.attached_to_doctype == "JH Project Item":
        item_extension = get_file_extension(filename)
        allowed_item_extensions = {"xls", "xlsx", "pdf", "doc", "docx"}
        if item_extension not in allowed_item_extensions:
            frappe.throw(
                _("Item attachments must be Excel, PDF, or Word documents."),
                frappe.ValidationError,
            )

    # Check if extension is allowed
    is_allowed, ext = is_extension_allowed(filename)
    if not is_allowed:
        if ext in BLOCKED_EXTENSIONS:
            frappe.log_error(
                title="Blocked Dangerous File Upload",
                message=f"Blocked dangerous file upload: {filename}"
            )
            frappe.throw(
                _("File upload blocked: .{0} files are not allowed for security reasons.").format(ext),
                frappe.ValidationError
            )
        else:
            frappe.throw(
                _("File upload blocked: .{0} files are not in the allowed file types. Allowed types: images, documents, PDFs.").format(ext),
                frappe.ValidationError
            )

    # Read file content for magic byte verification
    file_content = None
    try:
        if file_doc.file_url:
            file_path = file_doc.get_full_path()
            if file_path:
                import os
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        # Read only first 512 bytes for magic byte check
                        file_content = f.read(512)
        elif hasattr(file_doc, "content") and file_doc.content:
            # If content is available directly (before save)
            file_content = file_doc.content[:512] if len(file_doc.content) > 512 else file_doc.content
    except Exception as e:
        # Log the error but continue - better to allow than to break functionality
        frappe.log_error(
            title="File Validation Warning",
            message=f"Could not read file content for magic byte verification: {filename}. Error: {str(e)}"
        )

    # Verify magic bytes if content is available
    if file_content:
        is_valid, reason = verify_magic_bytes(file_content, ext)
        if not is_valid:
            frappe.log_error(
                title="Blocked File - Magic Byte Mismatch",
                message=f"Blocked file upload with invalid signature: {filename}. Reason: {reason}"
            )
            frappe.throw(
                _("File upload blocked: {0}").format(reason),
                frappe.ValidationError
            )


def validate_file_before_insert(doc, method=None):
    """
    Hook function to be called before File document insert.
    This is registered in hooks.py under doc_events.
    """
    validate_uploaded_file(doc)


def validate_attachment_field(file_url, filename=None):
    """
    Validate a file URL from an Attach field.
    Use this for validating files already uploaded via Attach fields.

    Args:
        file_url: The file URL (e.g., /files/myfile.pdf)
        filename: Optional filename override

    Raises:
        frappe.ValidationError: If the file fails validation
    """
    if not file_url:
        return

    # Extract filename from URL if not provided
    if not filename:
        filename = file_url.split("/")[-1] if "/" in file_url else file_url

    # Check for double extension attacks
    has_double_ext, dangerous_ext = has_double_extension(filename)
    if has_double_ext:
        frappe.throw(
            _("File not allowed: Double extension detected (.{0}).").format(dangerous_ext),
            frappe.ValidationError
        )

    # Check if extension is allowed
    is_allowed, ext = is_extension_allowed(filename)
    if not is_allowed:
        if ext in BLOCKED_EXTENSIONS:
            frappe.throw(
                _("File not allowed: .{0} files are blocked for security reasons.").format(ext),
                frappe.ValidationError
            )
        else:
            frappe.throw(
                _("File not allowed: .{0} is not in the allowed file types.").format(ext),
                frappe.ValidationError
            )
