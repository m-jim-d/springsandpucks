// Adaptation by James D. Miller
//    original code by James Kingsley:
//    https://blog.elblearning.com/blog/how-to-create-a-leaderboard-elearning-google
//    Archived link (of the orginal page):
//    https://web.archive.org/web/20201108130226/https://elearningbrothers.com/blog/how-to-create-a-leaderboard-elearning-google/

// m_ indicate global scope (m for module)
var m_doc = SpreadsheetApp.getActiveSpreadsheet();
var m_sheet = m_doc.getSheetByName('games');
var m_nColumns = 15; // number of columns in the games sheet
var m_nQueryLimit = 25;

/*
Refer to the client-side code for composing an HTTP Get request (e.g. submitScoresThenReport).
The "Deployment ID" in the URL is found via the "Tools/Script editor/Select a project..." interface for the spreadsheet. 
Pick "Manage deployments" from the "Deploy" select element, upper right.
The "Deployment ID" does not give general access to your account. It only allows the web user to submit parameters
to the doGet function below.

To deploy an update to this script (without changing the URL for the app) do the following:
  save it (ctrl-s) / Deploy / Manage deployments / click the edit icon / select "New version" / click Deploy in the pop-up
*/

// Handle HTTP GET request:
function doGet( e) {
    return addGameResult(e.parameter['mode'], e.parameter['userName'], e.parameter['score'], e.parameter['gameVersion'], 
                         e.parameter['winTime'], e.parameter['mouse'], e.parameter['npcSleep'], 
                         e.parameter['nPeople'], e.parameter['nDrones'], e.parameter['frMonitor'], e.parameter['hzPhysics'], 
                         e.parameter['virtualGamePad'], e.parameter['noFriendlyFire'], e.parameter['editorUsage'],
                         e.parameter['index'], false);
}

// This test function doesn't require publishing and/or calling from a web page. It presents
// the results returned from addGameResult (called with debug parameter set to true).
// Use the menu (run/debug) if you want to run this with break points.
// Use control-enter to see the log output (from manual runs, not from web requests).
// You might have to comment out the locking stuff during debugging. Generally not.
function testDoGet() {
    // Call with debug parameter set to true.
    var summaryFromAdd = addGameResult('report', 'bill', 29600, '7.a', 
                                        5.1, 'x', 'x', 
                                        1, 3, 60, 60, 
                                        'x', '', 12345, true);
    
    // First, just output everything...
    Logger.log('Full Result(ver 8)=' + JSON.stringify(summaryFromAdd));
    
    if (summaryFromAdd) {
        if (summaryFromAdd.result == 'report') {
            Logger.log('userName=' + summaryFromAdd.userName + 
                       ', score=' + summaryFromAdd.userScore + ' (' + summaryFromAdd.userRank + '/' + summaryFromAdd.scoreCount + ')' );    
            // Line by line user data...
            Logger.log('=======Best Results===================');
            for (var i = 0, len = summaryFromAdd.users.length; i < len; i++) {
                var userData = summaryFromAdd.users[i];
                Logger.log(JSON.stringify( userData));
            }
            Logger.log('=================================');
        
            // This next one will prompt you, must respond or it will keep waiting.
            // Browser.msgBox('userName=' + summaryFromAdd.userName);
            var test1 = summaryFromAdd.userName;
            // Can use the following dummy line as a break point (click by the number).
            var stop = null;

        } else {
            Logger.log('result=' + summaryFromAdd.result);
            Logger.log('error=' + summaryFromAdd.error);
        }
    }
}

