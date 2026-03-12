import { useCallback, useEffect, useMemo, useState } from "react";
import { useHasJrcPermission } from "@/hooks/userrole";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";

type FolderNode = {
  key: string;
  name: string;
  children: FolderNode[];
};

type EmployeeOption = {
  employee_name: string;
  email: string;
  employee_code?: string;
};

type GroupMember = {
  email: string;
  employee_name: string;
};
type TableColumn = {
  key: string;
  header: string;
  sourceIndex?: number;
  userNameSourceIndex?: number;
  userEmailSourceIndex?: number;
};
type SortConfig = {
  key: string;
  sourceIndex?: number;
  userNameSourceIndex?: number;
  userEmailSourceIndex?: number;
};

const BLANK_FOLDER = "(Blank)";
const FULL_PATH_SORT_KEY = "__full_path__";
const USER_IDENTITY_COLUMN_KEY = "__user_identity_column__";
const USER_IDENTITY_SORT_KEY = "__user_identity__";
const USER_NAME_EMAIL_HEADER = "User Name / User Email";
// Shared email matcher used to parse email cell values from preview rows.
const EMAIL_PATTERN = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi;
// Business rule: these upload metadata fields must stay hidden in the preview table.
const HIDDEN_TABLE_HEADERS = new Set([
  "linkid",
  "linktype",
  "accessvialinkid",
  "herolinkaudience",
  "herolinkrole",
  "userorgrouptype",
]);
const NAME_HEADERS = new Set([
  "firstname",
  "name",
  "employeename",
  "fullname",
]);
const EMAIL_HEADERS = new Set([
  "email",
  "useremail",
  "individualemail",
  "memberemail",
  "employeeemail",
]);
const PERMISSION_HEADERS = new Set(["permission", "premission"]);
const PERMISSION_TOOLTIP_BY_VALUE: Record<string, string> = {
  "restricted view": "permission to View files",
  contribute: "permission to Create Sub Folders, Create/Rename/Delete Subfolders and Files",
  read: "permission to make small edit",
  "full control": "permission for Create/Rename Folder,Create/Rename/Delete Files",
};

function normalizeHeader(value: string): string {
  // Normalization lets us match headers safely even if spacing/case changes in Excel.
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitFolderPath(value: string): string[] {
  const text = (value || "").trim();
  if (!text) return [BLANK_FOLDER];

  // Support multiple folder path formats coming from Excel values.
  const delimiter = text.includes("\\")
    ? /\\+/g
    : text.includes("/")
      ? /\/+/g
      : text.includes(">")
        ? />+/g
        : null;

  const segments = delimiter
    ? text.split(delimiter).map((segment) => segment.trim())
    : [text];

  return segments.filter(Boolean).length > 0
    ? segments.filter(Boolean)
    : [BLANK_FOLDER];
}

function buildFolderHierarchy(rows: string[][]): {
  tree: FolderNode[];
  rowIndexesByFolder: Record<string, number[]>;
} {
  type MutableNode = {
    key: string;
    name: string;
    children: Record<string, MutableNode>;
  };

  const root: MutableNode = { key: "", name: "", children: {} };
  const rowIndexesByFolder: Record<string, number[]> = {};

  rows.forEach((row, rowIndex) => {
    // First Excel column is treated as folder path source for left hierarchy.
    const folderValue = row[0] || "";
    const segments = splitFolderPath(folderValue);
    let current = root;
    let currentPath = "";

    segments.forEach((segment) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!current.children[segment]) {
        current.children[segment] = {
          key: currentPath,
          name: segment,
          children: {},
        };
      }
      current = current.children[segment];
      // Keep reverse mapping to filter right-side rows when a folder is selected.
      if (!rowIndexesByFolder[currentPath]) {
        rowIndexesByFolder[currentPath] = [];
      }
      rowIndexesByFolder[currentPath].push(rowIndex);
    });
  });

  const toImmutableNodes = (node: MutableNode): FolderNode[] =>
    Object.values(node.children)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((child) => ({
        key: child.key,
        name: child.name,
        children: toImmutableNodes(child),
      }));

  const rootNodes = toImmutableNodes(root);
  // Tree should start from business folders directly (skip Personal wrapper level).
  const personalRoot = rootNodes.find(
    (node) => normalizeHeader(node.name) === "personal"
  );

  return {
    tree: personalRoot ? personalRoot.children : rootNodes,
    rowIndexesByFolder,
  };
}

function filterFolderTreeBySearch(nodes: FolderNode[], searchText: string): {
  nodes: FolderNode[];
  autoExpandedKeys: Set<string>;
} {
  const query = searchText.trim().toLowerCase();
  if (!query) {
    return { nodes, autoExpandedKeys: new Set() };
  }

  const autoExpandedKeys = new Set<string>();

  const recursiveFilter = (node: FolderNode): FolderNode | null => {
    const childMatches = node.children
      .map((child) => recursiveFilter(child))
      .filter((child): child is FolderNode => !!child);
    const isMatch = node.name.toLowerCase().includes(query);

    if (!isMatch && childMatches.length === 0) {
      return null;
    }

    if (childMatches.length > 0) {
      autoExpandedKeys.add(node.key);
    }

    return {
      ...node,
      children: childMatches,
    };
  };

  return {
    nodes: nodes
      .map((node) => recursiveFilter(node))
      .filter((node): node is FolderNode => !!node),
    autoExpandedKeys,
  };
}

