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
       m_closingRemark, m_reverseFeeder, m_stopFeeder;
   
   var m_wallMap = {'wall5':'leftHoop', 'wall12':'rightHoop', 'wall21':'backboard', 'wall23':'bottomSensor', 'wall24':'topSensor'};
   
   var m_nameMap = {
      'trump2':   {'name':'Donald', 'title':'   (former President of the United States, Donald Trump)'}, 
      'biden2':   {'name':'Joe',    'title':'   (President of the United States, Joe Biden)'}, 
      'harris':   {'name':'Kamala', 'title':'   (Vice President of the United States, Kamala Harris)'}, 
      'pence':    {'name':'Mike',   'title':'   (former Vice President of the United States, Mike Pence)'}, 
      'pelosi':   {'name':'Nancy',  'title':'   (Speaker of the United States House of Representatives, Nancy Pelosi)'}, 
      'schumer':  {'name':'Chuck',  'title':'   (Majority Leader of the United States Senate, Chuck Schumer)'}, 
      'mcconnell':{'name':'Mitch',  'title':'   (Minority Leader of the United States Senate, Mitch McConnell)'}, 
      'mccarthy': {'name':'Kevin',  'title':'   (Minority Leader of the United States House of Representatives, Kevin McCarthy)'}
   };

   var m_democratNames = ['biden2','harris','schumer','pelosi'];
   var m_republicanNames = ['trump2','pence','mcconnell','mccarthy'];
   
   var m_numberNames = {0:'Zero',1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight'};
   
   // module globals for objects brought in by initializeModule
   // (none)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
   }
   
   // This prepares for the collision detection by the sensors when the user launches a shot (see ghostBall.js). 
   function resetShotState( pars = {}) {
      m_clientName = uT.setDefault( pars.clientName, "local");
      let puckName = uT.setDefault( pars.puckName, "puck4");
      let initializing = uT.setDefault( pars.initializing, false);
      
      m_backBoardShot = false;
      m_hoopContact = false;
      m_hitTopSensor = false;
      m_hitBottomSensorFirst = false;
      m_callCount = 0;
      
      if (initializing) {
         m_firstExampleShot = true;
         m_millerShot = "no attempt yet";
      } else {
         m_firstExampleShot = false;
         if (gW.aT.puckMap[ puckName].imageID == "miller") m_millerShot = "attempted";
      }
   }
   
   function stopAllTimers() {
      window.clearTimeout( m_closingRemark);
      window.clearTimeout( m_reverseFeeder);
      window.clearTimeout( m_stopFeeder);   
      
      gW.messages['score'].resetMessage();
      gW.messages['gameTitle'].resetMessage();
      gW.messages['help'].resetMessage();
      gW.messages['help2'].resetMessage();
   }
   
   function initializeGame() {
      stopAllTimers();
      
      m_reportedWin = false;
      m_humanUseOfBasketBall = false;
      m_timeOfStart = new Date().getTime();
      
      resetShotState({'initializing':true});
      
      // Make sure the auto-feeder wall is in it's starting position.
      gW.aT.wallMap['wall25'].setPosition( new wS.Vec2D(20.7,0.58));
      gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( 0.0, 0.0));
      
      // Make a roster based on the politician faces in the capture.
      let someDemocrats = false;
      let someRepublicans = false;
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
         } else if (imageID == 'miller') {
            m_millerAvailable = true;
         }
      }
      //m_playList = ['biden2','harris'];  // for quick testing...
      //m_playList = ['biden2'];  // for even quicker testing...
      m_initialTeamSize = m_playList.length;
      
      if (someDemocrats && someRepublicans) {
         m_partisanNature = 'from both sides of the aisle';
      } else if (someDemocrats && !someRepublicans) {
         m_partisanNature = 'from the democratic side of the aisle';
      } else if (!someDemocrats && someRepublicans) {
         m_partisanNature = 'from the republican side of the aisle';
      } else if (!someDemocrats && !someRepublicans) {
         m_partisanNature = 'from either side of the aisle';
      }
      
      gW.messages['gameTitle'].loc_px = {'x':450,'y':350};
      
      gW.messages['gameTitle'].setFont('50px Arial');
      gW.messages['gameTitle'].popAtEnd = false;
      gW.messages['gameTitle'].newMessage("Bipartisan Hoops " + "[50px Arial, #CD5A00](" + String.fromCharCode(8217) + "21-" + String.fromCharCode(8217) + "22)[base]" +
              "\\  [30px Arial, lightgray]a game for the weary U.S. citizen[base]", 5.0); 
      
      gW.messages['help'].loc_px = {'x':75,'y':95};
      gW.messages['help'].newMessageSeries({
         1:{'tL_s':8.0, 'message':"The view:" + 
                                "\\    use the \"[base,yellow]esc[base]\" key to exit back to normal view" +
                                "\\    \"[base,yellow]v[base]\" key to return to full-screen view" + 
                                "\\    \"[base,yellow]5[base]\" key to restart this demo (including this help)" +
                                "\\    \"[base,yellow]0[base]\" key to exit and reset (nuke) everything"},
         2:{'tL_s':8.0, 'message':'Position the ball before the shot:' + 
                                '\\    hold the "[base,yellow]ctrl[base]" key down while dragging the basketball' + 
                                '\\    in a similar way, encourage one of the politicians (or me) to get into the game'},
         3:{'tL_s':8.0, 'message':"Aim your shot:" + 
                                "\\    [base,yellow]drag[base] the cursor, over, and then off the basketball, to change shot speed and direction" +
                                "\\    (you'll see the predicted path of the ball)"},
         4:{'tL_s':8.0, 'message':"Fine tune it:" + 
                                '\\    press the "[base,yellow]b[base]" key to enable finer positioning' +
                                '\\    press "[base,yellow]b[base]" again to disable it'},
         5:{'tL_s':8.0, 'message':'Shoot:' + 
                                '\\    [base,yellow]release[base] the mouse button' + 
                                '\\    (release over the basketball to cancel the shot)'},
         6:{'tL_s':8.0, 'message':'Scoring:' + 
                                '\\    [base,yellow]100[base]: shot rattles in' + 
                                '\\    [base,yellow]200[base]: swish shot' + 
                                '\\    [base,yellow]300[base]: bank shot that rattles in' + 
                                '\\    [base,yellow]400[base]: clean bank shot'},
         7:{'tL_s':12.0, 'message':'Aim for a bank shot:' + 
                                '\\    Bank shots with a face are easier if it hits the backboard with a [base,yellow]vertical[base] orientation.' + 
                                "\\    Click on a face while it's resting on the ground," + 
                                '\\    then use the [base,yellow]"c"[base] key to attach to the center (and avoid rotation).' + 
                                '\\    This will keep the orientation vertical while aiming the shot.'},
         8:{'tL_s':8.0, 'message':"Try unlocked shooting (flinging can be fun):" + 
                                 '\\   press "[base,yellow]ctrl-shift-L[base]"' + 
                                 '\\   ("[base,yellow]ctrl-shift-L[base]" again to lock it)'}
      });
   }
   
   // This gets called in gwModule for any puck collisions with walls during demo 5.e.basketball.
   function processBasketBallCollisions( wall, puck) {
      // Exit if shooting a puck with no image OR not one of the sensor walls near the hoop.
      if ((puck.imageID === null) || ( ! (wall.name in m_wallMap))) return;
      
      m_callCount++;
      
      if (m_wallMap[ wall.name] == "backboard") {
         m_backBoardShot = true;
      }
      if ((m_wallMap[ wall.name] == "leftHoop") || (m_wallMap[ wall.name] == "rightHoop")) {
         m_hoopContact = true;
      }
      if (m_wallMap[ wall.name] == "topSensor") {
         m_hitTopSensor = true;
      }
      if ((m_wallMap[ wall.name] == "bottomSensor") && ( ! m_hitTopSensor)) {
         m_hitBottomSensorFirst = true;
      }
      
      // Run final check on bottom sensor to see if the puck went through the hoop from the top.
      if ( (m_wallMap[ wall.name] == "bottomSensor") && ( ! m_hitBottomSensorFirst) && (m_hitTopSensor) ) { 
         let messageString = "";
         let messageDuration = 4.0;
                  
         let shotTypeString = "";
         let scoreChange = 0;
         if ((m_backBoardShot) && (m_hoopContact)) {
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
         if (m_firstExampleShot) scoreChange = 0; 
         gW.clients[ m_clientName].score += scoreChange;
         
         let scoreString = "";
         cT.Client.applyToAll( client => { 
            let scoreChangeString = (client.name == m_clientName) ? scoreChange : 0;
            scoreString += '' + client.nameString(true) + ': [base,yellow]' + client.score + ' (+' + scoreChangeString + ')    [base]';
         });
         if ( ! m_reportedWin) gW.messages['score'].newMessage( scoreString, 10.0);
         
         if (puck.imageID == "miller") {
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
            messageString = "good one, [base,yellow]" + m_nameMap[ puck.imageID]['name'] + "[base]" + shotTypeString + "\\[25px Arial]" + m_nameMap[ puck.imageID]['title'];
         }
         
         if ( ! m_firstExampleShot) gW.messages['gameTitle'].newMessage( messageString, messageDuration);
         
         // Auto feeder (push a new face into the game)...
         if (m_playList.includes( puck.imageID) || m_firstExampleShot) {
            // Keep wall (a block) speed consistent, independent of user selected time-step.
            let blockSpeed_mps = 1.00 * ( gW.aT.dt_RA_ms.result / (gW.getDeltaT_s()*1000) );
            // Use a wall to push the next puck out for shooting
            gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( -blockSpeed_mps,0));
            // 2.5 seconds later, reverse the motion.
            m_reverseFeeder = window.setTimeout( function() {
               gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( blockSpeed_mps,0));
            }, 2500);
            // Stop the wall and make sure it is all the way back, out of the way.         
            m_stopFeeder = window.setTimeout( function() {
               gW.aT.wallMap['wall25'].setVelocity( new wS.Vec2D( 0.0, 0.0));
               gW.aT.wallMap['wall25'].setPosition( new wS.Vec2D(20.7, 0.58));
            }, 5000);
         }
         
         m_firstExampleShot = false;
         
         // After playing someone, remove from the play list.
         m_playList = m_playList.filter( name => (name != puck.imageID) );
         
         if ((m_playList.length == 0) && ( ! m_reportedWin)) {
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
            
            // This series effectively waits until the message in gameTitle finishes (waits messageDuration seconds).
            let politicianString = (m_initialTeamSize == 1) ? 'politician' : 'politicians';
            let playingString = (m_initialTeamSize == 1) ? '' : ' together';
            let theSeries = {
               1:{'tL_s':messageDuration, 'message':"[1px Arial]."},
               2:{'tL_s':2.0, 'message':"[35px Arial]That's pretty good coaching!"},
               3:{'tL_s':2.0, 'message':"[35px Arial]" + m_numberNames[ m_initialTeamSize] + " " + politicianString + ","},
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
            gW.messages['help2'].loc_px = {'x':325,'y':230};  //     gametitle{'x':450,'y':350};   old{'x':200,'y':110}
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
         
         //console.log("collisions, list = " + m_callCount + ', ' +  m_playList.length);
         m_callCount = 0;
      }
   }
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'resetShotState': resetShotState,
      'initializeGame': initializeGame,
      'processBasketBallCollisions': processBasketBallCollisions
   };

})();