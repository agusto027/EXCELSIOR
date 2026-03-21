// Code.gs - Apps Script Backend for Excelsior Library

const ADMIN_EMAIL = "excelsior.ietlko@gmail.com";

// Get Sheet
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// Standard JSON Output
function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/*********************
 * GET REQUESTS
 *********************/
function doGet(e) {
  try {

    const action = e.parameter.action;

    if (action === 'getBooks')
      return jsonOutput({status:"success",data:getBooks()});

    if (action === 'getDashboardStats')
      return jsonOutput({status:"success",data:getDashboardStats()});

    if (action === 'getMyBooks')
      return jsonOutput({status:"success",data:getMyBooks(e.parameter.email)});

    if (action === 'getRequests')
      return jsonOutput({status:"success",data:getRequests()});

    if (action === 'getActiveIssues')
      return jsonOutput({status:"success",data:getActiveIssues()});

    return jsonOutput({status:"error",message:"Invalid action"});

  } catch(err) {

    return jsonOutput({
      status:"error",
      message:err.toString()
    });

  }
}


/*********************
 * POST REQUESTS
 *********************/
function doPost(e) {

  try {

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if(action === 'issueRequest')
      return jsonOutput(submitRequest("Issue",data));

    if(action === 'returnRequest')
      return jsonOutput(submitRequest("Return",data));

    if(action === 'approveRequest')
      return jsonOutput(approveRequest(data));

    if(action === 'rejectRequest')
      return jsonOutput(rejectRequest(data));

    if(action === 'addBook')
      return jsonOutput(addBook(data));

    if(action === 'removeBook')
      return jsonOutput(removeBook(data));

    if(action === 'editBook')
      return jsonOutput(editBook(data));

    if(action === 'sendReminder')
      return jsonOutput(sendReminder(data));

    return jsonOutput({
      status:"error",
      message:"Invalid action"
    });

  } catch(err){

    return jsonOutput({
      status:"error",
      message:err.toString()
    });

  }

}


/*********************
 * BOOKS
 *********************/
function getBooks(){

  const bookSheet = getSheet('Book Inventory');
  const issueSheet = getSheet('Issued Books');
  
  const data = bookSheet.getDataRange().getValues();
  if(data.length<=1) return [];

  // Get current issuers
  const issuedData = issueSheet.getDataRange().getValues();
  const currentIssuers = {}; // Mapping of Book ID -> Array of User Names
  
  for(let i=1; i<issuedData.length; i++) {
    if(issuedData[i][7] === 'Issued') {
      const bId = issuedData[i][1];
      const studentName = issuedData[i][2];
      if(!currentIssuers[bId]) currentIssuers[bId] = [];
      currentIssuers[bId].push(studentName);
    }
  }

  const headers = data[0];
  const books=[];

  for(let i=1;i<data.length;i++){

    let book={};

    headers.forEach((h,j)=>{
      book[h]=data[i][j];
    });
    
    // Attach current issuers list
    book['currentIssuers'] = currentIssuers[book['Book ID']] || [];

    books.push(book);

  }

  return books;
}



/*********************
 * DASHBOARD
 *********************/
function getDashboardStats(){

  const bookSheet=getSheet('Book Inventory');
  const issueSheet=getSheet('Issued Books');
  const logSheet=getSheet('Admin Logs');


  const books=bookSheet.getDataRange().getValues();

  let totalBooks=0;
  let availableBooks=0;

  for(let i=1;i<books.length;i++){

    totalBooks+=Number(books[i][4])||0;
    availableBooks+=Number(books[i][5])||0;

  }


  const issued=issueSheet.getDataRange().getValues();

  let currentlyIssued=0;

  for(let i=1;i<issued.length;i++){

    if(issued[i][7]=="Issued")
      currentlyIssued++;

  }


  const logs=logSheet.getDataRange().getValues();

  let recent=[];

  for(let i=Math.max(1,logs.length-5);i<logs.length;i++){

    recent.push({

      action:logs[i][0],
      bookId:logs[i][1],
      studentName:logs[i][2],
      date:logs[i][3]

    });

  }


  return{

    totalBooks,
    availableBooks,
    issuedBooks:currentlyIssued,
    recentActivities:recent.reverse()

  };

}



/*********************
 * MY BOOKS
 *********************/
