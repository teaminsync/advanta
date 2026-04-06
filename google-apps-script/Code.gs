const SHEET_ID = '1bGBJwSpJY2JmT3F-FaOYkw4m_nxeBPknJ2KwUHp1Sp8';
const SHEET_NAME = 'Sheet1';

function getSheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function getPayload_(e) {
  // Try to parse JSON body first
  var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '';
  
  if (rawBody) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      // Not JSON, fall through to form parameters
    }
  }
  
  // Fall back to form parameters
  return e && e.parameter ? e.parameter : {};
}

function doPost(e) {
  try {
    var sheet = getSheet_();
    var data = getPayload_(e);
    
    var name = (data.name || '').toString().trim();
    var phone = (data.phoneNumber || data.phone || '').toString().trim();
    var district = (data.district || '').toString().trim();
    var state = (data.state || '').toString().trim();
    var status = (data.status || 'lose').toString().trim();
    
    // Validate that we have at least some data
    if (!name && !phone && !district && !state) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, message: 'No data received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Append row with timestamp
    var timestamp = new Date();
    sheet.appendRow([timestamp, name, phone, district, state, status]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Data saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Support GET requests for testing
  return doPost(e);
}
