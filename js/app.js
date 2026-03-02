// app.js - Frontend Logic for Excelsior Library

// Configuration
const API_URL = "https://script.google.com/macros/s/AKfycbydTpilxrrOQFxv2VgTK40ej8dfzoX0hyENHGgXoKnHn-voPaku-y9Ul7kkqx0IdS7W/exec"; // Update this with actual Apps Script URL
const ADMIN_PASSWORD = "admin@excelsior27"; // Simple frontend check, not for secure systems

// State Management
let state = {
    books: [],
    dashboard: null,
    myBooks: [],
    requests: [],
    activeIssues: [],
    logs: [],
    currentView: 'dashboard',
    hasSeenRules: false
};

// --- DOM Elements ---
const navLinks = document.querySelectorAll('.nav-btn');
const mobileBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('navLinks');
const viewContainer = document.getElementById('viewContainer');
const mainLoader = document.getElementById('mainLoader');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMessage');

// Modals
const issueModal = document.getElementById('issueModal');
const rulesModal = document.getElementById('rulesModal');
const closeModals = document.querySelectorAll('.close-modal');
const closeRulesBtn = document.querySelector('.close-rules-btn');
const issueForm = document.getElementById('issueForm');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    loadView('dashboard');
});

// --- Navigation Logic ---
function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const view = e.currentTarget.dataset.view;
            loadView(view);

            if (window.innerWidth <= 768) {
                mobileMenu.classList.remove('active');
            }
        });
    });

    mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
}

// --- View Router ---
async function loadView(view) {
    state.currentView = view;
    viewContainer.innerHTML = '';
    showLoader('Loading data...');

    try {
        if (view === 'dashboard') {
            await fetchDashboardData();
            renderDashboard();
        } else if (view === 'catalogue') {
            await fetchBooks();
            renderCatalogue();
            if (!state.hasSeenRules && rulesModal) {
                rulesModal.classList.add('active');
                state.hasSeenRules = true;
            }
        } else if (view === 'liveissues') {
            await fetchLiveIssues();
            renderLiveIssues();
        } else if (view === 'mybooks') {
            renderMyBooksLogin();
        } else if (view === 'admin') {
            renderAdminLogin();
        }
    } catch (error) {
        showToast("Error loading view: " + error.message, "error");
    } finally {
        hideLoader();
    }
}

// --- API Calls ---
async function apiGet(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.append('action', action);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }
    const response = await fetch(url);
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message);
    return result.data;
}

async function apiPost(action, payload) {
    payload.action = action;
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            // mode: 'no-cors' - GAS standard web app works better via body post without strict json header sometimes, but we will use plain fetch
            'Content-Type': 'text/plain;charset=utf-8',
            // Note: GAS doPost works seamlessly if Content-Type is text/plain.
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message);
    return result;
}

// --- Data Fetchers ---
async function fetchDashboardData() {
    if (!state.dashboard) {
        state.dashboard = await apiGet('getDashboardStats');
    }
}

async function fetchBooks() {
    if (state.books.length === 0) {
        state.books = await apiGet('getBooks');
    }
}

async function fetchLiveIssues() {
    // We can reuse the same endpoint the admin uses, but we only render public info
    state.activeIssues = await apiGet('getActiveIssues');
}

// --- Render Functions ---

