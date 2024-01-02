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

// Monkey Hunt (mH) module
// monkeyHunt.js
   console.log('mH _*-*_');
// 1:30 PM Tue January 3, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.mH = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_timeOfStart, m_reportedWin, m_updatedScore, m_monkeyInWindow, m_monkeyHitFloor, m_autoPosition,
       m_timeOutID_autoPosition, m_timeOutID_niceShot, m_reportedWin, m_clientName, m_projectileName,
       m_hitCount, m_hitMessageIndex, m_shotIndex, m_gameOverReported, m_timeOfStart, m_shotLimit, m_shotInPlay;
   
   var m_wallMap = {'wall3':'floor','wall8':'topWindow','wall5':'bottomRight','wall9':'topRight'};
   var m_puckMap = {'puck1':'shooter','puck2':'monkey'};
   var m_rightWall = ['wall5','wall9'];
   
   // module globals for objects brought in by initializeModule
   // (none)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
      // nothing yet
   }
   
   // This is called in the poolShot function and acts to prepares for collision detection by sensors.
   function resetShotState( pars = {}) {
      m_clientName = uT.setDefault( pars.clientName, "local");
      m_projectileName = uT.setDefault( pars.puckName, "puck1");
      let initializing = uT.setDefault( pars.initializing, false);
      
      m_monkeyInWindow = false;
      m_updatedScore = false;
      m_hitCount = 0;
      // 1,2,3.. After shooting the first shot, the m_shotIndex is 2.
      m_shotIndex++;
      m_shotInPlay = true;
      
      if (m_autoPosition && ( ! initializing)) {
         if (m_timeOutID_autoPosition) window.clearTimeout( m_timeOutID_autoPosition);
         waitThenSetPositions();
      }
   }
   
   // the s key runs this directly, no wait.
   function setPositions( pars = {}) {
      let disableAutoPosition = uT.setDefault( pars.disableAutoPosition, false);
      
      if (disableAutoPosition) {
         m_autoPosition = false;
         if (m_timeOutID_autoPosition) window.clearTimeout( m_timeOutID_autoPosition);
         if (m_timeOutID_niceShot) window.clearTimeout( m_timeOutID_niceShot);
      } 
      
      // Make sure the platforms aren't still there (before we create and position new ones).
      deleteMonkeyWalls();
      
      // monkey and platform
      gW.aT.puckMap['puck2'].setPosition( new wS.Vec2D(17.8, 12.0), 0);         
      new cP.Wall( new wS.Vec2D( 17.9, 9.19), {'name':'wall6', 'half_width_m':0.60, 'half_height_m':0.02, 'monkeyHunt':true});
      
      // Shooter
      if (m_shotIndex <= 3) {
         gW.aT.puckMap['puck1'].setPosition( new wS.Vec2D( 0.5,  12.0), 0);
         new cP.Wall( new wS.Vec2D( 0.173, 9.19), {'half_width_m':0.60, 'half_height_m':0.02, 'monkeyHunt':true});
         
      } else if (m_shotIndex > 3) {
         gW.aT.puckMap['puck1'].setPosition( new wS.Vec2D( 0.5,  1.5), 0);
      }

      if ( ! m_gameOverReported) {
         gW.messages['gameTitle'].setFont('25px Arial');
         if (m_shotIndex <= 3) {
            gW.messages['gameTitle'].newMessage("He's back... \\ \\ ...shot " + m_shotIndex + " of " + m_shotLimit + ".", 3.0);
         } else {
            gW.messages['gameTitle'].newMessage("He's back... \\ \\   you're on the ground this time... \\ \\...shot " + m_shotIndex + " of " + m_shotLimit + ".", 3.0);
         }
      }
      
      m_monkeyHitFloor = false;
      m_shotInPlay = false;
      updateScore(0, false);
      
      // Taunt the user if not hitting monkey before floor collision.
      let someOneHasHitIt = false;
      cT.Client.applyToAll( client => { 
         if (client.score > 0) someOneHasHitIt = true;
      });
      if ( ! someOneHasHitIt) {
         gW.messages['gameTitle'].addToIt("\\ \\ \\ \\[25px Arial,lightgray]Bump him[base] out the window.");
         
         if ([2,4,6].includes( m_shotIndex)) {
            gW.sounds['monkeyPlacement2'].play();
         } else {
            gW.sounds['monkeyPlacement'].play();
         }
      }  
   }
   
   function waitThenSetPositions() {
      gW.messages['help2'].loc_px = {'x':4,'y':15};
      gW.messages['help2'].newMessageSeries({
         1:{'tL_s':1.0, 'message':'[15px Arial,yellow]6[15px Arial,lightgray]: wait for next shot.'},
         2:{'tL_s':1.0, 'message':'[15px Arial,yellow]5[base]'},
         3:{'tL_s':1.0, 'message':'[15px Arial,yellow]4[base]'},
         4:{'tL_s':1.0, 'message':'[15px Arial,yellow]3[base]'},
         5:{'tL_s':1.0, 'message':'[15px Arial,yellow]2[base]'},
         6:{'tL_s':1.0, 'message':'[15px Arial,yellow]1[base]'}
      });
      
      m_timeOutID_autoPosition = window.setTimeout( function() {
         setPositions();
         m_timeOutID_autoPosition = null;
      }, 6000);
   }
   
   function initializeGame() {
      resetShotState({'initializing':true});
      
      m_autoPosition = true;
      m_monkeyHitFloor = false;
      m_timeOfStart = new Date().getTime();
      
      if (m_timeOutID_autoPosition) window.clearTimeout( m_timeOutID_autoPosition);
      m_timeOutID_autoPosition = null;
      
      if (m_timeOutID_niceShot) window.clearTimeout( m_timeOutID_niceShot);
      m_timeOutID_niceShot = null;
      
      m_reportedWin = false;
      m_updatedScore = false;
      m_hitCount = 0;
      m_hitMessageIndex = 1;
      m_shotIndex = 1;
      m_shotLimit = 6; // 6
      m_gameOverReported = false;
      m_timeOfStart = new Date().getTime();
      m_shotInPlay = false;
      
      updateScore(0, false);
      
      gW.sounds['monkeyPlacement'].play();
      
      gW.messages['gameTitle'].loc_px = {'x':450,'y':350};
      
      gW.messages['gameTitle'].setFont('50px Arial');
      gW.messages['gameTitle'].popAtEnd = false;
      gW.messages['gameTitle'].newMessage("Monkey Hunt \\  [30px Arial]a challenge for you...[base]" +
                                                   "\\ \\  [italic 35px Arial]     hit the monkey before he lands", 4.0);
      
      gW.messages['help'].loc_px = {'x':75,'y':90};
      gW.messages['help'].newMessageSeries({
         1:{'tL_s':5.0, 'message':'[25px Arial,yellow]full-screen[25px Arial,lightgray] view:' +
                                '\\    press the [base,yellow]esc[base] or [base,yellow]zero[base] key to return to the normal view' +
                                '\\    press the [base,yellow]v key[base] for full-screen'
                                },
         2:{'tL_s':5.0, 'message':'[25px Arial,yellow]aim[25px Arial,lightgray] your shot:' + 
                                '\\    use the mouse to [base,yellow]drag[base] the projectile forecast out of the ball' +
                             '\\ \\    (on a touch screen, touch the ball and drag)'
                                },
         3:{'tL_s':5.0, 'message':'[25px Arial,yellow]shoot[25px Arial,lightgray] the ball:' + 
                                '\\    [base,yellow]release[base] the mouse button after aiming' + 
                                '\\    release [base,yellow]over[base] the ball to [base,yellow]cancel[base] the shot' + 
                             '\\ \\    (on a touch screen, release your touch point after aiming)'
                                },
         4:{'tL_s':5.0, 'message':'[25px Arial,yellow]fine tune[25px Arial,lightgray] your shot:' + 
                                '\\    to toggle fine-moves, tap the [base,yellow]b key[base] while dragging the ball' + 
                             '\\ \\    (on a touch screen, tap a second-finger while dragging)'
                                },
         5:{'tL_s':7.0, 'message':'[25px Arial,lightgray](alternately) lock the ball [25px Arial,yellow]speed[25px Arial,lightgray]:' +
                                '\\    tap the [base,yellow]z key[base] while dragging the ball to set new speed locks' +
                                '\\    or use the [base,yellow]mouse wheel[base] to change the speed after locking' + 
                                '\\    to unlock, tap z with no ball selected'
                                },
         6:{'tL_s':5.0, 'message':'[25px Arial,yellow]Manually[25px Arial,lightgray] start the next shot with the [25px Arial,yellow]s key[25px Arial,lightgray]' + 
                                '\\    (instead of waiting 6 seconds)'
                                },
         7:{'tL_s':5.0, 'message':"[25px Arial,yellow]restart[25px Arial,lightgray] the challenge (and this help):" +
                                '\\    press [base,yellow]#4 key[base] ' + 
                             '\\ \\    (on a touch screen, restart with a four-finger touch)'
                                }
      });
      
      gW.messages['help2'].resetMessage();
            
      // Make sure all touch-screen clients have their control key UP (so not ball-in-hand). This must be set on the client and then sent from there to the host.
      hC.sendSocketControlMessage({'from':'host', 'to':'roomNoSender', 'data':{'controlKey':{'value':'U'}}});
   }
   
   function deleteMonkeyWalls() {
      cP.Wall.applyToAll( wall => {
         if (wall.monkeyHunt) {
            wall.deleteThisOne({});
         }
      });
   }
   
   function updateScore( scoreChange, showChange = true) {
      // Allow only one score update per shot (similar, a bit redundant, to the checks on m_hitCount).
      if ( ! m_updatedScore) {
         gW.clients[ m_clientName].score += scoreChange;
         
         let scoreString = "";
         let n_nonZeroScores = 0;
         cT.Client.applyToAll( client => { 
            if (client.score > 0) n_nonZeroScores++;
            let scoreChangeValue = (client.name == m_clientName) ? scoreChange : 0;
            let scoreChangeString = (showChange) ? ' (+' + scoreChangeValue + ')' : "";
            scoreString += client.nameString(true) + ': [base,yellow]' + client.score + scoreChangeString + '[base]    ';
         });
         if (n_nonZeroScores > 1) scoreString += "\\[20px Arial, gray]Multiple players share a total of six shots.[base]";
         if ( ! m_reportedWin) gW.messages['score'].newMessage( scoreString, 5.0);
         
         m_updatedScore = true;
      }
   }
   
   // This gets called in gwModule for any puck collisions with walls during demo 4.e.
   function processWallCollisions( puck, wall) {
      if (m_shotInPlay && (m_puckMap[ m_projectileName] == "shooter") && (m_puckMap[ puck.name] == "monkey") && (m_wallMap[ wall.name] == "topWindow")) {
         m_monkeyInWindow = true;
         
         // This one sounds like a monkey friend laughing at him being pushed outside. Delay a little so the alarmed sound can finish.
         window.setTimeout( function() { gW.sounds['monkeyOK'].play(); }, 300);
         
         if ( ! m_gameOverReported) { 
            updateScore( 100);
            
            if (m_shotIndex > m_shotLimit) {
               gameOver("Ending on a high note!");
               
            } else {
               gW.messages['gameTitle'].setFont('35px Arial');
               if (m_shotIndex <= 3) { 
                  gW.messages['gameTitle'].newMessage("That's it... \\ \\[25px Arial]  some time outside...\\ \\[25px Arial]  probably a banana out there", 3.0);
                  
               } else if (m_shotIndex > 3) {
                  gW.messages['gameTitle'].newMessage("Very satisfying... \\ \\[25px Arial]  free at last...", 3.0);
               }
            }
         }
         
      } else if ((m_puckMap[ puck.name] == "monkey") && (m_wallMap[ wall.name] == "floor")) {
         m_monkeyHitFloor = true;
         if (m_shotIndex > m_shotLimit) gameOver('Not your best shot...');
      }
   }
   
   // Check if puck hits the monkey before the monkey lands on the floor.
   function processHits( puck_A, puck_B) {
      if (puck_A.bullet) {
         var puck_bullet = puck_A, puck_target = puck_B;
      } else {
         var puck_bullet = puck_B, puck_target = puck_A;
      }
      
      if ((m_puckMap[ m_projectileName] == "shooter") && (m_puckMap[ puck_target.name] == "monkey") && ( ! m_monkeyHitFloor)) {
         gW.sounds['monkeyAlarmed'].play();
         
         // Wait to see if the monkey has been pushed out the window. Don't comment on hitting the monkey if that (window transit) happens.
         // If game is over, send final shot comment.
         m_timeOutID_niceShot = window.setTimeout( function() { 
            if (( ! m_monkeyInWindow) && ( ! m_gameOverReported)) {
               
               // Only give credit for hitting the monkey once per shot, and only if not a window transit.
               if (m_hitCount == 0) updateScore( 25);
               
               if (m_shotIndex > m_shotLimit) {
                  gameOver('That one landed.');
                  
               } else if (m_hitCount == 0) {
                  gW.messages['gameTitle'].setFont('30px Arial');
                  
                  if (m_hitMessageIndex == 1) {
                     gW.messages['gameTitle'].newMessage("[35px Arial]            Good shot." + 
                                                    "\\ \\[25px Arial]Even better if you escort the monkey out. " + 
                                                    "\\ \\[25px Arial]             (through the window)", 3.0);
                  } else if (m_hitMessageIndex == 2) {
                     gW.messages['gameTitle'].newMessage("[35px Arial]      That one connected." + 
                                                    "\\ \\[25px Arial]Better if you send the monkey packing. ", 2.5);
                  } else if (m_hitMessageIndex == 3) {
                     gW.messages['gameTitle'].newMessage("[35px Arial]               Nice one." +
                                                    "\\ \\[25px Arial]100 points if you put him outside via the window. ", 2.5);
                  } else if (m_hitMessageIndex == 4) {
                     gW.messages['gameTitle'].newMessage("[30px Arial]            Well done.", 2.5);
                     
                  } else if (m_hitMessageIndex >= 5) {
                     gW.messages['gameTitle'].newMessage("[30px Arial]            Good eye.", 2.5);
                  }
                  
                  m_hitMessageIndex++;
               }    
               
               m_hitCount++;
            }
            m_timeOutID_niceShot = null;
         }, 700);
         
      }
   }
   
   function gameOver( shotComment = "") {
      if ( ! m_gameOverReported) { 
      
         gW.messages['gameTitle'].setFont('25px Arial');
         let shotCommentString = (shotComment != "") ? "" + shotComment + "\\ \\" : "";
         gW.messages['gameTitle'].newMessage("" + shotCommentString + 
                                            "Put another quarter in (the 4 key) to reset the scoring... " + 
                              "\\[20px Arial]                (a four-finger touch) " + 
                           "\\ \\[25px Arial]Or, you can keep shooting. " + 
                     "\\ \\ \\ \\[30px Arial]         Thanks for playing.", 6.0);
         
         let playTime_s = (new Date().getTime() - m_timeOfStart)/1000;
         cT.Client.applyToAll( client => { 
            // If not using TwoThumbs, must set this before calling addScoreToSummary.
            if (client.touchScreenUsage) client.virtualGamePadUsage = true;
            if ((client.name == 'local') || (client.score > 0)) client.addScoreToSummary( playTime_s.toFixed(2), gW.getDemoIndex(), false);
         });
         lB.reportGameResults();
         // Send a score for each human player to the leader-board. Build leader-board report at the end.
         lB.submitScoresThenReport();
         // Open up the multi-player panel so you can see the leader-board report.
         if ( ! gW.dC.multiplayer.checked) {  
            $('#chkMultiplayer').trigger('click');
         }
         
         m_gameOverReported = true;
      }
   }
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'setPositions': setPositions,
      'resetShotState': resetShotState,
      'initializeGame': initializeGame,
      'deleteMonkeyWalls': deleteMonkeyWalls,
      'processWallCollisions': processWallCollisions,
      'processHits': processHits
   };

})();