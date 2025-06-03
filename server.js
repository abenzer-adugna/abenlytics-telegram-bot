/**
 * Handles POST requests from Telegram Web App
 * @param {Object} e - Event object containing POST data
 */
function doPost(e) {
  let response;
  
  try {
    // Validate request has data
    if (!e  !e.postData  !e.postData.contents) {
      throw new Error("Invalid request: No data received");
    }

    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    const service = data.service;
    const user = data.user || {};
    
    // Validate required fields
    if (!service) {
      throw new Error("Service type not specified");
    }

    // Process different service requests
    switch(service) {
      case "book_download":
        response = handleBookDownload(user);
        break;
      case "one_on_one":
        response = handleOneOnOneRequest(user);
        break;
      case "newsletter":
        response = handleNewsletterSignup(user);
        break;
      default:
        throw new Error("Unknown service requested");
    }
    
    // Log successful request
    logRequest(user, service, "success");
    
  } catch (error) {
    // Log error
    logRequest(user  {}, service  "unknown", "error: " + error.message);
    
    // Return error response
    response = {
      status: "error",
      message: error.message
    };
  }
  
  // Return JSON response
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles book download requests
 */
function handleBookDownload(user) {
  const fileName = "Essential_Investing_Books.zip";
  const file = DriveApp.getFilesByName(fileName).next();
  
  return {
    status: "success",
    action: "download",
    url: file.getDownloadUrl(),
    user: user.id
  };
}

/**
 * Handles 1:1 help requests
 */
function handleOneOnOneRequest(user) {
  const botToken = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const message = New 1:1 request from ${user.first_name} (${user.username || 'no username'});
  
  UrlFetchApp.fetch(https://api.telegram.org/bot${botToken}/sendMessage, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: user.id,
      text: "Your 1:1 request has been received! We'll contact you soon."
    })
  });
  
  // Notify admin
  const adminChatId = "YOUR_ADMIN_CHAT_ID";
  UrlFetchApp.fetch(https://api.telegram.org/bot${botToken}/sendMessage, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: adminChatId,
      text: message
    })
  });
  
  return {
    status: "success",
    message: "1:1 request submitted"
  };
}

/**
 * Logs all requests to Google Sheets
 */
function logRequest(user, service, status) {
  const sheet = SpreadsheetApp.openById("YOUR_SHEET_ID")
    .getSheetByName("Requests");
  
  sheet.appendRow([
    new Date(),
    user.id || "unknown",
    user.first_name || "unknown",
    service || "unknown",
    status
  ]);
}

/**
 * Handles newsletter signups
 */
function handleNewsletterSignup(user) {
  const sheet = SpreadsheetApp.openById("YOUR_SHEET_ID")
    .getSheetByName("Newsletter");
  
  // Check if user already exists
  const emails = sheet.getRange("B:B").getValues().flat();
  if (emails.includes(user.email)) {
    throw new Error("You're already subscribed!");
  }
  
  // Add new subscriber
  sheet.appendRow([
    new Date(),
    user.email,
    user.first_name,
    user.id
  ]);
  
  return {
    status: "success",
    message: "Newsletter subscription confirmed"
  };
}
