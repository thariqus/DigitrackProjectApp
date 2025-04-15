const fs = require("fs");
const path = require("path");

// Get current date in YYYY.MM.DD format
const now = new Date();
const currentDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
  2,
  "0"
)}.${String(now.getDate()).padStart(2, "0")}`;

// Read the current version from __init__.py
const initPyPath = path.join(__dirname, "..", "jh_digitrack", "__init__.py");
const content = fs.readFileSync(initPyPath, "utf8");

// Extract current version
const versionMatch = content.match(
  /__version__ = "(\d{4}\.\d{2}\.\d{2}\.\d+)"/
);
if (!versionMatch) {
  console.error("Could not find version in __init__.py");
  process.exit(1);
}

const currentVersion = versionMatch[1];
const parts = currentVersion.split(".");
const versionDate = `${parts[0]}.${parts[1]}.${parts[2]}`;
const lastDigit = parts[3];
const lastDigitNum = parseInt(lastDigit);

// Determine new version
let newVersion;
if (versionDate === currentDate) {
  // If date is the same, increment the last digit
  newVersion = `${currentDate}.${lastDigitNum + 1}`;
} else {
  // If date is different, reset to 1
  newVersion = `${currentDate}.1`;
}

// Update the file
const newContent = content.replace(
  /__version__ = ".*"/,
  `__version__ = "${newVersion}"`
);
fs.writeFileSync(initPyPath, newContent);

console.log(`Updated version from ${currentVersion} to ${newVersion}`);