// Add the new submission (make a new row) and return the list of the best submissions.
function addGameResult( mode, userName, score, gameVersion, winTime, mouse, npcSleep, nPeople, nDrones, frMonitor, 
                        hzPhysics, virtualGamePad, noFriendlyFire, editorUsage, index, debug) {
    
    // A script lock, one that locks out all but one invocation. Forces one-at-a-time (wait your turn) operation.
    // http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
    var lock = LockService.getScriptLock();
    // Attempts to acquire the lock, timing out with an exception after the specified number of milliseconds.
    lock.waitLock(30000); // 30 seconds
    
    try {
        var timeNow = new Date(); // create a timestamp
        var nextRow = m_sheet.getLastRow() + 1; // locate next empty row
        
        // Read the existing data once. Used for both the idempotency check and the report.
        var allData = [];
        var nExisting = m_sheet.getLastRow() - 1; // minus the header row
        if (nExisting > 0) {
          allData = m_sheet.getRange(2, 1, nExisting, m_nColumns).getValues();
        }
        
        // Put the new data into the row.
        if (userName == "reportOnly") {
          m_nQueryLimit = 50;
        } else {
          // Idempotency guard: skip the insert if an identical submission already exists (same person,
          // game version, score, win time, and randomIndex). This prevents duplicate rows caused by
          // delayed/retried writes (e.g., a slow write that lands after the client resends). Runs inside
          // the script lock, so the read-check-write is atomic against concurrent submissions.
          var isDup = allData.some(function(r) {
            return String(r[0])  === String(userName)    &&
                   String(r[3])  === String(gameVersion) &&
                   String(r[1])  === String(score)       &&
                   String(r[4])  === String(winTime)     &&
                   String(r[14]) === String(index);
          });
          if ( ! isDup) {
            // Create an array of the new data to facilitate the write.
            var row = [[userName, score, timeNow, gameVersion, winTime, mouse, npcSleep, nPeople, nDrones, frMonitor, 
                        hzPhysics, virtualGamePad, noFriendlyFire, editorUsage, index]];
            m_sheet.getRange(nextRow, 1, 1, m_nColumns).setValues(row);
            
            // Add the new row to the in-memory data so the report includes it immediately.
            allData.push(row[0]);
          }
        }
        
        // If the user is asking for a leaderboard report.
        if (mode == 'report') {
            // First, sort by score, and get the best scores for the specified version of the game.
            var bestSubmissions_score = getBestSubmissions( gameVersion, 'score', allData);
            // Determine user's rank based on the score sorting.
            var userSummary = findUserRank( userName, score, timeNow, gameVersion, 'score', allData);
        
            var newRecordSummary = {
                "result": "report",
                "userName": userName,
                "userRank": userSummary.rank,
                "scoreCount": userSummary.scoreCount,
                "userScore": score,
                "winTime": winTime,
                "users": bestSubmissions_score,
                "version": "v1.4"
            };

            // Next, sort by winTime, and get the lowest times for the specified version of the game.
            var bestSubmissions_time = getBestSubmissions( gameVersion, 'winTime', allData);
            // Determine user's rank based on the winTime sorting.
            var userSummary_timeBased = findUserRank( userName, score, timeNow, gameVersion, 'winTime', allData);

            // Insert this time-based result as an attribute of main score-based newRecordSummary result.
            newRecordSummary.timeSortedResults = {
                "userName": userName,
                "userRank": userSummary_timeBased.rank,
                "scoreCount": userSummary_timeBased.scoreCount,
                "userScore": score,
                "winTime": winTime,
                "users": bestSubmissions_time
            }
            
        } else {
            var newRecordSummary = {"result": "one record added (no report)"};
        }
        
        if (debug) {
            // for testing...
            return newRecordSummary;           
        } else {
            // Retun an object with the user summary and leader results.
            return ContentService.createTextOutput(JSON.stringify( newRecordSummary)).setMimeType(ContentService.MimeType.JSON);
        }
        
    } catch (e) {
        var errorSummary = {
            "result": "error",
            "error": e
        };
        
        if (debug) {
            // For testing...
            return errorSummary;        
        } else {  
            return ContentService.createTextOutput(JSON.stringify( errorSummary)).setMimeType(ContentService.MimeType.JSON);
        }
        
    } finally {
        lock.releaseLock();
    }
}