function JRCPermission() {
  // Keep upload types aligned with backend parser support in user_details.py
  // (_build_excel_preview_from_file_url fallback chain: XLSX -> ODS -> CSV).
  const isAllowedUploadFile = (file: File | null) => {
    if (!file?.name) return false;
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv");
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDmailFile, setSelectedDmailFile] = useState<File | null>(null);
  const [isDmailUploading, setIsDmailUploading] = useState(false);
  const [dmailUploadError, setDmailUploadError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderSearchText, setFolderSearchText] = useState("");
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [employeeSearchResults, setEmployeeSearchResults] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [isEmployeeSearchLoading, setIsEmployeeSearchLoading] = useState(false);
  const [hasLoadedDefaultPreview, setHasLoadedDefaultPreview] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    file_name?: string;
    file_url?: string;
    date?: string;
  } | null>(null);
  const [uploadedDmailFile, setUploadedDmailFile] = useState<{
    file_name?: string;
    file_url?: string;
    date?: string;
  } | null>(null);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [isGroupMembersLoading, setIsGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState("");
  const [selectedGroupEmail, setSelectedGroupEmail] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMemberSearchText, setGroupMemberSearchText] = useState("");
  const [knownGroupEmails, setKnownGroupEmails] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const { data: jrcPermission, isLoading: isJrcPermissionLoading } =
    useHasJrcPermission();
  // Upload option is restricted to users with JRC Permission role.
  const canUpload = !!jrcPermission?.message?.has_access;

  const { tree: folderTree, rowIndexesByFolder } = useMemo(
    () => buildFolderHierarchy(previewRows),
    [previewRows]
  );
  const { nodes: searchableFolderTree, autoExpandedKeys } = useMemo(
    () => filterFolderTreeBySearch(folderTree, folderSearchText),
    [folderTree, folderSearchText]
  );

  // Hide first Excel column in table (shown in left folder tree)
  // and remove backend-only link metadata columns from UI.
  const tableColumns = useMemo<TableColumn[]>(
    () => {
      // Keep original sourceIndex so every cell can still read from the raw row array.
      const visibleColumns: TableColumn[] = previewHeaders
        .map((header, sourceIndex) => ({
          key: `column-${sourceIndex}`,
          header,
          sourceIndex,
        }))
        .filter(
          ({ header, sourceIndex }) =>
            (sourceIndex ?? -1) > 0 && !HIDDEN_TABLE_HEADERS.has(normalizeHeader(header))
        );

      const nameIndex = visibleColumns.findIndex(({ header }) =>
        NAME_HEADERS.has(normalizeHeader(header))
      );
      const emailIndex = visibleColumns.findIndex(({ header }) => {
        const normalized = normalizeHeader(header);
        return (
          EMAIL_HEADERS.has(normalized) ||
          normalized.includes("email") ||
          normalized.includes("mail")
        );
      });

      // Keep overall order and only swap Name and Email positions when Email appears first.
      if (nameIndex < 0 || emailIndex < 0 || nameIndex < emailIndex) {
        const userNameColumnIndex = visibleColumns.findIndex(({ header }) => {
          const normalized = normalizeHeader(header);
          return normalized === "username" || normalized === "user";
        });
        const userEmailColumnIndex = visibleColumns.findIndex(({ header }) => {
          const normalized = normalizeHeader(header);
          return normalized === "useremail";
        });
        if (userNameColumnIndex < 0 || userEmailColumnIndex < 0) {
          return visibleColumns;
        }

        const mergedColumns: TableColumn[] = [];
        visibleColumns.forEach((column, index) => {
          if (index === userNameColumnIndex) {
            mergedColumns.push({
              key: USER_IDENTITY_COLUMN_KEY,
              header: USER_NAME_EMAIL_HEADER,
              userNameSourceIndex: visibleColumns[userNameColumnIndex].sourceIndex,
              userEmailSourceIndex: visibleColumns[userEmailColumnIndex].sourceIndex,
            });
            return;
          }
          if (index === userEmailColumnIndex) {
            return;
          }
          mergedColumns.push(column);
        });
        return mergedColumns;
      }

      const reorderedColumns = [...visibleColumns];
      [reorderedColumns[nameIndex], reorderedColumns[emailIndex]] = [
        reorderedColumns[emailIndex],
        reorderedColumns[nameIndex],
      ];

      const userNameColumnIndex = reorderedColumns.findIndex(({ header }) => {
        const normalized = normalizeHeader(header);
        return normalized === "username" || normalized === "user";
      });
      const userEmailColumnIndex = reorderedColumns.findIndex(({ header }) => {
        const normalized = normalizeHeader(header);
        return normalized === "useremail";
      });
      if (userNameColumnIndex < 0 || userEmailColumnIndex < 0) {
        return reorderedColumns;
      }

      const mergedColumns: TableColumn[] = [];
      reorderedColumns.forEach((column, index) => {
        if (index === userNameColumnIndex) {
          mergedColumns.push({
            key: USER_IDENTITY_COLUMN_KEY,
            header: USER_NAME_EMAIL_HEADER,
            userNameSourceIndex: reorderedColumns[userNameColumnIndex].sourceIndex,
            userEmailSourceIndex: reorderedColumns[userEmailColumnIndex].sourceIndex,
          });
          return;
        }
        if (index === userEmailColumnIndex) {
          return;
        }
        mergedColumns.push(column);
      });
      return mergedColumns;
    },
    [previewHeaders]
  );
  const emailColumnIndex = useMemo(
    () =>
      // Resolve email from original headers (not visible column position),
      // so group-panel click behavior stays correct after hiding columns.
      previewHeaders.findIndex((header) => {
        const normalized = normalizeHeader(header);
        return normalized === "email" || normalized === "useremail";
      }),
    [previewHeaders]
  );
  const permissionColumnIndex = useMemo(
    () =>
      previewHeaders.findIndex((header) => {
        const normalized = normalizeHeader(header);
        return (
          PERMISSION_HEADERS.has(normalized) ||
          normalized.includes("permission") ||
          normalized.includes("premission")
        );
      }),
    [previewHeaders]
  );
  const knownGroupEmailSet = useMemo(
    () => new Set(knownGroupEmails.map((email) => email.toLowerCase().trim())),
    [knownGroupEmails]
  );

  const extractEmailsFromText = (value: string) => {
    const text = (value || "").trim().toLowerCase();
    if (!text) return [];
    const matches = text.match(EMAIL_PATTERN) || [];
    return Array.from(new Set(matches));
  };

  const getClickedGroupEmail = (rawValue: string) => {
    // Only group IDs from dmail mapping are allowed to open team-member side panel.
    const emails = extractEmailsFromText(rawValue);
    for (const email of emails) {
      if (knownGroupEmailSet.has(email)) {
        return email;
      }
    }
    return "";
  };
  const getPermissionTooltip = (rawValue: string) =>
    PERMISSION_TOOLTIP_BY_VALUE[(rawValue || "").trim().toLowerCase()] || "";
  const folderFilteredRows = useMemo(() => {
    if (!selectedFolderKey) {
      return previewRows;
    }
    const rowIndexes = rowIndexesByFolder[selectedFolderKey] || [];
    return rowIndexes.map((index) => previewRows[index]).filter(Boolean);
  }, [previewRows, rowIndexesByFolder, selectedFolderKey]);
  const filteredRows = useMemo(() => {
    if (!selectedEmployee?.email || emailColumnIndex < 0) {
      return folderFilteredRows;
    }
    const selectedEmail = selectedEmployee.email.trim().toLowerCase();
    return folderFilteredRows.filter((row) => {
      const rowEmail = (row[emailColumnIndex] || "").trim().toLowerCase();
      return rowEmail === selectedEmail;
    });
  }, [folderFilteredRows, selectedEmployee, emailColumnIndex]);
  const getFullPathFromRow = useCallback(
    (row: string[]) => splitFolderPath(row[0] || "").join(" / "),
    []
  );
  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return filteredRows;
    }

    const rowsWithIndexes = filteredRows.map((row, index) => ({ row, index }));
    rowsWithIndexes.sort((left, right) => {
      const leftValue =
        sortConfig.key === FULL_PATH_SORT_KEY
          ? getFullPathFromRow(left.row)
          : sortConfig.key === USER_IDENTITY_SORT_KEY
            ? (left.row[sortConfig.userNameSourceIndex ?? -1] || "").trim()
          : left.row[sortConfig.sourceIndex ?? -1] || "";
      const rightValue =
        sortConfig.key === FULL_PATH_SORT_KEY
          ? getFullPathFromRow(right.row)
          : sortConfig.key === USER_IDENTITY_SORT_KEY
            ? (right.row[sortConfig.userNameSourceIndex ?? -1] || "").trim()
          : right.row[sortConfig.sourceIndex ?? -1] || "";

      const comparison = leftValue
        .trim()
        .localeCompare(rightValue.trim(), undefined, {
          sensitivity: "base",
          numeric: true,
        });

      if (comparison !== 0) return comparison;

      if (sortConfig.key === USER_IDENTITY_SORT_KEY) {
        const leftEmail = (left.row[sortConfig.userEmailSourceIndex ?? -1] || "").trim();
        const rightEmail = (right.row[sortConfig.userEmailSourceIndex ?? -1] || "").trim();
        const emailComparison = leftEmail.localeCompare(rightEmail, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        if (emailComparison !== 0) return emailComparison;
      }
      return left.index - right.index;
    });

    return rowsWithIndexes.map(({ row }) => row);
  }, [filteredRows, getFullPathFromRow, sortConfig]);
  const filteredGroupMembers = useMemo(() => {
    const query = groupMemberSearchText.trim().toLowerCase();
    if (!query) return groupMembers;
    return groupMembers.filter((member) => {
      const name = (member.employee_name || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [groupMembers, groupMemberSearchText]);
  const handleColumnSort = (
    key: string,
    sourceIndex?: number,
    userNameSourceIndex?: number,
    userEmailSourceIndex?: number
  ) => {
    setSortConfig((previous) => {
      if (previous?.key === key) {
        // Second click on same header resets to default row order.
        return null;
      }
      return {
        key,
        sourceIndex,
        userNameSourceIndex,
        userEmailSourceIndex,
      };
    });
  };
  const getSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return "";
    return "A-Z";
  };

  const fetchPreview = async (fileUrl?: string) => {
    if (!fileUrl) return;

    setIsPreviewLoading(true);
    setPreviewError("");

    try {
      // Backend applies row-level visibility filtering; frontend only renders returned rows.
      const previewApiUrl = `/api/method/jh_digitrack.api.user_details.get_jrc_upload_preview?file_url=${encodeURIComponent(
        fileUrl
      )}`;
      const response = await fetch(
        previewApiUrl
      );
      const result = await response.json();

      if (!response.ok) {
        const message =
          result?.message || result?.exc || "Failed to load Excel preview.";
        throw new Error(message);
      }

      // Handle both wrapped and direct Frappe response shapes.
      const preview = result?.message?.message || result?.message || {};
      const headers = Array.isArray(preview?.headers) ? preview.headers : [];
      const rows = Array.isArray(preview?.rows) ? preview.rows : [];

      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setSelectedFolderKey(null);
      setExpandedFolders({});
      setFolderSearchText("");
      setEmployeeSearchText("");
      setEmployeeSearchResults([]);
      setSelectedEmployee(null);
    } catch (error) {
      setPreviewHeaders([]);
      setPreviewRows([]);
      setSelectedFolderKey(null);
      setExpandedFolders({});
      setFolderSearchText("");
      setEmployeeSearchText("");
      setEmployeeSearchResults([]);
      setSelectedEmployee(null);
      setPreviewError(
        error instanceof Error ? error.message : "Unable to load preview table."
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const fetchLatestPreview = async () => {
    setIsPreviewLoading(true);
    setPreviewError("");

    try {
      const latestPreviewApiUrl =
        "/api/method/jh_digitrack.api.user_details.get_latest_jrc_upload_preview";
      const response = await fetch(
        latestPreviewApiUrl
      );
      const result = await response.json();

      if (!response.ok) {
        const message =
          result?.message || result?.exc || "Failed to load latest Excel preview.";
        throw new Error(message);
      }

      // Default table load uses latest uploaded Excel resolved by backend.
      const preview = result?.message?.message || result?.message || {};
      const headers = Array.isArray(preview?.headers) ? preview.headers : [];
      const rows = Array.isArray(preview?.rows) ? preview.rows : [];

      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setSelectedFolderKey(null);
      setExpandedFolders({});
      setFolderSearchText("");
      setEmployeeSearchText("");
      setEmployeeSearchResults([]);
      setSelectedEmployee(null);

      if (preview?.file_url) {
        setUploadedFile({
          file_name: preview.file_name || preview.file_url.split("/").pop() || "View file",
          file_url: preview.file_url,
          date: preview.date || "",
        });
      } else {
        setUploadedFile(null);
      }
      // If latest preview already includes dmail metadata, use it immediately.
      const latestDmailUpload = preview?.dmail_upload || {};
      if (latestDmailUpload?.file_url) {
        setUploadedDmailFile({
          file_name:
            latestDmailUpload.file_name ||
            latestDmailUpload.file_url.split("/").pop() ||
            "View file",
          file_url: latestDmailUpload.file_url,
          date: latestDmailUpload.date || "",
        });
      }
    } catch (error) {
      setPreviewHeaders([]);
      setPreviewRows([]);
      setSelectedFolderKey(null);
      setExpandedFolders({});
      setFolderSearchText("");
      setEmployeeSearchText("");
      setEmployeeSearchResults([]);
      setSelectedEmployee(null);
      setPreviewError(
        error instanceof Error ? error.message : "Unable to load latest preview table."
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const fetchLatestDmailUpload = async () => {
    try {
      // Keep second upload card stable after refresh by always loading latest backend metadata.
      const response = await fetch(
        `/api/method/jh_digitrack.api.user_details.get_latest_jrc_dmail_upload?ts=${Date.now()}`
      );
      const result = await response.json();
      if (!response.ok) {
        return;
      }

      const payload = result?.message?.message || result?.message || {};
      if (payload?.file_url) {
        setUploadedDmailFile({
          file_name: payload.file_name || payload.file_url.split("/").pop() || "View file",
          file_url: payload.file_url,
          date: payload.date || "",
        });
      } else {
        // Clear only when backend explicitly confirms there is no latest dmail file.
        setUploadedDmailFile(null);
      }
    } catch {}
  };

  const fetchKnownGroupEmails = async () => {
    try {
      // Build a client-side allow-list for clickable group IDs in Email column.
      const response = await fetch(
        "/api/method/jh_digitrack.api.user_details.get_jrc_group_email_list"
      );
      const result = await response.json();
      if (!response.ok) {
        setKnownGroupEmails([]);
        return;
      }

      const payload = result?.message?.message || result?.message || {};
      const emails = Array.isArray(payload?.group_emails) ? payload.group_emails : [];
      setKnownGroupEmails(
        emails
          .map((value: unknown) => String(value || "").trim().toLowerCase())
          .filter((value: string) => !!value)
      );
    } catch {
      setKnownGroupEmails([]);
    }
  };

  const highlightFolderText = (text: string) => {
    const query = folderSearchText.trim();
    if (!query) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const startIndex = lowerText.indexOf(lowerQuery);
    if (startIndex === -1) return text;

    const endIndex = startIndex + query.length;
    const before = text.slice(0, startIndex);
    const matched = text.slice(startIndex, endIndex);
    const after = text.slice(endIndex);

    return (
      <>
        {before}
        <span className="bg-yellow-200 text-black px-0.5 rounded">{matched}</span>
        {after}
      </>
    );
  };

  useEffect(() => {
    const searchText = employeeSearchText.trim();
    if (searchText.length < 2 || selectedEmployee?.employee_name === searchText) {
      setEmployeeSearchResults([]);
      return;
    }

    let isMounted = true;
    setIsEmployeeSearchLoading(true);

    // Debounce employee lookup so API is not called on every keystroke.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/method/jh_digitrack.api.user_details.search_jh_user_master_employees?query=${encodeURIComponent(
            searchText
          )}&limit=10`
        );
        const result = await response.json();
        if (!isMounted) return;

        if (!response.ok) {
          setEmployeeSearchResults([]);
          return;
        }

        const employees = result?.message?.message?.employees || result?.message?.employees || [];
        setEmployeeSearchResults(Array.isArray(employees) ? employees : []);
      } catch {
        if (isMounted) {
          setEmployeeSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsEmployeeSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      setIsEmployeeSearchLoading(false);
    };
  }, [employeeSearchText, selectedEmployee]);

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((previous) => ({
      ...previous,
      [folderKey]: !previous[folderKey],
    }));
  };

  const getFolderKeysFromRow = (row: string[]) => {
    // Rebuild full folder key chain (parent -> child) from hidden first column value.
    const segments = splitFolderPath(row[0] || "");
    const keys: string[] = [];
    let currentPath = "";

    segments.forEach((segment) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      keys.push(currentPath);
    });

    return keys;
  };
  const handleTableRowClick = (row: string[]) => {
    // Clicking a table row should sync left tree to that row's folder path.
    const folderKeys = getFolderKeysFromRow(row);
    if (folderKeys.length === 0) {
      setSelectedFolderKey(null);
      return;
    }

    const targetFolderKey = folderKeys[folderKeys.length - 1];
    setSelectedFolderKey(targetFolderKey);
    setExpandedFolders((previous) => {
      const next = { ...previous };
      // Expand every parent key so selected folder is visible/highlighted in the tree.
      folderKeys.forEach((key) => {
        next[key] = true;
      });
      return next;
    });
  };

  const handleGroupEmailClick = async (rawValue: string) => {
    const candidate = (rawValue || "").trim();
    if (!candidate || !candidate.includes("@")) return;

    setSelectedGroupEmail(candidate);
    setGroupMembers([]);
    setGroupMemberSearchText("");
    setGroupMembersError("");
    setIsGroupMembersOpen(true);
    setIsGroupMembersLoading(true);

    try {
      const response = await fetch(
        `/api/method/jh_digitrack.api.user_details.get_jrc_group_members?group_email=${encodeURIComponent(
          candidate
        )}`
      );
      const result = await response.json();

      if (!response.ok) {
        const message = result?.message || result?.exc || "Failed to load group members.";
        throw new Error(message);
      }

      const payload = result?.message?.message || result?.message || {};
      const members = Array.isArray(payload?.members) ? payload.members : [];
      setSelectedGroupEmail(payload?.group_email || candidate);
      setGroupMembers(members);
    } catch (error) {
      setGroupMembers([]);
      setGroupMembersError(
        error instanceof Error ? error.message : "Unable to load group members."
      );
    } finally {
      setIsGroupMembersLoading(false);
    }
  };

  const renderFolderNode = (node: FolderNode, level = 0) => {
    const hasChildren = node.children.length > 0;
    const isFolderNameMatched = node.name
      .toLowerCase()
      .includes(folderSearchText.trim().toLowerCase());
    const isExpanded = folderSearchText.trim()
      ? isFolderNameMatched || autoExpandedKeys.has(node.key) || !!expandedFolders[node.key]
      : !!expandedFolders[node.key];
    const isSelected = selectedFolderKey === node.key;

    return (
      <div key={node.key}>
        <button
          type="button"
          onClick={() => {
            setSelectedFolderKey(node.key);
            if (hasChildren) {
              toggleFolder(node.key);
            }
          }}
          className={`w-full flex items-center gap-1 px-2 py-1.5 rounded text-xs text-left ${
            isSelected ? "bg-[#972e26] text-white" : ""
          }`}
          style={{ paddingLeft: `${level * 10}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <span className="inline-block w-3.5" />
          )}
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span
            title={node.key || node.name}
            className={`truncate rounded px-1 ${
              isSelected ? "" : "hover:bg-rose-50"
            }`}
          >
            {highlightFolderText(node.name)}
          </span>
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (hasLoadedDefaultPreview || isJrcPermissionLoading) return;
    // Load once when access checks are complete so table opens with latest file by default.
    setHasLoadedDefaultPreview(true);
    void (async () => {
      await fetchLatestPreview();
      // Second upload card should also load latest backend value by default.
      await fetchLatestDmailUpload();
      // Load group list once so personal email IDs are not clickable.
      await fetchKnownGroupEmails();
    })();
  }, [hasLoadedDefaultPreview, isJrcPermissionLoading]);

  const handleFileUpload = async () => {
    if (!canUpload || isUploading) return;
    if (!selectedFile) {
      setUploadError("Please choose a file before uploading.");
      return;
    }
    if (!isAllowedUploadFile(selectedFile)) {
      // Guard at submit-time as well (not just input-time) to prevent bypass uploads.
      window.alert("You can only upload .xlsx or .csv files.");
      setUploadError("Only .xlsx or .csv files are allowed.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile, selectedFile.name);
      formData.append("is_private", "0");
      // Frappe rejects POST upload without CSRF token; read from global boot/session.
      const csrfToken =
        (window as any)?.frappe?.csrf_token || (window as any)?.csrf_token || "";

      const response = await fetch(
        "/api/method/jh_digitrack.api.user_details.upload_jrc_file",
        {
          method: "POST",
          body: formData,
          // Keep authenticated session cookies for whitelisted method + permission checks.
          credentials: "include",
          headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.message?.file_url) {
        const message =
          result?.message || result?.exc || "File upload failed. Please try again.";
        throw new Error(message);
      }

      setUploadedFile({
        file_name: result.message.file_name || selectedFile.name,
        file_url: result.message.file_url,
        date: result.message.date || "",
      });
      // After upload, refresh table from the same file so UI reflects latest content immediately.
      await fetchPreview(result.message.file_url);
      setSelectedFile(null);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to upload file."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDmailFileUpload = async () => {
    if (!canUpload || isDmailUploading) return;
    if (!selectedDmailFile) {
      setDmailUploadError("Please choose a file before uploading.");
      return;
    }
    if (!isAllowedUploadFile(selectedDmailFile)) {
      // Same guard for dmail upload to keep both upload flows consistent.
      window.alert("You can only upload .xlsx or .csv files.");
      setDmailUploadError("Only .xlsx or .csv files are allowed.");
      return;
    }

    setIsDmailUploading(true);
    setDmailUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedDmailFile, selectedDmailFile.name);
      formData.append("is_private", "0");
      const csrfToken =
        (window as any)?.frappe?.csrf_token || (window as any)?.csrf_token || "";

      const response = await fetch(
        "/api/method/jh_digitrack.api.user_details.upload_jrc_dmail_file",
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.message?.file_url) {
        const message =
          result?.message || result?.exc || "Distribute mail upload failed. Please try again.";
        throw new Error(message);
      }

      setUploadedDmailFile({
        file_name: result.message.file_name || selectedDmailFile.name,
        file_url: result.message.file_url,
        date: result.message.date || "",
      });
      // Reload latest preview so backend applies newest dmail mapping for group-mail visibility.
      await fetchLatestPreview();
      // Refresh allow-list because a new dmail upload can change valid group IDs.
      await fetchKnownGroupEmails();
      setSelectedDmailFile(null);
    } catch (error) {
      setDmailUploadError(
        error instanceof Error ? error.message : "Unable to upload distribute mail file."
      );
    } finally {
      setIsDmailUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">JRC Explorer</h1>
        <p className="text-sm text-muted-foreground">
          JRC Explorer List
        </p>
      </div>

      {isJrcPermissionLoading ? (
        // Keep loading card in same palette as dashboard cards.
        <div className="max-w-xl rounded-2xl border border-rose-200 bg-rose-100/60 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      ) : canUpload ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Upload cards follow dashboard rose theme for visual consistency. */}
          <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Upload File</h2>

            <input
              type="file"
              accept=".xlsx,.csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && !isAllowedUploadFile(file)) {
                  window.alert("You can only upload .xlsx or .csv files.");
                  setSelectedFile(null);
                  setUploadError("Only .xlsx or .csv files are allowed.");
                  e.currentTarget.value = "";
                  return;
                }
                setSelectedFile(file);
                setUploadError("");
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700"
            />

            <button
              type="button"
              onClick={handleFileUpload}
              disabled={isUploading}
              className="h-9 px-4 rounded-md bg-[#972e26] text-white hover:bg-[#7c251f] disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
            <p className="text-xs text-muted-foreground">
              Upload an Excel or CSV file.
            </p>

            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}

            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

            {uploadedFile?.file_url && (
              <p className="text-xs">
                Uploaded:{" "}
                <a
                  href={uploadedFile.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {uploadedFile.file_name || "View file"}
                </a>
                {uploadedFile.date ? ` | Date: ${uploadedFile.date}` : ""}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 space-y-3 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Upload Distribute Mail File</h2>

            <input
              type="file"
              accept=".xlsx,.csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && !isAllowedUploadFile(file)) {
                  window.alert("You can only upload .xlsx or .csv files.");
                  setSelectedDmailFile(null);
                  setDmailUploadError("Only .xlsx or .csv files are allowed.");
                  e.currentTarget.value = "";
                  return;
                }
                setSelectedDmailFile(file);
                setDmailUploadError("");
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700"
            />

            <button
              type="button"
              onClick={handleDmailFileUpload}
              disabled={isDmailUploading}
              className="h-9 px-4 rounded-md bg-[#972e26] text-white hover:bg-[#7c251f] disabled:opacity-60"
            >
              {isDmailUploading ? "Uploading..." : "Upload"}
            </button>
            <p className="text-xs text-muted-foreground">
              Upload an Excel or CSV file.
            </p>

            {selectedDmailFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedDmailFile.name}
              </p>
            )}

            {dmailUploadError && <p className="text-xs text-red-600">{dmailUploadError}</p>}

            {uploadedDmailFile?.file_url && (
              <p className="text-xs">
                Uploaded:{" "}
                <a
                  href={uploadedDmailFile.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {uploadedDmailFile.file_name || "View file"}
                </a>
                {uploadedDmailFile.date ? ` | Date: ${uploadedDmailFile.date}` : ""}
              </p>
            )}
          </div>
        </div>
      ) : (
        null
      )}

      {/* Main data panel also uses the same rose palette as dashboard widgets. */}
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-100/60 p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Last updated on: {uploadedFile?.date || "N/A"} </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-xs text-muted-foreground block mb-1">
                Search Folder
              </label>
              <input
                type="text"
                value={folderSearchText}
                onChange={(e) => setFolderSearchText(e.target.value)}
                placeholder="Type folder name..."
                className="h-9 w-full rounded-md border border-rose-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              />
              {(folderSearchText.trim() || selectedFolderKey !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    // Reset folder search and selection so tree falls back to default "All" view.
                    setFolderSearchText("");
                    setSelectedFolderKey(null);
                  }}
                  className="absolute right-2 top-7 text-[10px] text-[#972e26] underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative">
              <label className="text-xs text-muted-foreground block mb-1">
                Search Employee
              </label>
              <input
                type="text"
                value={employeeSearchText}
                onChange={(e) => {
                  setEmployeeSearchText(e.target.value);
                  setSelectedEmployee(null);
                }}
                placeholder="Type employee name..."
                className="h-9 w-full rounded-md border border-rose-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              />
              {selectedEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeSearchText("");
                    setSelectedEmployee(null);
                    setEmployeeSearchResults([]);
                  }}
                  className="absolute right-2 top-7 text-[10px] text-[#972e26] underline"
                >
                  Clear
                </button>
              )}
              {(isEmployeeSearchLoading || employeeSearchResults.length > 0) &&
                !selectedEmployee && (
                  // Search dropdown shows matched employee records from JH User Master.
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-rose-200 bg-white shadow-sm max-h-52 overflow-auto">
                    {isEmployeeSearchLoading ? (
                      <p className="px-2 py-2 text-xs text-muted-foreground">
                        Searching employees...
                      </p>
                    ) : (
                      employeeSearchResults.map((employee) => (
                        <button
                          type="button"
                          key={`${employee.email}-${employee.employee_code || ""}`}
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setEmployeeSearchText(employee.employee_name);
                            setEmployeeSearchResults([]);
                          }}
                          className="w-full text-left px-2 py-2 text-xs hover:bg-rose-50"
                        >
                          <p className="font-medium">{employee.employee_name}</p>
                          <p className="text-muted-foreground">{employee.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
            </div>
          </div>

          {selectedEmployee && (
            <p className="text-xs text-muted-foreground">
              Filtered by employee: {selectedEmployee.employee_name} ({selectedEmployee.email})
            </p>
          )}

          {isPreviewLoading && (
            <p className="text-xs text-muted-foreground">Loading uploaded data...</p>
          )}

          {previewError && <p className="text-xs text-red-600">{previewError}</p>}

          {previewHeaders.length > 0 ? (
            <div className="grid grid-cols-12 gap-4">
              {/* Left: folder hierarchy built from first Excel column. */}
              <div className="col-span-12 lg:col-span-3 rounded-xl border border-rose-200 bg-white/70 p-2 max-h-[70vh] overflow-auto">
                <div className="space-y-0.5">
                  {searchableFolderTree.map((node) => renderFolderNode(node))}
                  {searchableFolderTree.length === 0 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      No matching folders found.
                    </p>
                  )}
                </div>
              </div>

              {/* Right: rows filtered by selected folder and selected employee. */}
              <div className="col-span-12 lg:col-span-9 rounded-xl border border-rose-200 bg-white/70 overflow-auto max-h-[70vh]">
                <table className="min-w-full text-xs">
                  <thead className="bg-rose-50 sticky top-0">
                    <tr>
                      {tableColumns.map(
                        ({
                          key,
                          header,
                          sourceIndex,
                          userNameSourceIndex,
                          userEmailSourceIndex,
                        }) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:underline"
                            onClick={() => {
                              if (key === USER_IDENTITY_COLUMN_KEY) {
                                handleColumnSort(
                                  USER_IDENTITY_SORT_KEY,
                                  undefined,
                                  userNameSourceIndex,
                                  userEmailSourceIndex
                                );
                                return;
                              }
                              if (sourceIndex !== undefined) {
                                handleColumnSort(`column-${sourceIndex}`, sourceIndex);
                              }
                            }}
                          >
                            {header}
                            {getSortIndicator(
                              key === USER_IDENTITY_COLUMN_KEY
                                ? USER_IDENTITY_SORT_KEY
                                : `column-${sourceIndex}`
                            ) && (
                              <span className="text-[10px] text-gray-500">
                                {getSortIndicator(
                                  key === USER_IDENTITY_COLUMN_KEY
                                    ? USER_IDENTITY_SORT_KEY
                                    : `column-${sourceIndex}`
                                )}
                              </span>
                            )}
                          </button>
                        </th>
                        )
                      )}
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={() => handleColumnSort(FULL_PATH_SORT_KEY)}
                        >
                          Full Path
                          {getSortIndicator(FULL_PATH_SORT_KEY) && (
                            <span className="text-[10px] text-gray-500">
                              {getSortIndicator(FULL_PATH_SORT_KEY)}
                            </span>
                          )}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length > 0 ? (
                      sortedRows.map((row, rowIndex) => (
                        <tr
                          key={`row-${rowIndex}`}
                          // Row click drives folder tree selection/expand on the left.
                          onClick={() => handleTableRowClick(row)}
                          className="cursor-pointer border-t border-rose-100 hover:bg-rose-50/50"
                        >
                          {tableColumns.map(
                            ({ key, sourceIndex, userNameSourceIndex, userEmailSourceIndex }) => (
                            <td
                              key={`cell-${rowIndex}-${key}`}
                              className={`px-3 py-2 ${
                                key === USER_IDENTITY_COLUMN_KEY ? "" : "whitespace-nowrap"
                              }`}
                            >
                              {(() => {
                                if (key === USER_IDENTITY_COLUMN_KEY) {
                                  const userNameValue = row[userNameSourceIndex ?? -1] || "";
                                  const userEmailValue = row[userEmailSourceIndex ?? -1] || "";
                                  const groupEmail = getClickedGroupEmail(userEmailValue);
                                  return (
                                    <div className="leading-tight">
                                      <p className="font-medium">{userNameValue || "-"}</p>
                                      <p className="text-[11px] text-muted-foreground break-all">
                                        {groupEmail ? (
                                          <button
                                            type="button"
                                            className="text-blue-600 underline hover:text-blue-700"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleGroupEmailClick(groupEmail);
                                            }}
                                          >
                                            {userEmailValue || "-"}
                                          </button>
                                        ) : (
                                          userEmailValue || "-"
                                        )}
                                      </p>
                                    </div>
                                  );
                                }

                                const resolvedSourceIndex = sourceIndex ?? -1;
                                const cellValue = row[resolvedSourceIndex] || "";
                                const permissionTooltip =
                                  resolvedSourceIndex === permissionColumnIndex
                                    ? getPermissionTooltip(cellValue)
                                    : "";

                                if (
                                  resolvedSourceIndex === emailColumnIndex &&
                                  !!getClickedGroupEmail(cellValue)
                                ) {
                                  return (
                                    <button
                                      type="button"
                                      className="text-blue-600 underline hover:text-blue-700"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        // Stop row-click folder selection when opening side panel.
                                        const groupEmail = getClickedGroupEmail(cellValue);
                                        if (groupEmail) {
                                          void handleGroupEmailClick(groupEmail);
                                        }
                                      }}
                                    >
                                      {cellValue}
                                    </button>
                                  );
                                }

                                if (permissionTooltip) {
                                  return <span title={permissionTooltip}>{cellValue}</span>;
                                }

                                return cellValue;
                              })()}
                            </td>
                            )
                          )}
                          <td
                            className="px-3 py-2 whitespace-nowrap"
                            title={getFullPathFromRow(row)}
                          >
                            {getFullPathFromRow(row)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t">
                        <td
                          className="px-3 py-2 text-muted-foreground"
                          colSpan={Math.max(tableColumns.length + 1, 1)}
                        >
                          No rows available for selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            !isPreviewLoading &&
            !previewError && (
              <p className="text-xs text-muted-foreground">
                Upload an Excel file to preview data here.
              </p>
            )
          )}
      </div>

      {isGroupMembersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20"
          onClick={() => {
            setIsGroupMembersOpen(false);
            setGroupMemberSearchText("");
          }}
        >
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l border-rose-200 p-4 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Group Team Members</h4>
                <p className="text-xs text-muted-foreground break-all">
                  {selectedGroupEmail || "N/A"}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-[#972e26] underline"
                onClick={() => {
                  setIsGroupMembersOpen(false);
                  setGroupMemberSearchText("");
                }}
              >
                Close
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={groupMemberSearchText}
                onChange={(event) => setGroupMemberSearchText(event.target.value)}
                placeholder="Search group member..."
                className="h-9 w-full rounded-md border border-rose-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              />
              {groupMemberSearchText.trim() && (
                <button
                  type="button"
                  onClick={() => setGroupMemberSearchText("")}
                  className="absolute right-2 top-2 text-[10px] text-[#972e26] underline"
                >
                  Clear
                </button>
              )}
            </div>

            {isGroupMembersLoading ? (
              <p className="text-xs text-muted-foreground">Loading members...</p>
            ) : groupMembersError ? (
              <p className="text-xs text-red-600">{groupMembersError}</p>
            ) : filteredGroupMembers.length > 0 ? (
              <div className="max-h-[80vh] overflow-auto rounded-md border border-rose-200">
                <ul className="divide-y divide-rose-100">
                  {filteredGroupMembers.map((member, index) => (
                    <li key={`${member.email}-${index + 1}`} className="px-3 py-2">
                      <p className="text-xs font-medium text-gray-900">
                        {member.employee_name || member.email}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">{member.email}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No matching members found.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default JRCPermission;