function getMyBooks(email){

  const sheet=getSheet('Issued Books');
  const data=sheet.getDataRange().getValues();

  const bookSheet=getSheet('Book Inventory');
  const books=bookSheet.getDataRange().getValues();

  let bookMap={};

  for(let i=1;i<books.length;i++)
    bookMap[books[i][0]]=books[i][1];


  let myBooks=[];

  for(let i=1;i<data.length;i++){

    if(data[i][4]==email && data[i][7]=="Issued"){

      myBooks.push({

        issueId:data[i][0],
        bookId:data[i][1],
        bookTitle:bookMap[data[i][1]],
        issueDate:data[i][5],
        dueDate:data[i][6],
        status:data[i][7]

      });

    }

  }

  return myBooks;

}



/*********************
 * REQUESTS
 *********************/
function getRequests(){

  const sheet=getSheet('Requests');
  const data=sheet.getDataRange().getValues();

  if(data.length<=1) return [];

  const headers=data[0];

  let requests=[];

  for(let i=1;i<data.length;i++){

    if(data[i][7]=="Pending"){

      let req={};

      headers.forEach((h,j)=>{
        req[h]=data[i][j];
      });

      requests.push(req);

    }

  }

  return requests;

}



/*********************
 * SUBMIT REQUEST
 *********************/
function submitRequest(type,data){

  const sheet=getSheet('Requests');

  const requestId="REQ-"+new Date().getTime();

  sheet.appendRow([

    requestId,
    type,
    data.bookId,
    data.studentName,
    data.rollNumber,
    data.email,
    new Date().toLocaleDateString(),
    "Pending"

  ]);


  MailApp.sendEmail(

    ADMIN_EMAIL,
    "New Library "+type+" Request",
    "Student : "+data.studentName+
    "\nBook ID : "+data.bookId+
    "\nEmail : "+data.email

  );


  return{

    status:"success",
    message:"Request submitted"

  };

}



/*********************
 * ADD BOOK
 *********************/
function addBook(data){

  const sheet=getSheet('Book Inventory');

  sheet.appendRow([

    data.bookId,
    data.bookName,
    data.author,
    data.category,
    data.totalCopies,
    data.totalCopies,
    0,
    "Active"

  ]);

  return{

    status:"success",
    message:"Book Added"

  };

}

/*********************
 * APPROVE REQUEST
 *********************/
function approveRequest(data) {
  const reqSheet = getSheet('Requests');
  const reqData = reqSheet.getDataRange().getValues();
  let reqRowIndex = -1;
  let requestDetails = null;
  
  for(let i=1; i<reqData.length; i++) {
    if(reqData[i][0] === data.requestId && reqData[i][7] === 'Pending') {
      reqRowIndex = i + 1;
      requestDetails = {
        type: reqData[i][1],
        bookId: reqData[i][2],
        studentName: reqData[i][3],
        rollNumber: reqData[i][4],
        email: reqData[i][5]
      };
      break;
    }
  }
  
  if(reqRowIndex === -1) return { status: "error", message: "Request not found or already processed" };
  
  const bookSheet = getSheet('Book Inventory');
  const bookData = bookSheet.getDataRange().getValues();
  let bookRowIndex = -1;
  
  for(let i=1; i<bookData.length; i++) {
    if(bookData[i][0] === requestDetails.bookId) {
      bookRowIndex = i + 1;
      break;
    }
  }
  
  if(bookRowIndex === -1) return { status: "error", message: "Book not found" };
  
  const availableCopies = bookData[bookRowIndex-1][5];
  const issuedCopies = bookData[bookRowIndex-1][6];
  
  if(requestDetails.type === 'Issue') {
    if(availableCopies <= 0) return { status: "error", message: "No available copies" };
    
    // Update Inventory
    bookSheet.getRange(bookRowIndex, 6).setValue(availableCopies - 1); // Available Copies
    bookSheet.getRange(bookRowIndex, 7).setValue(issuedCopies + 1); // Issued Copies
    
    // Add to Issued Books
    const issueSheet = getSheet('Issued Books');
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days issue period
    
    issueSheet.appendRow([
      'ISSUE-' + new Date().getTime(),
      requestDetails.bookId,
      requestDetails.studentName,
      requestDetails.rollNumber,
      requestDetails.email,
      issueDate.toLocaleDateString(),
      dueDate.toLocaleDateString(),
      'Issued'
    ]);
    
  } else if (requestDetails.type === 'Return') {
    // Update Inventory
    bookSheet.getRange(bookRowIndex, 6).setValue(availableCopies + 1);
    bookSheet.getRange(bookRowIndex, 7).setValue(issuedCopies - 1);
    
    // Update Issued Books status
    const issueSheet = getSheet('Issued Books');
    const issueData = issueSheet.getDataRange().getValues();
    for(let i=1; i<issueData.length; i++) {
      if(issueData[i][1] === requestDetails.bookId && issueData[i][4] === requestDetails.email && issueData[i][7] === 'Issued') {
        issueSheet.getRange(i+1, 8).setValue('Returned'); // Status
        break;
      }
    }
  }
  
  // Mark request as approved
  reqSheet.getRange(reqRowIndex, 8).setValue('Approved');
  
  logAdminAction(`Approved ${requestDetails.type} Request`, requestDetails.bookId, requestDetails.studentName, data.adminName);
  
  MailApp.sendEmail(requestDetails.email, `Library Request Approved`, `Your ${requestDetails.type} request for Book ID ${requestDetails.bookId} has been approved.`);
  
  return { status: "success", message: "Request approved successfully" };
}

