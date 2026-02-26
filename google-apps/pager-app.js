// Event logger
// Enter a record into the "log" sheet of this spreadsheet document: timestamp and event description.

// m_ indicates global (m for module) scope
var m_doc = SpreadsheetApp.getActiveSpreadsheet();
var m_sheet = m_doc.getSheetByName('log');
var m_nColumns = 3; // number of columns in the sheet

// Handle HTTP GET request:
function doGet( e) {
    return addLogRecord(e.parameter['mode'], e.parameter['eventDesc'], false);
}

function testAddLogRecord() {
    let result = addLogRecord( "test", "test event", true);
    Logger.log("result from addLogRecords = " + JSON.stringify( result));
}

function addLogRecord( mode, eventDesc, debug) {
    // A script lock, one that locks out all but one invocation. Forces one-at-a-time (wait your turn) operation.
    // http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
    var lock = LockService.getScriptLock();
    
    // Attempt to acquire the lock, timing out with an exception after the specified number of milliseconds.
    lock.waitLock(30000); // 30 seconds
    
    try {
        // Sort the sheet by timestamp (column 1), descending order. This removes editing blanks.
        var nRows = m_sheet.getLastRow() - 1; // -1 because of header
        if (nRows > 0) {
            var range = m_sheet.getRange(2, 1, nRows, m_nColumns);
            range.sort([{column:1, ascending:false}]);
        }
    
        var timeNow = new Date(); // create a timestamp
        //var dayOfWeek = timeNow.getDay();
        // Note: YYYY (uppercase) will produce incorrect date strings around the new year. Must use yyyy (lowercase).
        // YYYY: Week-based year (ISO week date year)
        // yyyy: Calendar year
        var timeString = Utilities.formatDate(timeNow, "America/Chicago", "MMM d, yyyy EEE hh:mm:ss a");
        
        // Create an array of the new data to facilitate the write.
        var row = [[timeNow, timeString, eventDesc + ""]];  // empty string is for testing...
        
        // Add a blank row after the header
        m_sheet.insertRows(2, 1);
        
        // Put the new data into that blank row.
        m_sheet.getRange(2, 1, 1, m_nColumns).setValues(row);
        
        return ContentService.createTextOutput(JSON.stringify( {'result':'ok'} )).setMimeType(ContentService.MimeType.JSON);
        
    } catch (e) {
        var errorSummary = {"result":"error", "error": e};
        if (debug) {
            return errorSummary;    
        } else {  
            return ContentService.createTextOutput(JSON.stringify( errorSummary)).setMimeType(ContentService.MimeType.JSON);
        }
        
    } finally {
        lock.releaseLock();
    }
}

// Update the formats for a column. Call this from the "Run" menu.
function formatTimeStamps() {
    var nRows = m_sheet.getLastRow() - 1; // -1 because of the header
    if (nRows > 0) {
        // start below the header, row 2, and in column 2
        var range = m_sheet.getRange(2, 2, nRows, 1);
        
        range.setNumberFormat("dddd h:mm:ss A/P");  // dddd, m/d/yy h:mm:ss A/P
        range.setBackground('white');
    }
}

function checkForOldRecords() {
    // pad is a library
    pad.sortAndTrim_clean('log', 1, 3, true); // sheetname, extra days to keep, columns, use midnight
}
