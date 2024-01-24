/*
Copyright 2022 James D. Miller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Leader Board (lB) module
// leaderBoard.js
   console.log('lB _*-*_');
// 5:11 PM Wed July 20, 2022

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.lB = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_leaderBoardIndex = 0;
   
   var m_timeTipPool = 'time (seconds) to finish the pool game';
   var m_scoreTip = '+200: win,\n+100: pop client or drone \n+50: pop regular puck \n+10: hit a puck with your bullet \n-10: get hit by somebody else&#39;s bullet \n-1: bad shot';
   var m_scoreTipPool_9ball    = '+50: win \n+15: pocket a ball \n-5: take a shot \n-10: object ball not low ball \n-20: scratch the cue ball';
   var m_scoreTipPool_rotation = '+50: win \n+15: pocket a ball \n-5: take a shot \n-10: object ball not low ball \n-20: scratch the cue ball';
   var m_scoreTipPool_8ball    = '+50: win \n+15: pocket a ball \n-5: take a shot \n-10: object ball not in group \n-20: scratch the cue ball';
   
   // module globals for objects brought in by initializeModule
   // (none)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
      // nothing yet...
   }
   
   function leaderBoardReport( lbResp, gameVersion) {
      m_leaderBoardIndex += 1;
      var scoreCell_id = 'scoresCell' + m_leaderBoardIndex;
      var timeCell_id = 'timesCell' + m_leaderBoardIndex;
      var scoreOrTime_id = 'scoreOrTime' + m_leaderBoardIndex;
      
      // Simplify the reporting for Jello Madness because there is only the time-based result (no scoring result).
      if (gW.getDemoIndex() == 6) {
         var rankString = "";
         rankString = "On a time basis, " + lbResp.userName + " placed " + lbResp.timeSortedResults.userRank + ' of ' + lbResp.timeSortedResults.scoreCount + 
                             ", " + lbResp.timeSortedResults.winTime + " seconds.</br><br class='score'>";
         var leaderBoardReportHTML = "Leader Board Report: " + gameVersion + "</br><br class='score'>" + rankString;
         
      } else {
         if (lbResp.userRank != 'mouse or npcSleep usage') {
            var rankString = "Highest human scorer, " + lbResp.userName + ', placed ' + lbResp.userRank + ' of ' + lbResp.scoreCount + ' with a score of ' + lbResp.userScore + ". ";
            if (lbResp.timeSortedResults.winTime != '') {
               rankString += "On a time basis, placed " + lbResp.timeSortedResults.userRank + ' of ' + lbResp.timeSortedResults.scoreCount + 
                             ", " + lbResp.timeSortedResults.winTime + " seconds.";
            }
         } else {
            var rankString = "Highest human scorer, " + lbResp.userName + ', scored ' + lbResp.userScore + " (mouse or npc-sleep used).";
         }
         
         rankString += "</br><br class='score'>";
         // Build the toggle link that swaps the time-sorted and score-sorted tables.
         // (Note the use of the escape \ to get three levels of quotations in the following string.) 
         var scoreOrTime_string = ([3,4,5].includes( gW.getDemoIndex())) ? 'time':'score';
         var leaderBoardReportHTML = "Leader Board Report: " + gameVersion + "&nbsp;&nbsp;&nbsp;(" + 
              "<a title = 'toggle between low-time and high-score based queries' " + 
                 "onclick=\"uT.toggleElementDisplay('" + timeCell_id +  "','block'); " + 
                           "uT.toggleElementDisplay('" + scoreCell_id + "','block'); " +
                           "uT.toggleSpanValue('" + scoreOrTime_id + "','time','score');\">" + 
              "<span id='" + scoreOrTime_id + "'>" + scoreOrTime_string + "</span></a>)" + 
              "</br><br class='score'>" + rankString;
      }
      
      // Add the tables
      var scoreTable = leaderBoardTable( "score",   lbResp,                   gameVersion);
      var timeTable  = leaderBoardTable( "winTime", lbResp.timeSortedResults, gameVersion);
      
      // For ghost-ball pool and the projectile games, make the score-sorted table the default.
      if ([3,4,5].includes( gW.getDemoIndex())) {
         leaderBoardReportHTML += 
            "<table><tr>" + 
            "<td id='" + scoreCell_id + "' style='vertical-align:text-top; display:block'>" + scoreTable + "</td>" + 
            "<td id='" + timeCell_id +  "' style='display:none'>" + timeTable + "</td>" + 
            "</tr></table>";
      } else {
         leaderBoardReportHTML += 
            "<table><tr>" + 
            "<td id='" + scoreCell_id + "' style='display:none'>" + scoreTable + "</td>" + 
            "<td id='" + timeCell_id +  "' style='vertical-align:text-top; display:block'>" + timeTable + "</td>" + 
            "</tr></table>";
      }
      
      // Find the most recent game report element (in the chat panel).
      var gameReportElement = document.getElementById("gR" + hC.gb.gameReportCounter);
      // Append the leader-board report to the game report.
      gameReportElement.innerHTML = gameReportElement.innerHTML + "<br>" + leaderBoardReportHTML;
      
      // Send this, the combo of the game summary and leader-board report, to everyone else in the 
      // room so they can see it in their chat panel.
      hC.chatToNonHostPlayers( gameReportElement.innerHTML);
   }
   
   function checkIfInGameTable( userName, winTime, userScore, index) {
      // This compares one row from the leaderboard report to each row in the game table.
      var inTable = false;
      for (let scoreRecord of cT.Client.scoreSummary) {
         if ((scoreRecord['name'] == userName) && (scoreRecord['winner'] == winTime) && (scoreRecord['score'] == userScore) && (scoreRecord['randomIndex'] == index)) {
            inTable = true;
         } 
      }
      return inTable;
   }
   
   function scoreTipPool() {
      if (gW.getDemoVersion().includes('8ball')) {
         return m_scoreTipPool_8ball;
      } else if (gW.getDemoVersion().includes('9ball')) {
         return m_scoreTipPool_9ball;
      } else if (gW.getDemoVersion().includes('rotation')) {
         return m_scoreTipPool_rotation;
      }
   }
   
   function leaderBoardTable( mode, lbResp, gameVersion) {
      var rowIndex = 1;
      
      // If no records in the report, return with this simple warning.
      if (lbResp.users.length < 1) return "(no " + mode + " records)";
      
      var colHighLightStyle = "style='background-color:#ffffef;'"; // #FFFFFF #e2e2b7 #f7f7d7 #f9f9e5 #ffffef
      var rowHighLightStyle = "style='background-color:darkgray; color:white'";
      if (mode == 'score') {
         var style_score = colHighLightStyle;
         var style_winTime = "";
         var tableClass = "score";
      } else {
         var style_winTime = colHighLightStyle;
         var style_score = "";
         var tableClass = "score";
      }
            
      // Ghost-ball pool and projectile games
      if ([3,4,5].includes( gW.getDemoIndex())) {
         var tableString = "<table class='" + tableClass + "'><tr align='right'>" +
            "<td class='leaderboardHeader'></td>" +
            "<td class='leaderboardHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='leaderboardHeader' title='" +m_timeTipPool+ "' " +style_winTime+ ">time</td>" +
            "<td class='leaderboardHeader' title='" +scoreTipPool()+ "' " +style_score+ ">score</td>" +
            "<td class='leaderboardHeader' title='monitor frames per second'>fps</td>" +
            "<td class='leaderboardHeader' title='inverse of the physics timestep'>ipt</td>" +
            "<td class='leaderboardHeader' title='virtual gamepad was used during game'>vgp</td>" +
            "</tr>";
      // Jello Madness      
      } else if (gW.getDemoIndex() == 6) {
         var tableString = "<table class='" + tableClass + "'><tr align='right'>" +
            "<td class='leaderboardHeader'></td>" +
            "<td class='leaderboardHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='leaderboardHeader' title='time (seconds) to untangle the jello (separate the pucks)' " +style_winTime+ ">time</td>" +
            "<td class='leaderboardHeader' title='human players'>p</td>" +
            "<td class='leaderboardHeader' title='monitor frames per second'>fps</td>" +
            "<td class='leaderboardHeader' title='inverse of the physics timestep'>ipt</td>" +
            "</tr>";
      // Puck Popper      
      } else {
         var tableString = "<table class='" + tableClass + "'><tr align='right'>" +
            "<td class='leaderboardHeader'></td>" +
            "<td class='leaderboardHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='leaderboardHeader' title='time (seconds) to win game (last puck standing)' " +style_winTime+ ">time</td>" +
            "<td class='leaderboardHeader' title='" +m_scoreTip+ "' " +style_score+ ">score</td>" +
            "<td class='leaderboardHeader' title='human players'>p</td>" +
            "<td class='leaderboardHeader' title='drones'>d</td>" +
            "<td class='leaderboardHeader' title='monitor frames per second'>fps</td>" +
            "<td class='leaderboardHeader' title='inverse of the physics timestep'>ipt</td>" +
            "<td class='leaderboardHeader' title='virtual gamepad was used during game'>vgp</td>" +
            "<td class='leaderboardHeader' title='friendly fire was prevented during game'>nff</td>" +
            "</tr>";
      }
      
      for (let score of lbResp.users) {
         // Highlight each row in the leader-board report that matches any row in the game result report.
         if ( checkIfInGameTable( score['userName'], score['winTime'], score['score'], score['index']) ) {
            var rowStyle = rowHighLightStyle;
            var style_score_td = "";
            var style_winTime_td = "";
         } else {
            var rowStyle = "";
            var style_score_td = style_score;
            var style_winTime_td = style_winTime;
         }
         
         if (typeof score['winTime'] == 'number') {
            if (mode == 'score') {
               var timeResult = score['winTime'].toFixed(2);
            } else {
               var timeResult = score['winTime'].toFixed(2);
            }
         } else {
            var timeResult = score['winTime'];
         }
         
         // Ghost-ball pool and projectile games
         if ([3,4,5].includes( gW.getDemoIndex())) {
            tableString += "<tr align='right' " + rowStyle + ">" + 
               "<td class='leaderboardIndex'>" + rowIndex + "</td>" +
               "<td class='leaderboardName'                        >" + score['userName'].replace('(host)','(h)') + "</td>" +
               "<td class='leaderboardScore' " +style_winTime_td+ ">" + timeResult +                                "</td>" +
               "<td class='leaderboardScore' " +style_score_td+   ">" + score['score'] +                            "</td>" +
               "<td class='leaderboardScore'                       >" + score['frMonitor'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['hzPhysics'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['virtualGamePad'] + "</td>" +
               "</tr>";
         // Jello Madness
         } else if (gW.getDemoIndex() == 6) {
            tableString += "<tr align='right' " + rowStyle + ">" + 
               "<td class='leaderboardIndex'>" + rowIndex + "</td>" +
               "<td class='leaderboardName'                        >" + score['userName'].replace('(host)','(h)') + "</td>" +
               "<td class='leaderboardScore' " +style_winTime_td+ ">" + timeResult +                                "</td>" +
               "<td class='leaderboardScore'                       >" + score['nPeople'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['frMonitor'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['hzPhysics'] + "</td>" +
               "</tr>";
         // Puck Popper
         } else {
            tableString += "<tr align='right' " + rowStyle + ">" + 
               "<td class='leaderboardIndex'>" + rowIndex + "</td>" +
               "<td class='leaderboardName'                        >" + score['userName'].replace('(host)','(h)') + "</td>" +
               "<td class='leaderboardScore' " +style_winTime_td+ ">" + timeResult +                                "</td>" +
               "<td class='leaderboardScore' " +style_score_td+   ">" + score['score'] +                            "</td>" +
               "<td class='leaderboardScore'                       >" + score['nPeople'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['nDrones'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['frMonitor'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['hzPhysics'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['virtualGamePad'] + "</td>" +
               "<td class='leaderboardScore'                       >" + score['noFriendlyFire'] + "</td>" +
               "</tr>";
         }
         rowIndex += 1;
      }
      tableString += "</table>";
      return tableString;
   }
   
   function submitScoresThenReport() {
      var nR = 0;
      var peopleClients = [];
      // Define the spreadsheet function within this submitScoresThenReport scope so it has access to nR
      // and peopleClients.
      function sendScoreToSpreadSheet( mode, userName, userScore, gameVersion, winner, mouse, npcSleep, n_people, n_drones, frameRate_monitor, frameRate_physics, virtualGamePad, noFriendlyFire, index) {
         // The "Deployment ID" in this URL is found via the "Tools/Script editor/Select a project..." interface for the spreadsheet. Pick "Manage deployments" from the "Deploy" select element, upper right.
         // The "Deployment ID" does not give general access to the account. It only allows the web user to submit parameters to the doGet function in the spreadsheet project's script.
         //var sheetURL = 'https://script.google.com/macros/s/AKfycbz2DWA7VNas0M4ZwIADjPBSxF9SLqX64PxnwpF-bbM0xECDZrhS/exec';
         var sheetURL = 'https://script.google.com/macros/s/AKfycbzYVIiG2_tMu-6i8e7Pt6XWHGC4UpQopyv5-fb8k1j_HUy5Z2BAcoFB1TffsQ1IJxuwgA/exec';
         // AJAX
         var xhttp = new XMLHttpRequest();
         xhttp.open('GET', sheetURL + '?mode=' + mode + 
                                      '&userName=' + userName + '&score=' + userScore +  '&gameVersion=' + gameVersion + 
                                      '&winTime=' + winner +    '&mouse=' + mouse +      '&npcSleep=' + npcSleep +
                                      '&nPeople=' + n_people +  '&nDrones=' + n_drones + '&frMonitor=' + frameRate_monitor + '&hzPhysics=' + frameRate_physics + 
                                      '&virtualGamePad=' + virtualGamePad + '&noFriendlyFire=' + noFriendlyFire + '&index=' + index, true);
         xhttp.send();
         xhttp.onreadystatechange = function () {
            // If there is a response from the spreadsheet:
            if (this.readyState == 4 && this.status == 200) {
               // lbResp is short for leaderBoardResponse
               var lbResp = JSON.parse( this.responseText);
               
               if (lbResp.result == 'report') {
                  /*
                  // useful for testing:
                  console.log('You, ' + lbResp.userID + ', placed ' + lbResp.userRank + ' of ' + lbResp.scoreCount + ' with a score of ' + lbResp.userScore);
                  for (var i = 0; i < lbResp.users.length; i++) {
                     // Convert the date so can display it.
                     var recordDate = new Date(lbResp.users[i].date);
                     var recordDateString = recordDate.getDate() +'/'+ (recordDate.getMonth() + 1) +'/'+ recordDate.getFullYear() +' '+ recordDate.getHours() +':'+ recordDate.getMinutes();         
                     console.log(recordDateString + ', ' + lbResp.users[i].id + ', ' + lbResp.users[i].score);
                  } 
                  */
                  
                  // Assemble the html needed to display the leaderboard query results in the chat panel.
                  leaderBoardReport( lbResp, gameVersion);
                  
               } else {
                  console.log( lbResp.result);
                  if (lbResp.error) console.log( lbResp.error);
               }
               
               // Keep (recursively) sending data until the last score (highest), ask for a report for that last one. 
               nR += 1;
               console.log('rC='+nR);
               
               if (nR < n_people-1) {
                  // Make another non-report entry
                  sendScoreToSpreadSheet( 'noReport', peopleClients[ nR]['name'], peopleClients[ nR]['score'], gW.getDemoVersion(), 
                                          peopleClients[ nR]['winner'], peopleClients[ nR]['mouse'], peopleClients[ nR]['npcSleep'], 
                                          n_people, n_drones, frameRate_monitor, frameRate_physics, peopleClients[ nR]['virtualGamePad'], noFriendlyFire, peopleClients[ nR]['randomIndex']);
                  
               } else if (nR == n_people-1) {
                  // Do a final submission, and ask for a report (see first parameter) from the spreadsheet this time.
                  sendScoreToSpreadSheet( 'report',   peopleClients[ nR]['name'], peopleClients[ nR]['score'], gW.getDemoVersion(),
                                          peopleClients[ nR]['winner'], peopleClients[ nR]['mouse'], peopleClients[ nR]['npcSleep'], 
                                          n_people, n_drones, frameRate_monitor, frameRate_physics, peopleClients[ nR]['virtualGamePad'], noFriendlyFire, peopleClients[ nR]['randomIndex']);
               }
            }
         }
      }
      
      // Ascending sort (this way the report gets issued on the highest score, last one.)
      cT.Client.scoreSummary.sort((a, b) => a['score'] - b['score']);
      
      // Make a subset of the scores to only include real people.
      for (let score of cT.Client.scoreSummary) {
         // Filter out the NPC pucks here.
         if ( ! score['name'].includes('NPC')) {
            peopleClients.push( score);
         }
      }
      var n_people = peopleClients.length;
      var n_drones = cT.Client.scoreSummary.length - n_people;
      var frameRate_monitor = gW.dC.fps.innerHTML; //current observed refresh rate of the monitor
      var frameRate_physics = $('#FrameRate').val(); //timestep for engine
      var noFriendlyFire = (gW.dC.friendlyFire.checked) ? '':'x'; 
      
      // Recursively send the scores. If only one player, go right to 'report' mode.
      if (n_people > 0) {
         var reportMode = (n_people == 1) ? 'report':'noReport'; 
         sendScoreToSpreadSheet( reportMode, peopleClients[0]['name'], peopleClients[0]['score'], gW.getDemoVersion(), 
                                             peopleClients[0]['winner'], peopleClients[0]['mouse'], peopleClients[0]['npcSleep'], 
                                             n_people, n_drones, frameRate_monitor, frameRate_physics, peopleClients[0]['virtualGamePad'], noFriendlyFire, peopleClients[0]['randomIndex']);
      }
   }
   
   function reportGameResults() {
      
      let gameName;
      let demoBase = gW.getDemoVersion().slice(0,3);
      let demoIndex = gW.getDemoIndex();
      if ([7,8].includes( demoIndex)) {
         gameName = 'Puck Popper';
      } else if (['6.a','6.d'].includes( demoBase)) {
         gameName = 'Jello Madness';
      } else if (demoBase == '3.d') {
         gameName = 'Ghostball Pool';
      } else if (demoBase == '5.e') {
         gameName = 'Bipartisan Hoops';
      } else if (demoBase == '4.e') {
         gameName = 'Monkey Hunt';
      } 
      
      // Delete the old help link in leaderboard (in the prior report) before making one in the current report.
      $( ".helpLinkFromLB" ).remove();
      var firstLine = "Game Summary: <span style='color:brown'>" + gameName + "</span> (" + gW.getDemoVersion() + ")" +
                      "<span class='helpLinkFromLB' style='float:right'>(<a title='click or use the m key to toggle between help and leaderboard'" +
                      "onclick= \" $('#chkMultiplayer').trigger('click'); \" >help</a>)</span> </br><br class='score'>";
      
      // Jello Madness
      if (gW.getDemoIndex() == 6) {
         var summaryString = firstLine + 
            "<table class='score'><tr align='right'>" +
            "<td class='scoreHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='scoreHeader' title='time (seconds) to untangle the jello (separate the pucks)'>time</td>" +
            "</tr>";
         for (let score of cT.Client.scoreSummary) {
            summaryString += "<tr align='right'>" + 
            "<td class='score'>" + score['name']     + "</td>" + 
            "<td class='score'>" + score['winner']   + "</td>" + 
            "</tr>";
         }
      // Ghost Pool and projectile games
      } else if ([3,4,5].includes( gW.getDemoIndex())) {
         var summaryString = firstLine + 
            "<table class='score'><tr align='right'>" +
            "<td class='scoreHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='scoreHeader' title='" +m_timeTipPool+ "'>time</td>" +
            "<td class='scoreHeader' title='" +scoreTipPool()+ "'>score</td>" +
            "<td class='scoreHeader' title='virtual gamepad used during game'>vgp</td>" + 
            "</tr>";
         for (let score of cT.Client.scoreSummary) {
            summaryString += "<tr align='right'>" + 
            "<td class='score'>" + score['name']     + "</td>" + 
            "<td class='score'>" + score['winner']   + "</td>" + 
            "<td class='score'>" + score['score']    + "</td>" + 
            "<td class='score'>" + score['virtualGamePad'] + "</td>" +
            "</tr>";
         }
      // Puck Popper
      } else {
         cT.Client.scoreSummary.sort((a, b) => b['score'] - a['score']);
         var summaryString = firstLine + 
            "<table class='score'><tr align='right'>" +
            "<td class='scoreHeader' title='client name \n or \nnickname (client name)'>name</td>" +
            "<td class='scoreHeader' title='time (seconds) to win game (last puck standing)'>time</td>" +
            "<td class='scoreHeader' title='" +m_scoreTip+ "'>score</td>" +
            "<td class='scoreHeader' title='mouse usage in the canvas area'>m</td>" +
            "<td class='scoreHeader' title='NPCs have been sleeping (ctrl-q)'>s</td>" +
            "<td class='scoreHeader' title='virtual gamepad used during game'>vgp</td>" + 
            "</tr>";
         // Check for any mouse usage by the players as you write out the rows.
         var someMouseFunnyBz = false;
         for (let score of cT.Client.scoreSummary) {
            if (score['mouse'] == 'x') someMouseFunnyBz = true;
            summaryString += "<tr align='right'>" + 
            "<td class='score'>" + score['name']     + "</td>" + 
            "<td class='score'>" + score['winner']   + "</td>" + 
            "<td class='score'>" + score['score']    + "</td>" + 
            "<td class='score'>" + score['mouse']    + "</td>" +
            "<td class='score'>" + score['npcSleep'] + "</td>" +
            "<td class='score'>" + score['virtualGamePad'] + "</td>" +
            "</tr>";
         }
      }
      
      // Now report the sorted score summary (pass in function to give descending numeric sort)
      summaryString += "</table>"
      hC.displayMessage( summaryString);
      
      // If any of the players or the host (without a puck player) used the mouse, mark everyone 
      // as suspect before doing the submission to the leaderboard. This appropriately blocks the case where the host
      // turns off his player and uses his mouse to delete the drones and lets one network player win.
      // That's clever, but that's not allowed.
      // (Notice the word "of" here. This type of for-of loop works nicely on arrays, and presents the item, not simply the index.)
      for (let score of cT.Client.scoreSummary) {
         // For Jello Madness, Ghost-ball pool and the projectile games, don't check for mouse usage. Mouse is always used.
         if ([3,4,5,6].includes( gW.getDemoIndex()) ) {
            score['mouse'] = '';
         } else {
            if (someMouseFunnyBz || gW.clients['local'].mouseUsage) score['mouse'] = 'x';
         }
      }
   }
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      
      // Methods
      'reportGameResults': reportGameResults,
      'submitScoresThenReport': submitScoresThenReport
   };

})();