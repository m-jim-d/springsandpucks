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

// BiPartisan Hoops (bpH) module
// bpHoops.js
   console.log('bpH _*-*_');
// 12:27 PM Sat August 20, 2022

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.bpH = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   
   var m_backBoardShot, m_hoopContact, m_hitTopSensor, m_hitBottomSensorFirst, m_firstExampleShot, 
       m_humanUseOfBasketBall, m_callCount, m_playList, m_initialTeamSize, m_reportedWin, 
       m_clientName, m_timeOfStart, m_millerShot, m_millerAvailable, m_partisanNature,
       m_closingRemark, m_reverseFeeder, m_stopFeeder, m_priorShotIndex, m_puck_pos_2d_m, m_puck_v_2d_mps, 
       m_shotReportIssued, m_hitRightWall, m_chokeShotReports, m_timer_s, m_gameState;
   
   var m_wallMap = {'wall5':'leftHoop', 'wall12':'rightHoop', 'wall21':'backboard', 'wall23':'bottomSensor', 'wall24':'topSensor', 'wall26':'rightWallSensor'};
   
   let monkeyText = '\\[30px Arial]"Independent voters tend to be more pragmatic in their political views, weighing the specifics of ' + 
                    '\\[30px Arial]each issue rather than aligning strictly with one party' +"'"+ 's platform across the board." ' + 
                    '\\ \\[20px Arial](Source: "The Rise of Independent Voters" by Rhodes Cook in a 2012 Bipartisan Policy Center report)' +
                    '\\ \\[30px Arial]Hmm, vaguely familiar, Monkey Hunt?'
   var m_nameMap = {
      'trump2':   {'name':'Donald', 'title':'   (former President of the United States, Donald Trump)'}, 
      'biden2':   {'name':'Joe',    'title':'   (President of the United States, Joe Biden)'}, 
      'harris':   {'name':'Kamala', 'title':'   (Vice President of the United States, Kamala Harris)'}, 
      'pence':    {'name':'Mike',   'title':'   (former Vice President of the United States, Mike Pence)'}, 
      'pelosi':   {'name':'Nancy',  'title':'   (Speaker of the United States House of Representatives, Nancy Pelosi)'}, 
      'schumer':  {'name':'Chuck',  'title':'   (Majority Leader of the United States Senate, Chuck Schumer)'}, 
      'mcconnell':{'name':'Mitch',  'title':'   (Minority Leader of the United States Senate, Mitch McConnell)'}, 
      'mccarthy': {'name':'Kevin',  'title':'   (Minority Leader of the United States House of Representatives, Kevin McCarthy)'},
      
      'elephant-1': {'name':'Republican',  
         'title':'\\[30px Arial]"The Republican Party was founded in 1854 by former members of the Whig Party\\[30px Arial]who opposed the expansion of slavery into the western territories."\\ \\[20px Arial](Source: "History of the Republican Party" at www.gop.com)'},
      'elephant-2': {'name':'Republican',  
         'title':'\\[30px Arial]"Abraham Lincoln, the 16th President of the United States, was the first Republican president,\\[30px Arial]leading the nation during the American Civil War."\\ \\[20px Arial](Source: Biography.com' +"'s"+ ' "Abraham Lincoln" page)'},
      'elephant-3': {'name':'Republican',  
         'title':'\\[30px Arial]"The Republican Party' +"'"+ 's pro-business philosophy rejects the notion that the economy is a fixed pie, \\[30px Arial]in which one person' +"'"+ 's gain is another' +"'"+ 's loss." \\ \\[20px Arial](Source: "The Republican Way" by Michael Barone in The Wall Street Journal, August 11, 2016)'},
      'elephant-4': {'name':'Republican',  
         'title':'\\[30px Arial]"The Republican Party has been a champion of limiting the size and scope \\[30px Arial]of the federal government, advocating for lower taxes and deregulation." \\ \\[20px Arial](Source: "Basic Republican Principles" by Ed Feulner in The Heritage Foundation, February 25, 2013)'},
      
      'donkey-1':   {'name':'Democrat',    
         'title':'\\[30px Arial]"The Democratic Party championed the cause of small farmers, urban laborers, \\[30px Arial]and immigrant groups in the late 19th century under President Grover Cleveland' +"'"+ 's leadership." \\ \\[20px Arial](Source: "The Democratic Party" by Nelson W. Polsby in Handbook of Political Science, Addison-Wesley, 1975)'},
      'donkey-2':   {'name':'Democrat',    
         'title':'\\[30px Arial]"Democrats have positioned themselves as supporters of workers' +"'"+ ' rights, \\[30px Arial]fighting for issues like a higher minimum wage, paid family leave, and labor union protections." \\ \\[20px Arial](Source: "The Democrats and American Labor" by Michael Kazin in Dissent Magazine, Summer 2019)'},
      'donkey-3':   {'name':'Democrat',    
         'title':'\\[30px Arial]"The Democratic Party was the party of the ' +"'"+ 'common man' +"'"+ ' and favored westward expansion, \\[30px Arial]territorial acquisition, and cheap land for settlers in the 19th century." \\ \\[20px Arial](Source: "The Rise of the Democratic Party" by Sean Wilentz in The New York Times, April 26, 2005)'},
      'donkey-4':   {'name':'Democrat',    
         'title':'\\[30px Arial]The Democratic Party has been a champion of civil rights, from President Harry Truman' +"'"+ 's \\[30px Arial]integration of the armed forces to Lyndon B. Johnson signing the Civil Rights Act of 1964. \\ \\[20px Arial](Source: "The Democrats' +"'"+ ' Civil Rights History" by John Hendrickson in The Atlantic, July 22, 2020)'},
      
      'monkey-1':   {'name':'Independent', 
         'title': monkeyText},
   };

   var m_democratNames = ['biden2','harris','schumer','pelosi','donkey-1','donkey-2','donkey-3','donkey-4'];
   var m_republicanNames = ['trump2','pence','mcconnell','mccarthy','elephant-1','elephant-2','elephant-3','elephant-4'];
   var m_independentNames = ['monkey-1'];
   
   var m_numberNames = {0:'Zero',1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine'};
   
   var m_version = "v2";
   var m_gameState = {};
   
   // module globals for objects brought in by initializeModule
   // (none)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
   }
   
   // This prepares for analysis of the collision events from the game sensors. This is called when the user releases 
   // the mouse button and either launches a cursor-spring shot (see gB.poolShot) or drops a puck (see mouseUp_handler in eventsHost).
   function resetShotState( pars = {}) {
      m_clientName = uT.setDefault( pars.clientName, "local");
      // puck4 is in flight at the beginning.
      let puckName = uT.setDefault( pars.puckName, "puck4");
      let initializing = uT.setDefault( pars.initializing, false);
      
      m_puck_v_2d_mps = uT.setDefault( pars.puck_v_2d_mps, new wS.Vec2D(0.0,0.0));
      m_puck_pos_2d_m = uT.setDefault( pars.puck_pos_2d_m, new wS.Vec2D(0.0,0.0));
      
      m_backBoardShot = false;
      m_hoopContact = false;
      m_hitTopSensor = false;
      m_hitBottomSensorFirst = false;
      m_hitRightWall = false;
      m_callCount = 0;
      m_shotReportIssued = false;
      
      if (initializing) {
         m_firstExampleShot = true;
         m_millerShot = "no attempt yet";
      } else {
         m_firstExampleShot = false;
         // check the puck in flight at start (puck4, normally the basketball).
         if ((gW.aT.puckMap[ puckName]) && (gW.aT.puckMap[ puckName].imageID == "miller")) { 
            m_millerShot = "attempted";
         }
      }
      
      m_chokeShotReports = ( $('#pw_basketball').val() == "quiet" ) ? true : false; // inhibit long shot reports
   }
   
   function stopAllTimers() {
      window.clearTimeout( m_closingRemark);
      window.clearTimeout( m_reverseFeeder);
      window.clearTimeout( m_stopFeeder);   
   }
   function stopAllMessages() {
      gW.messages['score'].resetMessage();
      gW.messages['gameTitle'].resetMessage();
      gW.messages['help'].resetMessage();
      gW.messages['help2'].resetMessage();
   }
   
   function initializeGame( version="v2") {
      m_gameState['showTimer'] = false;
      m_gameState['shutDown'] = false;
      m_gameState['timeWarningGiven'] = false;
      
      stopAllTimers();
      stopAllMessages();
       
      m_timer_s = 0;
      gW.messages['hoopsTimer'].loc_px = {'x':30,'y':60};
      
      m_version = version;
      m_reportedWin = false;
      m_humanUseOfBasketBall = false;
      m_timeOfStart = new Date().getTime();
      m_priorShotIndex = -1;
      
      resetShotState({'initializing':true});
      
      // Make sure the auto-feeder wall is in it's starting position.
      gW.aT.wallMap['wall25'].setPosition( new wS.Vec2D(20.7,0.58));
      gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( 0.0, 0.0));
      
      // Make a roster based on the politician faces in the capture.
      let someDemocrats = false;
      let someRepublicans = false;
      let someIndependents = false;
      m_millerAvailable = false
      m_playList = [];
      for (let puckName in gW.aT.puckMap) {
         let imageID = gW.aT.puckMap[ puckName].imageID;
         if (imageID in m_nameMap) {
            m_playList.push( imageID);
         }
         if (m_democratNames.includes( imageID)) {
            someDemocrats = true;
         } else if (m_republicanNames.includes( imageID)) {
            someRepublicans = true;
         } else if (m_independentNames.includes( imageID)) {
            someIndependents = true;
         } else if (imageID == 'miller') {
            m_millerAvailable = true;
         }
      }
      //m_playList = ['biden2','harris'];  // for quick testing...
      //m_playList = ['biden2'];  // for even quicker testing...
      //m_playList = ['donkey-1','elephant-1','monkey-1'];  // v2 testing...
      
      m_initialTeamSize = m_playList.length;
      
      if (someDemocrats && someRepublicans && someIndependents) {
         m_partisanNature = 'from multiple perspectives';
      } else if (someDemocrats && someRepublicans) {
         m_partisanNature = 'from both sides of the aisle';
      } else if (someDemocrats && !someRepublicans) {
         m_partisanNature = 'from the democratic side of the aisle';
      } else if (!someDemocrats && someRepublicans) {
         m_partisanNature = 'from the republican side of the aisle';
      } else if (!someDemocrats && !someRepublicans) {
         m_partisanNature = 'from either side of the aisle';
      } else {
         m_partisanNature = 'from a variety of perspectives';
      }
      
      gW.messages['gameTitle'].loc_px = {'x':450,'y':350};
      
      gW.messages['gameTitle'].setFont('50px Arial');
      gW.messages['gameTitle'].popAtEnd = false;
      if (version == "v2") {
         gW.messages['gameTitle'].newMessage("Bipartisan Hoops[base]" +
                 "\\  [30px Arial, lightgray]a game for the curious U.S. citizen[base]", 5.0); 
      } else {
         gW.messages['gameTitle'].newMessage("Bipartisan Hoops " + "[50px Arial, #CD5A00](" + String.fromCharCode(8217) + "21-" + String.fromCharCode(8217) + "22)[base]" +
                 "\\  [30px Arial, lightgray]a game for the weary U.S. citizen[base]", 5.0); 
      }
      
      gW.messages['help'].loc_px = {'x':75,'y':95};
      let politicianPhrase = (m_version == "v2") ? "mascots" : "politicians (or me)";
      let facePhrase = (m_version == "v2") ? "mascot" : "face";
      gW.messages['help'].newMessageSeries({
         1:{'tL_s':8.0, 'message':"The view:" + 
                                "\\    use the \"[base,yellow]esc[base]\" key to exit back to normal view" +
                                "\\    \"[base,yellow]v[base]\" key to return to full-screen view" + 
                                "\\    \"[base,yellow]5[base]\" key to restart this demo (including this help)" +
                                "\\    \"[base,yellow]0[base]\" key to exit and reset (nuke) everything"},
         2:{'tL_s':6.0, 'message':'Please note:' + 
                                '\\    Any shooting will stop this help series.' +
                                '\\    Games are limited to [base,yellow]120[base] seconds.'},
         3:{'tL_s':8.0, 'message':'Position the ball before the shot:' + 
                                '\\    hold the "[base,yellow]ctrl[base]" key down while dragging the basketball' + 
                                '\\    in a similar way, encourage one of the ' + politicianPhrase + ' to get into the game'},
         4:{'tL_s':8.0, 'message':"Aim your shot:" + 
                                "\\    [base,yellow]drag[base] the cursor, over, and then off the basketball, to change shot speed and direction" +
                                "\\    (you'll see the predicted path of the ball)"},
         5:{'tL_s':8.0, 'message':"Fine tune it:" + 
                                '\\    press the "[base,yellow]b[base]" key to enable finer positioning' +
                                '\\    press "[base,yellow]b[base]" again to disable it'},
         6:{'tL_s':8.0, 'message':'Shoot:' + 
                                '\\    [base,yellow]release[base] the mouse button' + 
                                '\\    (release over the basketball to cancel the shot)'},
         7:{'tL_s':8.0, 'message':'Scoring:' + 
                                '\\    [base,yellow]100[base]: shot rattles in' + 
                                '\\    [base,yellow]200[base]: swish shot' + 
                                '\\    [base,yellow]300[base]: bank shot that rattles in' + 
                                '\\    [base,yellow]400[base]: clean bank shot' +
                                '\\    [base,yellow]500[base]: trick shot'},
         8:{'tL_s':12.0, 'message':'Aim for a bank shot:' + 
                                '\\    Bank shots with a ' + facePhrase + ' are easier if it hits the backboard with a [base,yellow]vertical[base] orientation.' + 
                                "\\    Click on a " + facePhrase + " while it's resting on the ground," + 
                                '\\    then use the [base,yellow]"c"[base] key to attach to the center (and avoid rotation).' + 
                                '\\    This will keep the orientation vertical while aiming the shot.'},
         9:{'tL_s':8.0, 'message':"Try unlocked shooting (flinging can be fun):" + 
                                 '\\   press "[base,yellow]ctrl-shift-L[base]"' + 
                                 '\\   ("[base,yellow]ctrl-shift-L[base]" again to lock it)'}
      });
   }
   
   function checkTimeLimit() {
      let countdownStart_s = 120; // reference point calculating countdown, zero after this much time
      let startShowingTimer_s = 60;
      let shutdownTime_s = 0;
      
      gW.messages['help2'].loc_px = {'x':325,'y':230};
      
      m_timer_s += gW.getDeltaT_s();
      let countdownTimer_s = countdownStart_s - m_timer_s;
      let timeRemaining_s = countdownTimer_s - shutdownTime_s;
      
      if ( ! m_reportedWin) {
         if ( (countdownTimer_s < shutdownTime_s) && ( ! m_gameState['shutDown']) ) {
            m_gameState['shutDown'] = true;
            m_gameState['showTimer'] = false;
            
            gW.messages['help2'].newMessage("[30px Arial]You can score one last time (shoot as many times as you like).", 3);
            
         } else if ((countdownTimer_s >= shutdownTime_s) && (countdownTimer_s < startShowingTimer_s)) {
            m_gameState['showTimer'] = true;
            gW.messages['hoopsTimer'].newMessage( timeRemaining_s.toFixed(1), 0.2);
            
            let timeLeft_s = startShowingTimer_s - shutdownTime_s;
            
            if ( ! m_gameState['timeWarningGiven']) {
               gW.messages['help2'].newMessage("[30px Arial]" + timeLeft_s + " seconds remaining...", 3);
               m_gameState['timeWarningGiven'] = true;
            }
         }
      }
   }
   
   // This gets called in boxStuff.js for any puck collisions with walls during demo 5.e.basketball-par.
   function processBasketBallCollisions( wall, puck) {
      // Exit if shooting a puck with no image OR not one of the walls in the map.
      if ((puck.imageID === null) || ( ! (wall.name in m_wallMap))) return;
      
      m_callCount++;
      
      if (m_wallMap[ wall.name] == "backboard") {
         m_backBoardShot = true;
         
      } else if ((m_wallMap[ wall.name] == "leftHoop") || (m_wallMap[ wall.name] == "rightHoop")) {
         m_hoopContact = true;
         
      } else if (m_wallMap[ wall.name] == "topSensor") {
         m_hitTopSensor = true;
         
      } else if ((m_wallMap[ wall.name] == "bottomSensor") && ( ! m_hitTopSensor)) {
         m_hitBottomSensorFirst = true;
         console.log("hit bottom sensor first");
         
      } else if (m_wallMap[ wall.name] == "rightWallSensor") {
         m_hitRightWall = true;
         console.log("hit right wall");
      }
      
      // Run final check on bottom sensor to see if the puck went through the hoop from the top.
      if ( (m_wallMap[ wall.name] == "bottomSensor") && (m_hitTopSensor) ) {
      
         // final checks for prohibited, easy, and trick shots
         let prohibited = false;
         let tooEasy = false;
         let trickShot = false;
                  
         if (m_puck_v_2d_mps.zeroLength() || m_hitBottomSensorFirst) { 
            prohibited = true;
         } else if ((m_puck_v_2d_mps.x > 0.0) && (m_puck_pos_2d_m.y < 4.0)) { 
            trickShot = true;
         } else if ((m_puck_pos_2d_m.x > 1.0) && (m_puck_pos_2d_m.x < 10.0) || (m_puck_pos_2d_m.y >= 4.0)) { 
            tooEasy = true;
         }
         
         let messageString = "";
         
         let messageDuration;
         if (m_version == "v2") {
            if (prohibited) {
               messageDuration = 2.5;
            } else if (tooEasy) {
               messageDuration = 5.5;
            } else {
               messageDuration = (m_chokeShotReports) ? 3.0 : 7.0;
            }
         } else {
            messageDuration = (m_chokeShotReports) ? 3.0 : 4.0;
         }
                  
         let shotTypeString = "";
         let scoreChange = 0;
         if (prohibited) {
            shotTypeString = "goal tending\\[25px Arial]   nice try";
            scoreChange = 0;
         } else if (tooEasy) {
            shotTypeString = "too easy \\[30px Arial,yellow]try a harder shot" +
                             "\\[25px Arial]   move farther away (x > 10)" + 
                             "\\[25px Arial]   shoot from behind the backboard (x < 1)" +
                             "\\[25px Arial]   start lower (y < 4)" +
                             "\\[25px Arial]   be tricky (shoot to the right)";
            scoreChange = 0;
         } else if (trickShot) {
            if (m_hitRightWall) {
               shotTypeString = " --- wow, super tricky shot";
               scoreChange = 900;
            } else {
               shotTypeString = " --- pretty good, trick shot";
               scoreChange = 500;
            }
         } else if ((m_backBoardShot) && (m_hoopContact)) {
            shotTypeString = " --- bank shot rattles in";
            scoreChange = 300;
         } else if ((m_backBoardShot) && ( ! m_hoopContact)) {
            shotTypeString = " --- clean bank shot";
            scoreChange = 400;
         } else if (( ! m_backBoardShot) && (m_hoopContact)) {
            shotTypeString = " --- it rattles in";
            scoreChange = 100;
         } else if (( ! m_backBoardShot) && ( ! m_hoopContact)) {
            shotTypeString = " --- swish shot";
            scoreChange = 200;
         }
         
         // If no aiming guide, just flinging it, give a bonus.
         if (( ! gW.clients[ m_clientName].ctrlShiftLock) && (scoreChange > 0)) {
            scoreChange += 200;
            shotTypeString += " (fling bonus)";
         }
         
         if (m_firstExampleShot) scoreChange = 0; 
         gW.clients[ m_clientName].score += scoreChange;
         
         let scoreString = "";
         cT.Client.applyToAll( client => { 
            let scoreChangeString = (client.name == m_clientName) ? scoreChange : 0;
            scoreString += '' + client.nameString(true) + ': [base,yellow]' + client.score + ' (+' + scoreChangeString + ')    [base]';
         });
         if ( ! m_reportedWin) gW.messages['score'].newMessage( scoreString, 10.0);
         
         if (prohibited || tooEasy) {
            messageString = shotTypeString;
            
         } else if (puck.imageID == "miller") {
            m_millerShot = "made it";
            messageString = "a bit sluggish there, [base,yellow]Jim[base]" + shotTypeString +
                    "\\   [30px Arial] but it counts; maybe grab some coffee";
         
         } else if (puck.imageID == "basketball") {
            if ( ! m_firstExampleShot) m_humanUseOfBasketBall = true;
            messageString = "excellent shooting" + shotTypeString +
                    "\\   [30px Arial] Good choice: a real basketball. Makes sense.";
                    
         } else if (puck.imageID == "dandelion") {
            messageString = "almost too easy" + shotTypeString +
                    "\\   [30px Arial] have to hand it to you; nice shot";
            let adderString =        
                    "\\   [25px Arial]       (try the basketball)";
            if ( ! m_humanUseOfBasketBall) messageString = messageString + adderString;
                                                 
         } else {
            // Remove the "good one" for version 2 projectiles.
            let leadPhrase = ( uT.oneOfThese(['elephant','donkey','monkey'], puck.imageID) ) ? "" : "good one, ";
            messageString = leadPhrase + "[base,yellow]" + m_nameMap[ puck.imageID]['name'] + "[base]" + shotTypeString + "\\[25px Arial]" + m_nameMap[ puck.imageID]['title'];
         }
         
         if (m_chokeShotReports) messageString = shotTypeString.replace(" --- ","");
         
         if ( ! m_shotReportIssued) {
            if ( ! m_firstExampleShot) gW.messages['gameTitle'].newMessage( messageString, messageDuration);
    
            // Auto feeder (push a new face or mascot into the game)...
            if ((m_playList.includes( puck.imageID) || m_firstExampleShot) && (m_playList.length > 1)) {
               /* 
               Keep the positioning of the object consistent, independent of user 
               selected time-step or monitor frame-rate. (Slower physics requires 
               longer system-wait times for the feeder to move.) Alternatively, you can 
               apply this same correction to blockSpeed, instead of the wait times. 
               In that case the feeder will always render at the same speed. 
               But that will position the object poorly in some situations. 
               */
               let blockSpeed_mps = 1.00;
               let waitCorrection = ( gW.aT.dt_RA_ms.result / (gW.getDeltaT_s()*1000) );
               // Use a wall to push the next puck out for shooting
               gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( -blockSpeed_mps,0));
               // 2.5 seconds later, reverse the motion.
               m_reverseFeeder = window.setTimeout( function() {
                  gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( blockSpeed_mps,0));
               }, 2500 * waitCorrection);
               // Stop the wall and make sure it is all the way back, out of the way.         
               m_stopFeeder = window.setTimeout( function() {
                  gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( 0.0, 0.0));
                  gW.aT.wallMap['wall25'].setPosition( new wS.Vec2D(20.7, 0.58));
                  //m_firstExampleShot = false;
               }, 5000 * waitCorrection);
               
               // Now, after the first time through, the basketball shot, issue a reset as would 
               // normally happen with real shots. This will set m_firstExampleShot to false.
               if (m_firstExampleShot) resetShotState();
            }
            
            if ( ! m_firstExampleShot) m_shotReportIssued = true;
            
            // After playing someone, remove from the play list.
            m_playList = m_playList.filter( name => (name != puck.imageID) );
         }
            
         if ( ( ! m_reportedWin) && ((m_playList.length == 0) || (m_gameState['shutDown'])) ) {
            shutDownGame( messageDuration);
         }
         
         console.log("collisions, list = " + m_callCount + ', ' +  m_playList.length);
         m_callCount = 0;
      }
   }
   
   function shutDownGame( messageDelay) {
      let playTime_s = (new Date().getTime() - m_timeOfStart)/1000;
      cT.Client.applyToAll( client => { 
         // If not using TwoThumbs, must set this before calling addScoreToSummary. 
         if (client.touchScreenUsage) client.virtualGamePadUsage = true;
         if (client.score > 0) client.addScoreToSummary( playTime_s.toFixed(2), gW.getDemoIndex(), false);
      });
      
      lB.reportGameResults();
      // Send a score for each human player to the leader-board. Build leader-board report at the end.
      lB.submitScoresThenReport();
      // Open up the multi-player panel so you can see the leader-board report.
      if ( ! gW.dC.multiplayer.checked) {  
         $('#chkMultiplayer').trigger('click');
      }

      let shooterCount = (m_gameState['shutDown']) ? (m_initialTeamSize - m_playList.length) : m_initialTeamSize;
      
      // This series effectively waits until the message in gameTitle finishes (waits messageDelay seconds).
      let theSeries;
      if (m_version == "v2") {
         let quoteString = (shooterCount == 1) ? 'quote' : 'quotes';
         theSeries = {
            1:{'tL_s':messageDelay, 'message':"[1px Arial]."},
            2:{'tL_s':2.0, 'message':"[35px Arial]That's a pretty good civics lesson!"},
            3:{'tL_s':2.0, 'message':"[35px Arial]" + m_numberNames[ shooterCount] + " " + quoteString + ","},
            4:{'tL_s':2.0, 'message':"[35px Arial]" + m_partisanNature + "."},
            5:{'tL_s':2.0, 'message':"[35px Arial]Thanks for playing along."},
            6:{'tL_s':0.5, 'message':"[50px Arial]      ."},
            7:{'tL_s':0.5, 'message':"[50px Arial]     ..."},   
            8:{'tL_s':0.5, 'message':"[50px Arial]    ....."},
            9:{'tL_s':0.5, 'message':"[50px Arial]   ......."},
           10:{'tL_s':0.5, 'message':"[50px Arial]    ....."},
           11:{'tL_s':0.5, 'message':"[50px Arial]     ..."},
           12:{'tL_s':0.5, 'message':"[50px Arial]      ."},
           13:{'tL_s':3.0, 'message':"[30px Arial]press the 5 key to start again..."}
         }
      } else {
         let politicianString = (shooterCount == 1) ? 'politician' : 'politicians';
         let playingString = (shooterCount == 1) ? '' : ' together';
         theSeries = {
            1:{'tL_s':messageDelay, 'message':"[1px Arial]."},
            2:{'tL_s':2.0, 'message':"[35px Arial]That's pretty good coaching!"},
            3:{'tL_s':2.0, 'message':"[35px Arial]" + m_numberNames[ shooterCount] + " " + politicianString + ","},
            4:{'tL_s':2.0, 'message':"[35px Arial]" + m_partisanNature + ","},
            5:{'tL_s':2.0, 'message':"[35px Arial]playing" + playingString + "."},
            6:{'tL_s':0.5, 'message':"[50px Arial]      ."},
            7:{'tL_s':0.5, 'message':"[50px Arial]     ..."},   
            8:{'tL_s':0.5, 'message':"[50px Arial]    ....."},
            9:{'tL_s':0.5, 'message':"[50px Arial]   ......."},
           10:{'tL_s':0.5, 'message':"[50px Arial]    ....."},
           11:{'tL_s':0.5, 'message':"[50px Arial]     ..."},
           12:{'tL_s':0.5, 'message':"[50px Arial]      ."},
           13:{'tL_s':3.0, 'message':"[30px Arial]press the 5 key to start again..."}
         }
      }
      gW.messages['help2'].loc_px = {'x':325,'y':230};
      gW.messages['help2'].newMessageSeries( theSeries);
      
      // If no successful miller basket, delay a check until after the main closing message. 
      // Check if the miller puck has been used. Modify the encouraging message to reflect that.
      if (m_millerAvailable && (m_millerShot != 'made it')) {
         m_closingRemark = window.setTimeout( function() {
            let stringOfEncouragement = (m_millerShot == 'attempted') ? "Give the mystery man another try." : "I wouldn't mind a little ride too."; 
            gW.messages['help2'].newMessageSeries( {   
              1:{'tL_s':0.3, 'message':"[50px Arial]      ."},
              2:{'tL_s':0.3, 'message':"[50px Arial]     ..."},   
              3:{'tL_s':0.3, 'message':"[50px Arial]    ....."},
              4:{'tL_s':0.3, 'message':"[50px Arial]     ..."},
              5:{'tL_s':0.3, 'message':"[50px Arial]      ."},
              6:{'tL_s':2.0, 'message':"[30px Arial]before you go..."},
              7:{'tL_s':3.0, 'message':"[30px Arial]" + stringOfEncouragement}
            });
         }, gW.messages['help2'].getDurationOfSeries_s() * 1000);
      }
         
      m_reportedWin = true;   
   }
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      'gameState': m_gameState,
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'resetShotState': resetShotState,
      'initializeGame': initializeGame,
      'checkTimeLimit': checkTimeLimit,
      'processBasketBallCollisions': processBasketBallCollisions
   };

})();