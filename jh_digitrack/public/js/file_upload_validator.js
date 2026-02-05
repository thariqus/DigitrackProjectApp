// File Upload Validation for JH Digitrack
// Prevents malicious file uploads (VAPT security fix)
// This provides client-side validation for immediate user feedback
// Server-side validation is also implemented for security

(function() {
    'use strict';

    // Whitelist of allowed file extensions (must match server-side)
    var ALLOWED_EXTENSIONS = [
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif',
        // Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
        'txt', 'rtf', 'csv',
        // Archives
        'zip', 'rar', '7z', 'tar', 'gz'
    ];

    // Dangerous extensions that should NEVER be allowed
    var BLOCKED_EXTENSIONS = [
        // Executables
        'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'application',
        'gadget', 'hta', 'cpl', 'msc', 'jar',
        // Scripts
        'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps1xml', 'ps2',
        'ps2xml', 'psc1', 'psc2', 'msh', 'msh1', 'msh2', 'mshxml', 'msh1xml',
        'msh2xml', 'scf', 'lnk', 'inf', 'reg',
        // Server-side scripts
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'pht', 'phps',
        'asp', 'aspx', 'ascx', 'ashx', 'asmx', 'cer', 'asa', 'cdx',
        'jsp', 'jspx', 'jsw', 'jsv', 'jspf', 'wss', 'do', 'action',
        'cgi', 'pl', 'py', 'pyc', 'pyo', 'rb', 'rhtml', 'shtml',
        'sh', 'bash', 'zsh', 'csh', 'ksh',
        // Other dangerous
        'vbs', 'vbe', 'vb', 'swf', 'dll', 'so', 'dylib',
        'htaccess', 'htpasswd', 'config'
    ];

    /**
     * Get file extension from filename
     */
    function getFileExtension(filename) {
        if (!filename || filename.indexOf('.') === -1) {
            return '';
        }
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Get all extensions from filename to detect double extensions
     */
    function getAllExtensions(filename) {
        if (!filename) {
            return [];
        }
        var parts = filename.split('.');
        if (parts.length <= 1) {
            return [];
        }
        return parts.slice(1).map(function(ext) {
            return ext.toLowerCase();
        });
    }

    /**
     * Check if filename has a dangerous double extension
     */
    function hasDoubleExtension(filename) {
        var extensions = getAllExtensions(filename);
        if (extensions.length <= 1) {
            return { hasDangerous: false, extension: null };
        }

        // Check if any extension (except the last one) is dangerous
        for (var i = 0; i < extensions.length - 1; i++) {
            if (BLOCKED_EXTENSIONS.indexOf(extensions[i]) !== -1) {
                return { hasDangerous: true, extension: extensions[i] };
            }
        }
        return { hasDangerous: false, extension: null };
    }

    /**
     * Validate a single file
     */
    function validateFile(file) {
        var filename = file.name;
        var ext = getFileExtension(filename);

        // Check for double extension attacks
        var doubleExtCheck = hasDoubleExtension(filename);
        if (doubleExtCheck.hasDangerous) {
            return {
                valid: false,
                message: __('File not allowed: Double extension detected (.{0}). This is blocked for security reasons.', [doubleExtCheck.extension])
            };
        }

        // Check if extension is blocked
        if (BLOCKED_EXTENSIONS.indexOf(ext) !== -1) {
            return {
                valid: false,
                message: __('File not allowed: .{0} files are blocked for security reasons.', [ext])
            };
        }

        // Check if extension is in whitelist
        if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
            return {
                valid: false,
                message: __('File not allowed: .{0} is not an allowed file type. Please upload images, documents, or PDFs.', [ext])
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * Show error message to user
     */
    function showError(message) {
        frappe.msgprint({
            title: __('File Upload Blocked'),
            indicator: 'red',
            message: message
        });
    }

    /**
     * Initialize file upload validation
     * Hooks into Frappe's file uploader
     */
    function initFileUploadValidation() {
        // Override Frappe's file uploader validation
        if (frappe.ui && frappe.ui.FileUploader) {
            var originalUploader = frappe.ui.FileUploader;

            frappe.ui.FileUploader = function(opts) {
                var originalOnSuccess = opts.on_success;

                // Wrap the upload start to validate files
                var originalStartUpload = null;

                var uploader = new originalUploader(opts);

                // Hook into upload_files method if available
                if (uploader.upload_files) {
                    var originalUploadFiles = uploader.upload_files.bind(uploader);
                    uploader.upload_files = function() {
                        // Validate files before upload
                        var files = uploader.files || [];
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i].file || files[i];
                            var result = validateFile(file);
                            if (!result.valid) {
                                showError(result.message);
                                return;
                            }
                        }
                        return originalUploadFiles();
                    };
                }

                return uploader;
            };
        }

        // Also hook into the standard file input change event
        $(document).on('change', 'input[type="file"]', function(e) {
            var files = e.target.files;
            if (!files || !files.length) {
                return;
            }

            for (var i = 0; i < files.length; i++) {
                var result = validateFile(files[i]);
                if (!result.valid) {
                    showError(result.message);
                    // Clear the file input
                    $(e.target).val('');
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Hook into frappe.upload_file if it exists
        if (frappe.upload_file) {
            var originalUploadFile = frappe.upload_file;
            frappe.upload_file = function(file, args, callback, opts) {
                var fileToCheck = file;
                if (file && file.name) {
                    var result = validateFile(file);
                    if (!result.valid) {
                        showError(result.message);
                        if (callback) {
                            callback(null, result.message);
                        }
                        return;
                    }
                }
                return originalUploadFile.call(this, file, args, callback, opts);
            };
        }
    }

    // Initialize when DOM is ready
    $(document).ready(function() {
        initFileUploadValidation();
    });

    // Also initialize when Frappe is ready (in case of late loading)
    if (typeof frappe !== 'undefined' && frappe.ready) {
        frappe.ready(function() {
            initFileUploadValidation();
        });
    }

    // Export for testing/external use
    if (typeof window !== 'undefined') {
        window.jh_file_validator = {
            validateFile: validateFile,
            getAllowedExtensions: function() { return ALLOWED_EXTENSIONS.slice(); },
            getBlockedExtensions: function() { return BLOCKED_EXTENSIONS.slice(); }
        };
    }

})();
