frappe.pages['employee-search'].on_page_load = function (wrapper) {
  wrapper.classList.add('employee-search-page-wrapper');
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: '',
    single_column: true,
  });

  ensureMaterialIcons();
  page.main.html(frappe.render_template('employee_search'));

  initEmployeeSearchPage();
};

function ensureMaterialIcons() {
  const id = 'jh-material-icons';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(link);
}

function initEmployeeSearchPage() {
  const searchInput = document.getElementById("search");
  const searchTip = document.getElementById("searchTip");
  const resultsEl = document.getElementById('results');
  const resultHintEl = document.getElementById("resultHint");
  let currentRows = [];
  let selectedRowIndex = -1;

  let lastSearchQuery = "";

  document.addEventListener("keydown", function (e) {
    const modal = document.getElementById("employeeModal");
    if (modal && modal.style.display === "block") return;

    const isSearchFocused = (document.activeElement === searchInput);

    if (e.key === "ArrowDown" && currentRows.length > 0) {
      e.preventDefault();
      const next = Math.min(selectedRowIndex + 1, currentRows.length - 1);
      updateSelection(next);
    }
    else if (e.key === "ArrowUp" && currentRows.length > 0) {
      e.preventDefault();
      const prev = Math.max(selectedRowIndex - 1, 0);
      updateSelection(prev);
    }
    else if (e.key === "Enter") {
      e.preventDefault();

      if (isSearchFocused) {
        const currentValue = searchInput.value.trim();

        if (currentValue !== lastSearchQuery) {
          searchTip.style.display = "none";
          searchEmployee();
          lastSearchQuery = currentValue;
        } else {
          if (selectedRowIndex >= 0 && currentRows[selectedRowIndex]) {
            currentRows[selectedRowIndex].click();
          }
        }
      } else {
        if (selectedRowIndex >= 0 && currentRows[selectedRowIndex]) {
          currentRows[selectedRowIndex].click();
        }
      }
    }
  });

  function normalize(val) {
    if (!val) return '—';
    const cleaned = val.replace(/_/g, '').trim();
    return cleaned || '—';
  }

  function updateSelection(newIndex) {
    if (selectedRowIndex >= 0 && currentRows[selectedRowIndex]) {
      currentRows[selectedRowIndex].classList.remove("selected-row");
    }
    selectedRowIndex = newIndex;
    const row = currentRows[selectedRowIndex];
    if (row) {
      row.classList.add("selected-row");
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function highlightMatch(text, query) {
    const value = text || '';
    if (!query) return value;

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');

    return value.toString().replace(regex, `<mark>$1</mark>`);
  }

  window.searchEmployee = async function () {
    searchTip.style.display = "none";
    const query = document.getElementById('search').value.trim();
    if (!query) return;
    const querylength = query.replace(/\s/g, '').length;
    if (querylength <= 2) {
      resultsEl.innerHTML = `
        <div class="no-results">
          <h3>Input Too Short</h3>
          <p>Please enter more than 3 characters to perform a search.</p>
        </div>
      `;
      resultsEl.classList.add('show');
      currentRows = [];
      selectedRowIndex = -1;
      resultHintEl.classList.remove('show');
      return;
    }

    try {
      const res = await fetch(`/api/method/jh_digitrack.api.employee_search.search_employees?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      const employeeList = data?.message?.message;

      resultsEl.innerHTML = '';
      resultsEl.classList.remove('show');

      if (Array.isArray(employeeList) && employeeList.length > 0) {
        const container = document.createElement('div');
        container.style.display = "flex";
        container.style.justifyContent = "flex-end";
        container.style.marginBottom = "8px";

        if (employeeList.length >= 50) {
          const infoText = document.createElement('div');
          infoText.textContent = "*Showing first 50 records only";
          infoText.style.fontSize = "13px";
          infoText.style.color = "#666";
          infoText.style.fontWeight = "bold";

          container.appendChild(infoText);
        }
        const table = document.createElement('table');
        table.innerHTML = `
          <thead>
            <tr>
              <th>#</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Employee Code</th>
              <th>Email</th>
              <th>Mobile No</th>
              <th>Department | Location</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        employeeList.forEach((emp, index) => {
          const row = document.createElement('tr');
          const mobile = normalize(emp.mobile_no);
          const dept = normalize(emp.department_name);
          const loc = normalize(emp.location_name);

          const deptLoc =
            dept !== '—' && loc !== '—'
              ? `${dept} | ${loc}`
              : dept !== '—'
                ? dept
                : loc;
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${highlightMatch(emp.first_name, query)}</td>
            <td>${highlightMatch(emp.last_name, query)}</td>
            <td>${highlightMatch(emp.employee_code, query)}</td>
            <td>${highlightMatch(emp.mail_id, query)}</td>
            <td>${highlightMatch(mobile, query)}</td>
            <td>${highlightMatch(deptLoc, query)}</td>
          `;
          row.addEventListener('click', () => showEmployeeDetails(emp));
          tbody.appendChild(row);
        });
        resultsEl.appendChild(container);
        resultsEl.appendChild(table);

        currentRows = Array.from(table.querySelectorAll('tbody tr'));
        if (currentRows.length > 0) {
          selectedRowIndex = 0;
          currentRows[0].classList.add('selected-row');
        } else {
          selectedRowIndex = -1;
        }

        setTimeout(() => resultsEl.classList.add('show'), 50);
        resultHintEl.classList.add('show');
      } else {
        resultsEl.innerHTML = `
          <div class="no-results">
            <h3>No Matching Records</h3>
            <p>We couldn’t find any employee matching your search.<br/>Try again with a different name or employee code.</p>
          </div>
        `;
        resultsEl.classList.add('show');
        resultHintEl.classList.remove('show');
        currentRows = [];
        selectedRowIndex = -1;
      }
    } catch (err) {
      console.error("Fetch error:", err);
      resultsEl.innerHTML = '<p>An error occurred while fetching data.</p>';
      resultsEl.classList.add('show');
      currentRows = [];
      selectedRowIndex = -1;
    }
  };

  async function showEmployeeDetails(emp) {
    const modal = document.getElementById('employeeModal');
    const avatarEl = document.getElementById('employeeAvatar');
    const nameEl = document.getElementById('employeeFullName');
    const contactContainer = document.getElementById('contactDetails');
    const jobContainer = document.getElementById('jobDetails');

    try {
      const res = await fetch(`/api/method/jh_digitrack.api.employee_search.get_employee_details?name=${emp.name}`);
      const data = await res.json();
      const fullEmp = data?.message?.message || emp;

      const fullName = [fullEmp.first_name, fullEmp.middle_name, fullEmp.last_name]
        .filter(Boolean).join(" ");
      nameEl.textContent = fullName || fullEmp.first_name || "Unknown Employee";
      avatarEl.src = fullEmp.image || "/assets/jh_digitrack/images/avatar-logo.png";

      contactContainer.innerHTML = "";
      jobContainer.innerHTML = "";

      const skipFields = ["name", "owner", "creation", "modified_by", "modified", "doctype", "first_name", "middle_name", "last_name", "image"];
      const contactFields = ["desk_no", "mobile_no", "mail_id", "region"];
      const jobFields = ["employee_code", "ou_name", "designation_name", "reporting_manager", "funcational_reporting_manager", "skip_level_reporting_manager", "department_name", "location_name"];

      const allFields = [...contactFields, ...jobFields];

      allFields.forEach((key) => {
        if (skipFields.includes(key)) return;
        let value = fullEmp[key];
        if (!value || value.toString().trim() === "") {
          value = "No Data";
        }
        const fieldHTML = `<div class="details-row">
                            <strong>${formatKey(key)}</strong>
                            <span>${value}</span>
                          </div>`;
        if (contactFields.includes(key)) {
          contactContainer.innerHTML += fieldHTML;
        } else if (jobFields.includes(key)) {
          jobContainer.innerHTML += fieldHTML;
        }
      });

      modal.style.display = "block";
      document.querySelector(".modal .close").onclick = () => modal.style.display = "none";
      window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

    } catch (err) {
      console.error("Error fetching employee details:", err);
    }
  }

  function formatKey(key) {
    const customNames = {
      employee_code: "Employee ID",
      funcational_reporting_manager: "Functional Manager",
      reporting_manager: "Manager",
      ou_name: "Organization Unit",
      designation_name: "Business Title",
      department_name: "Department",
      region: "Work Address",
      desk_no: "Desk No",
      skip_level_reporting_manager: "Skip Level Manager",
      location_name: "Location"
    };
    if (customNames[key]) return customNames[key];
    return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const modal = document.getElementById("employeeModal");
      if (modal && modal.style.display === "block") {
        modal.style.display = "none";
      }
    }
  });

  searchInput.addEventListener("input", () => {
    const value = searchInput.value.trim();
    if (value) {
      searchTip.style.display = "block";
    } else {
      searchTip.style.display = "none";
      resultsEl.innerHTML = "";
      resultsEl.classList.remove("show");
      resultHintEl.classList.remove('show');
      currentRows = [];
      selectedRowIndex = -1;
      lastSearchQuery = "";
    }
  });
}
