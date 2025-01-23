// Adaptation by James D. Miller (8:02 PM Sat December 1, 2018)
//    original code:
//    https://blog.elblearning.com/blog/how-to-create-a-leaderboard-elearning-google
//    Archived link (of the original page):
//    https://web.archive.org/web/20201108130226/https://elearningbrothers.com/blog/how-to-create-a-leaderboard-elearning-google/

// m_ indicate global scope (m for module)
var m_doc = SpreadsheetApp.getActiveSpreadsheet();
var m_sheet = m_doc.getSheetByName('games');
var m_nColumns = 14; // number of columns in the games sheet

/*
Refer to the client-side code for composing an HTTP Get request (e.g. submitScoresThenReport).
The "Deployment ID" in the URL is found via the "Tools/Script editor/Select a project..." interface for the spreadsheet. 
Pick "Manage deployments" from the "Deploy" select element, upper right.
The "Deployment ID" does not give general access to your account. It only allows the web user to submit parameters
to the doGet function below.

To deploy an update to this script (without changing the URL for the app) do the following:
  save it (ctrl-s) / Deploy / Manage deployments / click the edit icon / select new version / click Deploy in the pop-up
*/

// Handle HTTP GET request:
function doGet( e) {
    return addGameResult(e.parameter['mode'], e.parameter['userName'], e.parameter['score'], e.parameter['gameVersion'], 
                         e.parameter['winTime'], e.parameter['mouse'], e.parameter['npcSleep'], 
                         e.parameter['nPeople'], e.parameter['nDrones'], e.parameter['frMonitor'], e.parameter['hzPhysics'], 
                         e.parameter['virtualGamePad'], e.parameter['noFriendlyFire'], e.parameter['index'], false);
}

