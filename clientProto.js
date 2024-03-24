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

// Client (cT) module
// clientProto.js 
   console.log('cT _*-*_');
// 4:22 PM Tue July 25, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.cT = (function() {
   "use strict";
   
   // module globals
   
   // module globals for objects brought in by initializeModule
   var x_canvas, x_ctx;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      x_canvas = canvas;
      x_ctx = ctx;
   }
      
   //////////////////////////////////////////////////////////////////////////////////////////
   ////
   ////  Prototype for a client, each player/user, as represented on the host, index.html 
   ////
   //////////////////////////////////////////////////////////////////////////////////////////
   
   function Client( pars) {
      dFM.DrawingFunctions.call(this); // inherit
      this.parsAtBirth = pars;
      //this.alsoThese = [];
      this.color = uT.setDefault( pars.color, "red");
      
      // Used for remembering the host's server name, for everyone but the host (who's this.name is 'local'),
      // this parameter is equal to this.name.
      this.nameFromServer = uT.setDefault( pars.nameFromServer, null);

      // Incrementing the network client name is done in server.js.
      this.name = uT.setDefault( pars.name, "manWithNoName");
            
      // Increment the NPC index, but use the higher value.
      if (this.name.slice(0,3) == 'NPC') {
         Client.npcIndex += 1;
         Client.npcIndex = Math.max(Client.npcIndex, Number(this.name.slice(3)));
         this.name = 'NPC' + Client.npcIndex;
      }
      // Add this client to the map.
      gW.clients[this.name] = this;
      
      this.puck = null;
      this.player = uT.setDefault( pars.player, true);
      this.nickName = uT.setDefault( pars.nickName, null);
      this.teamName = uT.setDefault( pars.teamName, null);
      this.winCount = 0; // use this to suggest a nickname after two game wins
      this.virtualGamePadUsage = false; // usage in a game
      this.twoThumbsEnabled = false; // client in tt fullscreen mode
      this.touchScreenUsage = false;
      this.deviceType = 'desktop';
      
      this.mouseDown = false;
      this.mouseUsage = false;
      this.button = null;
      
      this.raw_2d_px = null; // used only for the 'local' (host) in menu operations for tA.tableActions
      
      // Initially put the drawn cursor (for the local user) out of range of the canvas. That way the cursor doesn't
      // render there initially if the page is refreshed, looks cleaner when first coming to the page.
      if (this.name == 'local') {
         this.mouse_2d_px = new wS.Vec2D(-20, -20);
      } else {
         this.mouse_2d_px = new wS.Vec2D(-10, -10);
      }
      this.mouse_2d_m = wS.worldFromScreen( this.mouse_2d_px);
      this.mouse_async_2d_px = this.mouse_2d_m;
      
      // this one is used in calculating cursor speed...
      this.prev_mouse_2d_px = this.mouse_2d_px;
      
      // used with fine moves...
      this.prevNormalCursorPosOnCanvas_2d_px = this.mouse_2d_px;
      this.previousFine_2d_px = new wS.Vec2D(400, 300);
      this.fineMovesState = 'off';
      this.fMT = {'count':0}; //fine Move Transition
      
      // Make a cursor pin for all human clients.
      if (this.name.slice(0,3) != 'NPC') {
         this.pin = new cP.Pin( Object.assign({}, this.mouse_2d_m), {'name':this.name, 'cursorPin':true, 'borderColor':'white', 'fillColor':this.color});
      } else {
         this.pin = null;
      }
      
      // ghost ball state
      this.gBS = {};
      gB.resetPathAfterShot( this);
      
      // box2d cursor sensor for pool shots
      this.gBS.readyToDraw = false;
      this.b2dSensor = null;
      this.sensorTargetName = null;
      this.sensorContact = null;
      
      // method to indicate these two keys are down without actually holding them down.
      this.ctrlShiftLock = uT.setDefault( pars.ctrlShiftLock, false);
      // pool-game shot-speed lock
      this.poolShotLocked = uT.setDefault( pars.poolShotLocked, false);
      this.poolShotLockedSpeed_mps = uT.setDefault( pars.poolShotLockedSpeed_mps, 0);
      this.poolShotCount = 0;
      this.pocketedBallCount = 0;
      // more ghost-pool related parameters...
      this.stripesOrSolids = "table is open";
      this.scratchedDuringGame = false;
      this.objectBallFoulDuringGame = false;
      this.safetyShotFoulDuringGame = false;
      this.mouseStopMessage = "";
      this.mouseStopPenalty = 0;
      this.mouseStopFoulDuringGame = false;
      
      this.selectedBody = null;
      
      // Selection point (in the local coordinate system of the selected object).
      this.selectionPoint_l_2d_m = null;
      
      this.cursorSpring = null;
      
      // Initialize all the key values to be Up.
      for (var key in gW.keyMap) this[gW.keyMap[key]] = 'U';
      
      /*      
      The following enable/disable feature is needed for keys that do 
      something that should only be done once while the key is down (not each 
      frame). This technique is needed in cases where action is potentially 
      triggered each frame and it is not possible to compare the new key state 
      (coming from a client or the local keyboard) with the current key state. 
      
      Examples where this is NOT needed are the tube rotation keys. In 
      those cases, something must be done in each frame while the key is down. 
      The action repeats as the key state is inspected each frame (and seen to 
      be down). 
      
      Note there is an area in this code where pure-local-client key events 
      are handled to avoid repetition; see the keydown area in this file. 
      There, repetition is caused by holding the key down and the associated 
      repeated firing of the keydown event. There, new and current states can 
      be compared to avoid repetition.
      
      See also the updateClientState function and how it suppressed 
      unwanted repetition by comparing new and current states.
      */
      this.key_s_enabled = true;  // Flip the jet.
      this.key_k_enabled = true;  // Change the gun orientation by 1 large increment.
      this.key_i_enabled = true;  // Start a bullet stream.
      
      // This client-cursor triangle is oriented like an arrow pointing to 10 o'clock.
      //this.triangle_raw_2d_px = [new wS.Vec2D(0,0), new wS.Vec2D(14,8), new wS.Vec2D(8,14)];
      this.triangle_raw_2d_px = [new wS.Vec2D(0,0), new wS.Vec2D(11,12), new wS.Vec2D(3,16)];
      
      this.NPC_guncooling_timer_s = 0.0;
      this.NPC_guncooling_timer_limit_s = 2.0;
      this.NPC_shield_timer_s = 0.0;
      this.NPC_shield_timer_limit_s = 0.5;
      this.NPC_pin_timer_s = uT.setDefault( pars.NPC_pin_timer_s, 0.0);
      this.NPC_pin_timer_limit_s = uT.setDefault( pars.NPC_pin_timer_limit_s, 5.0);
      
      this.NPC_aimStepCount = 0;
      this.NPC_aimStepCount_limit = 20;
      this.NPC_skipFrame = false;
      
      this.gunAngle_timer_s = 0.0;
      this.gunAngle_timer_limit_s = 0.03;
      
      this.bulletAgeLimit_ms = uT.setDefault( pars.bulletAgeLimit_ms, null);
      
      // rtc contains WebRTC peer connection and data channel objects.
      this.rtc = new hC.RTC({});
      
      // Score for the leaderboard
      this.score = 0;
      
      // for drawing a little rectangle that helps to sync client and host video captures
      this.sendDrawSyncCommand = null;
   }
   // Variables common to all instances of Client...
   Client.npcIndex = 0;
   /* 
   The drag_c parameter affects a drag force that depends on the 
   absolute motion of the COM of the puck (not relative to cursor). This is 
   needed for providing the user with a controlled selection (and 
   positioning) of pucks. If you set these to zero you'll see it's just too 
   bouncy (and too much orbital motion). Unfortunately, this also gives a 
   somewhat counterintuitive feel when selecting long rectangular pucks, 
   near an end edge, with gravity on (the expected swing is strongly 
   damped). Refer to Spring.prototype.force_on_pucks to see where these 
   drag forces are applied. There is also the usual relative-motion drag 
   parameter (spring damper), damper_Ns2pm2, that is set to the default 
   value (0.5) here. I found this value is less useful here because the 
   drag_c is being used. 
   */ 
   Client.mouse_springs = {'0':{'strength_Npm':   60.0, 'damper_Ns2pm2': 0.5, 'drag_c':   60.0/30.0, 'unstretched_width_m': 0.060},   // 'drag_c': 2.0
                           '1':{'strength_Npm':    2.0, 'damper_Ns2pm2': 0.5, 'drag_c':    2.0/30.0, 'unstretched_width_m': 0.002},   //           0.1
                           '2':{'strength_Npm': 1000.0, 'damper_Ns2pm2': 0.5, 'drag_c': 1000.0/30.0, 'unstretched_width_m': 0.100}};  //          20.0
   Client.applyToAll = function ( doThis) {
      for (var clientName in gW.clients) {
         var client = gW.clients[ clientName];
         doThis( client);
      }
   }
   Client.deleteNPCs = function() {
      Client.applyToAll( client => {if (client.name.slice(0,3) == 'NPC') delete gW.clients[ client.name]});
      Client.npcIndex = 0;
   }
   Client.startingPandV = [];
   Client.scoreSummary = [];
   Client.teams = {};
   Client.winnerBonusGiven = false;
   Client.resetScores = function() {
      Client.applyToAll( client => {
         client.mouseUsage = false;
         client.touchScreenUsage = false;
         client.virtualGamePadUsage = false;
         client.score = 0;
      });
      // If the npc are still paused, indicate pause usage.
      if (pP.getNpcSleep()) {
         pP.setNpcSleepUsage( true);
      } else {
         pP.setNpcSleepUsage( false);
      }
      pP.setPuckPopperTimer_s(0);
      pP.resetTeams();
      
      Client.winnerBonusGiven = false;
      Client.scoreSummary = [];
      Client.teams = {};
   }
   // Sometimes it's just better to see 'host' displayed instead of 'local'.
   Client.translateIfLocal = function( clientName) {
      var nameString;
      if (clientName == 'local') {
         nameString = 'host';
      } else {
         nameString = clientName;
      }
      return nameString;
   }
   Client.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods (containing module must load first)
   Client.prototype.constructor = Client; // Rename the constructor (after inheriting)
   Client.prototype.nameString = function( nickNameOnly=false) {
      var nameString, finalNameString;
      
      nameString = Client.translateIfLocal( this.name);
      
      if (this.nickName) {
         if ( ! nickNameOnly) {
            let teamString = (this.teamName) ? ("." + this.teamName) : "";
            finalNameString = this.nickName + teamString + ' (' + nameString + ')';
         } else {
            finalNameString = this.nickName;
         }
      } else {
         finalNameString = nameString;
      }
      return finalNameString;
   }
   Client.prototype.addToTeamScore = function( winnerTimeString) {
      let teamMember = false;
      let teamScore = false;
      let teamName = null;
      let needTeamScore = false;
            
      if (this.teamName) {
         // Look for the corresponding team record.
         for (let summaryRecord of cT.Client.scoreSummary) {
            let teamName_sR = summaryRecord.name.split(" ")[0];
            if ((summaryRecord.rawName == "team") && (teamName_sR == this.teamName)) {
               teamScore = true;
               summaryRecord.score += this.score;
               Client.teams[ this.teamName].count += 1;
               summaryRecord.winner = winnerTimeString;
               summaryRecord.name = this.teamName + " (cnt:" + Client.teams[ this.teamName].count + ")";
               if (summaryRecord.virtualGamePad == "") summaryRecord.virtualGamePad = (this.virtualGamePadUsage) ? 'x':'';
            }
         }   
      }
      if (this.teamName && ( ! teamScore)) {
         needTeamScore = true;
      }
      return {'needTeamScore':needTeamScore, 'teamName':this.teamName};
   }
   Client.prototype.addScoreToSummary = function( winnerTimeString, demoIndex, npcSleepUsage) {
      let finalNameString, mouseString, npcSleepString, virtualGamePadString, teamState;
      
      finalNameString = this.nameString();
            
      // Clear the mouseString warning for Jello Madness. Mouse is always used.
      if ( [4,5,6].includes( demoIndex) ) {
         mouseString = '';
      } else {
         mouseString = (this.mouseUsage) ? 'x':'';
      }
      npcSleepString = (npcSleepUsage) ? 'x':'';
      virtualGamePadString = (this.virtualGamePadUsage) ? 'x':'';
      // The randomIndex provides a way to nearly uniquely associate records in the leaderboard report with the local game summary.
      teamState = this.addToTeamScore( winnerTimeString);
      Client.scoreSummary.push( {'score':this.score, 'rawName':this.name, 'nickName':this.nickName, 'name':finalNameString, 'virtualGamePad':virtualGamePadString, 
                                 'winner':winnerTimeString, 'mouse':mouseString, 'npcSleep':npcSleepString, 'randomIndex':Math.floor((Math.random() * 100000))} );                       
      if (teamState.needTeamScore) {
         // initialize the counter key for that team
         Client.teams[ teamState.teamName] = {'count':1};
         finalNameString = teamState.teamName + " (cnt:1)";
         Client.scoreSummary.push( {'score':this.score, 'rawName':'team', 'nickName':teamState.teamName, 'name':finalNameString, 'virtualGamePad':virtualGamePadString, 
                                    'winner':winnerTimeString, 'mouse':mouseString, 'npcSleep':npcSleepString, 'randomIndex':Math.floor((Math.random() * 100000))} );
      }                           
   }
   Client.prototype.createBox2dSensor = function( radius_m) {
      var bodyDef = new b2DW.BodyDef;
      bodyDef.type = b2DW.Body.b2_dynamicBody; // same type as a puck
      bodyDef.allowSleep = false;
      
      this.b2dSensor = gW.b2d.world.CreateBody( bodyDef);
      //this.b2dSensor.SetAwake(true);
      
      var fixDef = new b2DW.FixtureDef;
      fixDef.shape = new b2DW.CircleShape( radius_m);
      // Turned out to be better (offer more control) to use box2d contact events to inhibit the collision response.
      // (see contactNormals in ghostBall.js)
      fixDef.isSensor = false;
     
      this.b2dSensor.CreateFixture( fixDef);    
      
      // Set the initial position of the sensor
      this.b2dSensor.SetPosition( this.mouse_2d_m);
      
      // Mark this....
      this.b2dSensor.SetUserData('ghost-sensor');
      
      // Use the table map to get back to this client from the b2d event handler.
      gW.tableMap.set(this.b2dSensor, this);
   }
   Client.prototype.updateBox2dSensor = function( displace_2d_m) {
      this.b2dSensor.SetPosition( this.mouse_2d_m.add( displace_2d_m));
   }
   Client.prototype.deleteBox2dSensor = function() {
      gW.tableMap.delete( this.b2dSensor);
      gW.b2d.world.DestroyBody( this.b2dSensor);
      this.sensorTargetName = null;
      this.b2dSensor = null;
   }
   Client.prototype.checkForMouseSelection = function() {
      // Process selection attempts and object manipulations.
      if ((this.selectedBody === null) && (this.mouseDown)) {

         // Check for a body at the mouse position.
         var selected_b2d_Body = bS.b2d_getBodyAt( this.mouse_2d_m);
         
         if (selected_b2d_Body) {
            var selectedBody = gW.tableMap.get( selected_b2d_Body);
            
            if (gW.getDemoVersion().slice(0,3) == "3.d") gB.checkForMouseStops( this, selectedBody);
            
            // Tip for editing walls and pins
            if ( (gW.dC.editor.checked) && (this.key_ctrl == "U") && ((selectedBody.constructor.name == "Wall") || (selectedBody.constructor.name == "Pin")) ) {
               gW.messages['help'].newMessage('Hold down "ctrl" key to drag walls and pins (host only).', 1.5);
            }
            
            // Block the selection on static bodies (walls and pins) by a network client.
            if ( ((selectedBody.constructor.name != "Puck") && (this.name != 'local')) || 
                 // Block wall and pin selection if the wall/pin editor is off.
                 (!gW.dC.editor.checked && ((selectedBody.constructor.name == "Wall") || (selectedBody.constructor.name == "Pin"))) ) {
               
               selected_b2d_Body = null;
               
            } else {
               // Consider the case where client is trying to edit multiple objects (only shift key is down).
               if ((this.key_shift == "D") && (this.key_ctrl == "U") && (this.key_alt == "U")) {
                  
                  // Add this body to the multiple-select map (if not already there).
                  if (!(selectedBody.name in gW.hostMSelect.map) && (this.button == 0)) {
                     // Record the local selection point on the body.
                     if (gW.dC.comSelection.checked) {
                        selectedBody.selectionPoint_l_2d_m = new wS.Vec2D(0,0);
                     } else {
                        selectedBody.selectionPoint_l_2d_m = wS.Vec2D_from_b2Vec2( selected_b2d_Body.GetLocalPoint( this.mouse_2d_m));
                     }

                     gW.hostMSelect.map[ selectedBody.name] = selectedBody;
                  
                  // Remove this body from the map if doing a right-button (2) mouse click.
                  } else if ((selectedBody.name in gW.hostMSelect.map) && (this.button == 2)) {
                     gW.hostMSelect.removeOne( selectedBody);
                  }
               
               // If using the box-selection feature...
               } else if ((this.name == 'local') && (this.key_alt == "D") && (this.key_ctrl == "U")) {
                  if ((selectedBody.name in gW.hostMSelect.map) && (this.button == 2)) {
                     gW.hostMSelect.removeOne( selectedBody);
                  }
               
               // Normal single-body selection:
               // Allow single-body pin selection only if the wall/pin editor is on.
               } else if ( ! ( !gW.dC.editor.checked && (selectedBody.constructor.name == "Pin"))) {
                  // Which body object has been selected?
                  this.selectedBody = gW.tableMap.get( selected_b2d_Body);
                  if (this.selectedBody.clientName) {
                     var clientNameString = '(' + this.selectedBody.clientName + ')';
                  } else {
                     var clientNameString = '';
                  } 
                  
                  // Mark it as selected and record the local point.
                  this.selectionPoint_l_2d_m = wS.Vec2D_from_b2Vec2( selected_b2d_Body.GetLocalPoint( this.mouse_2d_m));
                  this.modifyCursorSpring('attach');
                  
                  // If selecting a small puck with right-button on mouse, warn user about stability:
                  if ((this.selectedBody.mass_kg < 0.15) && (this.button == 2)) {
                     gW.messages['help'].newMessage("For a small puck, use the middle or left mouse button.", 3.0);
                  }
                  
                  // If using the control key (deterministic drag or rotation) and there already are
                  // some bodies in the multi-select, add this body to the multi-select group. This
                  // insures normal group-rotation behaviors.
                  if ((this.key_ctrl == "D") && (gW.hostMSelect.count() > 0)) {
                     gW.hostMSelect.map[ selectedBody.name] = selectedBody;
                  }
               }
            }
         }
      // The mouse button has been released
      } else if ((this.selectedBody) && ( ! this.mouseDown)) {
         // Shoot the (single-selected) puck with the cursor spring energy.
         //if ((this.key_ctrl == 'D') && (this.key_shift == 'D') && (this.cursorSpring)) {
         //   this.poolShot();
         //   gW.messages['help'].resetMessage(); // stop the help pool players
         //}
         //this.modifyCursorSpring('detach');
      }
   }
   Client.prototype.modifyCursorSpring = function( mode) {
      // If there isn't already a cursor spring, add one. 
      if ((mode == 'attach') && ( ! this.cursorSpring)) {
         
         // Local selection point on puck.
         if ( ( ! gW.dC.comSelection.checked) || (this.key_ctrl == "D") || (this.ctrlShiftLock && (this.selectedBody.shape != 'circle')) ) {
            // For this special case, make sure the COM control reflects the non-COM action. Without this line, 
            // you would have to click c twice in the basketball game for any of the images that are based on rectangular pucks.
            if (this.ctrlShiftLock && (this.selectedBody.shape != 'circle')) gW.dC.comSelection.checked = false;
            
            var selectionPoint_l_2d_m = this.selectionPoint_l_2d_m.copy();
         } else {
            var selectionPoint_l_2d_m = new wS.Vec2D(0.0,0.0);
         }
         /*
         Always use a normal spring for the cursor ('softConstraints':false). Have played around with using the distance joints but they
         seem to have similar instability problems with small masses and strong springs.
         
         4:20 PM Tue May 12, 2020: Changed my mind. Going to let the cursor spring type be affected by the toggle (shift-s), took out the softConstraints
         specification: 'softConstraints':false.
         
         11:52 AM Sun May 22, 2022: ...and two years later I've restricted it again to be fixed (as Hooke's Law) and not allow soft constraints. Noticed that in the basketball game
         the ball drifts when aiming if using a distance joint (soft constraint). The (my) Hooke's law spring allows me to better inhibit (shut off) the spring forces when aiming
         under the ctrl-shift-locked conditions. Someday, a better solution, that would allow both spring natures in the cursor spring, is to not actually mount the spring
         until after the shot is launched (that would be a significant change).
         */
         // Note that a cursor spring is created using the client's name (this.name).
         this.cursorSpring = new cP.Spring(this.pin, this.selectedBody, 
            Object.assign({}, Client.mouse_springs[this.button], {'spo2_ap_l_2d_m':selectionPoint_l_2d_m, 'color':this.color, 'forCursor':true, 'name':this.name, 'softConstraints':false}) );  
         
         // High drag_c (the default for button 2) was causing instability for right-button manipulation of the inner pucks in a jello grid.
         if ((this.selectedBody.jello) && (this.button == 2)) this.cursorSpring.drag_c = 5.0;
         
         if ((this.selectedBody.constructor.name == 'Puck') && ( ! this.compoundBodySelected())) {
            this.createBox2dSensor( this.selectedBody.radius_m);
         }
         
      } else if ((mode == 'detach') && (this.cursorSpring)) {
         if ((this.selectedBody.constructor.name == 'Puck') && (this.b2dSensor)) {
            this.deleteBox2dSensor();
         }
         this.cursorSpring.deleteThisOne({});
         this.cursorSpring = null;
         
         this.selectionPoint_l_2d_m = null;
         
         this.selectedBody = null;
      }
   }
   Client.prototype.moveSBtoPosition = function(theBody, pos_2d_m) {
      // move Selected Body to Position
      theBody.position_2d_m = pos_2d_m;
      theBody.position_2d_px = wS.screenFromWorld( theBody.position_2d_m);
      theBody.b2d.SetPosition( pos_2d_m);
      // If it's a puck, freeze it, for more predictable put-it-here behavior.
      if (theBody.constructor.name == "Puck") {
         theBody.velocity_2d_mps = new wS.Vec2D(0.0,0.0);
         theBody.b2d.SetLinearVelocity( new wS.Vec2D(0.0,0.0));
         theBody.angularSpeed_rps = 0.0;
         theBody.b2d.SetAngularVelocity( theBody.angularSpeed_rps);
      }
   }
   Client.prototype.moveToCursorPosition = function() {
      // for direct positioning of objects:
      // Calculate the world (w) delta between the current mouse position and the original selection point.
      // The delta is used for positioning (direct dragging of) bodies so that selection points
      // follows the moving mouse location.
      var delta_w_2d_m = this.mouse_2d_m.subtract( this.cursorSpring.spo2_ap_w_2d_m);
      // Adding the delta to the body position, moves the body so that the original selection point is at the mouse position.
      var newPosition_2d_m = this.selectedBody.position_2d_m.add( delta_w_2d_m);

      // Before actually moving it, keep track of the calculated amount of movement.
      var movement_2d_m = newPosition_2d_m.subtract( this.selectedBody.position_2d_m);
      
      // Move the single selected body (SB) to the mouse position.
      this.moveSBtoPosition( this.selectedBody, newPosition_2d_m);
      
      // Temporarily inhibit the external forces on this puck (this prevents a gradual droop when gravity is on).
      if (this.selectedBody.constructor.name == "Puck") this.selectedBody.tempInhibitExtForce = true;
      
      // Move all the other selected bodies by a similar amount.
      // Note: the arrow function, used here, will take "this" from the surrounding context.
      gW.hostMSelect.applyToAll( tableObj => {
         if (tableObj !== this.selectedBody) this.moveSBtoPosition( tableObj, tableObj.position_2d_m.add( movement_2d_m));
         
         // Temporarily inhibit the external forces on this puck (this prevents a gradual droop when gravity is on).
         if (tableObj.constructor.name == "Puck") tableObj.tempInhibitExtForce = true;
      });
      
      // For this cursor-selected object, if one object or less in multi-select, output its position (for walls and pucks) and elasticity characteristics (for pucks);
      if (gW.hostMSelect.count() <= 1) {
         let bulletString = ((this.selectedBody.constructor.name == "Puck") && (this.selectedBody.bullet)) ? " (bullet)" : "";
         var objReport = "[base,yellow]" + this.selectedBody.name + "[base]" + bulletString + 
             " @ x:" + this.selectedBody.position_2d_m.x.toFixed(3) + ", " + "y:" + this.selectedBody.position_2d_m.y.toFixed(3) + " m" + "";
             //", \u03B8_deg:" + (this.selectedBody.b2d.GetAngle() * 180/Math.PI).toFixed(0); 
         
         if ((this.selectedBody.constructor.name == "Puck") || (this.selectedBody.constructor.name == "Wall")) {
            
            if (this.selectedBody.shape == "circle") {
               var dimensionsReport = "\\  radius = " + this.selectedBody.radius_m.toFixed(3);
            } else {
               var dimensionsReport = "\\  width/2, height/2 = " + this.selectedBody.half_width_m.toFixed(3) + ", " + this.selectedBody.half_height_m.toFixed(3);
            }
            objReport += dimensionsReport;
         }
         
         if (this.selectedBody.constructor.name == "Puck") {
            let rF = (this.selectedBody.restitution_fixed) ? " (fixed)" : "";
            let fF = (this.selectedBody.friction_fixed) ? " (fixed)" : "";
            objReport += "\\  restitution = " + this.selectedBody.restitution.toFixed(3) + rF + ", surface friction = " + this.selectedBody.friction.toFixed(3) + fF +
                         "\\  translational, rotational drag = " + this.selectedBody.linDamp.toFixed(3) + ", " + this.selectedBody.angDamp.toFixed(3);
            
            if (this.selectedBody.imageID) {
               let img = document.getElementById( this.selectedBody.imageID);
               if (img.title) {
                  objReport += "\\  title = " + img.title;
               }
            }
         }
         
         gW.messages['help'].newMessage( objReport, 0.05);
      }
   }
   Client.prototype.rotateSB = function(theBody, delta_angle_r) {
      if (theBody.constructor.name == "Puck") {
         theBody.velocity_2d_mps = new wS.Vec2D(0.0,0.0);
         theBody.b2d.SetLinearVelocity( new wS.Vec2D(0.0,0.0));
         theBody.angularSpeed_rps = 0.0;
         theBody.b2d.SetAngularVelocity( theBody.angularSpeed_rps);
      }
      // Everything but pins... If you don't exclude pins here, they become un-selectable after
      // a rotation with the editor.
      if (theBody.constructor.name != "Pin") {
         theBody.angle_r += delta_angle_r;
         theBody.b2d.SetAngle( theBody.angle_r);
      }
   }
   Client.prototype.rotateToCursorPosition = function() {
      var delta_r;
      
      // Rotate about the center of the group.
      if (gW.hostMSelect.count() > 1) {
         // Find the center only at the beginning of the rotation action.
         if (gW.hostMSelect.findCenterEnabled) {
            gW.hostMSelect.findCenter();
            // Don't do this again until one of the keys is released.
            gW.hostMSelect.findCenterEnabled = false;
         }
         // Measure the rotation relative to the center of the group.
         delta_r = gW.hostMSelect.center_2d_m.angleBetweenPoints_r( this.cursorSpring.spo2_ap_w_2d_m, this.mouse_2d_m);
      
         gW.hostMSelect.applyToAll( tableObj => {
            // Rotate the vector that runs from the hostMSelect center out to the object center. 
            var center_to_center_2d = tableObj.position_2d_m.subtract( gW.hostMSelect.center_2d_m);
            center_to_center_2d.rotated_by( delta_r * 180.0/ Math.PI );
            
            // Then reassemble the object vector and put the object there.
            this.moveSBtoPosition( tableObj, gW.hostMSelect.center_2d_m.add( center_to_center_2d));
            
            // Rotate the object about its center.
            this.rotateSB( tableObj, delta_r);
            
            // Temporarily inhibit the forces on this puck (this prevents a gradual droop when gravity is on).
            if (tableObj.constructor.name == "Puck") tableObj.tempInhibitExtForce = true;
         });
      
      // Rotate about the center of the single object.
      } else {
         // Find the angle formed by these three points (angle based at the center of this selected body). This is the angle formed
         // as the mouse (and cursor pin) moves from the old selection point. Note must use pin position and not simply the mouse
         // because the ghost sensor might displace the pin from the cursor.
         this.pin.getPosition();
         // Rotate, if not attached to the center of the puck...
         if ( ! this.cursorSpring.spo2_ap_l_2d_m.zeroLength() ) {
            delta_r = this.selectedBody.position_2d_m.angleBetweenPoints_r(this.cursorSpring.spo2_ap_w_2d_m, this.pin.position_2d_m);
         } else {
            delta_r = 0;
         }
         this.rotateSB( this.selectedBody, delta_r);  
         
         // Temporarily inhibit the forces on this puck (this prevents a gradual droop when gravity is on).
         if (this.selectedBody.constructor.name == "Puck") this.selectedBody.tempInhibitExtForce = true;
      }
   }
   Client.prototype.rotateEachAboutItself = function() {
      var delta_r = this.selectedBody.position_2d_m.angleBetweenPoints_r(this.cursorSpring.spo2_ap_w_2d_m, this.mouse_2d_m);
      if (gW.hostMSelect.count() > 0) {
         gW.hostMSelect.applyToAll( tableObj => {
            // Don't allow group rotation based on pin selection (avoid wall spinning).
            if (this.selectedBody.constructor.name != "Pin") this.rotateSB(tableObj, delta_r);
            
            // Temporarily inhibit the forces on this puck (this prevents a gradual droop when gravity is on).
            if (tableObj.constructor.name == "Puck") tableObj.tempInhibitExtForce = true;
         });
      } else {
         this.rotateSB(this.selectedBody, delta_r);
      }
   }
   Client.prototype.drawTriangle = function( drawingContext, position_2d_px, pars) {
      // Draw a triangle for the network client's cursor at position_2d_px

      var fillIt = uT.setDefault( pars.fillIt, true);
      var fillColor = uT.setDefault( pars.fillColor, 'red');
      
      this.triangle_2d_px = [];
      var cursorOffset_2d_px = new wS.Vec2D(0,1); //tweak the positioning of the cursor.
      for (var i = 0, len = this.triangle_raw_2d_px.length; i < len; i++) {
         // Put it at the mouse position: mouse + triangle-vertex + offset. 
         var p_2d_px = position_2d_px.add(this.triangle_raw_2d_px[i]).add( cursorOffset_2d_px);
         // Put it in the triangle array.
         this.triangle_2d_px.push( p_2d_px);
      }
      
      var fillColor = (drawingContext.globalCompositeOperation == 'screen') ? 'white' : fillColor; // white for color mixing demo
      if ( ( ! gW.getPauseErase()) || gW.getLagTesting()) {
         this.drawPolygon( drawingContext, this.triangle_2d_px, {'borderColor':'white', 'borderWidth_px':1, 'fillIt':fillIt ,'fillColor':fillColor});
         
         // Use cursor speed to calculate a radius at 2-frames out from the rendered cursor. Useful for quantifying the lag behind the system cursor.
         if (gW.getLagTesting() && (this.fineMovesState == 'off')) {
            let cursorSpeed_pxps = position_2d_px.subtract( this.prev_mouse_2d_px).length() / gW.getDeltaT_s();
            if (cursorSpeed_pxps == 0) gW.aT.cursorSpeed_pxps.reset();
            let cursorSpeed_ra_pxps = gW.aT.cursorSpeed_pxps.update( cursorSpeed_pxps);
            let radiusFor2FrameLag_px = 2 * gW.getDeltaT_s() * cursorSpeed_ra_pxps;
            if ( ! gW.getPauseErase()) this.drawCircle( drawingContext, position_2d_px, {'borderWidth_px':2, 'fillColor':'noFill', 'radius_px':radiusFor2FrameLag_px});
         }
      }
   }
   Client.prototype.compoundBodySelected = function() {
      return ( cP.Spring.checkIfAttached( this.selectedBody.name) || cP.Joint.checkIfAttached( this.selectedBody.name) );
   }
   Client.prototype.updateCursor = function() {
      this.mouse_2d_m = wS.worldFromScreen( this.mouse_2d_px);   
      
      var tryingToShoot_locked = this.ctrlShiftLock && (this.key_ctrl == "U") && (this.key_shift == "U");
      var tryingToShoot = ((this.key_ctrl == "D") && (this.key_shift == "D")) || tryingToShoot_locked;
      
      if ( (this.selectedBody) && (this.cursorSpring) && (this.selectedBody.constructor.name == 'Puck') && (gW.hostMSelect.count() == 0) && (tryingToShoot) && ( ! this.compoundBodySelected() ) ) {
         gB.updateGhostBall( this);
         this.gBS.readyToDraw = true;
      } else {
         if (this.pin) this.pin.setPosition( this.mouse_2d_m);
      }
      
      if (this.cursorSpring) this.cursorSpring.updateEndPoints();
   }
   Client.prototype.drawCursor = function( drawingContext) {
      if (this.mouseDown) {
         if ((this.key_shift == "D") || (this.key_alt == "D")) {
            this.pin.draw_MultiSelectPoint( drawingContext);
         } else {
            this.pin.draw( drawingContext, 4); // 4px radius
         }
      }
      // This shows the actual position of the cursor when fineMoves is active. 
      // This appears as a light-gray outline (no fill) and separate from the normal cursor (drawn next).
      if (this.fineMovesState != 'off') {
         drawingContext.globalAlpha = 0.70;
         this.drawTriangle( drawingContext, this.prevNormalCursorPosOnCanvas_2d_px, {'fillIt':false});
         drawingContext.globalAlpha = 1.00;
      }
      // Normal cursor rendering
      this.drawTriangle( drawingContext, this.mouse_2d_px, {'fillColor':this.color});
   }  
   Client.prototype.updateSelectionPoint = function() {
      // Calculate (update) the world location of the attachment point for use in force calculations.
      this.cursorSpring.spo2_ap_w_2d_m = wS.Vec2D_from_b2Vec2( this.selectedBody.b2d.GetWorldPoint( this.cursorSpring.spo2_ap_l_2d_m));
      this.cursorSpring.spo2_ap_w_2d_px = wS.screenFromWorld( this.cursorSpring.spo2_ap_w_2d_m);
   }
   Client.prototype.drawSelectionPoint = function( drawingContext) {
      // Draw small circle at the attachment point.
      var fillColor = (drawingContext.globalCompositeOperation == 'screen') ? this.selectedBody.color : this.color;
      if ( ! gW.getPauseErase()) {
         this.drawCircle( drawingContext, this.cursorSpring.spo2_ap_w_2d_px, {'borderColor':'white', 'borderWidth_px':2, 'fillColor':fillColor, 'radius_px':6});  // 6
      }
   }
  
  
   
   function updateClientState( clientName, state) {
      /*
      This is mouse, keyboard, and touch-screen input as generated from non-host-client (network)
      events. Note that this can happen at anytime as triggered by events on 
      the client. This is not fired each frame.
      
      Repetition can be an issue here as mouse movement will repeatedly send 
      the state. If you want to avoid repeating actions, it may be appropriate 
      here to compare the incoming state with the current client state (or 
      make use of a key_?_enabled properties) to stop after the first act. 
      This blocking of repetition does not necessarily need to happen here. 
      For an example of this, search on key_i_enabled.
      
      It is handy to do the blocking here because you have access to the incoming
      state and don't need the key_?_enabled properties. But for actions that are
      repeating each frame, you need to use the key_?_enabled approach.
      */
      
      if (gW.clients[ clientName]) {
         var client = gW.clients[ clientName];
         
         if ((state.MD) && ( ! client.mouseDown)) {
            // Similar to how the host client can clear multi-select by clicking on an open space.
            mS.clickToClearMulti( clientName);
            if (state.MD == 'T') client.touchScreenUsage = true;
         
         } else if (( ! state.MD) && (client.mouseDown)) {
            // Put this mouseUp handler here to try and improve the feeling of the puck fling, click-drag-release, for the
            // network clients. Just reproducing what is being done for the host client. Not sure it helped.
            // The "feel" issue is more likely related to latency.
            eV.mouseUp_handler( clientName);
         }
         client.mouseDown = state.MD;
         
         if ((client.mouseDown == 'M') && wS.pointInCanvas( x_canvas, client.mouse_2d_px)) {
            // If there's been a click on the canvas area, flag it as mouse usage.
            // This should prevent cell-phone clients from getting flagged here unless they
            // have a mouse connected and click on the canvas before getting into virtual game pad.
            client.mouseUsage = true;
         }
         
         client.button = state.bu;
         
         var posOnCanvas_2d_px = new wS.Vec2D( state.mX, state.mY);
         // facilitate high-resolution cursor movements
         var finalPosOnCanvas_2d_px = wS.fineMoves( clientName, posOnCanvas_2d_px);
         if (gW.getLagTesting()) dF.drawCircle( x_ctx, finalPosOnCanvas_2d_px, {'borderWidth_px':0, 'fillColor':'white', 'radius_px':3});
         if (client.fineMovesState != 'inTransition') {
            client.mouse_async_2d_px = finalPosOnCanvas_2d_px;
         }
         
         if (state.mW == 'F') eV.wheelEvent_handler( clientName, {'deltaY':1});
         if (state.mW == 'B') eV.wheelEvent_handler( clientName, {'deltaY':-1});
         
         client.key_a = state.a;
         client.key_s = state.s;  // key_s_enabled inhibits key-held-down repeats
         client.key_d = state.d;
         client.key_w = state.w;
         
         client.key_j = state.j;
         client.key_k = state.k;  // uses key_k_enabled
         if ((state['l'] == "D") && (client.key_l == "U")) {
            eV.key_l_handler('keydown', clientName);
         }
         client.key_l = state.l;
         client.key_i = state.i;  // uses key_i_enabled
         
         client.key_space = state.sp;
         client.key_questionMark = state.cl; //cl short for color
         
         client.key_alt = state.alt;
         
         // Compare incoming state with the current state. Only act if changing from U to D.
         if ((state['1'] == "D") && (client.key_1 == "U")) dS.demoStart(1);
         client.key_1 = state['1'];
         
         if ((state['2'] == "D") && (client.key_2 == "U")) dS.demoStart(2);
         client.key_2 = state['2'];
         
         if ((state['3'] == "D") && (client.key_3 == "U")) {
            if (gW.getDemoVersion().slice(0,3) == "3.d") {
               // If some version of the pool game is running, restart that version.
               dS.demoStart(3);
            } else {
               // If something other than a pool game is running, load in 9-ball.
               cR.demoStart_fromCapture(3, {'fileName':'demo3d.js'});
            }
         }
         client.key_3 = state['3'];
         
         if ((state['4'] == "D") && (client.key_4 == "U")) dS.demoStart(4);
         client.key_4 = state['4'];
         
         if ((state['5'] == "D") && (client.key_5 == "U")) dS.demoStart(5);
         client.key_5 = state['5'];
         
         if ((state['6'] == "D") && (client.key_6 == "U")) dS.demoStart(6);
         client.key_6 = state['6'];
         
         if ((state['7'] == "D") && (client.key_7 == "U")) dS.demoStart(7);
         client.key_7 = state['7'];
         
         if ((state['8'] == "D") && (client.key_8 == "U")) dS.demoStart(8);
         client.key_8 = state['8'];
         
         if ((state['9'] == "D") && (client.key_9 == "U")) dS.demoStart(9);
         client.key_9 = state['9'];
         
         if ((state['f'] == "D") && (client.key_f == "U")) eV.freeze();
         client.key_f = state['f'];
         
         
         // Similar to how the ctrl events are handled for the host (local client).
         if ((state['ct'] == "D") && (client.key_ctrl == "U")) {
            eV.key_ctrl_handler('keydown', clientName);
         }
         if ((state['ct'] == "U") && (client.key_ctrl == "D")) {
            eV.key_ctrl_handler('keyup', clientName);
         }
         client.key_ctrl = state['ct'];
         
         if ((state['b'] == "D") && (client.key_b == "U")) {
            eV.key_b_handler( clientName);
         }
         client.key_b = state['b'];
         
         if ((state['c'] == "D") && (client.key_c == "U")) {
            eV.key_c_handler( clientName);
         }
         client.key_c = state['c'];
         
         if ((state['n'] == "D") && (client.key_n == "U")) {
            eV.key_n_handler( clientName);
         }
         client.key_n = state['n'];
         
         // Releasing the shift key (similar to event handler for local client).
         if ((state['sh'] == "U") && (client.key_shift == "D")) {
            // Done with the rotation action. Get ready for the next one.
            gW.hostMSelect.resetCenter();
            client.modifyCursorSpring('detach');
         }
         client.key_shift = state.sh;
         
         // Set pool shot speed.
         if ( (state.z == "D") && (client.key_z == "U") && (((client.key_shift == "D") && (client.key_ctrl == "D")) || (client.ctrlShiftLock)) ) {
            gB.togglePoolShotLock( client);
         }
         client.key_z = state.z;
         
         // Specific angle being sent from client in TwoThumbs mode.
         if (client.puck && state['jet_d']) {
            client.puck.jet.rotateJetToAngle( state['jet_d']);
         }
         if (client.puck && state['gun_d']) {
            client.puck.gun.rel_position_2d_m.set_angle( state['gun_d']);
            // Flag this client as using the virtual game pad during this game.
            client.virtualGamePadUsage = true;
         }
         
         // Special Two Thumbs controls.
         if (client.puck) {
            // Jet throttle
            client.puck.jet.throttle = state['jet_t'];
            
            // Gun Scope: rotation rate fraction   and   firing trigger 
            // Freeze the puck at the first press of the scope trigger or rotator. If external forces
            // move the puck after this freeze event, so be it.
            if ((client.puck.gun.scopeTrigger == 'U')     && (state['ScTr']  == 'D') ||
                (client.puck.gun.scopeRotRateFrac == 0.0) && (state['ScRrf'] != 0.0)) {
               
               // Check if it's moving before breaking (and drawing the break circle).
               var v_2d_mps = client.puck.velocity_2d_mps;
               if ((Math.abs( v_2d_mps.x) > 0) || (Math.abs( v_2d_mps.y) > 0)) {
                  client.puck.b2d.SetLinearVelocity( new b2DW.Vec2(0.0,0.0));
                  client.puck.gun.scopeBreak = true;
               }
            }
            client.puck.gun.scopeRotRateFrac = state['ScRrf'];
            client.puck.gun.scopeTrigger = state['ScTr'];
         }
         /*         
         var stateString = "";
         for (var key in state) stateString += key + ":" + state[ key] + ",";
         console.log("stateString=" + stateString);
         */
      }
   }
  
   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      'Client': Client,
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'updateClientState': updateClientState,
      
   };   
   
})();