// Get the best submissions (by score or time), up to a count of m_nQueryLimit.
function getBestSubmissions( gameVersion, secondSortColumn, allData) {
    var colMap =       {'score':1, 'winTime':4};
    var ascendingMap = {'score':false, 'winTime':true};
    var thirdSortColumn = (secondSortColumn == 'score') ? "winTime" : "score";
    
    // Use provided data or read once from the sheet.
    if ( ! allData) {
      let nRows = m_sheet.getLastRow() - 1;
      allData = (nRows > 0) ? m_sheet.getRange(2, 1, nRows, m_nColumns).getValues() : [];
    }
    
    var bestSubmissions = [];
    // Filter in memory and map to objects. Keep mouse/npcSleep rows; they are shown and flagged in the report.
    for (var row = 0, len = allData.length; row < len; row++) {
        if ( (allData[row][3] == gameVersion) && (allData[row][0] != '') && 
             (allData[row][ colMap[ secondSortColumn]] != '') ) {

            bestSubmissions.push({
              userName: allData[row][0],
              score: allData[row][1],
              date: allData[row][2],
              winTime: allData[row][4],
              mouse: allData[row][5],
              npcSleep: allData[row][6],
              nPeople: allData[row][7],
              nDrones: allData[row][8],
              frMonitor: allData[row][9],
              hzPhysics: allData[row][10],
              virtualGamePad: allData[row][11],
              noFriendlyFire: allData[row][12],
              editorUsage: allData[row][13],
              index: allData[row][14]
            });
        }
    }
    
    // Sort the filtered results in memory (no spreadsheet sort).
    bestSubmissions.sort(function(a, b) {
        var av = a[secondSortColumn], bv = b[secondSortColumn];
        var cmp = (av < bv ? -1 : (av > bv ? 1 : 0));
        if (cmp !== 0) {
            return ascendingMap[secondSortColumn] ? cmp : -cmp;
        }
        av = a[thirdSortColumn]; bv = b[thirdSortColumn];
        cmp = (av < bv ? -1 : (av > bv ? 1 : 0));
        return ascendingMap[thirdSortColumn] ? cmp : -cmp;
    });
    
    // Trim to the query limit.
    if (bestSubmissions.length > m_nQueryLimit) {
      bestSubmissions.length = m_nQueryLimit;
    }
    return bestSubmissions;
}

// Find this users rank for the specified sort order.
// Find match based on name, score, and timestamp.
function findUserRank( userName, score, recordTime, gameVersion, secondSortColumn, allData) {
    var colMap =       {'score':1, 'winTime':4};
    var ascendingMap = {'score':false, 'winTime':true};
    var thirdSortColumn = (secondSortColumn == 'score') ? "winTime" : "score";
    
    // Use provided data or read once from the sheet.
    if ( ! allData) {
      let nRows = m_sheet.getLastRow() - 1;
      allData = (nRows > 0) ? m_sheet.getRange(2, 1, nRows, m_nColumns).getValues() : [];
    }
    
    // In case this user has mouse usage...
    var userSummary = {'rank':'mouse or npcSleep usage'};
    var rank = 0;
    var recordTimeString = recordTime.toString();
    
    // Build the list of qualifying rows for this version (non-mouse, non-sleep).
    var qualifying = [];
    for (var row = 0, len = allData.length; row < len; row++) {
        if ((allData[row][3] == gameVersion) && (allData[row][0] != '') &&
            (allData[row][5] != 'x') && (allData[row][6] != 'x') &&
            (allData[row][ colMap[ secondSortColumn]] != '')) {
            qualifying.push(allData[row]);
        }
    }
    
    // Sort the qualifying rows in memory.
    qualifying.sort(function(a, b) {
        var av = a[colMap[ secondSortColumn]], bv = b[colMap[ secondSortColumn]];
        var cmp = (av < bv ? -1 : (av > bv ? 1 : 0));
        if (cmp !== 0) {
            return ascendingMap[secondSortColumn] ? cmp : -cmp;
        }
        av = a[colMap[ thirdSortColumn]]; bv = b[colMap[ thirdSortColumn]];
        cmp = (av < bv ? -1 : (av > bv ? 1 : 0));
        return ascendingMap[thirdSortColumn] ? cmp : -cmp;
    });
    
    // Count ranks and look for the user's row.
    for (var i = 0, len = qualifying.length; i < len; i++) {
        rank += 1;
        if ((qualifying[i][0] == userName) && (qualifying[i][1] == score) && (qualifying[i][2].toString() == recordTimeString)) {
            userSummary.userName = qualifying[i][0];
            userSummary.score = qualifying[i][1];
            userSummary.winTime = qualifying[i][4];
            userSummary.date = qualifying[i][2];
            userSummary.rank = rank;
        }
    }
    userSummary.scoreCount = rank;
    return userSummary;
}

// Initialize the spreadsheet
function setup() {  
    // An array of labels
    var row = [["name", "score", "timestamp", "game version", "win time", "mouse", "sleep", "players", "drones", "fr monitor", 
                "fr physics", "game pad", "no friendly fire", "editor usage", "index"]];
    
    // Initialize the header row
    m_sheet.getRange(1, 1, 1, m_nColumns).setValues(row);
}
