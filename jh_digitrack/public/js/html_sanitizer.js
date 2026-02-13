// HTML Sanitization Utility for JH Digitrack
// Prevents HTML/XSS injection attacks on form fields

/**
 * Sanitizes dangerous HTML content from user input
 * Removes script tags, event handlers, iframes, and javascript: URLs
 * @param {string} html - The input string to sanitize
 * @returns {string} - The sanitized string
 */
function jh_sanitize_html(html) {
    if (!html || typeof html !== 'string') {
        return html;
    }
    return html
        // Remove event handlers like onclick, onmouseover, onerror, etc.
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
        // Remove script tags and their content
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        // Remove iframe tags
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
        // Remove javascript: URLs
        .replace(/javascript\s*:/gi, '')
        // Remove img tags with onerror/onload (common XSS vector)
        .replace(/<img[^>]*\s+on\w+\s*=[^>]*>/gi, '')
        // Remove object tags
        .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
        // Remove embed tags
        .replace(/<embed\b[^>]*>/gi, '')
        // Remove base tags (can redirect all URLs)
        .replace(/<base\b[^>]*>/gi, '')
        // Remove link tags with javascript
        .replace(/<link[^>]*href\s*=\s*["']?\s*javascript:[^>]*>/gi, '')
        // Remove form tags (prevent phishing forms)
        .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
        // Remove meta refresh tags
        .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, '')
        // Remove svg with scripts
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, function(match) {
            if (/<script|on\w+\s*=/i.test(match)) {
                return '';
            }
            return match;
        })
        // Remove data: URLs in src attributes (can contain scripts)
        .replace(/\s+src\s*=\s*["']?\s*data:[^"'\s>]*/gi, ' src=""')
        // Remove expression() in style attributes (IE vulnerability)
        .replace(/expression\s*\([^)]*\)/gi, '')
        // Remove behavior: in style (IE vulnerability)
        .replace(/behavior\s*:[^;}"']*/gi, '')
        // Remove -moz-binding (Firefox vulnerability)
        .replace(/-moz-binding\s*:[^;}"']*/gi, '');
}

/**
 * Attaches HTML sanitization to form fields
 * @param {Object} frm - The Frappe form object
 * @param {Array} fields - Array of field names to sanitize
 */
function jh_attach_sanitizer(frm, fields) {
    if (!frm || !fields || !Array.isArray(fields)) {
        return;
    }

    fields.forEach(function(field) {
        var control = frm.fields_dict[field];
        if (!control) {
            return;
        }

        // Handle standard input fields (Data, Small Text, etc.)
        if (control.$input) {
            // Remove any existing sanitizer handler to prevent duplicates
            control.$input.off('input.jh_sanitizer');

            // Attach new sanitizer handler
            control.$input.on('input.jh_sanitizer', function() {
                var value = $(this).val();
                var clean = jh_sanitize_html(value);
                if (value !== clean) {
                    $(this).val(clean);
                    frm.set_value(field, clean);
                }
            });
        }

        // Handle Text Editor fields (Quill-based)
        if (control.quill) {
            // Use a debounced approach for Quill to avoid performance issues
            var quillTimeout;
            control.quill.off('text-change.jh_sanitizer');
            control.quill.on('text-change', function() {
                clearTimeout(quillTimeout);
                quillTimeout = setTimeout(function() {
                    var value = control.get_value();
                    var clean = jh_sanitize_html(value);
                    if (value !== clean) {
                        control.set_value(clean);
                    }
                }, 300);
            });
        }

        // Handle textarea fields (Long Text, Text)
        var $wrapper = control.$wrapper;
        if ($wrapper) {
            var $textarea = $wrapper.find('textarea');
            if ($textarea.length) {
                $textarea.off('input.jh_sanitizer');
                $textarea.on('input.jh_sanitizer', function() {
                    var value = $(this).val();
                    var clean = jh_sanitize_html(value);
                    if (value !== clean) {
                        $(this).val(clean);
                        frm.set_value(field, clean);
                    }
                });
            }
        }
    });
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.jh_sanitize_html = jh_sanitize_html;
    window.jh_attach_sanitizer = jh_attach_sanitizer;
}
