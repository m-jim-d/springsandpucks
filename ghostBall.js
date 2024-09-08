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

// Ghost Ball Pool (gB) module
// ghostBall.js
   console.log('gB _*-*_');
// 4:44 PM Wed August 10, 2022

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.gB = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_poolTimer_gameDuration_s = 0;
   var m_poolTimer_stateCheck_s = 0;
   var m_poolTimer_stateCheckLimit_s = 0.2;
   var m_poolGameOver = false;
   var m_nonCueBallPocketed = false;
   var m_poolWinType = "no win yet";
   var m_objectBallFoul = false;
   var m_allPucksStopped = true;
   var m_poolGameShotCount = 0;
   var m_lowPuckName = null;
   var m_cushionCollision = false;
   var m_mostRecentPoolShooter = null;
   var m_nonCueBallsAtStart = null;
   var m_readyForFirstCueBallCollision = true;
   var m_cushionCollisionPenaltyGiven = false;
   var m_tableHistory = [];
   var m_tableHistoryIndex = 0;
   var m_endResultCaptured = false;
   var m_projectileForecast = true;
   var m_cueBallSpot_2d_m = null;
   var m_canvasWidth_m = null;
   var m_canvasHeight_m = null;
   
   // module globals for objects brought in by initializeModule
   var x_canvas, x_ctx;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      x_canvas = canvas;
      x_ctx = ctx;
   }
   
   function resetGame() {
      m_poolTimer_gameDuration_s = 0;
      m_poolWinType = "no win yet";
      m_poolGameOver = false;
      m_poolGameShotCount = 0;
      m_mostRecentPoolShooter = 'local';
      // Count of numbered pool balls at game start.
      m_nonCueBallsAtStart = Object.keys( gW.aT.puckMap).length - 1;
      
      m_lowPuckName = findLowPuck();
      
      cT.Client.applyToAll( client => {
         client.stripesOrSolids = "table is open";
         client.scratchedDuringGame = false;
         client.objectBallFoulDuringGame = false;
         client.safetyShotFoulDuringGame = false;
         client.score = 100;
         client.poolShotCount = 0;
         client.pocketedBallCount = 0;
         client.mouseStopPenalty = 0;
         client.mouseStopMessage = "";
         client.mouseStopFoulDuringGame = false;
      });
      
      m_canvasWidth_m = wS.meters_from_px( x_canvas.width);
      m_canvasHeight_m = wS.meters_from_px( x_canvas.height);
      
      // If not a secondary capture, start with a fresh rack.
      if (gW.getDemoVersion().split('.').length == 3) {
         positionCushions();
         newRack();
      }
      
      gW.messages['gameTitle'].setFont('50px Arial');
      gW.messages['gameTitle'].loc_px = {'x':75,'y':220};
      gW.messages['gameTitle'].popAtEnd = false;
      gW.messages['help'].loc_px = {'x':75,'y':90};  
      
      // Don't show the intro text (exit) if the capture has a moving cue ball.
      let inhibitIntroHelp = false;
      cP.Puck.applyToAll( puck => {
         if ( ! puck.velocity_2d_mps.zeroLength()) inhibitIntroHelp = true;
      });
      if (inhibitIntroHelp) return;
      
      gW.messages['gameTitle'].newMessage("ghost-ball \\  pool", 2.0);
      if (gW.getDemoVersion().includes('9ball')) {
         gW.messages['gameTitle'].addToIt("\\                9-ball");
      } else if (gW.getDemoVersion().includes('8ball')) {
         gW.messages['gameTitle'].addToIt("\\ \\                          8-ball");
      } else if (gW.getDemoVersion().includes('rotation')) {
         gW.messages['gameTitle'].addToIt("\\ \\                          simple rotation");
      }
      
      gW.messages['help'].newMessageSeries({
         1:{'tL_s':5.0, 'message':'release the ghost:' + 
                                '\\    use the mouse to drag the ghost ball out of the cue ball'},
         2:{'tL_s':5.0, 'message':"aim your shot:" + 
                                "\\    touch the ghost ball against an object ball or cushion for alignment aids"},
         4:{'tL_s':5.0, 'message':'shoot the cue ball:' + 
                                '\\    release the mouse button ' + 
                                '\\    (release over the cue ball to cancel the shot)'},
         5:{'tL_s':7.0, 'message':'adjust the cue ball [base,yellow]speed[base]:' +
                                '\\    tap the "z" key while dragging the ghost ball' +
                                "\\    (speed [base,yellow]value[base] is based on ghost-cue separation)" +
                                "\\    alternately use the mouse wheel"},
         6:{'tL_s':5.0, 'message':'full-screen view:' +
                                '\\    press the "v" key to fill the screen with the pool table' +
                                '\\    press the "esc" key to return to the normal view'},
         7:{'tL_s':5.0, 'message':"restart the game (and this help):" + 
                                "\\    press #3 key " + 
                                "\\    (above the w, not on keypad)"},
         8:{'tL_s':2.0, 'message':"play some pool..."}
      });
   }
   
   function positionCushions() {
      let halfHeight_m = 0.06;
      
      // shrink the side pocket, move the top and bottom cushions in toward the middle
      let adjust_m = 0.17;
      
      // Sides, left right. Rotate 90 degrees.
      gW.aT.wallMap['wall1'].setPosition( new wS.Vec2D(               0 + halfHeight_m, m_canvasHeight_m/2), Math.PI/2);
      gW.aT.wallMap['wall2'].setPosition( new wS.Vec2D( m_canvasWidth_m - halfHeight_m, m_canvasHeight_m/2), Math.PI/2);
      
      // Top, left right
      gW.aT.wallMap['wall5'].setPosition( new wS.Vec2D( m_canvasWidth_m * (1.0/4.0) + adjust_m, m_canvasHeight_m - halfHeight_m), 0);
      gW.aT.wallMap['wall6'].setPosition( new wS.Vec2D( m_canvasWidth_m * (3.0/4.0) - adjust_m, m_canvasHeight_m - halfHeight_m), 0);
      
      // Bottom, left right
      gW.aT.wallMap['wall10'].setPosition( new wS.Vec2D( m_canvasWidth_m * (1.0/4.0) + adjust_m, halfHeight_m), 0);
      gW.aT.wallMap['wall11'].setPosition( new wS.Vec2D( m_canvasWidth_m * (3.0/4.0) - adjust_m, halfHeight_m), 0);
   }
   
   function newRack() {
      let remainingPucks, remainRackSpots;
      
      let gap_m = 0.00;
      let radius_m = gW.aT.puckMap['puck0'].radius_m;
      let delta_y_m = 2 * (radius_m + gap_m);
      let delta_x_m = delta_y_m * Math.pow( 3, 0.5) / 2.0; // h = a × √3 / 2
      let n_columns = 5;
      let angle_deg = 0;
      
      // position of the first (lowest y) ball on left side of rack, the starting position of the rack calculations
      let y_original_position_m = (m_canvasHeight_m / 2.0) - (radius_m * 4.0);
      let x_position_m = (m_canvasWidth_m / 4.0) - (delta_x_m * 4.0);
      
      m_cueBallSpot_2d_m = new wS.Vec2D( (3.0/4.0) * m_canvasWidth_m, m_canvasHeight_m / 2.0);
      
      let rackPositions = {}
      
      let gameName = gW.getDemoVersion().split('.')[2];
      
      let puckIndex = 1;
      for (let i = 0; i < n_columns; i++) {
         let y_position_m = y_original_position_m + (i * (delta_y_m/2.0) );
         for (let j = i; j < n_columns; j++) {
            let puck_pos_2d_m = new wS.Vec2D( x_position_m, y_position_m);
            rackPositions[ puckIndex] = puck_pos_2d_m;
            y_position_m += delta_y_m;
            puckIndex += 1;
         }
         x_position_m += delta_x_m;
      }
      
      // spot the cue ball
      gW.aT.puckMap['puck0'].setPosition( m_cueBallSpot_2d_m, 0);
      
      // put the 1 ball at the front
      gW.aT.puckMap['puck1'].setPosition( rackPositions[ 15], angle_deg);
      
      if (gameName == '9ball') {
         // 9 ball in the middle
         gW.aT.puckMap[ 'puck9'].setPosition( rackPositions[ 11], angle_deg);
         
         remainingPucks = [2,3,4,5,6,7,8];
         remainRackSpots = [3,7,8,10,12,13,14];
      
      } else if (['rotation','8ball'].includes( gameName)) {
         if (gameName == '8ball') {
            // 8 ball in the middle
            gW.aT.puckMap[ 'puck8'].setPosition( rackPositions[ 11], angle_deg);
            remainingPucks = [2,3,4,5,6,7,9,10,11,12,13,14,15];
            
         } else if (gameName == 'rotation') {
            // 15 ball in the middle
            gW.aT.puckMap[ 'puck15'].setPosition( rackPositions[ 11], angle_deg);
            remainingPucks = [2,3,4,5,6,7,8,9,10,11,12,13,14];
         }
         remainRackSpots = [1,2,3,4,5,6,7,8,9,10,12,13,14];
      }
      
      // randomize
      remainRackSpots.sort(() => Math.random() - 0.5);
   
      let i = 0;
      for (let index in remainingPucks) {
         let puckName = "puck" + remainingPucks[ index];
         let position_2d_m = rackPositions[ remainRackSpots[ i]];
         gW.aT.puckMap[ puckName].setPosition( position_2d_m, angle_deg);
         i++;
      }
   }
   
   function addToTableHistory() {
      m_tableHistory.push( cR.saveState( {'inhibitWriteToCaptureCell':true} ));
      m_tableHistoryIndex = m_tableHistory.length - 1;
   }
   function restoreFromTableHistory() {
      if (m_tableHistory.length > 0) {
         tA.clearTable();
         cR.restoreFromState( JSON.parse( m_tableHistory[ m_tableHistoryIndex]));
         gW.messages['help'].newMessage( "table capture [30px Arial,yellow]_" + (m_tableHistoryIndex+1) + "_[base]", 1.0);
         m_lowPuckName = findLowPuck();
      }
   }
   function getTableCapture( mode) {
      // Before you step through the shot history, make sure the current table state has been captured (but only once).
      if ( ! m_endResultCaptured) {
         addToTableHistory();
         m_endResultCaptured = true;
      }
      if (mode == 'previous') {
         if (m_tableHistoryIndex > 0) {
            m_tableHistoryIndex--;
         }
      } else if (mode == 'next') {
         if (m_tableHistoryIndex < m_tableHistory.length - 1) {
            m_tableHistoryIndex++;
         }
      }
      restoreFromTableHistory();
   }
   function resetTableHistory() {
      m_tableHistory = [];
      m_tableHistoryIndex = 0;
      m_endResultCaptured = false;
   }
   
   function lessThanGlancing( client, contactNormal_2d) {
      // dot product of cursor spring and contact normal
      var dot = client.cursorSpring.p1p2_normalized_2d.dot( contactNormal_2d);
      var angle = contactNormal_2d.angleBetweenVectors_d( client.cursorSpring.p1p2_normalized_2d);
      if (dot < -0.13) {
         return true;
      } else {
         return false;
      }
   }
   
   function updateGhostBall( client) {
      // Primarily, updateGhostBall serves to position the ghost-ball sensor puck before the engine step. The engine result is needed
      // for determining the contact normals for wall targets.
      
      var displace_2d_m = new wS.Vec2D(0.0,0.0);
      // Shift cursor pin if it gets displaced from the cursor during aiming process.
      var cursorPinOffset_2d_m = new wS.Vec2D(0.0,0.0);
      
      if ( ( ! gW.getG_ON()) && (client.selectedBody.shape == 'circle') && (client.fineMovesState != 'inTransition') && (client.sensorTargetName) ) {
         if (client.sensorTargetName.includes('puck')) {
            var targetPuck = gW.aT.puckMap[ client.sensorTargetName];
            /*
            It's debatable whether this block for puck (circular non-wall) targets is needed here. 
            Maybe, this should be only after the engine step, since some of this is repeated there, 
            and the circular case does not depend on the positioning of the sensor puck, and corresponding engine results, for contact normals.
            If this moves, then the client.pin.setPosition should also.
            */
            if (targetPuck && (targetPuck.shape == 'circle')) {
               // Distance between the cursor and the center of the target puck.
               var cursorToTarget_2d_m = client.mouse_2d_m.subtract( targetPuck.position_2d_m);
               var cursorToTarget_m = cursorToTarget_2d_m.length();
               
               // Needed distance between the centers of the ghost and target puck so that they are touching (a kiss).
               var kissSeparation_m = client.selectedBody.radius_m + targetPuck.radius_m;
               
               var contactNormal_2d = cursorToTarget_2d_m.normal();
               // The amount the cursor pin needs to be offset from the cursor so that the ghost puck is positioned to
               // be kissing the target puck.
               cursorPinOffset_2d_m = contactNormal_2d.scaleBy( kissSeparation_m - cursorToTarget_m);
            }
         
         } else if (client.sensorTargetName.includes('wall') && (client.sensorContact)) {
            // For wall contact, displace sensor from the cursor (sensor has the radius of the selected ball)
            
            // By observation of the contact point (when displace_2d_m is kept at zero, see commented line below), 
            // it can be seen that: displacement_needed = sensor_radius - (mouse_point - engine_contact_point).
            // This is convergent, and becomes more accurate as each frame is calculated.
            // Also see: mouseUp_handler in events.js and contact listeners in boxStuff.js
            var mouseToWallContact_2d_m = client.mouse_2d_m.subtract( wS.Vec2D_from_b2Vec2( client.sensorContact.points_2d_m[0]));
            client.gBS.mouseToWallContact_2d_m = mouseToWallContact_2d_m;
            
            // Scaler displacement of sensor used to keep the contact point on the surface of the target.
            var displace_m = client.selectedBody.radius_m - mouseToWallContact_2d_m.length();
            
            // the 0.999 helps with stability, especially on the left side of walls and also pointy corners.
            displace_2d_m = client.sensorContact.normal_2d.scaleBy( 0.999 * displace_m);
            // The "sensor" displacement conflicts with the finemoves transition. So disable during the transition. 
            if (client.fineMovesState == 'inTransition') displace_2d_m = new wS.Vec2D(0,0);
            //displace_2d_m = new wS.Vec2D(0,0); // remove comment to view with an un-displaced sensor and see raw contact info.
      
            cursorPinOffset_2d_m = displace_2d_m;
         }
      }
      
      //let debugString = "target=" + client.sensorTargetName + ", cursorPinOffset_2d_m=" + cursorPinOffset_2d_m.x.toFixed(2) + ',' + cursorPinOffset_2d_m.y.toFixed(2);
      //hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
      
      // For non-wall targets, this update will move the ghost sensor puck along with the cursor (displacement is zero).
      // For wall targets, this update will displace the ghost sensor puck out from the wall (in a direction normal to the wall). 
      client.updateBox2dSensor( displace_2d_m);
      
      // Move the client cursor pin to the cursor position and add ghost-ball offsets if any.
      client.pin.setPosition( client.mouse_2d_m.add( cursorPinOffset_2d_m) );
   }
   
   function toggleProjectileForecast () {
      m_projectileForecast = ! m_projectileForecast;
      let flagWord = (m_projectileForecast) ? 'ON':'OFF'
      gW.messages['help'].newMessage( "projectile forecast: [Arial,yellow]" + flagWord + "[base]", 2.0);
   }
   
   function drawProjectilePath( drawingContext, client) {
      let shotVelocity_2d_mps = calcShotVelocity( client);
      
      let dt_s = gW.getDeltaT_s();
      let t_report_limit_s = 0.1 - dt_s; // draw every 0.1 seconds
      let g_mps2 = gW.getG_mps2();
      let v_n_2d_mps = shotVelocity_2d_mps;
      let pos_n_2d_m = client.selectedBody.position_2d_m.copy();
      
      // for rectangular pucks
      let vertices_2d_m;
      if (client.selectedBody.shape != "circle") {
         vertices_2d_m = bS.b2d_getPolygonVertices_2d_m( client.selectedBody.b2d);
      }
      
      let i_report = 0;
      let time_s = 0;
      
      do {
         /* Quoted from Box2D documentation:
         "Box2D uses the symplectic Euler integration scheme. It does not 
         reproduce parabolic motion of projectiles and has only first-order 
         accuracy. However it is fast and has good stability." 
         
         The Euler method is used here in this prediction of the puck's 25 
         positions over a period of 25*0.1 = 2.5s. These 25 predictions are drawn 
         with a 0.4 lineAlpha. These are identical to Box2D calculations. 
         */
         v_n_2d_mps.y += (-1 * g_mps2) * dt_s;
         v_n_2d_mps = v_n_2d_mps.scaleBy( (1 - (client.selectedBody.linDamp * dt_s)) ); // drag effects
         
         pos_n_2d_m.x += v_n_2d_mps.x * dt_s;
         pos_n_2d_m.y += v_n_2d_mps.y * dt_s;  // ( (v_n_2d_mps.y * dt_s) + (0.5 * (-1 * g_mps2) * Math.pow( dt_s, 2)) );
         
         time_s += dt_s;         
         
         if (time_s > t_report_limit_s) {
            if (client.selectedBody.shape == "circle") {
               client.drawCircle( drawingContext, wS.screenFromWorld( pos_n_2d_m), {'borderColor':'white', 'borderWidth_px':2, 'fillColor':'noFill', 'lineAlpha':0.4, 'radius_px':client.selectedBody.radius_px});
            
            } else {
               // difference between original the nth position (not diff between n-1 and n).
               let delta_n_2d_m = pos_n_2d_m.subtract( client.selectedBody.position_2d_m);
               
               let vertices_n_2d_px = [];
               for (var j = 0, len = vertices_2d_m.length; j < len; j++) {
                  // Calculate where the vertices would be at step n...
                  var p_2d_m = vertices_2d_m[j].add( delta_n_2d_m);
                  vertices_n_2d_px.push( wS.screenFromWorld( p_2d_m));
               }
               client.selectedBody.drawPolygon( drawingContext, vertices_n_2d_px, {'borderColor':'white', 'borderWidth_px':2, 'fillIt':false, 'lineAlpha':0.4}); // 0.4
            }
            i_report++;
            time_s = 0;
         }
         
      } while (i_report < 25);
   }
   
   function drawGhostBall( drawingContext, client) {
      // drawGhostBall runs after the engine step. Path lines for wall targets depend on the engine result (contact normals).
      
      var mouseToWallContact_2d_m = client.gBS.mouseToWallContact_2d_m;
      
      var lockedAndJustPositioning = client.ctrlShiftLock && (client.key_ctrl == "D") && (client.key_shift == "U");
      
      if ( ! lockedAndJustPositioning) {
         if (client.poolShotLocked) {
            var speed_mps = parseFloat( client.poolShotLockedSpeed_mps.toFixed( 1));
            gW.messages['gameTitle'].resetMessage();
            gW.messages['help'].newMessage( client.nameString() + ":\\  shot speed locked: [25px Arial,yellow]" + speed_mps.toLocaleString() + "[base] mps", 0.3);
            
         } else {
            var e_s = calcPoolShotEandS( client);
            var speed_mps = e_s.cueBallSpeed_mps.toFixed(1);
            var energy_j  = e_s.energy_joules.toFixed(1);
            let messageString = client.nameString() + ":\\  shot speed: [25px Arial,yellow]" + speed_mps + "[base] mps, energy: " + energy_j + " J" + "";
                                //"\\   \u03B8_deg:" + (client.selectedBody.b2d.GetAngle() * 180/Math.PI).toFixed(1);
            gW.messages['help'].newMessage( messageString, 0.3);
         }
         
         if ( m_projectileForecast && gW.getG_ON() ) {
            drawProjectilePath( drawingContext, client);
         }
         
         // add some pool game info...
         if ((gW.getDemoVersion().slice(0,3) == "3.d") && ( ! m_poolGameOver)) {
            if (client.poolShotCount > 0) {
               gW.messages['help'].addToIt( "\\  shot count = " + client.poolShotCount);
               gW.messages['help'].addToIt( "\\  pocketed balls (without a foul) = " + client.pocketedBallCount);
               if (( ! client.scratchedDuringGame) && ( ! client.objectBallFoulDuringGame) && ( ! client.mouseStopFoulDuringGame)) {
                  gW.messages['help'].addToIt( "\\  clean game so far");
               } else {
                  // nothing yet...
               }
            }
            gW.messages['help'].addToIt( "\\  score = [base,yellow]" + client.score + "[base]");
            if (client.mouseStopMessage != "") {            
               gW.messages['help'].addToIt( client.mouseStopMessage);
               if (m_cushionCollisionPenaltyGiven) {
                  gW.messages['help'].addToIt("\\  safety-shot penalty, -10");
               }
            }
         }
      }
      
      // Provide alignment aids when ghost-ball is touching the target ball or wall (no aids if shooting a rectangle or if gravity is ON).
      if ((client.sensorTargetName) && (client.selectedBody.shape == 'circle') && ( ! gW.getG_ON()) && ( ! lockedAndJustPositioning)) {
         
         // In Ghost-Ball Pool, automatically turn on finemoves when ghost touches a target.
         if ((client.fineMovesState == 'off') && (gW.getDemoVersion().slice(0,3) == "3.d")) { 
            client.previousFine_2d_px = client.mouse_2d_px;
            client.fineMovesState = 'on';
         }

         client.gBS.pathAfter.ghostPuckCenter_2d_m = null;
         client.gBS.pathAfter.ghostPuckRadius_px = client.selectedBody.radius_px;
         client.gBS.pathAfter.lines = [];
         client.gBS.pathAfter.enabled = false;
         client.gBS.pathAfter.sensorTargetName = client.sensorTargetName;
         
         if (client.sensorTargetName.includes('puck') && (gW.aT.puckMap[ client.sensorTargetName].shape == 'circle') && (client.fineMovesState != 'inTransition')) {
            var targetPuck = gW.aT.puckMap[ client.sensorTargetName];
            
            if ((client.selectedBody.restitution == 1.0) && (targetPuck.restitution == 1.0) && (client.selectedBody.friction == 0.0) || (targetPuck.friction == 0.0)) {
               var elasticCollision = true;
            } else {
               var elasticCollision = false;
            } 
            
            // Distance between the cursor and the center of the target puck.
            var cursorToTarget_2d_m = client.mouse_2d_m.subtract( targetPuck.position_2d_m);
            var cursorToTarget_m = cursorToTarget_2d_m.length();
            
            // Needed distance between the centers of the ghost and target puck so that they are touching (a kiss).
            var kissSeparation_m = client.selectedBody.radius_m + targetPuck.radius_m;
            
            var contactNormal_2d = cursorToTarget_2d_m.normal();
            
            // Draw normal and tangent lines out from the center of the ghost puck.
            var ghostPuckCenter_2d_m = targetPuck.position_2d_m.add( cursorToTarget_2d_m.normal().scaleBy( kissSeparation_m) );
            client.gBS.pathAfter.ghostPuckCenter_2d_m = ghostPuckCenter_2d_m;
            var lengthScaleFactor = 8;
            
            var contactPoint_2d_m  = ghostPuckCenter_2d_m.add( contactNormal_2d.scaleBy( -client.selectedBody.radius_m));
            var contactPoint_2d_px = wS.screenFromWorld( contactPoint_2d_m);
            
            // normal line center of ghostPuck to contact point
            client.drawLine( drawingContext, contactPoint_2d_px, wS.screenFromWorld( ghostPuckCenter_2d_m), {'width_px':2, 'color':'yellow'});
            
            // the contact point
            client.drawCircle( drawingContext, contactPoint_2d_px, {'borderColor':'white', 'borderWidth_px':0, 'fillColor':'red', 'radius_px':3});
            
            // Draw lines for shot aiming
            if (lessThanGlancing( client, contactNormal_2d)) {
               let color, dashArray, lineWidth_px, startingPoint_2d_m;
               for (let legIndex = 1; legIndex <= 4; legIndex++) {
                  let useThisLineForPathShadow = false;
                  
                  // copy so don't rotate contactNormal_2d
                  let orientation_2d = contactNormal_2d.copy();
                  let okToDraw = true;
                  
                  // tail end of the target ball path 
                  if (legIndex == 1) {
                     if (gW.getDemoVersion().slice(0,3) == "3.d") {
                        startingPoint_2d_m = ghostPuckCenter_2d_m;
                     } else {
                        startingPoint_2d_m = ghostPuckCenter_2d_m;
                     }
                     orientation_2d.rotated_by(  0); 
                     color = 'yellow';
                     lineWidth_px = 2;
                     dashArray = [10]; // large dashes
                  
                  // front end of the target ball path
                  } else if (legIndex == 3) {
                     if (gW.getDemoVersion().slice(0,3) == "3.d") {
                        // far edge of target puck
                        startingPoint_2d_m = targetPuck.position_2d_m.add( contactNormal_2d.scaleBy( -targetPuck.radius_m));
                     } else {
                        // slightly in from the near edge of target puck (so don't draw over the red dot)
                        startingPoint_2d_m = targetPuck.position_2d_m.add( contactNormal_2d.scaleBy( +targetPuck.radius_m - wS.meters_from_px(2.5)));
                     }
                     
                     orientation_2d.rotated_by(180);                     
                     color = 'yellow';
                     lineWidth_px = 2;
                     if (elasticCollision) {
                        dashArray = []; // solid line
                        useThisLineForPathShadow = true;
                     } else {
                        dashArray = [3];
                     }
                  
                  // cue ball path lines, solid one is followed
                  } else if ((legIndex == 2) || (legIndex == 4)) {
                     startingPoint_2d_m = ghostPuckCenter_2d_m;
                     if (legIndex == 2) {
                        orientation_2d.rotated_by( 90);
                     } else if (legIndex == 4) {
                        orientation_2d.rotated_by(270);
                     }
                     if (client.selectedBody.radius_m == targetPuck.radius_m) {
                        let dotProduct = client.cursorSpring.p1p2_normalized_2d.dot( orientation_2d);
                        /*
                        if (legIndex == 2) {
                           let debugString = legIndex + ", dot=" + dot.toFixed(3);
                           hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
                        }                  
                        */
                        color = 'white';
                        if (dotProduct > 0) {
                           lineWidth_px = 2;
                           if (elasticCollision) {
                              dashArray = []; // solid line
                              useThisLineForPathShadow = true;
                           } else {
                              dashArray = [3];
                           }
                        } else {
                           lineWidth_px = 2;
                           dashArray = [10]; // large dashes
                        }
                     } else {
                        okToDraw = false;
                     }
                  }
                  let endPoint_2d_m = ghostPuckCenter_2d_m.add( orientation_2d.scaleBy( lengthScaleFactor));
                  if (okToDraw) {
                     let startingPoint_2d_px = wS.screenFromWorld( startingPoint_2d_m);
                     let endPoint_2d_px = wS.screenFromWorld( endPoint_2d_m);
                     client.drawLine( drawingContext, startingPoint_2d_px, endPoint_2d_px, {'width_px':lineWidth_px, 'color':color, 'dashArray':dashArray});
                     if (useThisLineForPathShadow) {
                        client.gBS.pathAfter.lines.push( {'direction_2d':orientation_2d, 'color':color} );
                     }
                  }
               }
            }
            
         } else if (client.sensorTargetName.includes('wall') && (mouseToWallContact_2d_m) &&  (client.fineMovesState != 'inTransition')) {
            let dashArray, useThisLineForPathShadow;
            if ((client.selectedBody.restitution == 1.0) && (client.selectedBody.friction == 0.0)) {
               dashArray = [];
               useThisLineForPathShadow = true;
            } else {
               dashArray = [3];
               useThisLineForPathShadow = false;
            } 
            
            var contactPoint_2d_m  = wS.Vec2D_from_b2Vec2( client.sensorContact.points_2d_m[0]);
            var contactPoint_2d_px = wS.screenFromWorld( contactPoint_2d_m);
            
            // normal line from contact event
            var contactNormal_2d = wS.Vec2D_from_b2Vec2( client.sensorContact.normal_2d);
            var contactNormal_2d_m = contactNormal_2d.scaleBy( client.selectedBody.radius_m);
            var normalLine_endpoint_2d_px = wS.screenFromWorld( contactPoint_2d_m.add( contactNormal_2d_m));
            
            client.drawLine( drawingContext, contactPoint_2d_px, normalLine_endpoint_2d_px, {'width_px':2, 'color':'yellow'});
            
            // the contact point
            client.drawCircle( drawingContext, contactPoint_2d_px, {'borderColor':'white', 'borderWidth_px':0, 'fillColor':'red', 'radius_px':3});
            
            // vector along the line from the ghost to the selected puck
            var ghostPosition_2d_m = client.pin.position_2d_m;  //client.mouse_2d_m.add( cursorPinOffset_2d_m);
            client.gBS.pathAfter.ghostPuckCenter_2d_m = ghostPosition_2d_m;
            var ghostToSelected_2d_m = client.selectedBody.position_2d_m.subtract( ghostPosition_2d_m); 
            
            // angular difference between the spring line and the contact normal
            var diffWithNormal_deg = ghostToSelected_2d_m.get_angle() - contactNormal_2d_m.get_angle();
            if (diffWithNormal_deg < 0) diffWithNormal_deg = diffWithNormal_deg + 360;
            
            // direction after the wall collision
            var angleAfterWallCollision = ghostToSelected_2d_m.get_angle() - (2 * diffWithNormal_deg);
            var directionAfterWallCollision_2d = new wS.Vec2D(0, 1);
            directionAfterWallCollision_2d.set_angle( angleAfterWallCollision);
            var directionAfterWallCollision_2d_m = directionAfterWallCollision_2d.scaleBy( 12);
            
            // line the puck follows after the wall collision
            var endPointForCollisionLine_2d_m = ghostPosition_2d_m.add( directionAfterWallCollision_2d_m);
            
            // Use the dot product to determine when the user has pushed the cursor into the wall. When the sensor is
            // displaced (using displace_2d_m), the dot product will go negative when the cursor is pushed beyond the engine's contact point.
            // Also, if diffWithNormal_deg is greater than 90, you must be aiming around a corner or on the far side of a wall.
            // Inhibit the alignment lines in both of these cases.
            var dotProduct = contactNormal_2d.dot( mouseToWallContact_2d_m);
            // Not accurate when the user is pushing the sensor into the wall too far (negative dotProduct).
            if ( (dotProduct > 0) && ((diffWithNormal_deg < 90.0) || (diffWithNormal_deg > 270.0)) ) {
               if (useThisLineForPathShadow) client.gBS.pathAfter.lines.push( {'direction_2d':directionAfterWallCollision_2d, 'color':'white'} );
               client.drawLine( drawingContext, wS.screenFromWorld( ghostPosition_2d_m), wS.screenFromWorld( endPointForCollisionLine_2d_m), {'width_px':2, 'color':'white', 'dashArray':dashArray});
            }
         }
      
      } else {
         // If not engaged with a target puck, automatically transition out of finemoves when playing ghost-ball pool.
         let poolWithGravityOff = ( (gW.getDemoVersion().slice(0,3) == "3.d") && ( ! gW.getG_ON()) );
         if (poolWithGravityOff && (client.fineMovesState == 'on')) { 
            wS.exitFineMoves( client.name);
         }
      }
      
      if ( (client.selectedBody.shape == 'circle') && ( ! lockedAndJustPositioning) && ( ! gW.getG_ON()) ) {
         // Draw the ghost ball at the position of the cursor pin (note that the small pin circle is drawn as part of the drawCursor function)
         client.drawCircle( drawingContext, client.pin.position_2d_px, {'borderColor':'white', 'borderWidth_px':2, 'fillColor':'noFill', 'lineAlpha':0.5, 'radius_px':client.selectedBody.radius_px});
      }
   }   
   
   function resetPathAfterShot( client) {
      let timeForFade_s = 0.75;
      let framesForFade = gW.getFrameRate() * timeForFade_s;
      
      client.gBS.pathAfter = {'enabled':false, 'ghostPuckCenter_2d_m':null, 'ghostPuckRadius_px':null, 'lines':[], 
                              'sensorTargetName':null, 'fadeOut':false, 'fadeCounter':0, 'framesForFade':framesForFade};
   }
   
   function drawPathAfterShot( drawingContext, client) {
      if ((client.gBS.pathAfter.enabled) && (client.gBS.pathAfter.sensorTargetName)) {
         let scalingFactor = 12.0;
         let dashArray = []; // [] makes the line solid (no dash)
         
         let fadeFactor = (client.gBS.pathAfter.framesForFade - client.gBS.pathAfter.fadeCounter)/client.gBS.pathAfter.framesForFade;
         if (fadeFactor < 0.0) fadeFactor = 0;
         if (client.gBS.pathAfter.fadeOut) {
            client.gBS.pathAfter.fadeCounter++;
         }
         
         let linesAlpha = 1.0 * fadeFactor;
         let ghostAlpha = 0.5 * fadeFactor;
         let smallCircleAlpha = 1.0 * fadeFactor;
         
         for (var j = 0, len = client.gBS.pathAfter.lines.length; j < len; j++) {
            let startPoint_2d_px = wS.screenFromWorld( client.gBS.pathAfter.ghostPuckCenter_2d_m);
            let line_2d_m = client.gBS.pathAfter.lines[j].direction_2d.scaleBy( scalingFactor);
            let endPoint_2d_px = wS.screenFromWorld( client.gBS.pathAfter.ghostPuckCenter_2d_m.add( line_2d_m) );
            let lineColor = client.gBS.pathAfter.lines[j].color;
            client.drawLine( drawingContext, startPoint_2d_px, endPoint_2d_px, {'width_px':2, 'color':lineColor, 'alpha':linesAlpha, 'dashArray':dashArray});
         }
         
         if (client.gBS.pathAfter.lines.length > 0) {
            // the ghost circle
            let circleAttributes = {'borderColor':'white', 'borderWidth_px':2, 'fillColor':'noFill', 'lineAlpha':ghostAlpha, 'radius_px':client.gBS.pathAfter.ghostPuckRadius_px};
            client.drawCircle( drawingContext, wS.screenFromWorld( client.gBS.pathAfter.ghostPuckCenter_2d_m), circleAttributes);
            // small circle in the middle
            circleAttributes = {'borderColor':'white', 'borderWidth_px':2, 'fillColor':'black', 'fillAlpha':smallCircleAlpha, 'lineAlpha':smallCircleAlpha, 'radius_px':4};
            client.drawCircle( drawingContext, wS.screenFromWorld( client.gBS.pathAfter.ghostPuckCenter_2d_m), circleAttributes);
         }
      }
   }
   
   function checkForMouseStops( client, selectedBody) {
      if ( ( ! m_poolGameOver) && ( ! selectedBody.velocity_2d_mps.zeroLength()) ) {
         client.score -= 5;
         client.mouseStopPenalty -= 5;
         client.mouseStopFoulDuringGame = true;
         var nBallsStopped = -1 * client.mouseStopPenalty / 5;
         if (nBallsStopped == 1) {
            var ballsString = "a ball";
         } else {
            var ballsString = nBallsStopped + " balls";
         } 
         client.mouseStopMessage = "\\ \\  for stopping " + ballsString + " with the mouse, " + client.mouseStopPenalty;
      }
   }
   
   function calcPoolShotEandS( client) {
      // EandS (Energy and Speed)
      client.cursorSpring.calculateSeparation();
      var dl_x = client.cursorSpring.p1p2_separation_m;
      // Spring energy = 0.5 * k * x^2
      var springEnergy_joules = 0.5 * client.cursorSpring.strength_Npm * Math.pow( dl_x, 2);
      // Puck (cue ball) speed after getting the spring energy:  0.5 * m * speed^2 = springEnergy
      var cueBallSpeed_mps = Math.sqrt( springEnergy_joules * (2.0/client.selectedBody.mass_kg));
      return {'energy_joules':springEnergy_joules, 'cueBallSpeed_mps':cueBallSpeed_mps, 'cursorSpringStretch_m':dl_x};
   }
   
   function setPoolShotLockedValues( client) {
      // These are energy-related characteristics of a locked shot.
      let poolShotEnergy = calcPoolShotEandS( client);
      client.poolShotLockedSpeed_mps = poolShotEnergy.cueBallSpeed_mps;
      client.poolShotLockedSpringStretch_m = poolShotEnergy.cursorSpringStretch_m;
      client.poolShotLockedEnergy_J = poolShotEnergy.energy_joules;
   }
   
   function updatePoolShotLockedValues( client) {
      /* This is used AFTER a speed-lock has been set. So, if you release the cursor spring (release a mouse button) 
      to grab a different puck, or change cursor springs, this will use the speed-lock value to determine corresponding
      shot energy and cursor-spring stretch. */
      // E = 0.5 * mv^2
      client.poolShotLockedEnergy_J = 0.5 * client.selectedBody.mass_kg * Math.pow( client.poolShotLockedSpeed_mps, 2);
      // E = kx^2/2, x = (2E/k)^0.5
      client.poolShotLockedSpringStretch_m = Math.pow( 2.0 * client.poolShotLockedEnergy_J / client.cursorSpring.strength_Npm, 0.5);
   }
   
   function togglePoolShotLock( client) {
      if (client.selectedBody && (client.selectedBody.constructor.name != 'Puck')) return;
      
      // Set the shoot speed and lock it.
      if (client.cursorSpring) {
         setPoolShotLockedValues( client);
         client.poolShotLocked = true;
         
      // Release the speed lock, no cursor spring here, or no ball (puck) selected.
      } else {
         client.poolShotLocked = false;
         gW.messages['help'].newMessage(client.nameString() + " UNLOCKED shot speed", 1.0);
      }
   }
   
   function calcShotVelocity( client) {
      if (client.poolShotLocked) {
         client.cursorSpring.calculateSeparation();
         var speed_mps = client.poolShotLockedSpeed_mps;
      } else {
         var speed_mps = calcPoolShotEandS( client).cueBallSpeed_mps;
      }
      
      // Normalize the separation vector and then scale by the speed.
      var dr_2d_m = client.cursorSpring.p1p2_separation_2d_m;
      
      // can not calculate a normal in cases where the separation vector has zero length. 
      if (dr_2d_m.zeroLength()) {
         var velocity_2d_mps = new wS.Vec2D(0,0);
      } else {
         // sign change is useful if the cue ball ends up touching the next object ball.
         if (client.key_alt == "D") {
            var sign = -1;
         } else {
            var sign = 1;
         }
         var velocity_2d_mps = dr_2d_m.normal().scaleBy( sign * speed_mps);
      }
      
      return velocity_2d_mps;
   }
   
   function poolShot( client) {
      // Once play starts, move the title more to the center, out of the way of the help lines.
      gW.messages['gameTitle'].loc_px = {'x':450,'y':350};
      
      // Restrict this to single-object selections.
      if (gW.hostMSelect.count() == 0) {
      
         if ((gW.getDemoVersion().slice(0,3) == "3.d") && (client.selectedBody.name != "puck0") && ( ! m_poolGameOver)) {
            gW.messages['help'].newMessage("shoot the cue ball during the game", 1.0);
         
         // Shoot it...
         } else {
            // Always capture the table state at the time of the shot.
            addToTableHistory();
            // This flag indicates whether the end-result state has been captured. This flag is
            // used to capture (and avoid losing) the end-result state if you start to review the shot history (before taking another shot).
            m_endResultCaptured = false;
            
            if (gW.getDemoVersion().slice(0,3) == "3.d") separateIfTooClose();
            
            var shotVelocity_2d_mps = calcShotVelocity( client);
            if (shotVelocity_2d_mps.zeroLength()) {
               return;
            } else {               
               client.selectedBody.velocity_2d_mps = shotVelocity_2d_mps; // new Vec2D(2.0, 0.0);
               client.selectedBody.b2d.SetLinearVelocity( shotVelocity_2d_mps);
            }
            
            if ((gW.getDemoVersion().slice(0,3) == "3.d") && ( ! m_poolGameOver)) {
               client.score -= 5;
               gW.messages['help'].newMessage( client.nameString() + " has taken a shot, -5", 10.0);
               gW.messages['score'].newMessage( client.nameString() + ' score = ' + client.score, 10.0);
               // If pool shoot is from a network touch screen, the report will show a mark in the virtual-game-pad column.
               if (client.touchScreenUsage) client.virtualGamePadUsage = true;
            }
            // note: cue ball is flagged as spotted after scratching
            client.selectedBody.spotted = false;
            m_mostRecentPoolShooter = client.name;
            m_objectBallFoul = false;
            m_poolGameShotCount += 1;  // game shot count
            client.poolShotCount += 1; // client shot count
            client.mouseStopMessage = "";
            client.mouseStopPenalty = 0;
            client.gBS.pathAfter.enabled = true;
            // Allow check on first CBC (Cue Ball Collision). 
            m_readyForFirstCueBallCollision = true;
            m_cushionCollision = false;
            m_nonCueBallPocketed = false;
            m_cushionCollisionPenaltyGiven = false;
            
            if (gW.getDemoVersion().includes('basketball')) {
               // basketball shots
               bpH.resetShotState({'clientName':client.name, 'puckName':client.selectedBody.name, 
                                   'puck_v_2d_mps':client.selectedBody.velocity_2d_mps, 'puck_pos_2d_m':client.selectedBody.position_2d_m});
            } else if (gW.getDemoVersion().slice(0,3) == '4.e') {
               // Monkey Hunt
               mH.resetShotState({'clientName':client.name, 'puckName':client.selectedBody.name});
            } 
         }
         
      } else if ( (client.ctrlShiftLock) && (client.key_shift == "D") ) {
         // Ok ok ok. To shoot a group in the multi-select, ctrl-Shift-L then hold down the "Shift" key. Use the mouse wheel to see the speed-lock value. 
         gW.hostMSelect.applyToAll( tableObj => {
            var shotVelocity_2d_mps = calcShotVelocity( client);
            if (shotVelocity_2d_mps.zeroLength()) {
               return;
            } else {               
               tableObj.velocity_2d_mps = shotVelocity_2d_mps;
               tableObj.b2d.SetLinearVelocity( shotVelocity_2d_mps);
            }
         });
      }
   }
   
   function findLowPuck() {
      // for finding the lowest puck in ghost-ball pool
      var lowPuck = 100000;
      cP.Puck.applyToAll( puck => {
         var puckNumber = parseFloat( puck.name.slice(4));
         if (puck.name != "puck0") lowPuck = Math.min( puckNumber, lowPuck);
      });
      if (lowPuck != 100000) {
         var lowPuckName = "puck" + lowPuck;
      } else {
         var lowPuckName = null;
      } 
      return lowPuckName;
   }

   function separateIfTooClose() {
      // Trying to space out stationary balls so that trick-shot setups on the
      // pool table work a little better. This will disturb the rack a little on the
      // break, but maybe that's ok.
      var puckArray = Object.keys( gW.aT.puckMap);
      // Look at all the puckA-PuckB combinations.
      for (var j = 0, len = puckArray.length; j < len; j++) {
         for (var k = j+1; k < len; k++) {
            var puckA = gW.aT.puckMap[ puckArray[ j]];
            var puckB = gW.aT.puckMap[ puckArray[ k]];
            var separationOfCenters_2d_m = puckA.position_2d_m.subtract( puckB.position_2d_m);
            var separationNormal_2d = separationOfCenters_2d_m.normal();
            var separationOfCenters_m = separationOfCenters_2d_m.length();
            var separationOfSurfaces_m = separationOfCenters_m - (puckA.radius_m + puckB.radius_m);
            if (separationOfSurfaces_m < 0.006) {
               var moveNeeded = (0.007 - separationOfSurfaces_m)/2.0;
               // Separate pucks along the normal.
               puckA.b2d.SetPosition( puckA.position_2d_m.add(  separationNormal_2d.scaleBy(  moveNeeded) ) ); 
               puckB.b2d.SetPosition( puckB.position_2d_m.add(  separationNormal_2d.scaleBy( -moveNeeded) ) ); 
            }
         }
      }
   }
   
   function countStripesAndSolids() {
      var puckNumber;
      var n_solids = 0;
      var n_stripes = 0;
      cP.Puck.applyToAll( puck => {
         puckNumber = parseFloat( puck.name.slice(4));
         if ((puckNumber > 0) && (puckNumber < 8)) {
            n_solids += 1;
         } else if (puckNumber > 8) {
            n_stripes += 1;
         }
      });
      return {'stripes':n_stripes, 'solids':n_solids};
   }
   
   function drawPoolBallFeatures( drawingContext, puck, pars = {}) {
      var font =  uT.setDefault( pars.font, "20px Arial");
      var color = uT.setDefault( pars.color, 'black');
      var name = puck.name.slice(4);
      if (name != '0') {
         // White circle with ball number in the middle
         puck.drawCircle( drawingContext, puck.position_2d_px, {'borderWidth_px':0, 'fillColor':'lightgray', 'radius_px':0.5 * puck.radius_px});
         
         drawingContext.font = font;
         drawingContext.fillStyle = color;
         drawingContext.textAlign = "center";
         drawingContext.textBaseline = "middle";
         var x_px = puck.position_2d_px.x;
         var y_px = puck.position_2d_px.y + (puck.radius_px * 0.05);
         drawingContext.fillText( name, x_px, y_px);
      }
      
      // Balls higher than 8 are striped.
      if (name > 8) {
         puck.drawStripe( drawingContext,{"width":0.25, "stripeAngle_r":Math.PI/4, "trackPuckAngle":false});
      }
      
      // Draw thick circle to identify the low puck, helpful for 9-ball and rotation.
      // (note: low-puck search and display timer not used for 8-ball)
      if ((puck.name == m_lowPuckName) && (puck.lowBallFinderCircle_timer_s < puck.lowBallFinderCircle_timerLimit_s)) {
         puck.drawCircle( drawingContext, puck.position_2d_px, 
            {'borderColor':'white', //puck.color
             'fillColor':'noFill', 
             'borderWidth_px':puck.radius_px * 0.2, 
             'radius_px'     :puck.radius_px * 1.5 } );
             
         puck.lowBallFinderCircle_timer_s += gW.getDeltaT_s();
      }
   }
   
   function checkPoolBallState( puck, pars = {}) {
      // m_poolTimer_stateCheckLimit_s limits how often these checks are called in checkPoolGameState in updateAirTable method of gwModule.js.
      // When called, this is applied to each puck in the puck map.
      
      // If slow moving puck, stop it.
      if ((puck.velocity_2d_mps.length() < 0.2) && ( ! gW.getG_ON())) {
         puck.b2d.SetLinearVelocity( new b2DW.Vec2(0.0,0.0));
      }
      
      // Check if any puck is still moving.
      if ( ! puck.velocity_2d_mps.zeroLength()) m_allPucksStopped = false;
      
      // Check if this ball has gone in a pocket (i.e. center is off the canvas, in meters).
      var limits = {'min_x':0.0, 'max_x':19.0, 'min_y':0.0, 'max_y':10.75};
      if ( ! mS.SelectBox.pointInside( puck.position_2d_m, limits)) {
         var theShooter = gW.clients[ m_mostRecentPoolShooter];
         
         // any ball (except the cue ball) goes in a pocket
         if ( puck.name != "puck0" ) {
            m_nonCueBallPocketed = true;
            var puckNumber = parseFloat( puck.name.slice(4));
            
            if ( ! m_poolGameOver) {
               if (( m_objectBallFoul ) || ( gW.aT.puckMap['puck0'].spotted )) {
                  theShooter.score += 0;
                  gW.messages['help'].addToIt('\\  ' + puckNumber + '-ball pocketed after foul, +0', {'additionalTime_s':2.0});
               
               // clean shot: numbered ball pocketed without a foul.
               } else {
                  theShooter.pocketedBallCount += 1;
                  if ( gW.getDemoVersion().includes('8ball') ) {
                     if ((puckNumber < 8) && (theShooter.stripesOrSolids == "solids")) { 
                        theShooter.score += 15;
                        gW.messages['help'].addToIt('\\  solid (' + puckNumber + '-ball) pocketed, +15', {'additionalTime_s':2.0});
                     
                     } else if ((puckNumber > 8) && (theShooter.stripesOrSolids == "stripes")) {
                        theShooter.score += 15;
                        gW.messages['help'].addToIt('\\  stripe (' + puckNumber + '-ball) pocketed, +15', {'additionalTime_s':2.0});
                        
                     } else if (puckNumber != 8) {
                        if (theShooter.stripesOrSolids == "table is open") {
                           theShooter.score += 10;
                           gW.messages['help'].addToIt('\\  ' + puckNumber + '-ball pocketed, table open, +10', {'additionalTime_s':2.0});
                        } else {
                           theShooter.score += 0;
                           gW.messages['help'].addToIt('\\  ' + puckNumber + '-ball pocketed, but not in your group, +0', {'additionalTime_s':2.0});
                        }
                     }
                  // 9-ball and rotation
                  } else {
                     theShooter.score += 15;
                     gW.messages['help'].addToIt('\\  ' + puckNumber + '-ball pocketed, +15', {'additionalTime_s':2.0});
                     
                     // simple rotation, the win is near...
                     if (gW.getDemoVersion().includes('rotation') && (theShooter.pocketedBallCount == 7)) {
                        gW.messages['help'].addToIt("\\ \\  seven balls have been pocketed without fouls, need one more for the win...");
                     }
                  }
                  gW.messages['score'].newMessage( theShooter.nameString() + ' score = ' + theShooter.score, 10.0);
               }
            
               // This ball went in while table was open (in 8-ball game), and so establishes stripes or solids.
               if ( gW.getDemoVersion().includes('8ball') && (theShooter.stripesOrSolids == "table is open") && (m_poolGameShotCount > 1) ) {
                  if (puckNumber < 8) {
                     theShooter.stripesOrSolids = "solids";
                     // Set all other clients to be stripes
                     cT.Client.applyToAll( client => { if (client.name != theShooter.name) client.stripesOrSolids = 'stripes'});
                     gW.messages['gameTitle'].newMessage( theShooter.nameString() + " has " + theShooter.stripesOrSolids, 2.0);
                     
                  } else if (puckNumber > 8) {
                     theShooter.stripesOrSolids = "stripes";
                     cT.Client.applyToAll( client => { if (client.name != theShooter.name) client.stripesOrSolids = 'solids'});
                     gW.messages['gameTitle'].newMessage( theShooter.nameString() + " has " + theShooter.stripesOrSolids, 2.0);
                     
                  } else {
                     poolGameExit("\\  8-ball pocketed while table is open");
                  }
               }
               
               // Check for can't-win condition in simple rotation
               if (gW.getDemoVersion().includes('rotation')) {
                  var enoughBallsForAWin = false;
                  cT.Client.applyToAll( client => { 
                     if ((client.pocketedBallCount + (Object.keys( gW.aT.puckMap).length - 1)) > 8) enoughBallsForAWin = true ;
                  });
                  if ( ! enoughBallsForAWin) {
                     poolGameExit("\\  not enough balls left for any player to get to 8");
                  }
               }
            }
            
            // Add this "looks like a win, but wait" string to the "ball goes in message".
            var moreHelp = "";
            if ((gW.getDemoVersion().includes('9ball')) && (puck.name == "puck9")) {
               moreHelp = "\\ \\  that was the 9 (the money) ball, wait for the scratch check...";
               m_poolWinType = "9-ball";
            } else if ((gW.getDemoVersion().includes('8ball')) && (puck.name == "puck8")) {
               moreHelp = "\\ \\  that was the 8 (the money) ball, wait for the scratch check...";
               m_poolWinType = "8-ball";
            // for simple rotation, 8 balls pocketed
            } else if (gW.getDemoVersion().includes('rotation') && (theShooter.pocketedBallCount == 8)) {
               moreHelp = "\\ \\  that was the eighth ball pocketed, wait for the scratch check...";
               m_poolWinType = "rotation";
            }
            // No point in giving the additional help if the remaining balls quickly come to rest and a win is declared.
            // So wait 0.900 seconds and then check to to see if the game is over before adding the moreHelp string.
            window.setTimeout( function() {
               if (( ! m_poolGameOver) && (moreHelp != "")) { 
                  gW.messages['help'].addToIt( moreHelp, {'additionalTime_s':2.0});
               }
            }, 900);
            
            puck.deleteThisOne({});
            
            // Now, after the deletion, find the new low ball on the table.
            // 9-ball and simple rotation require a low-ball object ball. Help the user find this ball with a finder circle.
            if (( ! gW.getDemoVersion().includes('8ball')) && ( ! m_poolGameOver)) {
               m_lowPuckName = findLowPuck();
               if ( (m_lowPuckName) && (m_poolWinType == "no win yet") ) {
                  // Start displaying the finder circle
                  gW.aT.puckMap[ m_lowPuckName].lowBallFinderCircle_timer_s = 0;
               }
            }
                        
         // cue ball pocketed 
         } else {
            // still some other balls left on table
            if (Object.keys( gW.aT.puckMap).length > 1) {
               if ( ! m_poolGameOver) {
                  // Penalty for scratching
                  theShooter.scratchedDuringGame = true;
                  theShooter.score -= 20;
                  //gW.messages['gameTitle'].newMessage("scratch", 2.0);
               }
               gW.messages['help'].addToIt('\\  scratch, cue ball has been spotted', {'additionalTime_s':2.0});
               if ( ! m_poolGameOver) gW.messages['help'].addToIt(', -20'); // score not important if shooting after the game...
               // Spot the cue ball
               puck.b2d.SetPosition( m_cueBallSpot_2d_m);
               puck.b2d.SetLinearVelocity( new wS.Vec2D( 0.0, 0.0));
               puck.spotted = true;
               
            // cue ball was last ball on table, game over...
            } else if ((Object.keys( gW.aT.puckMap).length == 1) && ( ! m_poolGameOver)) {
               poolGameExit("\\  scratch on last shot");
            }
            
            // In case the user still has their cursor-spring connected to the cue ball.
            gW.clients['local'].modifyCursorSpring('detach');
         }
      }
   }
   
   function checkPoolGameState( drawingContext) {
      m_poolTimer_gameDuration_s += gW.getDeltaT_s();
      
      // wait for the timer
      if (m_poolTimer_stateCheck_s < m_poolTimer_stateCheckLimit_s) {
         m_poolTimer_stateCheck_s += gW.getDeltaT_s();
         
      // times up, run the checks
      } else {
         var theShooter = gW.clients[ m_mostRecentPoolShooter];
         
         // Ball speed is checked in checkPoolBallState.
         m_allPucksStopped = true;
         cP.Puck.applyToAll( puck => {
            // determine when balls go into pockets
            checkPoolBallState( puck);
         });
         
         if (m_allPucksStopped) {
            cT.Client.applyToAll( client => {
               resetPathAfterShot( client);
            });
         }
         
         // Must either pocket a ball or hit a cushion
         if ((m_poolGameShotCount > 0) && ( ! m_cushionCollisionPenaltyGiven) && (m_allPucksStopped)) {
            if (m_readyForFirstCueBallCollision) {
               theShooter.score -= 10;
               theShooter.safetyShotFoulDuringGame = true;
               m_cushionCollisionPenaltyGiven = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  no contact with object ball, -10', {'additionalTime_s':2.0});
               
            } else if (( ! m_nonCueBallPocketed) && ( ! m_cushionCollision)) {
               theShooter.score -= 10;
               theShooter.safetyShotFoulDuringGame = true;
               m_cushionCollisionPenaltyGiven = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  nothing pocketed and no collision with a cushion, -10', {'additionalTime_s':2.0});
            }
         }
         
         // If money-ball has been pocketed, report the win (or money-ball foul).
         if ((m_allPucksStopped) && (gW.aT.puckMap['puck0']) && ( ! gW.aT.puckMap['puck0'].spotted) && ( ! (m_poolWinType == "no win yet"))) {
            if (( ! cT.Client.winnerBonusGiven) && ( ! m_poolGameOver)) {
               
               if (m_objectBallFoul) {
                     poolGameExit("\\ \\  object-ball foul on money-ball shot");
               
               } else if (m_poolWinType == "8-ball") {
                  if (theShooter.stripesOrSolids == "table is open") {
                     poolGameExit("\\ \\  foul, money-ball pocketed while table is open");
                  
                  // Check for not-empty-group foul (a combo shot at the end will trigger this without an object-ball foul)
                  } else if (countStripesAndSolids()[ theShooter.stripesOrSolids] != 0) {
                     poolGameExit("\\ \\  foul, money-ball pocketed before pocketing all the " + theShooter.stripesOrSolids);
                        
                  } else {
                     reportPoolWin("8-ball win");
                  }
                  
               } else if (m_poolWinType == "rotation") {
                  reportPoolWin("simple-rotation win");
                           
               } else if (m_poolWinType == "9-ball") {
                  reportPoolWin("9-ball win");
               }
            }
               
         // Must have scratched on money-ball shot...
         } else if ( (m_allPucksStopped) && ( ! (m_poolWinType == "no win yet")) && ( ! m_poolGameOver) && (gW.aT.puckMap['puck0'].spotted) ) {
            poolGameExit("\\ \\  scratched on money-ball shot");
         }
         
         m_poolTimer_stateCheck_s = 0;
         
         // While the game is still underway, keep updating the score.
         if ( ! m_poolGameOver) {
            if (theShooter) gW.messages['score'].newMessage( theShooter.nameString() + ' score = ' + theShooter.score, 10.0);
         }
      }
   }
   
   function processCueBallFirstCollision( puck_A, puck_B) {
      if ( ((puck_A.name == "puck0") || (puck_B.name == "puck0")) && m_readyForFirstCueBallCollision ) {
         var theShooter = gW.clients[ m_mostRecentPoolShooter];
         
         if (puck_A.name == "puck0") {
            var cueBall = puck_A, objectBall = puck_B;
         } else {
            var cueBall = puck_B, objectBall = puck_A;
         }
         
         // low-ball check in 9-ball and rotation (if readyForFirstPoolBallCollision)
         if ( gW.getDemoVersion().includes('9ball') || gW.getDemoVersion().includes('rotation') )  {
            if (objectBall.name != m_lowPuckName) {
               theShooter.score -= 10;
               theShooter.objectBallFoulDuringGame = true;
               m_objectBallFoul = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  must hit low ball, -10', {'additionalTime_s':2.0});
            }
         
         } else if ( gW.getDemoVersion().includes('8ball') ) {
            var objectBallNumber = parseFloat( objectBall.name.slice(4));
            
            // stripes or solids check in 8-ball
            if ((objectBallNumber < 8) && (theShooter.stripesOrSolids == "stripes")) {
               theShooter.score -= 10;
               theShooter.objectBallFoulDuringGame = true;
               m_objectBallFoul = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  must hit a stripe first, -10', {'additionalTime_s':2.0});
               
            } else if ((objectBallNumber > 8) && (theShooter.stripesOrSolids == "solids")) {
               theShooter.score -= 10;
               theShooter.objectBallFoulDuringGame = true;
               m_objectBallFoul = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  must hit a solid first, -10', {'additionalTime_s':2.0});
               
            } else if ( (objectBallNumber == 8) && ( ! m_poolGameOver) && ( ! (theShooter.stripesOrSolids == "table is open"))) {
               var eightBallGame = countStripesAndSolids();
               // If the player still has some balls in his group on the table, warn when shooting at the 8-ball.
               if (eightBallGame[ theShooter.stripesOrSolids] > 0) {
                  theShooter.score -= 10;
                  theShooter.objectBallFoulDuringGame = true;
                  m_objectBallFoul = true;
                  gW.messages['help'].addToIt("\\  must pocket all " + theShooter.stripesOrSolids + " before using the 8 as an object ball (unless table is open), -10", {'additionalTime_s':2.0});
               }
            }
            // Must hit first ball in the rack on the break.
            if ((m_poolGameShotCount == 1) && (objectBall.name != "puck1")) {
               theShooter.score -= 10;
               theShooter.objectBallFoulDuringGame = true;
               m_objectBallFoul = true;
               if ( ! m_poolGameOver) gW.messages['help'].addToIt('\\  must hit the first ball in the rack on break, -20', {'additionalTime_s':2.0});
            }
         }
         m_readyForFirstCueBallCollision = false;
      }
   }
   
   function contactNormals( mode, contact) {
      var body_A = gW.tableMap.get( contact.GetFixtureA().GetBody());
      var body_B = gW.tableMap.get( contact.GetFixtureB().GetBody());
      
      if (body_A && body_B) {
      
         if (mode == 'preSolve') {

            // ghost puck sensor event associated with client cursor (also see drawGhostBall)
            if ((body_A.constructor.name == "Client") || (body_B.constructor.name == "Client")) {
               
               if (body_A.constructor.name == "Client") {
                  var clientTarget = body_B, client = body_A; 
               } else {
                  var clientTarget = body_A, client = body_B;
               }
               // Ignore contact between the sensor (the ghost) and the source puck (selected by client).
               if ((client.selectedBody) && (clientTarget.name != client.selectedBody.name)) {
                  var worldManifold = new b2DW.WorldManifold();
                  contact.GetWorldManifold( worldManifold);
                  
                  var wM_normal = Object.assign({}, worldManifold.m_normal);
                  var wM_points = Object.assign({}, worldManifold.m_points);
                  client.sensorContact = {'normal_2d':wS.Vec2D_from_b2Vec2( wM_normal),'points_2d_m':wM_points};
               }
               
               if (clientTarget.constructor.name == "Wall") {
                  // Note: since walls don't move in response to collisions, get identical wall behavior, if disabled (false).
                  contact.SetEnabled( true);
               } else {
                  // For all other targets (pucks and pins), disable any collision response with the ghost puck.
                  contact.SetEnabled( false);
               }
            }   
            
         } else if (mode == 'endContact') {
            if ((body_A.constructor.name == "Client") || (body_B.constructor.name == "Client")) {
               if (body_A.constructor.name == "Client") {
                  var client = body_A, clientTarget = body_B;
               } else {
                  var client = body_B, clientTarget = body_A;
               }
               
               // ignore contact between ghost and selected puck (also see drawGhostBall)
               if ((client.selectedBody) && (clientTarget.name != client.selectedBody.name)) {
                  if (client.sensorTargetName == clientTarget.name) {
                     client.sensorTargetName = null;
                     client.sensorContact = null;
                  }
               }
            }
         }
      }      
   }
   
   function poolGameExit( helpMessage) {
      m_poolGameOver = true;
      var theShooter = gW.clients[ m_mostRecentPoolShooter];
      theShooter.score = 0;
      gW.messages['score'].resetMessage();
      gW.messages['help'].addToIt( helpMessage, {'additionalTime':3.0});
      gW.messages['help'].addToIt("\\ \\  game over\\ \\  thanks for playing...", {'additionalTime':3.0});
      
      // Position the game-over announcement below (at a higher y value than) the last line of the help message.
      gW.messages['gameTitle'].loc_px.y = gW.messages['help'].yMax_px() + gW.messages['gameTitle'].lineHeight_px;
      gW.messages['gameTitle'].setFont('30px Arial');
      var theSeries = {
         1:{'tL_s':2.5, 'message':"that was almost a win..."},
         2:{'tL_s':2.5, 'message':"it's a little smoky in this pool hall..."},
         3:{'tL_s':2.5, 'message':"maybe open a window..."},
         4:{'tL_s':2.5, 'message':"and try again..."},
         5:{'tL_s':3.0, 'message':"press the 3 key \\  to restart from the keyboard..."},
         6:{'tL_s':3.0, 'message':"from a [base,orange]cell phone[base], \\  do a four-finger touch to restart."}};
      //gW.messages['gameTitle'].newMessage("thanks for playing", 5.0);
      gW.messages['gameTitle'].newMessageSeries( theSeries);
   }

   function reportPoolWin( winMessage) {
      // calculate bonuses and report to leader-board 
      cT.Client.applyToAll( client => { 
         client.mouseUsage = false; // always using the mouse, so this ding doesn't apply for the pool game.
         
         // Report for each client score except the local player when the player control is unchecked.
         if ( ! ((client.name == 'local') && ( ! gW.dC.player.checked)) ) {
            
            // first, add special bonuses to the winner's score
            if (client.name == m_mostRecentPoolShooter) {
               // Bonus for money-ball shot
               client.score += 50;
               gW.messages['help'].addToIt( "\\ \\  a winning shot, +50", {'additionalTime':2.0});
               
               // Bonus for low-shot count of winning player. Usually a reward for an early money-ball shot. Note that this also rewards you for winning after
               // your opponent pockets balls (a bonus for shot delegation). Only rewarded if no scratches by the winner. This doesn't apply well to 8-ball
               // because you must pocket all balls in your group before doing a money-ball shot. However, 8-ball does have the usual 5-point charge per shot
               // to indirectly motivate efficient shooting.
               if (m_poolWinType != "8-ball") {
                  // typical shot count needed to win game = non-cue ball count
                  if (gW.getDemoVersion().includes('rotation')) {
                     // Simple rotation really needs a full rack to play as intended, so fix the target at 8.
                     var nominalShotsNeeded = 8;
                  } else {
                     // Use this equation to accommodate custom 9-ball racks (with fewer than 9 balls).
                     var nominalShotsNeeded = m_nonCueBallsAtStart;
                  }
                  var nBallBonus = nominalShotsNeeded - client.poolShotCount;
                  if (( ! client.scratchedDuringGame) && (nBallBonus > 0)) {
                     var lowShotCountPointBonus = nBallBonus * 5;
                     client.score += lowShotCountPointBonus;
                     gW.messages['help'].addToIt( "\\ \\  bonus of " + nBallBonus + " balls (5pts/ball) for low-shot-count (" + client.poolShotCount + ") win and no scratch, +" + 
                        lowShotCountPointBonus, {'additionalTime':2.0});
                  }
               }
               
               // Bonus for clean game
               if (( ! client.scratchedDuringGame) && ( ! client.objectBallFoulDuringGame) && ( ! client.safetyShotFoulDuringGame) && ( ! client.mouseStopFoulDuringGame) &&
                   (client.poolShotCount >= 5) && (m_poolTimer_gameDuration_s > 60.0)) {
                  client.score += 50;
                  gW.messages['help'].addToIt( "\\ \\  bonus for clean game (five shots or more) with no fouls or scratches, +50", {'additionalTime':2.0});
               }
               
               // encourage nickname usage
               client.winCount += 1;
               if ((client.winCount > 1) && (client.nickName == null)) {
                  gW.messages['help'].addToIt( "\\ \\  (-:  try using a nickname  :-)", {'additionalTime':0.0});
               }
               
               gW.messages['score'].newMessage( client.nameString() + ' score = ' + client.score, 10.0);
            }
            
            // report for each player
            client.addScoreToSummary( m_poolTimer_gameDuration_s.toFixed(2), gW.getDemoIndex(), false);
         }
      });
      
      lB.reportGameResults();
      // Send a score for each human player to the leader-board. Build leader-board report at the end.
      lB.submitScoresThenReport();
      
      // Open up the multi-player panel so you can see the leader-board report.
      if (!gW.dC.multiplayer.checked) {  
         $('#chkMultiplayer').trigger('click');
      }
      cT.Client.winnerBonusGiven = true;
      m_poolGameOver = true;
      
      gW.messages['help'].addToIt("\\ \\  thanks for playing", {'additionalTime':3.0});
      // Position the game-over announcement below (at a higher y value than) the last line of the help message.
      gW.messages['gameTitle'].loc_px.y = gW.messages['help'].yMax_px() + gW.messages['gameTitle'].lineHeight_px;
      gW.messages['gameTitle'].newMessage( winMessage, 5.0);
   }

   function tripleTap( ts) {
      var now = new Date().getTime();
      var timesince = now - ts.previousTapTime;
      ts.previousTapTime = now;
      // A good short tap interval
      if ((timesince > 0) && (timesince < 300)) {
         ts.tapCount += 1;
         // That's a triple.
         if (ts.tapCount == 3) {
            ts.tapCount = 1;
            return true;
         // Nice double, but not a triple.
         } else {
            return false;
         }
      // Too much time has passed, so reset.
      } else {
         ts.tapCount = 1;
         return false;
      }
   }

   function interpretTouches( e, pars = {}) {
      // These are primitives, not mutable.
      var startOrEnd = uT.setDefault( pars.startOrEnd, null);
      var hostOrClient = uT.setDefault( pars.hostOrClient, null);
      var demoVersionOnHost = uT.setDefault( pars.demoVersionOnHost, null);
      var fromListener = uT.setDefault( pars.fromListener, null);
      
      // The following are references to mutable objects outside of interpretTouches. So, for example, 
      // changes here to mK and cl affect mK and cl outside of this function.
      var mK = uT.setDefault( pars.mK, null);
      var cl = uT.setDefault( pars.cl, null);
      var ts = uT.setDefault( pars.ts, null);
      var raw_2d_px = uT.setDefault( pars.raw_2d_px, null);
      var socket = uT.setDefault( pars.socket, null);
      
      var demoIndexOnHost = demoVersionOnHost.slice(0,1);
      let demoBase = demoVersionOnHost.slice(0,3);
      /*
      let debugString = "startOrEnd=" + startOrEnd + ", hostOrClient=" + hostOrClient + ', fromListener=' + fromListener + ', touch length=' + e.touches.length;
      if (fromListener != 'touchmove') {
         hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
      }
      */
      if (startOrEnd == 'start') {
         /* 
         if ((e.touches.length == 1) && (fromListener != 'touchmove')) {
            // An alternate approach to using touches.length is to use the identifier parameter:
            // Save the first touch id. This is needed to interpret Firefox touch ids because they keep incrementing. For Chrome this first touch id is
            // always 0 (zero). So simply subtracting this from any raw touch id gives the needed relative touch id (for both Chrome and Firefox): 0, 1, 2, 3...
            ts.firstTouchPointID = e.touches[0].identifier;
         }
         var touchIndex = e.changedTouches[0].identifier - ts.firstTouchPointID;  // the relative touch id: 0,1,2,3...
         */
         
         // Create a lock to prevent position changes when 4 or more touches (restarting pool game from touch screen).
         if (e.touches.length >= 4) {
            ts.fourOrMore = true;
         }
         
         var inputDevice = "touchScreen";
         // Use the length of the touches array instead of the identifier parameter...
         var touchIndex = e.touches.length;
         
         // Toggle ball-in-hand state when triple-tap the first touch point. This is like holding
         // down the control key when using a keyboard.
         if ( (fromListener != 'touchmove') && (touchIndex == 1) ) {
            if ( tripleTap( ts) ) {
               if (hostOrClient == 'client') {
                  if (mK['ct'] == 'D') {
                     mK['ct'] = 'U';
                  } else {
                     mK['ct'] = 'D';
                  }
               } else if (hostOrClient == 'host') {
                  if (cl.key_ctrl == 'D') {
                     cl.key_ctrl = 'U';
                     eV.key_ctrl_handler('keyup', cl.name);
                  } else {
                     cl.key_ctrl = 'D';
                     eV.key_ctrl_handler('keydown', cl.name);
                  }
               }
            }
         }
         
         // First touch started: do nothing here, handled elsewhere...
         // (note: cue ball shoots when the first touch point is lifted)
         if (touchIndex == 1) {
         
         // Second touch point: 
         // If playing playing Ghost Ball, lock in a new value for cue-ball speed via the z-key. 
         // If playing projectile games, toggle fine-moves via the b-key.
         } else if ((touchIndex == 2) && (fromListener != 'touchmove')) {
            if (hostOrClient == 'client') {
               if (demoBase == "3.d") {
                  mK['z'] = 'D';
               } else if (['4.e','5.e'].includes( demoBase)) {
                  mK['b'] = 'D';
               } 
               
            } else if (hostOrClient == 'host') {
               if (demoBase == "3.d") {
                  if (cl.key_z == 'U') {
                     togglePoolShotLock( cl);
                     cl.key_z = 'D';
                  }
               } else if (['4.e','5.e'].includes( demoBase)) {
                  eV.key_b_handler('local');
               }   
            }
         
         // Third touch: useful mainly for Bipartisan Hoops, so you can do a ball-in-hand maneuver to get vertical orientation for a bank shot.
         // Works best if 2nd and 3rd touch are done together, toggling between COM and non-COM ball-in-hand.
         } else if ((touchIndex == 3) && (fromListener != 'touchmove')) {
            if (demoVersionOnHost.includes('basketball')) {
               if (hostOrClient == 'client') {
                  // Reverse the "b" toggle issued in touchIndex 2, on the way to this touchIndex 3.
                  mK['b'] = 'U';
                  eVN.handle_sending_mK_data( mK);
                  mK['b'] = 'D';
                  eVN.handle_sending_mK_data( mK);
                  
                  mK['c'] = 'D';
                  mK['ct'] = 'D';
                  console.log("inside touches 3");
                  
               } else if (hostOrClient == 'host') {
                  // Reverse the "b" toggle...
                  eV.key_b_handler('local');
                  
                  eV.key_c_handler('local');
                  cl.key_ctrl = 'D';
                  eV.key_ctrl_handler('keydown', 'local');
               }  
            }
            
         // Forth touch: restart the pool game (e.g. demoIndexOnHost would be the 3 key if playing Ghost Ball)
         } else if (touchIndex == 4) {
            if (hostOrClient == 'client') {
               mK[ demoIndexOnHost] = 'D';
               mK['z'] = 'U';
               
            } else if ((hostOrClient == 'host') && (fromListener != 'touchmove')) {
               dS.demoStart( gW.getDemoIndex());
            }
         }
         
         // Only consider the first touch point for establishing cursor position.
         raw_2d_px.x = e.touches[0].clientX;
         raw_2d_px.y = e.touches[0].clientY;
         
      } else if (startOrEnd == 'end') {
         // Make touchIndex correspond to the start block above.
         var touchIndex = e.touches.length + 1;
         
         // Reset the 4-touch position lock if get down to 0 touch points.
         if (e.touches.length == 0) {
            ts.fourOrMore = false;
         }
         
         // If the first touch point has been lifted: SHOOT the cue ball
         if (touchIndex == 1) {
            if (hostOrClient == 'client') {
               mK['z'] = 'U';
               mK['3'] = 'U';
               mK.MD = false; // shoot it
               
               // The touchScreenUsage_sendCounter value is reset to zero on page load and also a normal re-connect with the client connect button.
               // (The "chat message" here, or ones similar, like sendSocketControlMessage with androidDebug, can be useful in debugging from the cell phone.)
               if ( hC.gb.touchScreenUsage_sendCounter == 0) {
                  socket.emit('chat message', "touch screen in use");
                  hC.gb.touchScreenUsage_sendCounter += 1;
               }
               
            } else if (hostOrClient == 'host') {
               cl.mouseDown = false;
            }
         
         // reset the z (or b) key
         } else if (touchIndex == 2) {
            if (hostOrClient == 'client') {
               if (demoBase == "3.d") {
                  mK['z'] = 'U';
                  mK.MD = 'T'; // T for touch, keep the mouse button down, don't shoot
               } else if (['4.e','5.e'].includes( demoBase)) {
                  mK['b'] = 'U';
                  mK.MD = 'T';
               } 
               
            } else if (hostOrClient == 'host') {
               if (demoBase == "3.d") {
                  cl.key_z = 'U';
                  cl.mouseDown = 'T'; // T for touch...
                  
               } else if (['4.e','5.e'].includes( demoBase)) {
                  // nothing yet...
               } 
            }
            
         } else if (touchIndex == 3) {
            if (demoVersionOnHost.includes('basketball')) {
               if (hostOrClient == 'client') {
                  mK.MD = 'T'; // T for touch, keep the mouse button down, don't shoot
                 
                  mK['c'] = 'U';
                  mK['ct'] = 'U';
               } else if (hostOrClient == 'host') {
                  cl.key_ctrl = 'U';
                  eV.key_ctrl_handler('keyup', 'local');
               }
            }
            
         // reset the number key (demoIndexOnHost) so, for example, ready to restart the pool game
         } else if (touchIndex == 4) {
            if (hostOrClient == 'client') {
               mK[ demoIndexOnHost] = 'U';
               mK.MD = 'T'; // T for touch, don't shoot
            } else if (hostOrClient == 'host') {
               // nothing yet...
            }
         }
         
      } else {
         console.log('catch everything else');
      }
   }

   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      'setCushionCollision': function( val) { m_cushionCollision = val; },
      
      // Methods
      'initializeModule': initializeModule,
      'resetGame': resetGame,
      'resetTableHistory': resetTableHistory,
      'updateGhostBall': updateGhostBall,
      'drawGhostBall': drawGhostBall,
      'drawPathAfterShot': drawPathAfterShot,
      'resetPathAfterShot': resetPathAfterShot,
      'checkForMouseStops': checkForMouseStops,
      'checkPoolGameState': checkPoolGameState,
      'processCueBallFirstCollision': processCueBallFirstCollision,
      'contactNormals': contactNormals,
      'togglePoolShotLock': togglePoolShotLock,
      'updatePoolShotLockedValues': updatePoolShotLockedValues,
      'toggleProjectileForecast': toggleProjectileForecast,
      'poolShot': poolShot,
      'drawPoolBallFeatures': drawPoolBallFeatures,
      'interpretTouches': interpretTouches,
      'getTableCapture': getTableCapture
   };

})();