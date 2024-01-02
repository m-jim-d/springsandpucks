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

// Puck Popper (pP) module
// puckPopper.js
   console.log('pP _*-*_');
// 8:55 PM Fri April 29, 2022

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.pP = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_playerCount = 0;
   var m_npcCount = 0;
   var m_territoryMarked = false;
   var m_puckPopperTimer_s = 0;
   var m_npcSleep = false;
   var m_npcSleepUsage = false;
   var m_clientPucksAtGameStart = 0;
   var m_bulletAgeLimit_ms = 1000;
   
   // module globals for objects brought in by initializeModule
   // (none)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
   }
      
   function activeTTclient() {
      var activeTTclient = false;
      cT.Client.applyToAll( client => {
         if (client.twoThumbsEnabled) activeTTclient = true;
      });
      return activeTTclient;
   }
      
   function getCountHumanPucks() {
      // The number of pucks with human drivers at the start of the game.
      var pucksHumanAtGameStart = 0;
      cT.Client.applyToAll( client => {
         if ( (client.name.slice(0,1) == 'u') || (client.name == 'local') ) {
            if (client.puck) pucksHumanAtGameStart += 1;
         }
      });
      return pucksHumanAtGameStart;
   }   
      
   function preGameSetUp( index) {
      if ( ! m_npcSleep) {
         if (getCountHumanPucks() > 0) {
            // Looks like someone is ready to play. Label this as a game.
            gW.messages['gameTitle'].newMessage("Puck \\Popper", 1.0);
         }
         
         if (index == 7) { 
            // abbreviated help for cannibal in springy chain.
            if (["7.e"].includes( gW.getDemoVersion().slice(0,3))) {
               gW.messages['help'].newMessage("shoot (i, j,l, k)" +   
                                            "\\jet (w, a,d, s)", 3.0);
         
            // If no network clients, assume a beginner is learning the game and provide some help.
            } else if ( ( ! activeTTclient()) && gW.clients['local'].puck) {
               gW.messages['help'].newMessageSeries({
                  1:{'tL_s':2.0, 'message':"Pop the other pucks..."},
                  2:{'tL_s':2.0, 'message':"Use your keyboard to move and shoot..."},
                  3:{'tL_s':5.0, 'message':"move (w, a,d, s)\\  shoot (i, j,l, k)\\    shield (spacebar)\\      find you (?)..."},
                  4:{'tL_s':3.0, 'message':"Place your middle fingers \\  on the \"w\" and \"i\" keys."}
               });
               
            } else {
            }
            
         } else if (index == 8) {
            if ( ( ! activeTTclient()) && gW.clients['local'].puck) {
               gW.messages['help'].newMessage("move (w, a,d, s)   shoot (i, j,l, k)   shield (spacebar)   find you (?)", 3.0);
            } else {
            }
         }
      } else {
         gW.messages['help'].newMessage("Drones are [base,yellow]sleeping[base]. Ctrl-Q to wake them.", 1.5);
      }
   }
   
   /*
   Almost all of the NPC (non playing character) code is in this module. There are a few blocks of NPC related code in the Pin methods, copyThisOne, and deleteThisOne.
   The context there is useful to see what those blocks are doing (so I left them there...).
   */
   
   function attachNavSpring( puck) {
      var navSpringName = "s" + (100 + cP.Puck.nameIndex);
      // Note that instantiation adds the new spring to the spring map.
      var temp = new cP.Spring( puck, gW.aT.pinMap[ puck.pinName], {strength_Npm:8.0, unstretched_width_m:0.1, color:'brown', damper_Ns2pm2:5.0, navigationForNPC:true, 'name':navSpringName});
      puck.navSpringName = temp.name;
   }
   
   function stepTheJetAngle( puck) {
      var spring = gW.aT.springMap[ puck.navSpringName];
      // If this spring still exists.
      if (spring) {
         // Use the end of the spring that's attached to the pin.
         if (spring.spo1.nextPinName) {
            var nextPinName = spring.spo1.nextPinName;
         } else {
            var nextPinName = spring.spo2.nextPinName;
         }
         // Gradually rotate jet to be in the direction of the next pin.
         // Vector between this puck and the next pin.
         var toNextPin_2d_m = puck.position_2d_m.subtract( gW.aT.pinMap[ nextPinName].position_2d_m);
         var angleOfNextPin_deg = toNextPin_2d_m.get_angle();
         var angleOfJet_deg = puck.jet.rel_position_2d_m.get_angle();
         var changeNeeded_deg = angleOfNextPin_deg - angleOfJet_deg;
         
         // Take the short way around.
         if (changeNeeded_deg >  180.0) changeNeeded_deg = changeNeeded_deg - 360;
         if (changeNeeded_deg < -180.0) changeNeeded_deg = changeNeeded_deg + 360;
         
         // Rotate by a percentage in this single step. This will yield a gradual sweep-to-target effect.
         puck.jet.rotateTubeAndFlame( 0.15 * changeNeeded_deg);
      }
   }
   
   function attachNavSpringToNextPin( puck) {
      var spring = gW.aT.springMap[ puck.navSpringName];
      // If this spring still exists.
      if (spring) {
         // Use the end of the spring that's attached to the pin.
         if (spring.spo1.nextPinName) {
            var nextPinName = spring.spo1.nextPinName;
         } else {
            var nextPinName = spring.spo2.nextPinName;
         }
         
         // If there's a pin in the map by that name, attach to it.
         if (gW.aT.pinMap[ nextPinName]) {
            // Move the end of the spring that's attached to the pin.
            if (gW.aT.springMap[ puck.navSpringName].spo1.constructor.name == "Pin")
               gW.aT.springMap[ puck.navSpringName].spo1 = gW.aT.pinMap[ nextPinName];
            else {
               gW.aT.springMap[ puck.navSpringName].spo2 = gW.aT.pinMap[ nextPinName];
            }
            puck.pinName = nextPinName;
         }
      } else {
         console.log('no spring to use.');
      }
   }
   
   function makeNPC_OnSinglePin( nNPCs, pinIndexStart, npcIndexStart, initialLocation_2d_m) {
      // Make multiple NPC clients, each on its own navigation track (single pin). Use editor to add
      // more pins as wanted.
      var pinIndex, pinName, npcIndex, npcName, x_m;
      for (var i = 0, len = nNPCs; i < len; i++) {
         pinIndex = pinIndexStart + i;
         npcIndex = npcIndexStart + i;
         pinName = 'pin' + pinIndex;
         npcName = 'NPC' + npcIndex;
         // Pin is referenced by the NPC puck (so do this before instantiating the puck)
         new cP.Pin( initialLocation_2d_m, {'radius_px':3, 'NPC':true, 'previousPinName':pinName, 'name':pinName, 'nextPinName':pinName});
         // NPC client is referenced by the NPC puck (so do this before instantiating the puck)
         new cT.Client({'name':npcName, 'color':'purple'});
         new cP.Puck( initialLocation_2d_m, new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':npcName, 'linDamp':1.0, 'hitLimit':20, 'pinName':pinName} );
         // Put the next one a little more to the right
         initialLocation_2d_m.x += 1.0;
      }
   }
   
   function makeNPC_OnTwoPins( placement_2d_m) {
      // A 2-pin navigation track for a single client.
      let pinRadius = 3;
      let namePinA = 'pin' + (cP.Pin.nameIndex + 1);
      let namePinB = 'pin' + (cP.Pin.nameIndex + 2);
      let pinA = new cP.Pin( placement_2d_m, {'radius_px':pinRadius, 'NPC':true, 'previousPinName':namePinB, 'name':namePinA, 'nextPinName':namePinB});
      let pinB = new cP.Pin( placement_2d_m.add(new wS.Vec2D( 1.0, 1.0)), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':namePinA, 'name':namePinB, 'nextPinName':namePinA});
      let nameForNPC = 'NPC' + (cT.Client.npcIndex + 1);
      new cT.Client({'name':nameForNPC, 'color':'purple'});
      new cP.Puck( placement_2d_m, new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':nameForNPC, 'linDamp':1.0, 
                                                            'restitution':0.7, 'restitution_fixed':true, 'hitLimit':20, 'pinName':namePinA, 'rayCast_init_deg':0} );
   }
   
   function aimToLead( client) {
      // Point gun along the ray-cast line and lead for target movement. 
      if (client.puck.gun.rayBody) {
         // Vector from the shooting NPC to the target
         var NPC_to_TargetPuck_2d_m = client.puck.gun.rayBody.position_2d_m.subtract( client.puck.position_2d_m);
         var parallel_unit_vector = NPC_to_TargetPuck_2d_m.normal();
         
         // Target's velocity as seen by the shooting NPC (in the NPC reference frame).
         var target_inNPCrf_2d_mps = client.puck.gun.rayBody.velocity_2d_mps.subtract( client.puck.velocity_2d_mps);
         
         // Component of the target's velocity along (parallel to) the line between the shooting NPC and the target.
         var target_parallel_2d_mps = target_inNPCrf_2d_mps.projection_onto( parallel_unit_vector);
         
         if (target_parallel_2d_mps) {
            // Component of target's relative (to shooter) velocity that is perpendicular to the line between the shooting NPC and the target
            var target_perpendicular_2d_mps = target_inNPCrf_2d_mps.subtract( target_parallel_2d_mps);
            var perpendicular_unit_vector = target_perpendicular_2d_mps.normal();
            /*          
            This next line of code is the clever part. Find the angle, at which the 
            bullet needs to fire, such that its perpendicular component matches the 
            perpendicular component of the target. Then, in cases where the parallel 
            component of the bullet is larger than that of the target, the bullet 
            will overtake and hit the target. These words can be represented with a 
            right triangle where the bullet speed is the hypotenuse and the target's 
            perpendicular speed is one of the legs. Use Pythagorean equation to find 
            the parallel component of the bullet velocity vector (the third leg of 
            the triangle). This defines the orientation of the bullet vector. 
            */           
            var bullet_parallelSpeed_mps = Math.sqrt( Math.pow( client.puck.gun.bulletSpeed_mps, 2) - Math.pow( target_perpendicular_2d_mps.length(), 2));
            // The bullet vector (relative to the shooting NPC) needed to intercept the target.
            var bullet_2d_mps = target_perpendicular_2d_mps.add( parallel_unit_vector.scaleBy( bullet_parallelSpeed_mps));
            var bullet_angle_deg = bullet_2d_mps.get_angle();
            
            if (bullet_angle_deg) {
               if (client.puck.gun.rayBody.linDamp > 0.0) {
                  // If the body has some linear damping drag, simply (easiest to) take the average of the leading angle 
                  // and the line-of-sight angle. Otherwise, the leading aim will overshoot the target as it slows
                  // down under drag forces.
                  // x_fraction = 0.5 gives equal weight to both, an average.
                  var x_fraction = 0.5;
                  var gun_angle_deg =  x_fraction * bullet_angle_deg  +  (1 - x_fraction) * client.puck.gun.angleToFoundPuck;
               } else {
                  var gun_angle_deg = bullet_angle_deg;
               }
               client.puck.gun.setTubeAngle(gun_angle_deg);
            }
         }
      } else {
         client.puck.gun.setTubeAngle( client.puck.gun.angleToFoundPuck);
      }
   }
   
   function thinkForNPC( client, deltaT_s) {
      // If a hit is detected, turn the shield on for a while.
      if ((client.puck.inComing) && (client.NPC_shield_timer_s < client.NPC_shield_timer_limit_s)) {
         client.key_space = "D";
         client.NPC_shield_timer_s += deltaT_s;
      } else {
         client.key_space = "U";
         client.NPC_shield_timer_s = 0.0;
         client.puck.inComing = false;
      }
      
      // If found a target.
      if ( ! client.puck.gun.scanning) {
         // Note that thinkForNPC runs every frame, so this aiming adjustment continuously updates
         // during a bullet-firing sequence, adjusting the aim for each bullet that fires. This will
         // give a curved look to the bullet group unless both shooter and target have the same velocity.
         // The gun tube updates its orientation even when not shooting.
         aimToLead( client);
         if (client.NPC_guncooling_timer_s < client.NPC_guncooling_timer_limit_s) {
            // Keep shooting
            client.key_i = "D";
            client.NPC_guncooling_timer_s += deltaT_s;
         } else {
            // Release the i key.
            client.key_i = "U";
            client.NPC_guncooling_timer_s = 0.0;
         }
      } else {
         client.key_i = "U";
      }
      
      // This flag forces a needed update to navSpringOnly_force_2d_N before drawing
      // the jet along the direction of the spring force.
      client.NPC_skipFrame = false;
      
      // Move NPC to the next pin
      if (client.NPC_pin_timer_s < client.NPC_pin_timer_limit_s) {
         client.NPC_pin_timer_s += deltaT_s;
      } else {
         // First aim the jet gradually toward the next pin.
         if (client.NPC_aimStepCount < client.NPC_aimStepCount_limit) {
            stepTheJetAngle( client.puck);
            client.NPC_aimStepCount += 1;
         } else {
            attachNavSpringToNextPin( client.puck);
            client.NPC_aimStepCount = 0;
            client.NPC_pin_timer_s = 0.0;
            client.NPC_skipFrame = true;
         }
      }
      
      // Aim the jet in the direction opposite to the spring force.
      if ( (client.NPC_aimStepCount == 0) && ( ! client.NPC_skipFrame) ) {
         client.puck.jet.rotateJetAndScaleFlameToThis( client.puck.navSpringOnly_force_2d_N.scaleBy(-1));
      }
   }
   
   function createPucksForNetworkClients( canvas, networkPuckTemplate, startingPosAndVels) {
      /*
      Make a controlled puck for each client (that wants one). Copy attributes from
      the host puck or the provided template.
      */
      var position_2d_m, velocity_2d_mps;
      var networkClientIndex = 1;
      
      function randomPandV( position_2d_m, velocity_2d_mps) {
         // Randomize the position as constrained by the boundary of the canvas.
         position_2d_m.x = (wS.meters_from_px( canvas.width) -0.3) * Math.random();
         position_2d_m.y = (wS.meters_from_px( canvas.height)-0.3) * Math.random();
         // Randomize the initial velocity 
         velocity_2d_mps.x = 5.0 * (Math.random() - 0.5);
         velocity_2d_mps.y = 5.0 * (Math.random() - 0.5);
      }
      
      function initializePuckPosAndVel( puckOrTemplate, clientName) {
         if ((networkClientIndex - 1) <= (startingPosAndVels.length - 1)) {
            // Use the array of starting positions
            position_2d_m = startingPosAndVels[ networkClientIndex - 1].position_2d_m;
            velocity_2d_mps = startingPosAndVels[ networkClientIndex - 1].velocity_2d_mps;
         } else {
            randomPandV( position_2d_m, velocity_2d_mps);
         }
         
         new cP.Puck( position_2d_m, velocity_2d_mps, {'color':'black', 'colorSource':true, 'clientName':clientName, 
             'bullet':            puckOrTemplate.bullet,
             'radius_m':          puckOrTemplate.radius_m,
             'hitLimit':          puckOrTemplate.hitLimit,
             'noRecoil':          puckOrTemplate.noRecoil,
             'cannibalize':       puckOrTemplate.cannibalize,
             'linDamp':           puckOrTemplate.linDamp,
             'restitution':       puckOrTemplate.restitution,
             'restitution_fixed': puckOrTemplate.restitution_fixed,
             'friction':          puckOrTemplate.friction,
             'friction_fixed':    puckOrTemplate.friction_fixed
             });
      }
      
      // First, check to make sure there is a puck for the host, if it's requested (checked).
      if (gW.dC.player.checked && !(gW.clients['local'].puck)) {
         // Make the requested puck for the host
         position_2d_m = startingPosAndVels[ networkClientIndex - 1].position_2d_m;
         velocity_2d_mps = startingPosAndVels[ networkClientIndex - 1].velocity_2d_mps;
         new cP.Puck( position_2d_m, velocity_2d_mps, cP.Puck.hostPars);
         networkClientIndex++;
      }
      
      m_clientPucksAtGameStart = 0;
      cT.Client.applyToAll( client => {
         var position_2d_m = new wS.Vec2D(0,0);
         var velocity_2d_mps = new wS.Vec2D(0,0);
         
         if ( (client.name.slice(0,1) == 'u') && (client.player) ) {
            
            // If the host has a puck for keyboard play, use the local puck as a template.
            if (gW.clients['local'].puck) {
               initializePuckPosAndVel( gW.clients['local'].puck, client.name);
                   
            // If the host is using the virtual game pad and a template has been established (e.g. from the 'local' puck in the capture).
            } else if (networkPuckTemplate) {  
               initializePuckPosAndVel( networkPuckTemplate, client.name);
                               
            } else {
               console.log('can not find anything to use as a puck template.');
            }
            
            // Update the TwoThumbs interface to show there is a client puck.
            var control_message = {'from':'host', 'to':client.name, 'data':{'puckPopped':{'value':false}} };
            hC.sendSocketControlMessage( control_message);
            
            // Send out the gun angle of the new puck so that sweep operations on a new puck start out 
            // smoothly (instead seeing a jump-to-sync at the client).
            gunAngleFromHost( client, 0.0, true); // true --> bypasses limits and executes immediately
            // Also sync up the jet angle on the client.
            jetAngleFromHost( client);
            
            // Increment only for network clients (inside the if block)
            networkClientIndex++;
         }
         if (client.puck) m_clientPucksAtGameStart += 1;
      });
   }
   
   function gunAngleFromHost( client, deltaT_s, bypassLimits = false) {
      if (client.puck) {
         if ((client.puck.gun.scopeRotRateFrac != 0) || (bypassLimits)) {
            // No need to send this every frame, so use timer to limit this.
            if ((client.gunAngle_timer_s >= client.gunAngle_timer_limit_s) || (bypassLimits)) {
               var gunAngle = client.puck.gun.rel_position_2d_m.get_angle();
               // If RTC data channel available:
               if (client.rtc.dataChannel && (client.rtc.dataChannel.readyState == 'open') && ( true )) {
                  client.rtc.dataChannel.send( JSON.stringify( {'data':{'gunAngle':gunAngle}} ));
               // Otherwise, send via socket.io
               } else {
                  var control_message = {'from':'host', 'to':client.name, 'data':{'gunAngle':gunAngle} };
                  hC.sendSocketControlMessage( control_message);
               }
               client.gunAngle_timer_s = 0;
            } else {
               client.gunAngle_timer_s += deltaT_s;
            }
         }
      }
   }
   
   function jetAngleFromHost( client) {
      if (client.puck) {
         var jetAngle = client.puck.jet.rel_position_2d_m.get_angle();
         var control_message = {'from':'host', 'to':client.name, 'data':{'jetAngle':jetAngle} };
         hC.sendSocketControlMessage( control_message);
      }
   }
   
   function fenceIsClientColor( clientName) {
      var theyMatch = true;
      cP.Wall.applyToAll( wall => {
         if (wall.fence) {
            if (wall.color != gW.clients[ clientName].color) {
                  theyMatch = false;
            }
         }
      });
      return theyMatch;
   }
   
   function deleteOldandUnhealthy( deltaT_s) {
      cP.Puck.applyToAll( puck => {
         if (puck.gunBullet()) {
            //var age_ms = window.performance.now() - puck.createTime;
            puck.age_ms += deltaT_s * 1000;
            if (puck.age_ms > puck.ageLimit_ms) { 
               // First penalize the shooter if no hits by this bullet.
               if ((!puck.atLeastOneHit) && (!cT.Client.winnerBonusGiven)) {
                  // Make sure the client is still there...
                  if (gW.clients[ puck.clientNameOfShooter]) {
                     // Now the penalty.
                     gW.clients[ puck.clientNameOfShooter].score -= 1;
                  }
               }
               // Then remove it.
               puck.deleteThisOne({});
            }
         } else if (puck.poorHealthFraction >= 1.0) {
            puck.deleteThisOne({});
         }
      });  
   }

   // Note that this check gets called every frame (if running #7 or #8).
   function checkForPuckPopperWinnerAndReport() {
      // Check for a puck-popper winner. Do this check on the pucks because the human clients
      // are not removed when their pucks are popped.
      if ( (m_playerCount == 1) || (( ! gW.dC.friendlyFire.checked) && (m_npcCount == 0)) ) {
         // Get the name of the client scoring the last hit. The check, to see if the winner (last client to produce a hit)
         // is still there, prevents a failed reference (to nickname) if the host uses the mouse to delete the last NPC. Usually, with
         // mouse deletion of the NPC, they are the last hitter, and so the applyToAll loop will run.
         var winnerClientName = gW.getLastClientToScoreHit();
         var winnerDescString = 'scoring winning hit';
         if ( ! gW.clients[ winnerClientName]) {
            // Looks like the last hitting client is not there (host is probably using the mouse for NPC deletes). 
            // There might be multiple players left (if friendly fire is off). So take the highest scorer as the winner.
            var highestScore = -10000;
            cP.Puck.applyToAll( puck => {
               if (puck.clientName) {
                  if (gW.clients[ puck.clientName].score > highestScore) {
                     winnerClientName = puck.clientName;
                     highestScore = gW.clients[ puck.clientName].score;
                  }
               }
            });
            winnerDescString = 'with highest score';
         }
         
         if (gW.clients[ winnerClientName]) {
            var winnerNickName = gW.clients[ winnerClientName].nickName;
         } else {
            // Still having trouble establishing a winner. Let's exit.
            return;
         }
         
         // If the winner is still around (hasn't disconnected)
         if (gW.clients[ winnerClientName] || (winnerClientName == 'Team')) {
            
            if (winnerNickName) {
               var displayName = winnerNickName + ' (' + cT.Client.translateIfLocal( winnerClientName) + ')';
            } else {
               var displayName = cT.Client.translateIfLocal( winnerClientName);
            }
            
            if (m_clientPucksAtGameStart > 1) {
               
               // Give a bonus (only once, not every frame) for winning.
               if ( ! cT.Client.winnerBonusGiven) {
                  cT.Client.winnerBonusGiven = true;
                  gW.clients[ winnerClientName].winCount += 1;
                  
                  // Yes, now add the winner(s) to the summary too. The losers got added when their puck was popped.
                  if (gW.dC.friendlyFire.checked) {
                     // Can only be one puck standing in this case.
                     gW.clients[ winnerClientName].score += 200;
                     gW.clients[ winnerClientName].addScoreToSummary( m_puckPopperTimer_s.toFixed(2), gW.getDemoIndex(), m_npcSleepUsage);
                  } else {
                     // Assign the winning time to all the client pucks on the no-friendly-fire team.
                     cP.Puck.applyToAll( puck => {
                        if (puck.clientName) {
                           gW.clients[ puck.clientName].score += 200;
                           gW.clients[ puck.clientName].addScoreToSummary( m_puckPopperTimer_s.toFixed(2), gW.getDemoIndex(), m_npcSleepUsage);
                        }
                     });
                  }
                  
                  lB.reportGameResults();
                  
                  // Send a score to the leaderboard for each human player. Build leaderboard report at the end.
                  lB.submitScoresThenReport();
                  
                  // Open up the multi-player panel so you can see the leader-board report.
                  if ( ! gW.dC.multiplayer.checked) {  
                     // Note: to directly call the click handler function, toggleMultiplayerStuff, it must be put in
                     // module-level scope, which has been done. So this can be explicitly controlled as follows:
                     //gW.dC.multiplayer.checked = !gW.dC.multiplayer.checked;
                     //toggleMultiplayerStuff();
                     // Another approach is to get at the function via the module-level, gW.dC.multiplayer. The following
                     // are alternate ways to do what the two statements above do. These approaches to not
                     // require toggleMultiplayerStuff to be in the module-level scope.
                     //gW.dC.multiplayer.click();
                     $("#chkMultiplayer").trigger("click");
                  }
                  // only displayed once per win (because this block only runs once per win)
                  gW.messages['help'].resetMessage();
                  
                  if (winnerClientName.includes('NPC')) {
                     var congratsString = "Only one player remaining...";
                     var summaryString = "Computer wins (oh man, that's not good)" +
                                         "\\   color = " + gW.clients[ winnerClientName].color + 
                                         "\\   time = " + m_puckPopperTimer_s.toFixed(2) + "s" +
                                         "\\   score = " + gW.clients[ winnerClientName].score;
                  } else {
                     if (gW.dC.friendlyFire.checked) {
                        var congratsString = "Only one player remaining...";
                        var summaryString = "" + displayName + " wins" + 
                                            "\\   color = " + gW.clients[ winnerClientName].color + 
                                            "\\   time = " + m_puckPopperTimer_s.toFixed(2) + "s" +
                                            "\\   score = " + gW.clients[ winnerClientName].score;
                     } else {
                        var congratsString = "Only good guys remaining...";
                        var summaryString = "The team wins" + 
                                            "\\   name of player " + winnerDescString + " = " + displayName + 
                                            "\\   color of player = " + gW.clients[ winnerClientName].color + 
                                            "\\   time to win = " + m_puckPopperTimer_s.toFixed(2) + "s";
                     }
                  }
                  
                  var theSeries = {
                     1:{'tL_s':2.0, 'message':congratsString},
                     2:{'tL_s':2.5, 'message':"...so that's a win!"},
                     3:{'tL_s':1.0, 'message':"Summary:"},
                     4:{'tL_s':5.0, 'message': summaryString},
                     5:{'tL_s':2.0, 'message':"Reports are in the left panel."},
                     6:{'tL_s':4.0, 'message':"Click the \"multiplayer\" checkbox (or use the m key) \\to toggle back to the help."}};
                  if ( (!winnerClientName.includes('NPC')) && gW.dC.friendlyFire.checked && ( ! m_territoryMarked) ) {
                     Object.assign( theSeries, { 
                        7:{'tL_s':1.0, 'message':"One last thing to try..."},
                        8:{'tL_s':2.5, 'message':"pop any left-over pucks..."},
                        9:{'tL_s':2.0, 'message':"then navigate..."},
                       10:{'tL_s':3.0, 'message':"to bounce your puck off the four walls."}
                     });
                  }
                  Object.assign( theSeries, { 
                     12:{'tL_s':1.0, 'message':"That's it..."},
                     13:{'tL_s':1.0, 'message':"...the end."},
                     15:{'tL_s':1.0, 'message':"."},
                     16:{'tL_s':1.0, 'message':".."},
                     17:{'tL_s':1.0, 'message':"..."},
                     18:{'tL_s':1.0, 'message':"...."},
                     19:{'tL_s':1.0, 'message':"....."},
                     20:{'tL_s':3.0, 'message':"You're still there?"},
                     21:{'tL_s':2.0, 'message':"Till next time."}
                  });
                  gW.messages['win'].color = 'lightgray';
                  gW.messages['win'].newMessageSeries( theSeries);
               }
               
               // Turn off (zero out the message string) the little score display for the local client (if they're the winner).
               if (winnerClientName == 'local') gW.messages['score'].newMessage("", 0.0);
               
               // This marked condition is checked every frame after a win. So use m_territoryMarked to post this
               // 5 second message only once per onset of a marked territory. That way it turns off after 5s.
               if (fenceIsClientColor( winnerClientName)) {
                  if ( ! m_territoryMarked) {
                     gW.messages['lowHelp'].newMessage("...nice job marking your territory...", 5.0);
                     m_territoryMarked = true;
                  }
               } else {
                  m_territoryMarked = false;
               }
            }
         }
      } else if (m_playerCount > 1) {
         let scoreString = "";
         cT.Client.applyToAll( client => { 
            // display score for all surviving human players
            if ((client.puck) && (client.name.slice(0,3) != 'NPC')) {
               scoreString += client.nameString(true) + ': [base,white]' + client.score + '[base]    ';
            }
         });
         gW.messages['score'].newMessage( scoreString, 0.2);
         
         m_puckPopperTimer_s += gW.getDeltaT_s();
         gW.messages['ppTimer'].newMessage( m_puckPopperTimer_s.toFixed(2), 0.2);
      }
   }
   
   
   
   function Shield( puck, pars) {
      dFM.DrawingFunctions.call(this); // Inherit attributes
      
      // Make a (circular) reference to the host puck.
      this.puck = puck;

      // Optional parameters and defaults.
      this.color = uT.setDefault( pars.color, 'lime');

      // Make a direct reference to the client.
      this.client = gW.clients[this.puck.clientName];
            
      this.radius_px = wS.px_from_meters( this.puck.radius_m * 1.15);
      
      this.ON = false;
      this.STRONG = true;
      this.STRONG_timer_s = 0;
      this.STRONG_time_limit_s = 3.0;
      this.CHARGING_timer_s = 0;
      this.CHARGING_time_limit_s = 2.0;
      this.charge_level = 1.0;
   }
   Shield.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods (containing module must load first)
   Shield.prototype.constructor = Shield; // Rename the constructor (after inheriting)
   Shield.prototype.updateState = function( drawingContext, deltaT_s) {
      // Let the client control the state and draw if ON.
      if (this.client.key_space == "D") {
         this.ON = true;
         if (this.STRONG) {
            var dashArray = [ 0];
         } else {
            // Shields are weak.
            var dashArray = [10];
         }
         this.drawCircle( drawingContext, this.puck.position_2d_px, 
            {'borderColor':this.color, 
             'fillColor':'noFill', 
             'borderWidth_px':3, 
             'radius_px':this.puck.radius_px * 1.15,
             'dashArray':dashArray});
      } else {
         this.ON = false;
      }

      // Drain the shield
      if (this.ON && this.STRONG) {
         this.STRONG_timer_s += deltaT_s;  
         this.charge_level = 1.00 - (this.STRONG_timer_s / this.STRONG_time_limit_s);
         if (this.STRONG_timer_s > this.STRONG_time_limit_s) {
            this.STRONG = false;
            this.STRONG_timer_s = 0.0;
         }  
      }
      
      // Recharge the shield only if completely drained.
      if (!this.STRONG) {
         this.CHARGING_timer_s += deltaT_s;
         this.charge_level = this.CHARGING_timer_s / this.CHARGING_time_limit_s;
         if (this.CHARGING_timer_s > this.CHARGING_time_limit_s) {
            this.STRONG = true;
            this.CHARGING_timer_s = 0.0;
         }
      }
      
      // Display the shield timer on the gun tube.
      this.puck.gun.indicatorFraction = this.charge_level;
   }
   


   function Tube( puck, pars) {
      dFM.DrawingFunctions.call(this); // Inherit attributes
      
      // Circular reference back to the puck.
      this.puck = puck;
      
      // Optional parameters and defaults.
      this.initial_angle = uT.setDefault( pars.initial_angle, 20);
      this.indicator = uT.setDefault( pars.indicator, false);

      // Make a direct reference to the client.
      this.client = gW.clients[this.puck.clientName];
      
      // 360 degrees/second  /  60 frames/second = 6 degrees/frame
      this.rotationRate_dps = 240.0; //4.0dpf;
      
      this.tube_color = 'blue';
      this.length_m = 1.05 * this.puck.radius_m;
      this.width_m =  0.30 * this.puck.radius_m;
      this.width_px = wS.px_from_meters( this.width_m);
      
      // Establish the relative-position vector (for the end of the tube) using the length of the tube.
      this.rel_position_2d_m = new wS.Vec2D(0.0, this.length_m);
      this.rel_position_2d_m.set_angle( this.initial_angle);
      this.absPositionOfEnds();
      
      this.indicatorWidth_px = wS.px_from_meters( this.width_m * 0.40);
      this.indicatorFraction = 0.00;
   }
   Tube.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods (containing module must load first)
   Tube.prototype.constructor = Tube; // Rename the constructor (after inheriting)
   Tube.prototype.absPositionOfEnds = function() {
      // Determine the absolute positions of the base and the end of the tube.
      this.base_2d_px = wS.screenFromWorld( this.puck.position_2d_m);
      this.end_2d_m = this.puck.position_2d_m.add( this.rel_position_2d_m);
      this.end_2d_px = wS.screenFromWorld( this.end_2d_m);
   }
   Tube.prototype.absPositionOfIndicator = function() {
      // The starting point will indicate the "amount" of the indicator.
      this.indicatorBase_2d_m = this.puck.position_2d_m.add( this.rel_position_2d_m.scaleBy(1 - this.indicatorFraction));
      this.indicatorBase_2d_px = wS.screenFromWorld( this.indicatorBase_2d_m);
      
      // Draw to the end of the tube.
      this.indicatorEnd_2d_m = this.puck.position_2d_m.add( this.rel_position_2d_m.scaleBy( 1.00));
      this.indicatorEnd_2d_px = wS.screenFromWorld( this.indicatorEnd_2d_m);
   }
   Tube.prototype.rotateTube = function( deg) {
      this.rel_position_2d_m.rotated_by( deg);
   }
   Tube.prototype.setTubeAngle = function( deg) {
      this.rel_position_2d_m.set_angle( deg);
   }
   Tube.prototype.drawTube = function( drawingContext) {      
      this.absPositionOfEnds();
      this.drawLine( drawingContext, this.base_2d_px, this.end_2d_px, {'width_px':this.width_px, 'color':this.tube_color});
      
      if (this.indicator) {
         this.absPositionOfIndicator();
         this.drawLine( drawingContext, this.indicatorBase_2d_px, this.indicatorEnd_2d_px, {'width_px':this.indicatorWidth_px, 'color':this.puck.shield.color});
      }
   }
   
   
   
   function Jet( puck, pars) {
      // The following link has a good explanation of the inheritance techniques used in this Jet (and the Gun) prototype.
      // https://tylermcginnis.com/javascript-inheritance-and-the-prototype-chain/
      //
      // Call the Tube constructor. Bind it to "this" jet. Pass the puck and pars to the constructor and run it. This brings in
      // all the attributes of Tube and makes them accessible in Jet. Note that Tube inherits from DrawingFunctions.
      Tube.call(this, puck, pars);
            
      // Add properties specific to Jet.
      this.width_m  = 0.17 * this.puck.radius_m;
      this.height_m = 1.00 * this.puck.radius_m;
      
      // This jet-flame triangle is oriented like an arrow pointing the positive x direction.
      this.initializeFlame( this.height_m);
      
      // Point the jet flame in the same direction as the tube.
      this.rotateFlame( this.initial_angle);
      
      // Set the tube color to match the client color.
      this.tube_color = this.client.color;
      
      this.flame_color = 'red';
      this.flameEdge_color = 'blue';
      
      // Scaler magnitude of jet thrust force
      this.jet_force_N = 1.3 * this.puck.mass_kg * Math.abs( gW.getG_mps2());
      // Controlled by the Two Thumbs interface.
      this.throttle = 1.0;
      
      this.rotationCounter = 0;
      
      this.noseCone_2d_m = [new wS.Vec2D(0,0),                    new wS.Vec2D(0,-this.width_m),
                            new wS.Vec2D(this.width_m * 2.0, 0),  new wS.Vec2D(0, this.width_m)];
   }
   // Use the Tube prototype as starting point for the Jet (inheritance). This brings
   // in all the methods from Tube.
   Jet.prototype = Object.create( Tube.prototype);
   // Reset the constructor name back to Jet, so it is not left as "Tube" from the inheritance.
   Jet.prototype.constructor = Jet;
   // Define any new methods for Jet.
   Jet.prototype.rotateShape = function( shapeArray_2d_m, degrees) {
      // degrees is the change from the current orientation.
      for (var i = 0, len = shapeArray_2d_m.length; i < len; i++) {
         // Rotate each vertex.
         shapeArray_2d_m[i].rotated_by( degrees);
      }
   }
   Jet.prototype.rotateFlame = function( degrees) {
      this.rotateShape( this.flameTriangle_2d_m, degrees);
   }
   Jet.prototype.rotateTubeAndFlame = function( degrees) {
      // deg is the change from the current orientation.
      this.rotateTube( degrees);
      this.rotateFlame( degrees);
   }
   Jet.prototype.rotateJetToAngle = function( targetAngle_deg) {
      var currentAngle_deg = this.rel_position_2d_m.get_angle();
      this.rotateTubeAndFlame( -currentAngle_deg + targetAngle_deg);
   }
   Jet.prototype.rotateJetAndScaleFlameToThis = function( f_2d_N) {
      // Rotate the tube and jet to be in the same direction as the supplied vector
      var current_deg = this.rel_position_2d_m.get_angle();
      
      // Orient the jet along the x axis so it is simple to scale it. The
      // angle will be 0 after this.
      this.rotateTubeAndFlame( -current_deg);
      
      // Scale the jet flame relative to the length of the supplied vector.
      var height_m = this.height_m * (f_2d_N.length() / this.jet_force_N);
      if (height_m < 0.10) height_m = 0.10;
      this.initializeFlame( height_m);
      
      var target_deg  = f_2d_N.get_angle();
      var change_deg = target_deg - 0;
      
      // Rotate, starting from 0, by this amount.
      this.rotateTubeAndFlame( change_deg);
   }
   Jet.prototype.rotateJetByClient = function( deltaT_s) {
      // The rate, expressed as degrees per second (dps), instead of degrees per frame, is useful for 
      // accommodating the various physics-engine timestep options. 

      // Left/Right pointing control
      if ((this.client.key_d == "D") && (this.client.key_shift != 'D')) {
         this.rotateTubeAndFlame(-this.rotationRate_dps * deltaT_s);
      }
      if ((this.client.key_a == "D") && (this.client.key_ctrl != 'D')) {
         this.rotateTubeAndFlame(+this.rotationRate_dps * deltaT_s);
      }
      
      // For use in stopping the puck...
      if ((this.client.key_s == "D") && (this.client.key_shift != "D") && (this.client.key_s_enabled)) {
         // This rotates the rel_position vector (the tube pointer) by the amount that it differs from the direction of motion.
         // The result being that it flips the tube to be in a direction opposite of the motion.
         // After the first flip, the subsequent s pressed rotate by -90 degrees. The rotationCounter is reset
         // when the jet is used.
         if (this.rotationCounter == 0) {
            this.rotateTubeAndFlame(this.puck.velocity_2d_mps.get_angle() - this.rel_position_2d_m.get_angle());
         } else {
            this.rotateTubeAndFlame(-90);
         }
         this.rotationCounter += 1;
         this.client.key_s_enabled = false;
      }
      if ((this.client.key_s == "U") && (!this.client.key_s_enabled)) {
         this.client.key_s_enabled = true;
      }
   }
   Jet.prototype.initializeFlame = function( height_m) {
      // This jet-flame triangle is oriented like an arrow pointing the positive x direction.
      this.flameTriangle_2d_m = [new wS.Vec2D(0,0),        new wS.Vec2D(0,-this.width_m),
                                 new wS.Vec2D(height_m,0), new wS.Vec2D(0, this.width_m)];
   }
   Jet.prototype.displaceShapeForRendering = function( shapeArray_2d_m, offSetVector_2d_m) {
      // Before you draw a shape, you have to know where it should appear on the screen. Return a
      // rendering array (in pixels) that has those vector addition results.
      var shapeArray_2d_px = [];
      for (var i = 0, len = shapeArray_2d_m.length; i < len; i++) {
         // Calculate where the vertices would need to be so as to appear (render) on the end of the tube.
         var p_2d_m = offSetVector_2d_m.add( shapeArray_2d_m[i]);
         var p_2d_px = wS.screenFromWorld( p_2d_m);
         // Put it in the triangle array.
         shapeArray_2d_px.push( p_2d_px);
      }
      return shapeArray_2d_px;
   }
   Jet.prototype.drawFlame = function( drawingContext) {
      // Draw flame at the end of the tube.
      var flameShape_2d_px = this.displaceShapeForRendering( this.flameTriangle_2d_m, this.end_2d_m);
      this.drawPolygon( drawingContext, flameShape_2d_px, {'borderColor':this.flameEdge_color,'borderWidth_px':3,'fillColor':this.flame_color});
   }
   Jet.prototype.drawNoseCone = function( drawingContext) {
      // The nose cone is processed with only rotation and displacement, no shape
      // elongation like with the jet flame. So there is no call to a function like
      // initializeFlame, that facilitates the flame shape change.
      
      // rotate nose cone to match tube
      var currentAngle_deg = this.noseCone_2d_m[2].get_angle();
      var targetAngle_deg = this.rel_position_2d_m.get_angle() + 180;
      this.rotateShape( this.noseCone_2d_m, (targetAngle_deg - currentAngle_deg));
      
      // Draw nose cone at the opposite side of the puck from the jet tube.
      var offset_2d_m = this.puck.position_2d_m.subtract( this.rel_position_2d_m);
      var noseConeShape_2d_px = this.displaceShapeForRendering( this.noseCone_2d_m, offset_2d_m);
      
      var lightColors = hC.clientLightColors; // an array
      var fillColor = ( lightColors.includes( this.tube_color) ) ? 'black':'white';
      this.drawPolygon( drawingContext, noseConeShape_2d_px, {'borderColor':this.tube_color, 'borderWidth_px':2, 'fillColor':fillColor} );
   }
   Jet.prototype.update = function( deltaT_s) {
      // Note, for NPC clients, orientation is established in the clients thinkForNPC method.
      // rotateJetAndScaleFlameToThis is called there to point the jet in the direction opposite to the navigation-spring force.
      // Jet flame is always on for NPCs (unless floating free from navigational track).
      
      // Jet flame is controlled to be on/off for human (non NPC) users
      if (this.client.name.slice(0,3) != 'NPC') {
         // Respond to client controls to rotate the Tube and Jet.
         this.rotateJetByClient( deltaT_s);
         
         // Fire the jet flame: if on (w key down), draw it, and calculate jet forces.
         if (this.client.key_w == "D") {
            this.puck.jet_force_2d_N = this.rel_position_2d_m.scaleBy( -this.jet_force_N * this.throttle / this.length_m);
            // Set the length of the jet flame to be proportional to the strength of the jet.
            this.rotateJetAndScaleFlameToThis( this.puck.jet_force_2d_N.scaleBy(-1));
            // If the jet is used, reset the rotation event counter.
            this.rotationCounter = 0;
         } else {
            this.puck.jet_force_2d_N = this.rel_position_2d_m.scaleBy( 0);
         }
      }
   }
   Jet.prototype.draw = function( drawingContext) {
      if (this.client.name.slice(0,3) == 'NPC') {
         if (!gW.dC.editor.checked && !this.puck.disableJet) {
            this.drawTube( drawingContext);
            this.drawFlame( drawingContext);
         }
      // Jet flame is controlled to be on/off for human (non NPC) users
      } else {
         // Always draw the tube and nose cone.
         this.drawTube( drawingContext);
         this.drawNoseCone( drawingContext);
         
         // Fire the jet flame: if on (w key down), draw it, and calculate jet forces.
         if (this.client.key_w == "D") {
            this.drawFlame( drawingContext);
         }
      }
   }
   
   
   
   function Gun( puck, pars) {
      Tube.call(this, puck, pars); // Inherit attributes from Tube (see details in Jet)
      
      this.tube_color = uT.setDefault( pars.tube_color, 'white');
      
      // Add properties specific to Gun.
      this.width_m  = 0.17 * this.puck.radius_m;
      this.height_m = 1.00 * this.puck.radius_m;

      // This overrides the rotationRate_dps inherited from the tube.
      this.rotationRate_dps = 90.0; //1.5dpf
      this.bulletSpeed_mps = 7.0;
      this.bulletCountLimit = 5;
      
      this.bulletWaitTimer_ms;
      this.timeBetweenBullets_ms = 70; //70
      
      this.rayCastLineLength_m = pars.rayCastLineLength_m; //always provided when a new gun is made for the host's puck.
      this.rayCast_init_deg = uT.setDefault( pars.rayCast_init_deg, 0.0);
      // Orient this along the x-axis, zero degrees.
      this.rayCastLine_2d_m = new wS.Vec2D(this.rayCastLineLength_m, 0);
      this.rayCastLine_2d_m.rotated_by( this.rayCast_init_deg);
      
      this.rayRotationRate_dps = uT.setDefault( pars.rayRotationRate_dps, 80);
      this.scanning = uT.setDefault( pars.scanning, true);
      this.rayBody = null;
      this.angleToFoundPuck = 0;
      
      // Attributes controlled only by the Two Thumbs interface (not the keyboard).
      this.scopeRotRateFrac = 0.0;
      this.scopeTrigger = 'U';
      this.scopeBreak = false;
      this.breakTimer_ms = 0;
      this.breakTimer_limit_ms = 100;
   }
   Gun.prototype = Object.create( Tube.prototype); // Inherit methods from Tube.
   Gun.prototype.constructor = Gun; // Reset the constructor name back to Gun
   // Define any new methods for Gun.
   Gun.prototype.rotateGunByClient = function( deltaT_s) {
      // The Rate, degrees per frame (dpf), gives the degrees of rotation in one frame.
      
      // Left/Right pointing control using the keyboard
      if ((this.client.key_l == "D") && (this.client.key_alt != "D") && (this.client.key_ctrl != "D")) {
         this.rotateTube(-this.rotationRate_dps * deltaT_s);
      }
      if (this.client.key_j == "D") {
         this.rotateTube(+this.rotationRate_dps * deltaT_s);
      }
      
      // Similar, but using the Two-Thumbs interface.
      if (this.scopeRotRateFrac != 0.0) {
         this.rotateTube((-1) * this.rotationRate_dps * this.scopeRotRateFrac * deltaT_s);
      }
      
      if ((this.client.key_k == "D") && (this.client.key_k_enabled)) {
         if (this.client.key_shift == "D") {
            this.rotateTube(+90.0);
         } else {
            this.rotateTube(-90.0);
         }
         
         this.client.key_k_enabled = false;
      }
      if ((this.client.key_k == "U") && (!this.client.key_k_enabled)) {
         this.client.key_k_enabled = true;
      }
   }
   Gun.prototype.fireBullet = function() {      
      // The bullet velocity as seen from the puck (dividing by length produces a normalized vector)
      var relativeVel_2D_mps = this.rel_position_2d_m.scaleBy( this.bulletSpeed_mps/this.length_m);
      
      // Absolute velocity of bullet as seen from the world.
      var absoluteVel_2D_mps = relativeVel_2D_mps.add( this.puck.velocity_2d_mps);
      
      // Setting bullet friction, to be near 0.0, and bullet restitution, to be near 1.0, 
      // gives simple and symmetric collision behavior when the bullets hit the walls.
      
      // Set the group index of the bullets to equal the negative value assigned by default to the
      // host puck. That will prevent bullets (from this gun) from colliding with each other and the host puck.
      
      // Note that the target-leading algorithm for the NPCs is more accurate if you use puck.position_2d_m as compared to end_2d_m (tube end).
      // So, for NPC clients, this will fire the bullet (to fly free) starting from the base of the tube not starting from the end of the tube.
      if ((this.client.name.slice(0,3) == 'NPC') || (this.puck.cannibalize)) {
         var bulletStartPosition_2d_m = this.puck.position_2d_m;
      } else {
         var bulletStartPosition_2d_m = this.end_2d_m;
      }
      
      // Don't allow shots if cannibalized down to the minimum puck size.
      if ( ! (this.puck.cannibalize && (this.puck.radius_px < cP.Puck.minRadius_px))) {
      
         // Make this bullet with the same groupIndex as the host puck (so no collisions with the host).
         let bulletAgeLimit_ms = (this.client.bulletAgeLimit_ms) ? this.client.bulletAgeLimit_ms : m_bulletAgeLimit_ms;
         var bullet = new cP.Puck( bulletStartPosition_2d_m, absoluteVel_2D_mps, 
            {'radius_m':0.04, 'bullet':true, 'color':this.client.color, 'colorSource':true, 'borderWidth_px':1, 'clientNameOfShooter':this.client.name, 
             'ageLimit_ms':bulletAgeLimit_ms, 'restitution_fixed':true, 'restitution':this.puck.bullet_restitution, 'friction_fixed':true, 'friction':0.0,
             'groupIndex':this.puck.groupIndex});
         
         if (this.puck.cannibalize) {
            /*
            The mass of the host puck can be reduced to account for creating and launching the bullet.
            Area = Pi * r^2;
            r_host = (A_host/Pi) ^ 0.5;
            */
            let area_host = Math.PI * Math.pow( this.puck.radius_m, 2);
            let area_bullet = Math.PI * Math.pow( bullet.radius_m, 2);
            let r_host_after = Math.pow( ((area_host - area_bullet) / Math.PI), 0.5);
            let radius_scaling_factor = r_host_after / this.puck.radius_m;
            this.puck.interpret_editCommand('thinner', radius_scaling_factor); // yes, thinner will reduce the radius
         }
         
         // Calculate the recoil impulse from firing the gun (opposite the direction of the bullet).
         if ((this.scopeTrigger == 'U') && ( ! this.puck.noRecoil)) {
            this.puck.impulse_2d_Ns.addTo( relativeVel_2D_mps.scaleBy(-1 * bullet.mass_kg));
         }
      }
      
   }
   Gun.prototype.start_BulletStream = function() {
      this.bulletCount = 1;
      this.bulletStream = 'on';
      // This allows the gun to immediately fire the first bullet.
      this.bulletWaitTimer_ms = 0;
   }
   Gun.prototype.stop_BulletStream = function() {
      this.bulletStream = 'off';
   }
   Gun.prototype.update_BulletStream = function( deltaT_s) {
      // If ok to fire, do so.
      if ( (this.bulletStream == 'on') && 
           ((this.bulletWaitTimer_ms >= this.timeBetweenBullets_ms) || (this.bulletWaitTimer_ms == 0.0)) && 
           (this.bulletCount <= this.bulletCountLimit) ) {
         
         // If the shields are down.
         if ( ! this.puck.shield.ON) {
            this.fireBullet();
         }
         // Reset the timer.
         this.bulletWaitTimer_ms = 0;
         this.bulletCount += 1;
      }
      this.bulletWaitTimer_ms += deltaT_s * 1000;
   }
   Gun.prototype.drawRayCastLine = function( drawingContext, deltaT_s) {
      // Update the angle of the ray.
      if (this.client.name.slice(0,3) == 'NPC') {
         if (this.scanning && ( ! m_npcSleep)) {
            this.rayCastLine_2d_m.rotated_by( +this.rayRotationRate_dps * deltaT_s);
         }
      } else {
         this.rayCastLine_2d_m.matchAngle(this.rel_position_2d_m); 
      }
      
      var ray_end_2d_m = this.puck.position_2d_m.add( this.rayCastLine_2d_m);

      var rayBody = null;
      // Set an endpoint in case nothing is hit in the raycast.
      var raycast_end_2d_m = ray_end_2d_m;
      var minFraction = 1.0;

      gW.b2d.world.RayCast( function( fixture, point, outputNormal, fraction) {
         
         var fixtureBody = gW.tableMap.get( fixture.GetBody());
         /*
         This "if" block updates the ray cast results only if it finds something closer.
         I didn't expect to have to do this when returning "fraction". But without
         this block, the callback will run multiple times and the last fixture to run it
         will determine the point vector. Last object always wins. So this block makes
         the closest object (along the ray) win out in identifying the fixture and point.
         */
         let gunBullet = (fixtureBody.constructor.name == "Puck") && fixtureBody.gunBullet();
         if ( (fraction < minFraction) && ( ! (gunBullet || (fixtureBody.constructor.name == "Pin")) ) ) {
            minFraction = Math.min(fraction, minFraction);
            rayBody = fixtureBody;
            raycast_end_2d_m = wS.Vec2D_from_b2Vec2( point);
         }
         return fraction;
      }, wS.b2Vec2_from_Vec2D( this.puck.position_2d_m), wS.b2Vec2_from_Vec2D( ray_end_2d_m) );
      
      if (rayBody && (rayBody.constructor.name == "Puck")) {
         // Make a reference to this rayBody on the gun
         this.rayBody = rayBody;
         //this.rayBody.color = 'green';
         this.scanning = false;
         
         // Point the ray at the center of the found puck.
         this.angleToFoundPuck = this.rayBody.position_2d_m.subtract( this.puck.position_2d_m).get_angle();
         this.rayCastLine_2d_m.set_angle( this.angleToFoundPuck);
      
      // This time check keeps you from sweeping during the bullet stream. Something about the small bullets
      // and their speed that yields occasional errors from the raycast.
      } else if (this.client.NPC_guncooling_timer_s >= this.client.NPC_guncooling_timer_limit_s) {
         this.scanning = true;
         this.rayBody = null;
      }
      
      // Draw it.
      var raycast_end_2d_px = wS.screenFromWorld( raycast_end_2d_m);
      this.drawLine( drawingContext, this.puck.position_2d_px, raycast_end_2d_px, {'width_px':1, 'color':'yellow', 'dashArray':[4]});
   }
   Gun.prototype.update = function( deltaT_s) {
      // Respond to client controls to rotate the Gun.
      this.rotateGunByClient( deltaT_s);
      
      // Fire the gun:
      // This method gets called every frame. If the i key is down, you
      // don't want it to fire a bullet every frame. The following logic allows one
      // call to fireBullet and then disables the i key. To enable, must release 
      // the key to the up position.
      if ((this.client.key_i == "D") || (this.scopeTrigger == "D")) {
         if (this.client.key_i_enabled) {
            this.start_BulletStream();
            this.client.key_i_enabled = false;
         }
         this.update_BulletStream( deltaT_s);
         
         // Reseting this counter here allows you to compensate for recoil with the s key (align opposite the motion) 
         // then w (some jet).
         this.puck.jet.rotationCounter = 0;
         
      } else if (((this.client.key_i == "U") && (this.scopeTrigger == "U")) && (!this.client.key_i_enabled)) {
         this.stop_BulletStream();
         this.client.key_i_enabled = true;
      }
   }
   Gun.prototype.draw = function( drawingContext, deltaT_s) {
      // Always draw the tube.
      this.drawTube( drawingContext);
      
      // Cast and draw ray based on gun orientation.
      var scopeRayOn = (this.scopeTrigger == "D") || (this.scopeRotRateFrac != 0);
      if ((this.client.name.slice(0,3) == 'NPC') || scopeRayOn) {
         this.drawRayCastLine( drawingContext, deltaT_s);
      }
      
      // The scope break is a feature of the TwoThumbs virtual game pad.
      if (this.scopeBreak) {
         if (this.breakTimer_ms > this.breakTimer_limit_ms) {
            this.breakTimer_ms = 0;
            this.scopeBreak = false;
         } else {
            this.drawCircle( drawingContext, this.puck.position_2d_px, 
               {'borderColor':'red', 'fillColor':'noFill', 
                'borderWidth_px': this.puck.radius_px * 0.2,
                'radius_px':      this.puck.radius_px * 1.2 } );
            this.breakTimer_ms += deltaT_s * 1000;
         }
      }
   }
   
   
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      'Shield': Shield,
      'Jet': Jet,
      'Gun': Gun,
      
      
      // Variables
      'setPlayerCount': function( val) { m_playerCount = val; },
      'addToPlayerCount': function( val) { m_playerCount += val; },
      
      'setNpcCount': function( val) { m_npcCount = val; },
      'addToNpcCount': function( val) { m_npcCount += val; },
      
      'setPuckPopperTimer_s': function( t_s) { m_puckPopperTimer_s = t_s; },
      
      'setNpcSleep': function( val) { m_npcSleep = val; },
      'getNpcSleep': function() { return m_npcSleep; },
      
      'setNpcSleepUsage': function( val) { m_npcSleepUsage = val; },
      'getNpcSleepUsage': function() { return m_npcSleepUsage; },
      
      'setBulletAgeLimit_ms': function( val) { m_bulletAgeLimit_ms = val; },
      
      // Methods
      'attachNavSpring': attachNavSpring,
      'makeNPC_OnSinglePin': makeNPC_OnSinglePin,
      'makeNPC_OnTwoPins': makeNPC_OnTwoPins,
      'preGameSetUp': preGameSetUp,
      'thinkForNPC': thinkForNPC,
      'createPucksForNetworkClients': createPucksForNetworkClients,
      'gunAngleFromHost': gunAngleFromHost,
      'jetAngleFromHost': jetAngleFromHost,
      'deleteOldandUnhealthy': deleteOldandUnhealthy,
      'checkForPuckPopperWinnerAndReport': checkForPuckPopperWinnerAndReport
   };

})();