function renderDashboard() {
    const d = state.dashboard;
    let actHTML = '';
    if (d.recentActivities && d.recentActivities.length > 0) {
        actHTML = `<ul style="list-style:none; padding:0;">` +
            d.recentActivities.map(a => `
                <li style="padding:1rem; border-bottom:1px solid var(--border-color); display:flex; gap:1rem; align-items:center;">
                    <i class="fa-solid fa-clock-rotate-left" style="color:var(--accent-gold);"></i>
                    <div>
                        <strong style="color:var(--text-primary);">${a.action}</strong> - Book ${a.bookId}
                        <br><small style="color:var(--text-muted);">${new Date(a.date).toLocaleString()} by ${a.studentName}</small>
                    </div>
                </li>
            `).join('') + `</ul>`;
    } else {
        actHTML = `<p style="padding:1rem; color:var(--text-muted);">No recent activities found.</p>`;
    }

    viewContainer.innerHTML = `
        <div class="container fade-in-up">
            <h2 class="mb-2">Library Overview</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fa-solid fa-books"></i>
                    <h3>Total Inventory</h3>
                    <div class="value">${d.totalBooks || 0}</div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-book-open-reader"></i>
                    <h3>Available Copies</h3>
                    <div class="value" style="color: var(--success);">${d.availableBooks || 0}</div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-book-bookmark"></i>
                    <h3>Currently Issued</h3>
                    <div class="value" style="color: var(--accent-gold);">${d.issuedBooks || 0}</div>
                </div>
            </div>
            
            <h2 class="mb-2 mt-2">Recent Administrator Activity</h2>
            <div class="table-container fade-in-up" style="animation-delay: 0.2s;">
                ${actHTML}
            </div>
        </div>
    `;
}

function renderCatalogue() {
    const categories = [...new Set(state.books.map(b => b['Category']))].filter(Boolean);

    viewContainer.innerHTML = `
        <div class="container fade-in-up">
            <h2 class="mb-2">Curated Catalogue</h2>
            
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="Search by title, author, or ID...">
                <select id="categoryFilter" style="max-width: 200px;">
                    <option value="">All Categories</option>
                    ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            
            <div class="catalogue-grid" id="bookGrid"></div>
        </div>
    `;

    document.getElementById('searchInput').addEventListener('input', filterBooks);
    document.getElementById('categoryFilter').addEventListener('change', filterBooks);

    renderBookGrid(state.books);
}

