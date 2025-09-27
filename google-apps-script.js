// Google Apps Script for Join Aliens Form
// Copy this code to your Google Apps Script project

function doPost(e) {
  try {
    // Replace 'YOUR_SHEET_ID' with your actual Google Sheet ID
    const SHEET_ID = 'YOUR_SHEET_ID'; // Get this from your Google Sheet URL
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    const data = JSON.parse(e.postData.contents);
    
    // Append row with timestamp, email, phone
    sheet.appendRow([
      new Date(data.ts),
      data.email || '',
      data.phone || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
function testScript() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        ts: Date.now(),
        email: 'test@example.com',
        phone: '555-1234'
      })
    }
  };
  
  const result = doPost(testData);
  console.log('Test result:', result.getContent());
}