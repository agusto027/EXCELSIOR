# Excelsior Literature Club - Library Management System

A dark academia themed, fully responsive, zero-cost library management system powered by vanilla HTML/CSS/JS on the frontend and a Google Sheets + Google Apps Script backend.

## 📖 How to Use the Library Website

Welcome to the Excelsior Literature Club Library! This platform allows members to easily browse our collection and request books, while providing admins with a powerful dashboard to manage everything seamlessly.

### For Students / Members
1. **Browse the Catalogue**: Click on the **Catalogue** tab to view all available books in our archives. You can search by Title, Author, or Book ID, and filter by Category.
2. **Request to Borrow**: Find a book that says **Available**, click **Request Issue**, fill in your details (you must use your official `@ietlucknow.ac.in` college email), and submit.
3. **Wait for Approval**: The Library Admin will review your request. Once approved, you will receive a confirmation email and the book will be officially issued to you.
4. **View Your Active Books**: Click on the **My Books** tab and enter your college email to see all books currently issued to you and their due dates.
5. **Return a Book**: In the **My Books** tab, you can click **Request Return** next to an issued book. Make sure to physically return the book to the library admin to complete the process!

### For Library Admins
1. **Admin Access**: Click on the **Admin** tab and enter the security passphrase (default is `admin@excelsior27`).
2. **Dashboard Overview**: The dashboard gives you a quick snapshot of Total Inventory, Available Copies, and Currently Issued books, along with recent activities.
3. **Manage Requests**: Under the **Pending Requests** section, you can Approve (✔️) or Reject (❌) incoming book requests. Approving a request automatically deducts from the available inventory and emails the student.
4. **Active Issues & Reminders**: Under **Active Issues**, you can see who has which book and when it is due. Overdue books are highlighted in red. You can click **Send Reminder** to instantly email the student a notice.
5. **Database Management**: For advanced inventory management (like bulk adding books or viewing comprehensive logs), you can click the link at the bottom of the dashboard to open the **Google Sheet** directly. Changes made in the sheet reflect instantly on the website.

---

## 🚀 Setup & Deployment Guide

### Step 1: Set up the Google Sheet Database
1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename the spreadsheet to **Excelsior Library DB**.
3. Create the following sheets (tabs) EXACTLY as named below and add these header columns in Row 1:

**Sheet 1: `Book Inventory`**
- Columns: `Book ID` | `Book Name` | `Author` | `Category` | `Total Copies` | `Available Copies` | `Issued Copies` | `Status`

**Sheet 2: `Issued Books`**
- Columns: `Issue ID` | `Book ID` | `Student Name` | `Roll Number` | `Email` | `Issue Date` | `Due Date` | `Status`

**Sheet 3: `Requests`**
- Columns: `Request ID` | `Request Type` | `Book ID` | `Student Name` | `Roll Number` | `Email` | `Date` | `Status`

**Sheet 4: `Users`**
- Columns: `Name` | `Roll Number` | `Email` | `Department`

**Sheet 5: `Admin Logs`**
- Columns: `Action` | `Book ID` | `Student Name` | `Date` | `Admin Name`

### Step 2: Deploy Google Apps Script Backend
1. On your Google Sheet, click on `Extensions` > `Apps Script`.
2. Delete any code in the editor and copy-paste the entire code from `backend/Code.gs` into it.
3. In `Code.gs`, change `const ADMIN_EMAIL = "admin@example.com";` to your club's actual admin email.
4. Click the `Save` icon.
5. Click on `Deploy` > `New deployment`.
6. Click the gear icon next to "Select type" and choose **Web app**.
7. Settings:
   - **Description**: Excelsior Library Backend
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
8. Click **Deploy**.
9. *Note: Google will ask you to authorize access. Click "Review permissions", choose your account, click "Advanced", and then "Go to project (unsafe)" to allow it.*
10. Copy the **Web app URL** generated.

### Step 3: Connect Frontend to Backend
1. Open the file `js/app.js` in a text editor.
2. At the top of the file, find the line: `const API_URL = "YOUR_WEB_APP_URL_HERE";`
3. Replace `"YOUR_WEB_APP_URL_HERE"` with the URL you copied in Step 2.
4. Save the file.

### Step 4: Add Your Book Catalogue
There are two ways to add books to your library:
**Method 1: Direct Entry (Best for Bulk)**
1. Open your **Excelsior Library DB** Google Sheet.
2. Go to the **Book Inventory** tab.
3. Simply type or copy-paste your existing book data starting from Row 2.
4. Ensure you fill in the columns correctly: `Book ID` (must be unique), `Book Name`, `Author`, `Category`, `Total Copies`, `Available Copies` (should be same as total initially), `Issued Copies` (0 initially), and `Status` (Active).

**Method 2: Through the App**
*Coming soon! You can build an "Add Book" form in the Admin Dashboard using the existing backend API if desired.*

### Step 5: Host the Website
Since this is a vanilla HTML/JS app, you can host it anywhere for free!
- **GitHub Pages**: Upload the folder to a GitHub repository and enable GitHub Pages in Settings.
- **Netlify**: Drag and drop the whole `excelsior library` folder into [Netlify Drop](https://app.netlify.com/drop).
- **Locally**: Just double click `index.html` to open it in your browser.

## Features
- **Zero Cost**: Completely free cloud database and API.
- **Dark Academia Theme**: Custom CSS for premium typography and layout.
- **Smart Automation**: Real-time Google Sheet updates and automated email notifications for requests. 
- **Easy Management**: Manage inventory directly from Google Sheets or the Admin Dashboard.