function renderBookGrid(booksToRender) {
    const grid = document.getElementById('bookGrid');
    if (!grid) return;

    if (booksToRender.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">No books found matching your criteria in the archives.</p>`;
        return;
    }

    grid.innerHTML = booksToRender.map((b, i) => {
        const available = parseInt(b['Available Copies']) || 0;
        const total = parseInt(b['Total Copies']) || 0;
        const isAvailable = available > 0;

        return `
        <div class="book-card fade-in-up" style="animation-delay: ${i * 0.05}s">
            <div class="book-cover">
                <i class="fa-solid fa-book-journal-whills"></i>
                <span class="book-category">${b['Category'] || 'General'}</span>
            </div>
            <div class="book-info">
                <h3 class="book-title">${b['Book Name']}</h3>
                <div class="book-author">By ${b['Author']}</div>
                
                <div class="book-stats">
                    <div><span>Available</span> <span>${available} / ${total}</span></div>
                    <div><span>ID</span> <span>${b['Book ID']}</span></div>
                </div>
                
                <div class="book-actions">
                    ${isAvailable
                ? `<button class="btn btn-primary btn-block" onclick="openIssueModal('${b['Book ID']}', '${b['Book Name'].replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-hand-holding-hand"></i> Request Issue
                           </button>`
                : `<button class="btn btn-secondary btn-block" disabled style="opacity:0.5; cursor:not-allowed; margin-bottom:0.5rem;">
                            <i class="fa-solid fa-ban"></i> Currently Unavailable
                           </button>
                           <div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">
                             Issued to: ${b.currentIssuers && b.currentIssuers.length > 0 ? b.currentIssuers.join(', ') : 'Unknown'}
                           </div>`
            }
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function filterBooks() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value;

    const filtered = state.books.filter(b => {
        const matchesTerm = (b['Book Name'] || '').toLowerCase().includes(term) ||
            (b['Author'] || '').toLowerCase().includes(term) ||
            (b['Book ID'] || '').toLowerCase().includes(term);
        const matchesCat = cat === '' || b['Category'] === cat;
        return matchesTerm && matchesCat;
    });

    renderBookGrid(filtered);
}

function renderLiveIssues() {
    let html = `<p style="color:var(--text-muted); text-align:center; padding: 2rem;">No books are currently issued.</p>`;

    if (state.activeIssues && state.activeIssues.length > 0) {
        html = `
            <div class="table-container fade-in-up">
                <table>
                    <thead>
                        <tr>
                            <th>Book Title</th>
                            <th>Issued To</th>
                            <th>Issue Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.activeIssues.map((i, idx) => {
            const isOverdue = new Date() > new Date(i.dueDate);
            return `
                            <tr style="animation-delay: ${idx * 0.05}s" class="fade-in-up">
                                <td>
                                    <strong>${i.bookTitle}</strong><br>
                                    <small style="color:var(--text-muted);">ID: ${i.bookId}</small>
                                </td>
                                <td>
                                    <i class="fa-solid fa-user-graduate" style="color:var(--accent-gold); margin-right:5px;"></i> 
                                    ${i.studentName}
                                </td>
                                <td>${new Date(i.issueDate).toLocaleDateString()}</td>
                                <td>
                                    <span class="badge badge-${isOverdue ? 'danger' : 'active'}">
                                        ${isOverdue ? 'Overdue' : 'Reading'}
                                    </span>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    viewContainer.innerHTML = `
        <div class="container fade-in-up">
            <h2 class="mb-1"><i class="fa-solid fa-users-viewfinder" style="color:var(--accent-gold);"></i> Live Issues</h2>
            <p class="mb-2" style="color:var(--text-muted);">See who is currently reading what from our digital archives.</p>
            ${html}
        </div>
    `;
}

function renderMyBooksLogin() {
    viewContainer.innerHTML = `
        <div class="container fade-in-up" style="max-width:500px; margin-top:10vh;">
            <div class="modal-content" style="width:100%;">
                <h2 class="mb-1 text-center">My Library Records</h2>
                <p class="text-center mb-2" style="color:var(--text-muted);">Enter your college email to view your currently issued books and requests.</p>
                <form id="myBooksForm">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="myBooksEmail" required placeholder="Ex: name.branch21@ietlucknow.ac.in">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-magnifying-glass"></i> Search Records</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('myBooksForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('myBooksEmail').value;
        showLoader('Searching library ledger...');
        try {
            const result = await apiGet('getMyBooks', { email });
            state.myBooks = result;
            renderMyBooksDashboard(email);
        } catch (error) {
            showToast("Error finding records: " + error.message, "error");
        } finally {
            hideLoader();
        }
    });
}

function renderMyBooksDashboard(email) {
    let tableHtml = `<p style="color:var(--text-muted);">No active issued books found for ${email}.</p>`;

    if (state.myBooks.length > 0) {
        tableHtml = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Issue ID</th>
                            <th>Book Title</th>
                            <th>Issue Date</th>
                            <th>Due Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.myBooks.map(b => `
                            <tr>
                                <td>${b.issueId}</td>
                                <td><strong>${b.bookTitle}</strong></td>
                                <td>${new Date(b.issueDate).toLocaleDateString()}</td>
                                <td style="${new Date() > new Date(b.dueDate) ? 'color:var(--danger); font-weight:bold;' : ''}">${new Date(b.dueDate).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" 
                                        onclick="submitReturnRequest('${b.bookId}', '${email}')">
                                        Request Return
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    viewContainer.innerHTML = `
        <div class="container fade-in-up">
            <div class="flex-between mb-2">
                <h2>Issued To: <span style="color:var(--text-primary); font-size:1.2rem;">${email}</span></h2>
                <button class="btn btn-secondary" onclick="renderMyBooksLogin()">Change User</button>
            </div>
            ${tableHtml}
        </div>
    `;
}

function renderAdminLogin() {
    viewContainer.innerHTML = `
        <div class="container fade-in-up" style="max-width:500px; margin-top:10vh;">
            <div class="modal-content" style="width:100%;">
                <h2 class="mb-1 text-center" style="color:var(--danger);"><i class="fa-solid fa-shield-halved"></i> Admin Access</h2>
                <form id="adminLoginForm">
                    <div class="form-group">
                        <label>Security Passphrase</label>
                        <input type="password" id="adminPass" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Authenticate</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = document.getElementById('adminPass').value;
        if (pass === ADMIN_PASSWORD) {
            loadAdminDashboard();
        } else {
            showToast("Invalid security passphrase.", "error");
        }
    });
}

async function loadAdminDashboard() {
    showLoader('Accessing sensitive records...');
    try {
        const [reqs, issues] = await Promise.all([
            apiGet('getRequests'),
            apiGet('getActiveIssues')
        ]);
        state.requests = reqs;
        state.activeIssues = issues;
        renderAdminDashboard();
    } catch (err) {
        showToast("Error loading admin data: " + err.message, "error");
    } finally {
        hideLoader();
    }
}

function renderAdminDashboard() {
    let reqHtml = `<p>No pending requests.</p>`;
    if (state.requests.length > 0) {
        reqHtml = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Req ID</th>
                            <th>Type</th>
                            <th>Book ID</th>
                            <th>Student</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.requests.map(r => `
                            <tr>
                                <td>${r['Request ID']}</td>
                                <td><span class="badge badge-${r['Request Type'] === 'Issue' ? 'pending' : 'active'}">${r['Request Type']}</span></td>
                                <td>${r['Book ID']}</td>
                                <td>${r['Student Name']}<br><small>${r['Roll Number']}</small></td>
                                <td>${r['Date']}</td>
                                <td style="display:flex; gap:0.5rem;">
                                    <button class="btn btn-primary" style="padding: 0.3rem 0.6rem; min-width:unset;" onclick="handleRequest('${r['Request ID']}', 'approve')"><i class="fa-solid fa-check"></i></button>
                                    <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; min-width:unset; border-color:var(--danger); color:var(--danger);" onclick="handleRequest('${r['Request ID']}', 'reject')"><i class="fa-solid fa-xmark"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    let activeHtml = `<p>No active issues found.</p>`;
    if (state.activeIssues && state.activeIssues.length > 0) {
        activeHtml = `
            <div class="table-container fade-in-up" style="animation-delay: 0.1s;">
                <table>
                    <thead>
                        <tr>
                            <th>Book</th>
                            <th>Student</th>
                            <th>Issued On</th>
                            <th>Due Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.activeIssues.map(i => {
            const isOverdue = new Date() > new Date(i.dueDate);
            return `
                            <tr>
                                <td>${i.bookTitle}<br><small>${i.bookId}</small></td>
                                <td>${i.studentName}<br><a href="mailto:${i.email}" style="color:var(--accent-gold); text-decoration:none;">${i.email}</a></td>
                                <td>${new Date(i.issueDate).toLocaleDateString()}</td>
                                <td style="${isOverdue ? 'color:var(--danger); font-weight:bold;' : ''}">${new Date(i.dueDate).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn ${isOverdue ? 'btn-primary' : 'btn-secondary'}" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" 
                                        onclick="sendReminder('${i.email}', '${i.studentName.replace(/'/g, "\\'")}', '${i.bookTitle.replace(/'/g, "\\'")}', '${i.dueDate}')">
                                        <i class="fa-solid fa-bell"></i> Send Reminder
                                    </button>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    viewContainer.innerHTML = `
        <div class="container fade-in-up">
            <h2 class="mb-2" style="color:var(--danger);">Admin Dashboard</h2>
            
            <h3 class="mb-1">Pending Requests</h3>
            ${reqHtml}
            
            <h3 class="mb-1 mt-2">Active Issues & Reminders</h3>
            ${activeHtml}
            
            <h3 class="mb-1 mt-2">Inventory Management</h3>
            <p>To bulk edit or view complete logs, please open the <a href="https://sheets.google.com" target="_blank" style="text-decoration:underline;">Google Sheet directly <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.8rem;"></i></a>.</p>
            <p style="color:var(--text-muted); font-size:0.9rem;">From Google Sheets, you can edit Book Details, directly update available copies, or manage specific user blocks.</p>
        </div>
    `;
}

// --- Action Functions ---

function openIssueModal(bookId, bookName) {
    document.getElementById('issueBookId').value = bookId;
    document.getElementById('issueBookName').value = bookName;
    issueModal.classList.add('active');
}

function initModals() {
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            if (issueModal) issueModal.classList.remove('active');
            if (rulesModal) rulesModal.classList.remove('active');
        });
    });

    if (closeRulesBtn) {
        closeRulesBtn.addEventListener('click', () => {
            rulesModal.classList.remove('active');
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === issueModal) issueModal.classList.remove('active');
        if (e.target === rulesModal) rulesModal.classList.remove('active');
    });

    issueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            bookId: document.getElementById('issueBookId').value,
            studentName: document.getElementById('issueStudentName').value,
            rollNumber: document.getElementById('issueRollNumber').value,
            email: document.getElementById('issueEmail').value,
            department: document.getElementById('issueDepartment').value
        };

        issueModal.classList.remove('active');
        showLoader('Submitting request to ledger...');

        try {
            if (API_URL === "YOUR_WEB_APP_URL_HERE") throw new Error("API URL not configured. Please see README.md");
            await apiPost('issueRequest', payload);
            showToast("Issue request submitted! Pending admin approval.", "success");
            issueForm.reset();
        } catch (err) {
            showToast("Failed to submit: " + err.message, "error");
        } finally {
            hideLoader();
        }
    });
}

async function submitReturnRequest(bookId, email) {
    if (!confirm("Are you sure you want to request return for this book?")) return;

    const studentInfo = state.myBooks.find(b => b.bookId === bookId);
    showLoader('Submitting return request...');
    try {
        await apiPost('returnRequest', {
            bookId: bookId,
            studentName: "User", // Can be omitted or fetched from state if we had it
            rollNumber: "N/A",
            email: email
        });
        showToast("Return request submitted! Please deposit the physical copy to Admin.", "success");
    } catch (err) {
        showToast("Failed to request return: " + err.message, "error");
    } finally {
        hideLoader();
    }
}

async function handleRequest(requestId, action) {
    showLoader(`Processing (${action})...`);
    try {
        await apiPost(action + 'Request', { // 'approveRequest' or 'rejectRequest'
            requestId: requestId,
            adminName: 'Excelsior Admin'
        });
        showToast(`Request ${action}d successfully.`, "success");
        // Reload dashboard
        loadAdminDashboard();
    } catch (err) {
        showToast(`Error processing request: ` + err.message, "error");
        hideLoader();
    }
}

async function sendReminder(email, studentName, bookTitle, dueDate) {
    if (!confirm(`Send an automated reminder email to ${studentName}?`)) return;

    showLoader('Sending email reminder...');
    try {
        await apiPost('sendReminder', {
            email, studentName, bookTitle, dueDate,
            adminName: 'Excelsior Admin'
        });
        showToast("Reminder sent successfully to " + studentName, "success");
    } catch (err) {
        showToast("Failed to send reminder: " + err.message, "error");
    } finally {
        hideLoader();
    }
}

// --- Utility Functions ---
function showLoader(text) {
    mainLoader.querySelector('p').innerText = text;
    mainLoader.classList.add('active');
    viewContainer.style.display = 'none';
}

function hideLoader() {
    mainLoader.classList.remove('active');
    viewContainer.style.display = 'block';
}

function showToast(message, type = "success") {
    toastMsg.innerText = message;
    toast.style.borderColor = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