// This test function doesn't require publishing and/or calling from a web page. It presents
// the results returned from addGameResult (called with debug parameter set to true).
// Use the menu (run/debug) if you want to run this with break points.
// Use control-enter to see the log output (from manual runs, not from web requests).
// You might have to comment out the locking stuff during debugging. Generally not.
function testDoGet() {
    // Call with debug parameter set to true.
    var summaryFromAdd = addGameResult('report', 'PeteBoy', 29600, '7.a', 
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
                        hzPhysics, virtualGamePad, noFriendlyFire, index, debug) {
    
    // A script lock, one that locks out all but one invocation. Forces one-at-a-time (wait your turn) operation.
    // http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
    var lock = LockService.getScriptLock();
    // Attempts to acquire the lock, timing out with an exception after the specified number of milliseconds.
    lock.waitLock(30000); // 30 seconds
    
    try {
        var timeNow = new Date(); // create a timestamp
        var nextRow = m_sheet.getLastRow() + 1; // locate next empty row
        
        // Create an array of the new data to facilitate the write.
        var row = [[userName, score, timeNow, gameVersion, winTime, mouse, npcSleep, nPeople, nDrones, frMonitor, 
                    hzPhysics, virtualGamePad, noFriendlyFire, index]];
        
        // Put the new data into the row.
        m_sheet.getRange(nextRow, 1, 1, m_nColumns).setValues(row);
        
        // If the user is asking for a leaderboard report.
        if (mode == 'report') {
            // First, sort by score, and get the best scores for the specified version of the game.
            var bestSubmissions_score = getBestSubmissions( gameVersion, 'score');
            // Determine user's rank based on the score sorting.
            var userSummary = findUserRank( userName, score, timeNow, gameVersion);
        
            var newRecordSummary = {
                "result": "report",
                "userName": userName,
                "userRank": userSummary.rank,
                "scoreCount": userSummary.scoreCount,
                "userScore": score,
                "winTime": winTime,
                "users": bestSubmissions_score,
                "version": "v1.1"
            };

            // Next, sort by winTime, and get the lowest times for the specified version of the game.
            var bestSubmissions_time = getBestSubmissions( gameVersion, 'winTime');
            // Determine user's rank based on the winTime sorting.
            var userSummary_timeBased = findUserRank( userName, score, timeNow, gameVersion);

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

// Get the best submissions (by score or time), up to a count of nQueryLimit.
function getBestSubmissions( gameVersion, secondSortColumn) {
    var colMap =       {'score':2,     'version':4,    'winTime':5};
    var ascendingMap = {'score':false, 'version':true, 'winTime':true};
    var thirdSortColumn = (secondSortColumn == 'score') ? "winTime" : "score";
    const nQueryLimit = 25;
    
    // Get a range starting in second row, first column.
    // Considering the header row, the number of rows and colums in the range.
    let nRows = m_sheet.getLastRow() - 1;
    let nCols = m_nColumns;
    var range = m_sheet.getRange(2, 1, nRows, nCols);
    
    // Sort this range (all the data) by game version and then other columns (score or winTime).
    // Note the array of sorting indications, one for each level of sorting.
    // https://developers.google.com/apps-script/reference/spreadsheet/range#sort(Object)
    range.sort([{column: colMap['version'],         ascending: ascendingMap['version']},
                {column: colMap[ secondSortColumn], ascending: ascendingMap[ secondSortColumn]},
                {column: colMap[ thirdSortColumn],  ascending: ascendingMap[ thirdSortColumn]}]);
   
    var userData = range.getValues();
    
    var bestSubmissions = [];
    var userCounter = 0;
    // Count up to nQueryLimit in the group, for rows that have: 
    // (1) a user name and, (2) a value in the secondary sort column, and (3) no mouse or npcSleep usage.
    for (var row = 0, len = userData.length; row < len; row++) {
        if ((userData[row][3] == gameVersion) && (userData[row][0] != '') && 
            (userData[row][ colMap[ secondSortColumn]-1] != '') && (userData[row][5] == '') && (userData[row][6] == '')) {

            userCounter += 1;
            var user = {};
            user.userName = userData[row][0];
            user.score = userData[row][1];
            user.date = userData[row][2];
            user.winTime = userData[row][4];
            user.mouse = userData[row][5];
            user.npcSleep = userData[row][6];
            user.nPeople = userData[row][7];
            user.nDrones = userData[row][8];
            user.frMonitor = userData[row][9];
            user.hzPhysics = userData[row][10];
            user.virtualGamePad = userData[row][11];            
            user.noFriendlyFire = userData[row][12];
            user.index = userData[row][13];
                        
            // Add this user to the array
            bestSubmissions.push(user);
            if (userCounter == nQueryLimit) break;
        }
    }
    return bestSubmissions;
}

// Find this users rank (assuming the sheet has been sorted by score or time). 
// Find match based on name, score, and timestamp.
function findUserRank( userName, score, recordTime, gameVersion) {
    // Get a range starting in second row, first column.
    // Considering the header row, the number of rows and colums in the range.
    let nRows = m_sheet.getLastRow() - 1;
    let nCols = m_nColumns;
    var range = m_sheet.getRange(2, 1, nRows, nCols);

    var userData = range.getValues();
    
    // In case this user has mouse usage...
    var userSummary = {'rank':'mouse or npcSleep usage'};
    var rank = 0;
    var foundGameSection = false;
    
    // Loop thru all rows, looking for the group of records corresponding to this version of
    // the game. Break from the loop after getting to the end of that group.
    // Count, in the rows for this particular version of the game, to determine the user rank
    // and the overall number of score entries (scoreCount) for this version of the game.
    for (var row = 0, len = userData.length; row < len; row++) {
        if (foundGameSection && (userData[row][3] != gameVersion)) {
          userSummary.scoreCount = rank;
          break;
        }
        // Don't count entries with mouse or npcSleep usage.
        if ((userData[row][3] == gameVersion) && (userData[row][5] != 'x') && (userData[row][6] != 'x')) {
            foundGameSection = true;
            rank += 1;
            // Look for the row of the current user. Identify it using name, score, and timestamp.
            if ((userData[row][0] == userName) && (userData[row][1] == score) && (userData[row][2] == recordTime.toString())) {
                userSummary.userName = userData[row][0];
                userSummary.score = userData[row][1];
                userSummary.winTime = userData[row][4];
                userSummary.date = userData[row][2];
                userSummary.rank = rank;
            }
        }
    }
    return userSummary;
}

// Initialize the spreadsheet
function setup() {  
    // An array of labels
    var row = [["name", "score", "timestamp", "game version", "win time", "mouse", "sleep", "players", "drones", "fr monitor", 
                "fr physics", "game pad", "no friendly fire", "index"]];
    
    // Initialize the header row
    m_sheet.getRange(1, 1, 1, m_nColumns).setValues(row);
}