/*********************
 * REJECT REQUEST
 *********************/
function rejectRequest(data) {
  const reqSheet = getSheet('Requests');
  const reqData = reqSheet.getDataRange().getValues();
  for(let i=1; i<reqData.length; i++) {
    if(reqData[i][0] === data.requestId && reqData[i][7] === 'Pending') {
      reqSheet.getRange(i+1, 8).setValue('Rejected');
      MailApp.sendEmail(reqData[i][5], `Library Request Rejected`, `Your ${reqData[i][1]} request for Book ID ${reqData[i][2]} has been rejected.`);
      logAdminAction(`Rejected ${reqData[i][1]} Request`, reqData[i][2], reqData[i][3], data.adminName);
      return { status: "success", message: "Request rejected" };
    }
  }
  return { status: "error", message: "Request not found" };
}

/*********************
 * LOG ADMIN ACTION
 *********************/
function logAdminAction(action, bookId, studentName, adminName) {
  const sheet = getSheet('Admin Logs');
  sheet.appendRow([action, bookId, studentName, new Date().toLocaleString(), adminName]);
}
/*********************
 * APPROVE REQUEST
 *********************/
function approveRequest(data){

  const reqSheet = getSheet('Requests');
  const reqData = reqSheet.getDataRange().getValues();

  let request = null;
  let reqRow = -1;

  for(let i=1;i<reqData.length;i++){

    if(reqData[i][0] == data.requestId && reqData[i][7]=="Pending"){

      request={
        type:reqData[i][1],
        bookId:reqData[i][2],
        studentName:reqData[i][3],
        rollNumber:reqData[i][4],
        email:reqData[i][5]
      };

      reqRow=i+1;

      break;
    }

  }

  if(reqRow==-1)
  return {status:"error",message:"Request not found"};



  const bookSheet=getSheet('Book Inventory');
  const books=bookSheet.getDataRange().getValues();

  let bookRow=-1;

  for(let i=1;i<books.length;i++){

    if(books[i][0]==request.bookId){

      bookRow=i+1;
      break;

    }

  }

  if(bookRow==-1)
  return {status:"error",message:"Book not found"};



  let available=books[bookRow-1][5];
  let issued=books[bookRow-1][6];


  if(request.type=="Issue"){

    if(available<=0)
    return {status:"error",message:"No Copies Available"};


    bookSheet.getRange(bookRow,6).setValue(available-1);
    bookSheet.getRange(bookRow,7).setValue(issued+1);


    const issueSheet=getSheet('Issued Books');

    let issueDate=new Date();
    let dueDate=new Date();

    dueDate.setDate(dueDate.getDate()+14);


    issueSheet.appendRow([

      "ISSUE-"+new Date().getTime(),
      request.bookId,
      request.studentName,
      request.rollNumber,
      request.email,
      issueDate.toLocaleDateString(),
      dueDate.toLocaleDateString(),
      "Issued"

    ]);

  }


  if(request.type=="Return"){

    bookSheet.getRange(bookRow,6).setValue(available+1);
    bookSheet.getRange(bookRow,7).setValue(issued-1);


    const issueSheet=getSheet('Issued Books');
    const data2=issueSheet.getDataRange().getValues();

    for(let i=1;i<data2.length;i++){

      if(data2[i][1]==request.bookId &&
         data2[i][4]==request.email &&
         data2[i][7]=="Issued"){

        issueSheet.getRange(i+1,8).setValue("Returned");

        break;

      }

    }

  }


  reqSheet.getRange(reqRow,8).setValue("Approved");


  MailApp.sendEmail(

    request.email,
    "Library Request Approved",
    "Your request for Book ID "+request.bookId+" is Approved"

  );


  return{

    status:"success",
    message:"Approved"

  };

}



/*********************
 * REJECT REQUEST
 *********************/
function rejectRequest(data){

  const sheet=getSheet('Requests');
  const dataSheet=sheet.getDataRange().getValues();


  for(let i=1;i<dataSheet.length;i++){

    if(dataSheet[i][0]==data.requestId &&
       dataSheet[i][7]=="Pending"){

      sheet.getRange(i+1,8).setValue("Rejected");


      MailApp.sendEmail(

        dataSheet[i][5],
        "Library Request Rejected",
        "Your request was rejected"

      );


      return{

        status:"success",
        message:"Rejected"

      };

    }

  }


  return{

    status:"error",
    message:"Request Not Found"

  };

}

/*********************
 * ACTIVE ISSUES
 *********************/
function getActiveIssues() {
  const sheet = getSheet('Issued Books');
  const data = sheet.getDataRange().getValues();
  
  const bookSheet = getSheet('Book Inventory');
  const books = bookSheet.getDataRange().getValues();
  
  let bookMap = {};
  for(let i=1; i<books.length; i++) {
    bookMap[books[i][0]] = books[i][1];
  }
  
  let activeIssues = [];
  
  for(let i=1; i<data.length; i++) {
    if(data[i][7] === 'Issued') {
      activeIssues.push({
        issueId: data[i][0],
        bookId: data[i][1],
        bookTitle: bookMap[data[i][1]] || 'Unknown',
        studentName: data[i][2],
        rollNumber: data[i][3],
        email: data[i][4],
        issueDate: data[i][5],
        dueDate: data[i][6]
      });
    }
  }
  return activeIssues;
}

/*********************
 * SEND REMINDER
 *********************/
function sendReminder(data) {
  const { email, studentName, bookTitle, dueDate, adminName } = data;
  
  const isOverdue = new Date() > new Date(dueDate);
  const subject = isOverdue ? `URGENT: Overdue Library Book Return` : `Reminder: Upcoming Library Book Return`;
  
  const body = `Dear ${studentName},\n\n` +
               `This is a reminder from the Excelsior Library Admin (${adminName}).\n\n` +
               `You currently have the book "${bookTitle}" issued.\n` +
               `The assigned due date is/was: ${new Date(dueDate).toLocaleDateString()}.\n\n` +
               (isOverdue ? `This book is currently OVERDUE. Please return it to the library administrator immediately to avoid penalties.\n\n` 
                          : `Please ensure the book is returned on or before the due date.\n\n`) +
               `Thank you for your cooperation.\n` +
               `Excelsior Literature Club`;
               
  MailApp.sendEmail(email, subject, body);
  
  logAdminAction(`Sent Return Reminder`, 'N/A', studentName, adminName);
  
  return { status: "success", message: "Reminder email sent successfully." };
}

/*********************
 * REMOVE BOOK
 *********************/
function removeBook(data) {
  const sheet = getSheet('Book Inventory');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(data.bookId).trim()) {
      sheet.deleteRow(i + 1);
      
      const adminName = data.adminName || 'Excelsior Admin';
      logAdminAction(`Removed Book`, data.bookId, 'N/A', adminName);
      
      return { status: "success", message: "Book successfully removed from catalogue." };
    }
  }
  
  return { status: "error", message: "Book ID not found in the catalogue." };
}

/*********************
 * EDIT BOOK
 *********************/
function editBook(data) {
  const sheet = getSheet('Book Inventory');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(data.bookId).trim()) {
      const row = i + 1;
      const currentIssued = values[i][6]; // Issued Copies
      
      const newTotal = parseInt(data.totalCopies);
      let newAvailable = newTotal - currentIssued;
      if (newAvailable < 0) newAvailable = 0; // Safeguard if copies are reduced below issued
      
      sheet.getRange(row, 2).setValue(data.bookName);
      sheet.getRange(row, 3).setValue(data.author);
      sheet.getRange(row, 4).setValue(data.category);
      sheet.getRange(row, 5).setValue(newTotal); // Total Copies
      sheet.getRange(row, 6).setValue(newAvailable); // Computed Available Copies
      
      const adminName = data.adminName || 'Excelsior Admin';
      logAdminAction(`Edited Book Details`, data.bookId, 'N/A', adminName);
      
      return { status: "success", message: "Book details updated in analogue archives." };
    }
  }
  
  return { status: "error", message: "Book ID not found in the catalogue." };
}