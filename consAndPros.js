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

// Constructors and Prototypes (cP) module
// consAndPros.js 
   console.log('cP _*-*_');
// 11:44 AM Sat December 9, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.cP = (function() {
   "use strict";   

   /////////////////////////////////////////////////////////////////////////////
   ////
   ////  Prototypes for Pucks, Springs, Joints, Pins, and Walls
   ////
   /////////////////////////////////////////////////////////////////////////////
      
   // For use in sound field, demo #2.
   function PuckTail( pars) {
      dFM.DrawingFunctions.call(this); // inherit
      this.firstPoint_2d_m = uT.setDefault( pars.firstPoint_2d_m, new wS.Vec2D(1.0, 1.0));
      this.initial_radius_m = uT.setDefault( pars.initial_radius_m, 1.0);
      
      // ppf: pixels per frame
      this.propSpeed_ppf_px = uT.setDefault( pars.propSpeed_ppf_px, 1);
      this.length_limit =     uT.setDefault( pars.length_limit, 25);
      
      this.color =            uT.setDefault( pars.color, 'lightgray');
      
      this.rainbow =          uT.setDefault( pars.rainbow, false);
      if (this.rainbow) {
         if (pars.hsl) {
            this.hsl = new uT.HSLColor( pars.hsl);
         } else {
            this.hsl = new uT.HSLColor( {'hue':0, 'saturation':80, 'lightness':70, 'steppingKey':'hue', 'stepSize':4} );
         }
      }
      
      this.machSwitch = uT.setDefault( pars.machSwitch, false);
      this.machValue = uT.setDefault( pars.machValue, 0);
            
      // The wait (time in seconds) before making a pure white color ping.
      this.markerPingTimerLimit_s = uT.setDefault( pars.markerPingTimerLimit_s, 1.0);
      this.markerPingTimer_s = 0.0;
      
      this.values = [];
   }
   PuckTail.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   PuckTail.prototype.constructor = PuckTail; // Rename the constructor (after inheriting)
   PuckTail.prototype.machCalc = function( puckSpeed_mps) {
      var waveSpeed_mps = wS.meters_from_px(this.propSpeed_ppf_px) * gW.getFrameRate();
      var mach =  puckSpeed_mps / waveSpeed_mps;
      return mach;
   }
   PuckTail.prototype.speedFromMach = function() {
      var waveSpeed_mps = wS.meters_from_px(this.propSpeed_ppf_px) * gW.getFrameRate();
      var puckSpeed_mps = waveSpeed_mps * this.machValue;
      return puckSpeed_mps;
   }
   PuckTail.prototype.update = function( drawingContext, newPoint_2d_m, deltaT_s) {
      var lineColor;
      
      if (this.rainbow) {
         // hue,   saturation, lightness
         // 0-360, 0-100%,     0-100%
         this.pingColor = this.hsl.colorString();
         this.hsl.step();
         
      } else {
         this.pingColor = this.color;
      }
         
      // Color one ring specially so to see it propagation better.
      this.markerPingTimer_s += deltaT_s;
      if ((this.markerPingTimer_s > this.markerPingTimerLimit_s) && !this.rainbow) {
         this.pingColor = 'white';
         this.markerPingTimer_s = 0.0;
      }
      
      // This is a reminder that an adjustable emit frequency doesn't render well. 
      // Best to emit once per frame as is done in the single line that follows.
      
      // Ping out a new ring (once per frame). Each value is a position vector and radius.
      this.values.push({'p_2d_px':wS.screenFromWorld( newPoint_2d_m), 'r_px':wS.px_from_meters(this.initial_radius_m), 'color':this.pingColor});
      
      // Remove the oldest value if needed.
      if (this.values.length > this.length_limit) {
         this.values.shift();
      }
      
      // Loop through the tail.
      for (var t = 0, len = this.values.length; t < len; t++) {
         
         // Expand the radius of the ping (like a sound wave propagating). Note: doing this addition in pixels (not meters)
         // to yield a more consistent and pleasing rendering.
         this.values[t].r_px += this.propSpeed_ppf_px;
         
         // Draw the sound circle (make the 'white' marker ring even more visible, using red, if single stepping).
         if (gW.getSingleStep() && (this.values[t].color == 'white')) {
            lineColor = 'red'; //#008080 cyan yellow magenta orange
         } else {
            lineColor = this.values[t].color;
         } 
         this.drawCircle( drawingContext, this.values[t].p_2d_px, {'radius_px':this.values[t].r_px, 'borderColor':lineColor, 'borderWidth_px':2, 'fillColor':'noFill'});
      }
   }



   function Puck( position_2d_m, velocity_2d_mps, pars) {
      dFM.DrawingFunctions.call(this); // Inherit attributes
      this.parsAtBirth = pars;
      
      // for removing old bullets
      this.ageLimit_ms = uT.setDefault( pars.ageLimit_ms, null);
      this.bullet = uT.setDefault( pars.bullet, false);
      this.bulletIndication = uT.setDefault( pars.bulletIndication, false);
      
      this.jello = uT.setDefault( pars.jello, false);
      
      this.clientName = uT.setDefault( pars.clientName, null);
      if (this.clientName) {
         // Don't allow a client puck if there is not already a client. Client first, then puck.
         // Throwing an error forces an exit from this constructor.
         if (!(gW.clients[this.clientName])) {
            var errorObj = new Error('Constructor declines to create a puck for a non-existent client.');
            errorObj.name = 'from Puck constructor';
            throw errorObj;
         }
         pP.incrementPlayerCount( +1);
         if (this.clientName.includes('NPC')) pP.addToNpcCount( +1);
         pP.updateTeamInfo( this.clientName, 1);
      }
      
      let result = assignName( pars.name, Puck.nameIndex, "puck", "puckMap");
      this.name = result.name;
      Puck.nameIndex = result.index;
      
      this.nameTip_timerLimit_s = 2.0;
      this.nameTip_timer_s = 0.0;
      
      this.lowBallFinderCircle_timerLimit_s = 3.0;
      this.lowBallFinderCircle_timer_s = this.lowBallFinderCircle_timerLimit_s;
      
      gW.aT.puckMap[this.name] = this;
      
      // Position of Center of Mass (COM)
      this.position_2d_m = wS.Vec2D_check( position_2d_m);
      // Position (in pixels).
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
      
      // Velocity of COM
      this.velocity_2d_mps = wS.Vec2D_check( velocity_2d_mps);
      
      // Parse out the parameters in the pars object. The values on the right
      // are the defaults (used if pars value is undefined).
      this.color = uT.setDefault( pars.color, "DarkSlateGray");
      
      if (this.color.includes('hsl')) {
         if (typeof pars.hsl !== "undefined") {
            this.hsl = new uT.HSLColor( pars.hsl);
            this.color = this.hsl.colorString();
         } else {
            this.hsl = new uT.HSLColor();
            this.hsl.parse( this.color);
         }
      }
      
      this.borderColor = uT.setDefault( pars.borderColor, "white");
      this.shape = uT.setDefault( pars.shape, "circle");
      this.imageID = uT.setDefault( pars.imageID, null);
      this.imageScale = uT.setDefault( pars.imageScale, 1.0);
      this.colorSource = uT.setDefault( pars.colorSource, false);
      //this.colorExchange = uT.setDefault( pars.colorExchange, false);
      this.drawDuringPE = uT.setDefault( pars.drawDuringPE, true); // PE = pause erase
      
      this.density = uT.setDefault( pars.density, 1.5);
      // Linear damping is like a drag force from translational movement through a surrounding fluid.
      // Note that springs have the attribute drag_c, with an effect similar to linDamp.
      this.linDamp = uT.setDefault( pars.linDamp, 0.0);
      // Rotational drag
      this.angDamp = uT.setDefault( pars.angDamp, 0.0);
      this.hitLimit = uT.setDefault( pars.hitLimit, 10);
      
      this.createTail = uT.setDefault( pars.createTail, false);
      this.tail = null;
      
      // www.iforce2d.net/b2dtut/collision-filtering
      // For client pucks, assign a negative group index that is based on the puck's name
      // This group index can be used to prevent collisions with bullets (having the same negative group index) 
      // coming from a gun hosted by this puck.
      if (this.clientName) {
         this.groupIndex = -this.name.slice(4)-1000;
      } else {
         this.groupIndex = uT.setDefault( pars.groupIndex, 0);
      }
      // The following are defaults for Box2D.
      this.categoryBits = uT.setDefault( pars.categoryBits, 0x0001);
      this.maskBits = uT.setDefault( pars.maskBits, 0xFFFF);
      
      // Rotational state
      this.angle_r = uT.setDefault( pars.angle_r, 0);
      this.angularSpeed_rps = uT.setDefault( pars.angularSpeed_rps, 0);
      this.angleLine = uT.setDefault( pars.angleLine, true);
      
      this.borderWidth_px = uT.setDefault( pars.borderWidth_px, 3);
      
      // Put a reference to this puck in the client.
      if (this.clientName) {
         gW.clients[this.clientName].puck = this;
      }
      
      this.age_ms = 0;
      //this.createTime = window.performance.now();
      
      // Note that a call to setGravityRelatedParameters() may override the restitution and friction settings
      // in what follows unless they have been "fixed" (set to be constant).
      
      // Restitution (elasticity) of the object in collisions
      if (typeof pars.restitution === 'undefined') {
         if (gW.getG_ON()) {
            this.restitution = Puck.restitution_gOn;                
         } else {
            this.restitution = Puck.restitution_gOff;
         }
      } else {
         this.restitution = pars.restitution;
      }
      // Option to fix restitution to be independent of the g toggle.
      this.restitution_fixed = uT.setDefault( pars.restitution_fixed, false);
      
      // Friction (tangential tackiness) of the object in collisions
      if (typeof pars.friction === 'undefined') {
         if (gW.getG_ON()) {
            this.friction = Puck.friction_gOn;
         } else {
            this.friction = Puck.friction_gOff;
         }
      } else {
         this.friction = pars.friction;
      }
      // Option to fix friction to be independent of the g toggle.
      this.friction_fixed = uT.setDefault( pars.friction_fixed, false);
      
      // Dimensions
      this.radius_m = uT.setDefault( pars.radius_m, 1.0);
      this.aspectR = uT.setDefault( pars.aspectR, 1.0);
      this.half_height_m = uT.setDefault( pars.half_height_m, null);
      this.half_width_m = uT.setDefault( pars.half_width_m, null);
      
      if (this.shape == 'circle') {
         this.radius_px = wS.px_from_meters( this.radius_m);
      
      // Rectangular
      } else {
         // Height and width given explicitly.
         if (this.half_height_m) {
            this.half_width_px = wS.px_from_meters( this.half_width_m);
            this.half_height_px = wS.px_from_meters( this.half_height_m);
         
         // Aspect ratio given.
         } else {
            this.half_width_m = this.radius_m * this.aspectR;
            this.half_width_px = wS.px_from_meters( this.half_width_m);
            
            this.half_height_m = this.radius_m;
            this.half_height_px = wS.px_from_meters( this.half_height_m);
         }
         
         if (this.imageID) {
            var img = document.getElementById( this.imageID);
            let image_aspectRatio = img.width / img.height;
            // Use the image shape and puck height to establish the puck width.
            this.half_width_m = this.half_height_m * image_aspectRatio;
            this.half_width_px = wS.px_from_meters( this.half_width_m);
         }
      }
      
      // Tail
      if (this.createTail) {
         var tailInitialState = {'firstPoint_2d_m':this.position_2d_m, 'initial_radius_m':this.radius_m};
         // Add any specified characteristics.
         if (pars.tail) {
            /*
            For pucks that don't have tails, set the creatTail flag to true in a 
            capture. Then run the capture. That will instantiate the puck with a tail 
            having editable attributes (in the capture).
            */
            let allTailPars = Object.assign({}, tailInitialState, pars.tail);
            this.tail = new PuckTail( allTailPars);
            
         } else {
            this.tail = new PuckTail( tailInitialState);
         }
         
         if (this.tail.machSwitch) {
            // Calculate the puck velocity based on the specified Mach number.
            var temp_v_2d_mps = new wS.Vec2D(0, this.tail.speedFromMach());
            temp_v_2d_mps.matchAngle( this.velocity_2d_mps);
            this.velocity_2d_mps = temp_v_2d_mps;
         }
      }
      
      this.tempInhibitExtForce = false;
      
      this.nonCOM_2d_N = [];
      
      this.sprDamp_force_2d_N = new wS.Vec2D(0.0,0.0);
      // This vector is needed for aiming the NPC's navigation jets.
      this.navSpringOnly_force_2d_N = new wS.Vec2D(0.0,0.0);
      this.jet_force_2d_N = new wS.Vec2D(0.0,0.0);
      this.impulse_2d_Ns = new wS.Vec2D(0.0,0.0);
      
      // Puck-popper features
      this.gun = null, this.jet = null;
      this.rayCastLineLength_m = uT.setDefault( pars.rayCastLineLength_m, 3.5);
      this.rayCast_init_deg = uT.setDefault( pars.rayCast_init_deg, 0);
      this.rayRotationRate_dps = uT.setDefault( pars.rayRotationRate_dps, 80);
      // Disables and hides the jet
      this.disableJet = uT.setDefault( pars.disableJet, false);
      this.noRecoil = uT.setDefault( pars.noRecoil, false);
      this.cannibalize = uT.setDefault( pars.cannibalize, false);
      this.bullet_restitution = uT.setDefault( pars.bullet_restitution, 0.92);
      // If a bullet puck never hits another puck, this stays false.
      this.atLeastOneHit = false;
      // It identifies the owner of this (bullet) puck.
      // (so you can't shoot yourself in the foot)
      this.clientNameOfShooter = uT.setDefault( pars.clientNameOfShooter, null);
      this.hitCount =  0;
      this.poorHealthFraction = 0;
      // Keep track of who shot the most recent bullet to hit this puck.
      this.whoShotBullet = null;
      this.flash = false;
      this.inComing = false;
      this.flashCount = 0;
      
      // Navigation spring (not generally the name of any attached spring). There can be only
      // one navigation spring.
      if (this.clientName && this.clientName.includes('NPC')) {
         this.navSpringName = null;
         this.pinName = uT.setDefault( pars.pinName, null);
         // If there's named pin and it still exists...
         if (this.pinName && (gW.aT.pinMap[ this.pinName])) {
            this.disableJet = false;
            pP.attachNavSpring( this);
         } else {
            this.disableJet = true;
         }
      }
      
      // Ghost-pool features
      this.spotted = false;
      // With network players involved, this choke is used to prevent more than one client from trying to make direct movements (like mouse-drag rotation).
      // This is the name of the first client to start a direct-movement on a puck.
      this.firstClientDirectMove = null;
      
      // Local selection point where candidate springs are to be attached.
      this.selectionPoint_l_2d_m = new wS.Vec2D(0,0);
      
      this.deleted = false;
      
      // All parameters should be set above this point. 
      
      this.b2d = null;
      this.create_Box2d_Puck();
      // Create a reference back to this puck from the b2d puck.
      // Note that a Map allows any type of object for the key!
      gW.tableMap.set(this.b2d, this);
      
      if (this.clientName) {
         // Add client controls and give each control a reference to this puck.
         this.jet = new pP.Jet(this, {'initial_angle':-20});
         this.gun = new pP.Gun(this, {'initial_angle':200, 'indicator':true, 'tube_color':'gray', 
             'rayCast_init_deg':this.rayCast_init_deg, 'rayRotationRate_dps':this.rayRotationRate_dps, 'rayCastLineLength_m':this.rayCastLineLength_m});
      }
      this.shield = new pP.Shield(this, {'color':'yellow'});
   }
   Puck.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   Puck.prototype.constructor = Puck; // Rename the constructor (after inheriting)
   Puck.nameIndex = 0;
   // Note: these gravity-related defaults are typically set to non-Null values in demoStart (in gwModule).
   Puck.restitution_default_gOn = null, Puck.restitution_default_gOff = null;
   Puck.restitution_gOn = null,         Puck.restitution_gOff = null;
   Puck.friction_default_gOn = null,    Puck.friction_default_gOff = null;
   Puck.friction_gOn = null,            Puck.friction_gOff = null;
   
   Puck.g_2d_mps2 = null;
   Puck.hostPars = {'radius_m':0.30, 'color':'black', 'colorSource':true, 'clientName':'local', 'hitLimit':20, 'bullet_restitution':0.85, 'linDamp':1.0};
   Puck.minRadius_px = 9; // limits cannibalization
   Puck.applyToAll = function ( doThis) {
      for (var puckName in gW.aT.puckMap) {
         var puck = gW.aT.puckMap[ puckName];
         doThis( puck);
      }
   }
   Puck.deleteAll = function() {
      cT.Client.applyToAll( client => client.puck = null);
      Puck.applyToAll( puck => {
         gW.tableMap.delete( puck.b2d);
         if (puck.b2d) gW.b2d.world.DestroyBody( puck.b2d);
         // Tell clients that their puck is gone.
         if ((puck.clientName) && (puck.clientName != 'local')) {
            var control_message = {'from':'host', 'to':puck.clientName, 'data':{'puckPopped':{'value':true}} };
            hC.sendSocketControlMessage( control_message);
         }
      });
      jM.initializeModule();
      gW.aT.puckMap = {};
      Puck.nameIndex = 0;
      pP.setPlayerCount( 0);
      pP.setNpcCount( 0);
   }
   Puck.findCenterOfMass = function() {
      // mass-weighted center of all pucks (COM)
      let com_2d_m = new wS.Vec2D(0,0);
      let mass_total_kg = 0;
      Puck.applyToAll( puck => {
         com_2d_m = com_2d_m.add( puck.position_2d_m.scaleBy( puck.mass_kg));
         mass_total_kg += puck.mass_kg;
      });
      com_2d_m = com_2d_m.scaleBy( 1.0 / mass_total_kg);
      return com_2d_m;
   }
   Puck.drawSystemCenterOfMass = function( drawingContext) {
      // The inherited drawing functions aren't available here, so using dF.
      
      // draw circle and cross hairs at SCM if more than one puck
      if (Object.keys( gW.aT.puckMap).length > 1) {
         let center_2d_px = wS.screenFromWorld( Puck.findCenterOfMass());
         dF.drawMark( drawingContext, center_2d_px);
      }
   }
   Puck.prototype.inMultiSelect = function() {
      return (this.name in gW.hostMSelect.map);
   }
   Puck.prototype.deleteThisOne = function( pars) {
      var deleteMode = uT.setDefault( pars.deleteMode, 'fromBullet');
      
      // Add this player's score to the summary.
      if (this.clientName) gW.clients[this.clientName].addScoreToSummary('', gW.getDemoIndex(), pP.getNpcSleepUsage());
      
      // But first, give credit to the owner of the bullet that last hit you.
      // Ignore old bullets that are being removed. Don't give any credit for
      // deletion by the editor. Make sure the client is still there before
      // changing its score.
      if ((! this.bullet) && (deleteMode != 'fromEditor')) {
         if (( ! cT.Client.winnerBonusGiven) && (gW.clients[this.whoShotBullet])) {
            // Give 100 for client and drone pucks, 50 for regular pucks.
            if (this.clientName) {
               gW.clients[this.whoShotBullet].score += 100;
            } else {
               gW.clients[this.whoShotBullet].score += 50;
            }
         }
      }
      
      // JavaScript uses garbage collection. Deleting a puck involves
      // mainly nullifying all references to the puck. (Also removing references
      // from the puck.)
      
      // Note that springs are checked, in the updateAirTable function, to
      // see if either of the two objects it is attached to has been deleted.
      // If so, the spring is deleted. So that's not needed here.
      
      this.deleted = true;
      this.jet = null;
      this.gun = null;
      this.shield = null;
      
      // Sound effect
      if (! this.bullet) gW.sounds['highPop'].play();
      
      // For pucks that are driven by clients (users or NPC)
      if (this.clientName) {
         if (this.clientName == 'local') {
            // Must keep the local client. Just null out the puck reference in the local client.
            gW.clients[this.clientName].puck = null;
         } else {
            // Recently decided to turn off (for now) the client disconnect when the client puck gets
            // destroyed in a game of Puck Popper. So the following line is commented and then added
            // the next line where the puck on the client is nulled.
            //deleteRTC_onClientAndHost( this.clientName);
            gW.clients[this.clientName].puck = null;
            
            // Tell the client that his puck has been popped.
            var control_message = {'from':'host', 'to':this.clientName, 'data':{'puckPopped':{'value':true}} };
            hC.sendSocketControlMessage( control_message);
            
            // Remove the client if it's an NPC.
            if (this.clientName.slice(0,3) == 'NPC') {
               delete gW.clients[ this.clientName];
               pP.addToNpcCount( -1);
            }
         }
         pP.incrementPlayerCount( -1);
         pP.updateTeamInfo( this.clientName, -1);
      }
      
      // Filter out any reference to this jello puck in the jelloPuck array.
      if (this.jello) {
         jM.removeDeletedPucks();
      }
      
      // Delete the corresponding Box2d object.
      gW.tableMap.delete( this.b2d);
      gW.b2d.world.DestroyBody( this.b2d);
      
      // Remove this puck from our puck map.
      delete gW.aT.puckMap[ this.name];
      
      // ...and from the multi-select map.
      gW.hostMSelect.removeOne( this);
   }
   Puck.prototype.copyThisOne = function( pars) {
      // If the position is not specified in pars, put the copy at the same position as the original.
      var position_2d_m = uT.setDefault( pars.position_2d_m, this.position_2d_m);
      
      // Make a copy of the mutable objects that are passed into the Puck constructor.
      var p_2d_m =          Object.assign({}, position_2d_m);
      var v_2d_mps =        Object.assign({}, this.velocity_2d_mps);
      var parsForNewBirth = Object.assign({}, this.parsAtBirth);
      
      // Make sure the name is nulled so the auto-naming feature is used in the constructor.
      parsForNewBirth.name = null;
      // Don't allow any network client or NPC features.
      parsForNewBirth.clientName = null;
      parsForNewBirth.pinName = null;
      
      /*
      Update pars to reflect any edits or state changes. For example,
      this loop, for the first element in the array, does the following:
      parsForNewBirth.angle_r = this.angle_r;
      */
      var parsToCopy = ['angle_r','angularSpeed_rps','friction','restitution','linDamp','angDamp','bullet_restitution','jello'];
      for (var i = 0, len = parsToCopy.length; i < len; i++) {
         parsForNewBirth[ parsToCopy[i]] = this[ parsToCopy[i]];
      }
      
      if (this.shape == 'circle') {
         parsForNewBirth.radius_m = this.radius_m;
      } else {
         parsForNewBirth.half_height_m = this.half_height_m;
         parsForNewBirth.half_width_m = this.half_width_m;
      }
      
      // If this is a drone puck, make a new NPC client for the copy.
      if (this.clientName && (this.clientName.slice(0,3) == 'NPC')) {
         // Sync the navigation timer of the copy to that of the original.
         // Note: instantiating with the current NPC name will increment the NPC counter (and the name).
         var theClientForTheCopy = new cT.Client({'name':this.clientName, 'color':'purple', 
                                                  'NPC_pin_timer_s':gW.clients[this.clientName].NPC_pin_timer_s,
                                                  'NPC_pin_timer_limit_s':gW.clients[this.clientName].NPC_pin_timer_limit_s});
         // Add the client name to the birth parameters for the puck.
         parsForNewBirth.clientName = theClientForTheCopy.name;
      }
      
      // Reset the group index so the copy of a client puck will collide with the original.
      // Added this to deal with copies of client pucks that have a negative group index (that prevents collisions with their bullets, self shooting).
      // Want to be able to copy a client's puck but have it collide normally. Without this statement,
      // 7b, or any PP capture, would produce a copy that would not collide with the source puck.
      if (this.clientName) parsForNewBirth.groupIndex = 0;
      
      // A copy of an NPC client puck will be fully outfitted (a client name is provided). 
      // A copy of regular client puck will be only a puck shell (no client name).
      var newPuck = new Puck( p_2d_m, v_2d_mps, parsForNewBirth);
      if (newPuck.jello) jM.addPuck( newPuck);
      
      return newPuck;
   }
   Puck.prototype.updateState = function() {
      this.getPosition();
      this.getVelocity();
      
      this.getAngle();
      this.getAngularSpeed();
   }   
   Puck.prototype.setPosition = function( pos_2d_m, angle_deg) {
      this.position_2d_m = pos_2d_m;
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
      this.b2d.SetPosition( pos_2d_m);
      
      this.velocity_2d_mps = new wS.Vec2D(0.0,0.0);
      this.b2d.SetLinearVelocity( new wS.Vec2D(0.0,0.0));
      
      this.angularSpeed_rps = 0.0;
      this.b2d.SetAngularVelocity( this.angularSpeed_rps);
      
      this.b2d.SetAngle( angle_deg * (Math.PI/180.0));
   }
   Puck.prototype.create_Box2d_Puck = function() {
      var bodyDef = new b2DW.BodyDef;
      bodyDef.type = b2DW.Body.b2_dynamicBody;
      
      // Create the body and a fixture.
      this.b2d = gW.b2d.world.CreateBody( bodyDef);
      this.b2d.CreateFixture( this.define_fixture( {}) );
      
      // Set the state: position and velocity (angle and angular speed).
      this.b2d.SetPosition( this.position_2d_m);
      this.b2d.SetLinearVelocity( this.velocity_2d_mps);
      this.b2d.SetAngle( this.angle_r);
      this.b2d.SetAngularVelocity( this.angularSpeed_rps);
      
      // Use the mass and moment of inertia calculated by box2d.
      this.mass_kg = this.b2d.GetMass();
      this.inertia_kgm2 = this.b2d.GetInertia();
      /*
      // just a check...
      let my_inertia_kgm2;
      if (this.shape == "circle") {
         // I = (m/2) * r^2
         my_inertia_kgm2 = (1/2) * this.mass_kg * (this.radius_m)**2;
      } else {
         // I = (m/12) * (h^2 + w^2)^2
         my_inertia_kgm2 = (1/12) * this.mass_kg * ((this.half_height_m * 2)**2 + (this.half_width_m * 2)**2);
      }
      console.log("mOI=" +  this.inertia_kgm2 + "," + my_inertia_kgm2);
      */
      
      this.b2d.SetLinearDamping( this.linDamp);
      this.b2d.SetAngularDamping( this.angDamp);
      this.b2d.SetBullet( this.bullet);
      //this.b2d.SetSleepingAllowed( false);
      
      this.b2d.m_fixtureList.SetFriction( this.friction);
      this.b2d.m_fixtureList.SetRestitution( this.restitution);
      
   }
   Puck.prototype.modify_Box2d_BodyAndFixture = function( fixture, pars) {
      // "fixture" can be either a created fixture object or a fixture definition (for use in creation).
      
      // Note that the default behavior is to have all scaling factors at 1.0 which only updates the box2d attributes
      // to correspond to those of the Puck object.
      
      this.restitution_scaling = uT.setDefault( pars.restitution_scaling, 1.0);
      this.friction_scaling = uT.setDefault( pars.friction_scaling, 1.0);
      this.linDamp_scaling = uT.setDefault( pars.linDamp_scaling, 1.0);
      this.angDamp_scaling = uT.setDefault( pars.angDamp_scaling, 1.0);
      
      // Adjust elasticity (bounciness).
      if (this.restitution_scaling != 1.0) {
         // If restitution is zero, bump it up a little so the scaling factor has something to work with.
         if (this.restitution == 0.0) this.restitution = 0.01;
         // Apply the scaling factor.
         this.restitution *= this.restitution_scaling;
         // Keep it between 0.0 and 1.0.
         if (this.restitution > 1.00) this.restitution = 1.0;
         if (this.restitution < 0.01) this.restitution = 0.0;
         
         // Keep this new restitution value independent of the gravity toggle.
         this.restitution_fixed = true;
         
         gW.messages['help'].newMessage("[base,yellow]" + this.name + "[base] restitution = " + this.restitution.toFixed(4), 0.5);
      }
      // If this fixture has been created, then use Set function.
      if (fixture.SetRestitution) {
         fixture.SetRestitution( this.restitution);
      } else {
         fixture.restitution = this.restitution;
      }
      
      // Adjust friction (surface tackiness).
      if (this.friction_scaling != 1.0) {
         // If friction is zero, bump it up a little so the scaling factor has something to work with.
         if (this.friction == 0.0) this.friction = 0.01;
         // Apply the scaling factor.
         this.friction *= this.friction_scaling;
         // Stop at zero.
         if (this.friction < 0.01) this.friction = 0.0;
         
         // Keep this new friction value independent of the gravity toggle.
         this.friction_fixed = true;
         
         gW.messages['help'].newMessage("[base,yellow]" + this.name + "[base] friction = " + this.friction.toFixed(4), 0.5);
      }
      // If this fixture has been created, then use Set function.
      if (fixture.SetFriction) {
         fixture.SetFriction( this.friction);
      } else {
         fixture.friction = this.friction;
      }
      
      // Adjust linear damping (damping from fluid drag).
      if (this.linDamp_scaling != 1.0) {
         // If linear damping is zero, bump it up a little so the scaling factor has something to work with.
         if (this.linDamp == 0.0) this.linDamp = 0.01;
         // Apply the scaling factor.
         this.linDamp *= this.linDamp_scaling;
         // Stop at zero.
         if (this.linDamp < 0.01) this.linDamp = 0.0;
         gW.messages['help'].newMessage("[base,yellow]" + this.name + "[base] drag coefficient = " + this.linDamp.toFixed(4), 0.5);
      }
      // Note: linearDamping is a body property (not fixture property)
      this.b2d.SetLinearDamping( this.linDamp);
      
      // Adjust angular damping (damping from fluid drag).
      if (this.angDamp_scaling != 1.0) {
         // If angular damping is zero, bump it up a little so the scaling factor has something to work with.
         if (this.angDamp == 0.0) this.angDamp = 0.01;
         // Apply the scaling factor.
         this.angDamp *= this.angDamp_scaling;
         // Stop at zero.
         if (this.angDamp < 0.01) this.angDamp = 0.0;
         gW.messages['help'].newMessage("[base,yellow]" + this.name + "[base] rotational drag coefficient = " + this.angDamp.toFixed(4), 0.5);
      }
      // Note: AngularDamping is a body property (not fixture property)
      this.b2d.SetAngularDamping( this.angDamp);
   }
   Puck.prototype.define_fixture = function( pars) {
      // Note that the default behavior is to have all scaling factors at 1.0 which only updates the box2d attributes
      // to correspond to those of the Puck object.
      this.width_scaling = uT.setDefault( pars.width_scaling, 1.0);
      this.height_scaling = uT.setDefault( pars.height_scaling, 1.0);
      this.radius_scaling = uT.setDefault( pars.radius_scaling, 1.0);
      
      // Create a circular or polygon dynamic box2d fixture.
      var fixDef = new b2DW.FixtureDef;
      fixDef.density = this.density;

      // Adjust some of the attributes of the fixture definition.
      this.modify_Box2d_BodyAndFixture( fixDef, pars);
      
      fixDef.filter.groupIndex = this.groupIndex;
      fixDef.filter.categoryBits = this.categoryBits;
      fixDef.filter.maskBits = this.maskBits;
      
      if (this.shape == 'circle') {
         // Apply the radius scaling factor.
         this.radius_m *= this.radius_scaling;
         this.radius_px = wS.px_from_meters( this.radius_m);
         /* 
         Don't let it get too small (except for gun bullets). 
         Note this chokes off an editing series in a discontinuous way. So this choke is not allowed
         for a shooting puck in cannibalize mode. In that case, size restrictions must be done at time
         of shooting (see the restrictions in fireBullet in the puckPopper module). Otherwise the size 
         reduction won't agree with the size of the bullet.
         */
         if ( (this.radius_px < Puck.minRadius_px) && ( ! this.gunBullet()) && ( ! this.cannibalize) && ( ! gW.getPiCalcs().enabled) ) {
            this.radius_px = Puck.minRadius_px;
            this.radius_m = wS.meters_from_px( this.radius_px);
         }
         
         // Don't let client pucks get so big that their bullets can collide with the body of their ship.
         if (this.clientName) {
            if (this.radius_m > this.parsAtBirth.radius_m) {
               this.radius_m = this.parsAtBirth.radius_m;
               this.radius_px = wS.px_from_meters( this.radius_m);
            }
         }
         
         fixDef.shape = new b2DW.CircleShape( this.radius_m);
      
      // Rectangular (polygon) shapes
      } else {
         // Apply the scaling factors to the current width and height.
         this.half_width_m *= this.width_scaling;
         this.half_height_m *= this.height_scaling;
         
         this.half_width_px = wS.px_from_meters( this.half_width_m);
         // Don't let it get too skinny because it becomes hard to select.
         if (this.half_width_px < 3) {
            this.half_width_px = 3;
            this.half_width_m = wS.meters_from_px( this.half_width_px);
         }
         
         this.half_height_px = wS.px_from_meters( this.half_height_m);
         if (this.half_height_px < 3) {
            this.half_height_px = 3;
            this.half_height_m = wS.meters_from_px( this.half_height_px);
         }
         
         fixDef.shape = new b2DW.PolygonShape;
         // Make it a rectangle.
         fixDef.shape.SetAsBox(this.half_width_m, this.half_height_m);
      }
      
      return fixDef;
   }
   Puck.prototype.interpret_editCommand = function( command, sf = null) {
      // For editing puck characteristics:
      
      // sf (specific factor) is used to override the default scaling factors.
      
      // Note: to modify the fixture dimensions you must delete
      // the old one and make a new one. The m_fixtureList linked list always
      // points to the most recent addition to the linked list. If there's only
      // one fixture, then m_fixtureList is a reference to that single fixture.
      
      var width_factor = 1.0;
      var height_factor = 1.0;
      var restitution_factor = 1.0;
      var friction_factor = 1.0;
      var drag_factor = 1.0;
      var angDrag_factor = 1.0;
      
      gW.aT.hack['pwsEdits'] = true;
      
      if (command == 'wider') {
         width_factor = (sf) ? sf : 1.1;
      } else if (command == 'thinner') {
         width_factor = (sf) ? sf : 1.0/1.1;
         
      } else if (command == 'taller') {
         height_factor = (sf) ? sf : 1.1;
      } else if (command == 'shorter') {
         height_factor = (sf) ? sf : 1.0/1.1;
         
      } else if (command == 'moreDamping') {
         restitution_factor = (sf) ? sf : 1.0/1.05;
      } else if (command == 'lessDamping') {
         restitution_factor = (sf) ? sf : 1.05;
      
      } else if (command == 'moreFriction') {
         friction_factor = (sf) ? sf : 1.05;
      } else if (command == 'lessFriction') {
         friction_factor = (sf) ? sf : 1.0/1.05;
      
      } else if (command == 'moreDrag') {
         drag_factor = (sf) ? sf : 1.05;
      } else if (command == 'lessDrag') {
         drag_factor = (sf) ? sf : 1.0/1.05;
      
      } else if (command == 'moreAngDrag') {
         angDrag_factor = (sf) ? sf : 1.05;
      } else if (command == 'lessAngDrag') {
         angDrag_factor = (sf) ? sf : 1.0/1.05;
      
      } else if (command == 'noChange') {
         // don't change anything.
      }
      
      if (['wider','thinner','taller','shorter'].includes( command)) {
         // Changes to the dimensions of the fixture require the fixture to be deleted and re-created.
         this.b2d.DestroyFixture( this.b2d.m_fixtureList);
         
         if (this.shape == 'circle') {
            // Use either left/right or up/down to change the circle radius.
            // Note that adjustAttachments uses x,y factors, even for circular pucks. They must be set to be equal.
            if (width_factor != 1.0) { 
               height_factor = width_factor;
            } else if (height_factor != 1.0) { 
               width_factor = height_factor;
            }
            this.b2d.CreateFixture( this.define_fixture({'radius_scaling':width_factor}));
         } else {
            console.log("height factor = " + height_factor);
            this.b2d.CreateFixture( this.define_fixture({'width_scaling':width_factor, 'height_scaling':height_factor}));
         }
         
         // Update the mass and moment of inertia.
         this.mass_kg = this.b2d.GetMass();
         this.inertia_kgm2 = this.b2d.GetInertia();
         
         if ((height_factor != 1.0) || (width_factor != 1.0)) {
            
            if (this.shape == "circle") {
               var dimensionsReport = "\\  radius = " + this.radius_m.toFixed(3) + " m";
            } else {
               var dimensionsReport = "\\  half width, half height = " + this.half_width_m.toFixed(3) + ", " + this.half_height_m.toFixed(3) + " m";
            }
            // inhibit this message when a sf factor is provided (like when a shooting puck is in cannibalize mode)
            if ( ! sf) gW.messages['help'].newMessage("[base,yellow]" + this.name + "[base] mass = " + this.mass_kg.toFixed(3) + " kg" + dimensionsReport, 1.0);
         }
         
         // This step (after deleting and recreating the fixture) keeps the pucks from falling (penetrating) into the floor when gravity is on.
         // It's an odd buggy behavior that only lasts a few frames and then the engine seems to realize the object should be colliding with the floor.
         // This call to SetPosition somehow gets the collisions working immediately after the fixture violence. Surprising that this body procedure is necessary 
         // since it was the fixture not the body, that was deleted.
         this.b2d.SetPosition( this.position_2d_m);
         
      } else {
         // Non-dimensional changes can be made directly to the box2d body and fixture attributes.
         let scalingFactors = {'restitution_scaling':restitution_factor, 'friction_scaling':friction_factor, 'linDamp_scaling':drag_factor, 'angDamp_scaling':angDrag_factor};
         this.modify_Box2d_BodyAndFixture( this.b2d.m_fixtureList, scalingFactors);
      }
      
      // As the puck is resized, adjust attachment points, and multiselect points.
      adjustAttachments( this, width_factor, height_factor);
            
      // Update the puck tail radius.
      if (this.tail) {
         this.tail.initial_radius_m = this.radius_m;
      }
   }
   Puck.prototype.gunBullet = function() {
      return (this.bullet && this.ageLimit_ms);
   }
   Puck.prototype.regularBullet = function() {
      return (this.bullet && ( ! this.ageLimit_ms));
   }
   Puck.prototype.getPosition = function() {
      this.position_2d_m = wS.Vec2D_from_b2Vec2( this.b2d.GetPosition());
   }
   Puck.prototype.worldPoint = function( localPoint_2d) {
      return wS.Vec2D_from_b2Vec2( this.b2d.GetWorldPoint( localPoint_2d));
   }
   Puck.prototype.getVelocity = function() {
      // COM velocity
      this.velocity_2d_mps = wS.Vec2D_from_b2Vec2( this.b2d.GetLinearVelocity());
   }
   Puck.prototype.getAngle = function() {
      // COM angle (radians)
      this.angle_r = this.b2d.GetAngle();
   }   
   Puck.prototype.getAngularSpeed = function() {
      // COM angular speed (radians per second)
      this.angularSpeed_rps = this.b2d.GetAngularVelocity();
   }  
   Puck.prototype.angularMomentum_Orbital = function() {
      // separation of the puck center from the axis of angular momentum
      let r_2d_m = this.position_2d_m.subtract( m_EpL.angularAxis_2d_m);
      // Lo = m * (r x v)
      return this.mass_kg * r_2d_m.cross( this.velocity_2d_mps);
   }  
   Puck.prototype.angularMomentum_Spin = function() {
      // Originally was going to calculate the moments of inertia, then decided to use box2d.
      // So, leaving this here as documentation...
      /*
      let spinAngularMomentum;
      // Ls = I * omega
      if (this.shape == "circle") {
         // Ls = (m/2) * r^2 * omega
         spinAngularMomentum = (1/2) * this.mass_kg * (this.radius_m)**2 * this.angularSpeed_rps;
      } else {
         // Ls = (m/12) * (h^2 + w^2)^2 * omega
         spinAngularMomentum = (1/12) * this.mass_kg * ((this.half_height_m * 2)**2 + (this.half_width_m * 2)**2) * this.angularSpeed_rps;
      }
      */
      let spinAngularMomentum = this.inertia_kgm2 * this.angularSpeed_rps;
      return spinAngularMomentum;
   }
   Puck.prototype.energyKinetic_rotational = function() {
      return (0.5) * this.inertia_kgm2 * this.angularSpeed_rps**2;
   }
   Puck.prototype.energyKinetic_translational = function() {
      return (0.5) * this.mass_kg * this.velocity_2d_mps.length_squared();
   }
   Puck.prototype.potentialEnergy = function() {
      let pe = (gW.getG_ON()) ? this.mass_kg * gW.getG_mps2() * this.position_2d_m.y : 0;
      return pe;
   }
   Puck.prototype.drawClientName = function( drawingContext, deltaT_s, pars = {}) {
      this.stayOn = uT.setDefault( pars.stayOn, false);
      
      if ((this.nameTip_timer_s < this.nameTip_timerLimit_s) || this.stayOn) {
         this.nameTip_timer_s += deltaT_s;
         
         let font = uT.setDefault( pars.font, "20px Arial");
         let teamFont = uT.setDefault( pars.teamFont, "18px Arial");
         let color = uT.setDefault( pars.color, 'lightgray');
         
         let nickName;
         if (gW.clients[this.clientName].nickName) {
            nickName = gW.clients[this.clientName].nickName;
         } else {
            nickName = cT.Client.translateIfLocal(this.clientName); 
         }
         
         drawingContext.font = font;
         drawingContext.fillStyle = color;
         drawingContext.textAlign = "center";
         let x_px = this.position_2d_px.x;
         
         // Draw nick name (over the puck)
         var y_px = this.position_2d_px.y - this.radius_px - 4;
         drawingContext.fillText( nickName, x_px, y_px);
         
         // Draw team name (inside the puck)
         let teamName = gW.clients[this.clientName].teamName;
         if (teamName) {
            drawingContext.font = teamFont;
            let lineHeight_px = parseInt( teamFont.substring(0,3)) * 1.30;
            y_px = this.position_2d_px.y - this.radius_px + lineHeight_px;
            drawingContext.fillText( teamName, x_px, y_px); 
         }
      }
   }      
   Puck.prototype.drawImage = function( drawingContext, imageID, imageScale, alpha, rotateWithPuck=false) {
      var img = document.getElementById( imageID);
      
      let imageWidth_px, imageHeight_px, offset_x_px, offset_y_px;
      if (this.shape == 'circle') {
         imageWidth_px = (this.radius_px * 2) * imageScale;
         imageHeight_px = imageWidth_px;
         
         // (my) offset is the distance from center to top left edge of image: half width and half height.
         offset_x_px = imageWidth_px/2.0;
         offset_y_px = offset_x_px;
         
      } else {
         imageWidth_px = (this.half_width_px * 2) * imageScale;
         imageHeight_px = (this.half_height_px * 2) * imageScale;
         
         // (my) offset is the distance from center to top left edge of image: half width and half height.
         offset_x_px = imageWidth_px/2.0;
         offset_y_px = imageHeight_px/2.0;
      }
      
      drawingContext.globalAlpha = alpha;
      if (rotateWithPuck) {
         // Must translate before doing the rotation
         drawingContext.translate( this.position_2d_px.x, this.position_2d_px.y);
         drawingContext.rotate( -this.angle_r);
         drawingContext.drawImage( img, -offset_x_px, -offset_y_px, imageWidth_px, imageHeight_px);
         drawingContext.rotate( this.angle_r);
         drawingContext.translate( -this.position_2d_px.x, -this.position_2d_px.y);
         
      } else {
         //                             left edge--------------------------, top edge---------------------------,
         drawingContext.drawImage( img, this.position_2d_px.x - offset_x_px, this.position_2d_px.y - offset_y_px, imageWidth_px, imageHeight_px);
      }
      drawingContext.globalAlpha = 1.00;
   }
   Puck.prototype.drawStripe = function( drawingContext, pars={}) {
      // Draw and fill the curved areas that define the outer edge (the background) of the stripe.
      
      let outsideColor = uT.setDefault( pars.outsideColor, 'lightgray');
      let changeFromRadius_px = uT.setDefault( pars.changeFromRadius_px, 0);
      let width = uT.setDefault( pars.width, 0.20); // 0.05: thin stripe, 0.30: stripe almost covers puck
      let stripeAngle_r = uT.setDefault( pars.stripeAngle_r, 0);
      let trackPuckAngle = uT.setDefault( pars.trackPuckAngle, false);
      
      if (trackPuckAngle) stripeAngle_r = this.angle_r;
      
      // Fill the area between the arc and a line connecting the arc's end points.
      drawingContext.fillStyle = outsideColor;
      drawingContext.beginPath();
      // Note that the start and end angles are entered with a negative sign to be consistent with Box2D.
      drawingContext.arc( this.position_2d_px.x, this.position_2d_px.y, // center position (pixels)
                          this.radius_px + changeFromRadius_px, // radius (pixels)
                          -(stripeAngle_r + (0.0 + width) * Math.PI), // start angle (radians)
                          -(stripeAngle_r + (1.0 - width) * Math.PI), // end angle
                          true); // counterclockwise if true
      drawingContext.fill(); 
      // Now, do the other side.
      drawingContext.fillStyle = outsideColor;
      drawingContext.beginPath();
      drawingContext.arc( this.position_2d_px.x, this.position_2d_px.y, 
                          this.radius_px + changeFromRadius_px, 
                          -(stripeAngle_r + (1.0 + width) * Math.PI), 
                          -(stripeAngle_r + (2.0 - width) * Math.PI), 
                          true);
      drawingContext.fill();
   }   
   Puck.prototype.draw = function( drawingContext, deltaT_s) {
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
      var borderColor, fillColor, fillAlpha;
      
      // Exit if puck is to be invisible during PauseErase.
      if ( gW.getPauseErase() && ( ! this.drawDuringPE) ) return;
      
      // Refer to index.html for the hidden image elements that are needed for each imageID (search on "puck costumes").
      if (this.shape == 'circle') {
         if ($('#chkC19').prop('checked') && (this.clientName) && (this.clientName.slice(0,3) == 'NPC')) { 
            // Virus                                 scale, alpha, rotate
            this.drawImage( drawingContext, 'covid', 1.65,  1.00,  false);
            fillColor = this.color;
            fillAlpha = 1.00;
         
         } else if (this.imageID) {
            this.drawImage( drawingContext, this.imageID, this.imageScale, 1.00, true);
            fillColor = this.color;
            fillAlpha = 0.00;
         
         } else if (this.hsl) {
            fillColor = this.hsl.colorString();
            this.hsl.step();
            fillAlpha = 1.00;
            
         } else {
            fillColor = this.color;
            fillAlpha = 1.00;
         }
         
         // Draw the main circle.
         // If hit, color the border red for a few frames.
         if (this.flash) {
            borderColor = 'red';
            this.flashCount += 1;
            if (this.flashCount >= 3) {
               this.flash = false;
               this.flashCount = 0;
            }
         } else {
            borderColor = this.borderColor;
         }
         
         if ((this.bullet) && (this.bulletIndication)) fillColor = 'black';
         this.drawCircle( drawingContext, this.position_2d_px, 
                {'borderColor':borderColor, 'borderWidth_px':this.borderWidth_px, 'fillColor':fillColor, 'radius_px':this.radius_px, 'fillAlpha':fillAlpha} );
         
         // Draw the health circle.
         this.poorHealthFraction = this.hitCount / this.hitLimit;
         var poorHealthRadius = this.radius_px * this.poorHealthFraction;
         if (poorHealthRadius > 0) {
            this.drawCircle( drawingContext, this.position_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'chocolate', 'radius_px':poorHealthRadius} );
         }
         
         if (gW.clients[this.clientName]) {
            // Update and draw the shield.
            this.shield.updateState( drawingContext, deltaT_s);
            
            // Draw the client finder circle. Big fat one. Easy to see. So you can find your puck.
            if (gW.clients[this.clientName].key_questionMark == "D") {
               gW.clients[this.clientName].puck.nameTip_timer_s = 0.0;
               this.drawCircle( drawingContext, this.position_2d_px, 
                  {'borderColor':gW.clients[this.clientName].color, 
                   'fillColor':'noFill', 
                   'borderWidth_px':this.radius_px * 0.3, 
                   'radius_px'     :this.radius_px * 1.5 } );
            }
         }
         
         // Show rotational orientation
         if ( ( ! this.gun) && this.angleLine) {
            if (this.angleLine == "stripe") {
               this.drawStripe( drawingContext, {"trackPuckAngle":true, "outsideColor":"gray"});
               
            } else {
               // Draw a line segment along the line from the center out to a local point on the radius.
               // Don't show this line for client pucks (gun) in Puck Popper.
               var pointOnEdge_2d_px = wS.screenFromWorld( this.b2d.GetWorldPoint( new b2DW.Vec2(this.radius_m, 0.0) ) );
               var pointAtHalfRadius_2d_px = wS.screenFromWorld( this.b2d.GetWorldPoint( new b2DW.Vec2(this.radius_m * (1.0/2.0), 0.0) ) );
               this.drawLine( drawingContext, pointAtHalfRadius_2d_px, pointOnEdge_2d_px, {'width_px':2, 'color':'white'});
            }
         }
         
         // Draw the tail if we have one.
         if (this.tail) this.tail.update( drawingContext, this.position_2d_m, deltaT_s);
         
         // If pool game:
         if (gW.getDemoVersion().slice(0,3) == "3.d") {
            // label pucks, draw stripe, draw finder circle
            gB.drawPoolBallFeatures( drawingContext, this);
         }
      
      } else {
         // Draw the rectangle.
         // This border width adjustment gives a similar result for rectangles when compared with the circle case.
         if (this.borderWidth_px >= 2) {
            var rect_borderWidth_px = this.borderWidth_px - 1;
         } else if (this.borderWidth_px < 2) {
            var rect_borderWidth_px = this.borderWidth_px;
         }
         
         var fillColor = ((this.bullet) && (this.bulletIndication)) ? 'black' : this.color;
         
         if (this.imageID) {
            this.drawImage( drawingContext, this.imageID, this.imageScale, 1.00, true);
            var rect_borderWidth_px = 0;
            var lineAlpha = 0.0;
            var fillIt = false;
         } else {
            var lineAlpha = 1.0;
            var fillIt = true;
         }
         
         this.drawPolygon( drawingContext, bS.b2d_getPolygonVertices_2d_px( this.b2d), 
            {'borderColor':this.borderColor,'borderWidth_px':rect_borderWidth_px,'fillColor':fillColor,'fillIt':fillIt,'lineAlpha':lineAlpha});
      }
      
      if ((this.clientName) && !(this.clientName.slice(0,3) == 'NPC')) {
         this.drawClientName( drawingContext, deltaT_s);
      }
   }
   Puck.prototype.draw_MultiSelectPoint = function( drawingContext) {
      var selectionPoint_2d_px;
      if ( ! gW.dC.comSelection.checked) {
         selectionPoint_2d_px = wS.screenFromWorld( this.b2d.GetWorldPoint( this.selectionPoint_l_2d_m));
      } else {
         selectionPoint_2d_px = this.position_2d_px;
      }
      this.drawCircle( drawingContext, selectionPoint_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'yellow', 'radius_px':5});
   }
   Puck.prototype.applyForces = function( deltaT_s) {
      // Net resulting force on the puck.
      
      // First consider forces acting on the COM.
      
      // F = acceleration * mass
      var g_force_2d_N = Puck.g_2d_mps2.scaleBy( this.mass_kg);
      
      var puck_forces_2d_N = g_force_2d_N;
          puck_forces_2d_N.addTo( this.sprDamp_force_2d_N); 
          
          puck_forces_2d_N.addTo( this.jet_force_2d_N);
          puck_forces_2d_N.addTo( this.impulse_2d_Ns.scaleBy(1.0/deltaT_s));

      if ( ! this.tempInhibitExtForce) {
         // Apply this force to the puck's center of mass (COM) in the Box2d world
         this.b2d.ApplyForce( puck_forces_2d_N, this.position_2d_m);
         
         // Apply any non-COM forces in the array. The spring forces are this array.
         for (var j = 0, len = this.nonCOM_2d_N.length; j < len; j++) {
            this.b2d.ApplyForce( this.nonCOM_2d_N[j].force_2d_N, this.nonCOM_2d_N[j].point_w_2d_m);
         }
         /*         
         // Apply torques.   #b2d
         */
      } else {
         this.tempInhibitExtForce = false;
      }
      
      // Now reset the aggregate forces.
      this.sprDamp_force_2d_N = new wS.Vec2D(0.0,0.0);
      this.nonCOM_2d_N = [];
      this.impulse_2d_Ns = new wS.Vec2D(0.0,0.0);
   }



   // Static spring anchors (no collisions)
   function Pin( position_2d_m, pars) {
      dFM.DrawingFunctions.call(this) // inherit
      this.parsAtBirth = pars;
      this.cursorPin = uT.setDefault( pars.cursorPin, false);
      
      let result = assignName( pars.name, Pin.nameIndex, "pin", "pinMap");
      this.name = result.name;
      Pin.nameIndex = result.index;
      
      // Don't put cursor pins in the map.
      if ( ! this.cursorPin) gW.aT.pinMap[this.name] = this;
      
      this.position_2d_m = wS.Vec2D_check( position_2d_m);
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
      
      // Local selection point for a pin is always at its center.
      this.selectionPoint_l_2d_m = new wS.Vec2D(0.0, 0.0);
       
      this.velocity_2d_mps =  uT.setDefault( pars.velocity_2d_mps, new wS.Vec2D(0.0, 0.0));
     
      this.radius_px = uT.setDefault( pars.radius_px, 6);
      // Make the radius in box2d a little larger so can select it easier.
      this.radius_m = wS.meters_from_px( this.radius_px + 2);
      
      // www.iforce2d.net/b2dtut/collision-filtering
      this.groupIndex = uT.setDefault( pars.groupIndex, 0);
      this.categoryBits = uT.setDefault( pars.categoryBits, 0x0001);
      // Masking parameters for b2d object for the pin:
      // The default Box2D values are 0xFFFF for maskBits (collide with everything).
      // Default here, 0x0000, will prevent collisions with the pin (collide with nothing).
      this.maskBits = uT.setDefault( pars.maskBits, 0x0000);
      
      this.deleted = false;
      
      // For creating a circular linked-list of pins to guide the NPC movement.
      this.NPC = uT.setDefault( pars.NPC, false);
      this.nextPinName = uT.setDefault( pars.nextPinName, null);
      this.previousPinName = uT.setDefault( pars.previousPinName, null);
      
      this.visible = uT.setDefault( pars.visible, true);
      this.color = uT.setDefault( pars.color, 'blue');
      this.borderColor = uT.setDefault( pars.borderColor, 'gray');
      this.navLineColor = uT.setDefault( pars.navLineColor, 'white');
      
      // All parameters should be set above this point.
      
      this.b2d = null;
      this.create_b2d_pin();
      // Create a reference back to this pin from the b2d pin.
      gW.tableMap.set(this.b2d, this);
   }
   Pin.nameIndex = 0;
   Pin.applyToAll = function ( doThis) {
      for (var pinName in gW.aT.pinMap) {
         var pin = gW.aT.pinMap[ pinName];
         doThis( pin);
      }
   }
   Pin.deleteAll = function () {
      if (m_EpL.displayReport) m_EpL.turnDisplayOff({});
      
      Pin.applyToAll( pin => {
         gW.tableMap.delete( pin.b2d);
         if (pin.b2d) gW.b2d.world.DestroyBody( pin.b2d);
      });
      gW.aT.pinMap = {};
      Pin.nameIndex = 0;      
   }
   Pin.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   Pin.prototype.constructor = Pin; // Rename the constructor (after inheriting)
   Pin.prototype.deleteThisOne = function( pars) {
      var deleteMode = uT.setDefault( pars.deleteMode, null);
      
      if ((this.name == m_EpL.pinName) && (deleteMode != "fromEpL")) {
         gW.messages['help'].newMessage("Can't let you delete the EpL pin. Try [base,yellow]ctrl-L[base].", 3.0);  
         gW.hostMSelect.removeOne( this);
         return;
      }
      
      // Note that springs are checked, in the updateAirTable function, to
      // see if either of the two objects it is attached to has been deleted.
      // If so, the spring is deleted. So that's not needed here.
      
      // Reassign the surrounding pins (if they are part of an NPC path)
      if (this.NPC) {
         // Point the next pin back at the previous pin.
         gW.aT.pinMap[this.nextPinName].previousPinName = gW.aT.pinMap[this.previousPinName].name;
         // Point the previous pin forward to the next pin.
         gW.aT.pinMap[this.previousPinName].nextPinName = gW.aT.pinMap[this.nextPinName].name;
      }
      
      // Delete reference in the tableMap.
      gW.tableMap.delete( this.b2d);
      
      // Delete the corresponding Box2d object.
      gW.b2d.world.DestroyBody( this.b2d);
      
      // Mark this pin as deleted.
      this.deleted = true;
      
      // Remove this pin from the pin map.
      delete gW.aT.pinMap[ this.name];
      // ...and from the multi-select map.
      gW.hostMSelect.removeOne( this);
   }
   Pin.prototype.copyThisOne = function( pars) {
      var position_2d_m = uT.setDefault( pars.position_2d_m, this.position_2d_m);
      
      var p_2d_m = Object.assign({}, position_2d_m);
      var parsForNewBirth =   Object.assign({}, this.parsAtBirth);
      // Make sure the name is nulled so the auto-naming feature is used in the constructor.
      parsForNewBirth.name = null;
      
      var newPin = new Pin( p_2d_m, parsForNewBirth);
      
      // Slide the new pin in front of the old one if it's in a NPC.
      if (this.NPC) {
         // Set the two links for the new pin.
         newPin.nextPinName = this.nextPinName;
         newPin.previousPinName = this.name;
         
         // Update the backward link of the original next pin.
         gW.aT.pinMap[this.nextPinName].previousPinName = newPin.name;
         
         // Update the forward link of the original pin.
         this.nextPinName = newPin.name;
      }
      return newPin;
   }
   Pin.prototype.define_fixture = function() {
      var fixDef = new b2DW.FixtureDef;   
      
      fixDef.filter.groupIndex = this.groupIndex;
      fixDef.filter.categoryBits = this.categoryBits;
      fixDef.filter.maskBits = this.maskBits;
      
      fixDef.shape = new b2DW.CircleShape( this.radius_m);
      
      return fixDef;
   }
   Pin.prototype.create_b2d_pin = function() {
      // Create a rectangular and static box2d object.
      
      var bodyDef = new b2DW.BodyDef;
      bodyDef.type = b2DW.Body.b2_kinematicBody; // b2_kinematicBody b2_staticBody
      
      this.b2d = gW.b2d.world.CreateBody( bodyDef);
      this.b2d.CreateFixture( this.define_fixture());
      
      // Set the state: position.
      this.b2d.SetPosition( this.position_2d_m);
      this.b2d.SetLinearVelocity( this.velocity_2d_mps);
   }
   Pin.prototype.getPosition = function() {
      this.position_2d_m = wS.Vec2D_from_b2Vec2( this.b2d.GetPosition());
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
   }
   Pin.prototype.setPosition = function( newPosition_2d_m) {
      this.b2d.SetPosition( newPosition_2d_m);
      this.position_2d_m = newPosition_2d_m;
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
   }
   Pin.prototype.worldPoint = function( localPoint_2d) {
      // This is here for compatibility with the corresponding puck method. Note multi-select and attachment points 
      // are always at the center of the pin.
      return wS.Vec2D_from_b2Vec2( this.b2d.GetWorldPoint( localPoint_2d));
   }
   Pin.prototype.draw_MultiSelectPoint = function( drawingContext) {
      this.getPosition(); // the center
      this.drawCircle( drawingContext, this.position_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'yellow', 'radius_px':5});
   }
   Pin.prototype.draw = function( drawingContext, radius_px) {
      radius_px = uT.setDefault( radius_px, this.radius_px);
      if (gW.dC.editor.checked || this.visible) {
         this.getPosition();
         // use white for the color-mixing demo (#9).
         var fillColor = (drawingContext.globalCompositeOperation == 'screen') ? 'white' : this.color;
         if ( ! gW.getPauseErase()) {
            this.drawCircle( drawingContext, this.position_2d_px, {'borderColor':this.borderColor, 'borderWidth_px':2, 'fillColor':fillColor, 'radius_px':radius_px});
         }
      }
      
      // Draw lines to indicate the relationships in the NPC navigation map.
      if (this.NPC && gW.dC.editor.checked) {
         if (gW.aT.pinMap[this.nextPinName]) {
            this.drawLine( drawingContext, this.position_2d_px, gW.aT.pinMap[this.nextPinName].position_2d_px, {'width_px':1, 'color':this.navLineColor, 'dashArray':[3]});
         }
      }
   }
   
   
   
   function Joint( tableObject1, tableObject2, pars) {
      dFM.DrawingFunctions.call(this); // inherit
      
      // Must have both objects to attach the Joint.
      // Throwing an error forces an exit from this constructor.
      if ( !((tableObject1) && (tableObject2)) ) {
         var errorObj = new Error('Attempting to construct a joint with one or both connected objects missing.');
         errorObj.name = 'from Joint constructor';
         throw errorObj;
      }
      this.parsAtBirth = pars;

      let result = assignName( pars.name, Joint.nameIndex, "j", "jointMap");
      this.name = result.name;
      Joint.nameIndex = result.index;
      
      // Add this joint to the joint map.
      gW.aT.jointMap[this.name] = this;
      
      this.color = uT.setDefault( pars.color, "black");
      this.visible = uT.setDefault( pars.visible, true);
      
      this.enableLimit = uT.setDefault( pars.enableLimit, false);
      this.lowerLimit_deg = uT.setDefault( pars.lowerLimit_deg, null);
      this.upperLimit_deg = uT.setDefault( pars.upperLimit_deg, null);
      
      this.colorInTransition = true;
      
      this.selected = uT.setDefault( pars.selected, false);
      
      // Joint Table Object (jto1). Giving this a distinctive name so that it can be (if needed) filtered
      // out in the JSON capture. This filtering avoids some wordiness in the capture.
      this.jto1 = tableObject1;
      this.jto1_name = tableObject1.name;
      // local point where joint is attached on jto1
      this.jto1_ap_l_2d_m = uT.setDefault( pars.jto1_ap_l_2d_m.copy(), new wS.Vec2D(0,0));
      
      // Same reasoning here for the distinctive name (jto2, not p2).
      this.jto2 = tableObject2;
      this.jto2_name = tableObject2.name;
      // local point where joint is attached on jto2
      this.jto2_ap_l_2d_m = uT.setDefault( pars.jto2_ap_l_2d_m.copy(), new wS.Vec2D(0,0));
      
      // All parameters should be set above this point.
      
      this.b2d = null;
      this.createJoint();
   }
   Joint.nameIndex = 0;
   Joint.countInMultiSelect = 0;
   Joint.applyToAll = function ( doThis) {
      // Run the doThis code on each joint.
      for (var jointName in gW.aT.jointMap) {
         var joint = gW.aT.jointMap[ jointName];
         var result = doThis( joint);
         if (result && result['breakRequest']) break;
      }
   }
   Joint.checkIfAttached = function ( objName) {
      let yesFoundIt = false;
      Joint.applyToAll( joint => {
         if ( (joint.jto1.name == objName) || (joint.jto2.name == objName) ) {
            yesFoundIt = true;
            return {'breakRequest':true};
         }
      });
      return yesFoundIt;
   }
   Joint.deleteAll = function () {
      // Remove these joints from the b2d world.
      Joint.applyToAll( joint => {
         if (joint.softConstraints) {
            gW.b2d.world.DestroyJoint( joint.b2d);
            joint.b2d = null;
         }
      });
      gW.aT.jointMap = {};
      Joint.nameIndex = 0;
   }
   Joint.findAll_InMultiSelect = function ( doThis) {
      // Find all the joints that have both ends in the multi-select map.
      Joint.countInMultiSelect = 0;
      Joint.applyToAll( joint => {
         if (joint.inMultiSelect()) {
            Joint.countInMultiSelect++;
            // For each joint you find.
            doThis( joint);
         }
      });
   }
   Joint.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   Joint.prototype.constructor = Spring; // Rename the constructor (after inheriting)
   Joint.prototype.setEnableLimit = function( trueFalse) {
      this.enableLimit = trueFalse;
      this.b2d.EnableLimit( trueFalse);
   }
   Joint.prototype.setLimits = function(lowerLimit_deg, upperLimit_deg) {
      this.lowerLimit_deg = lowerLimit_deg;
      this.upperLimit_deg = upperLimit_deg;
      this.b2d.SetLimits( lowerLimit_deg * Math.PI/180, upperLimit_deg * Math.PI/180);
   }
   Joint.prototype.createJoint = function() {
      var joint = new b2DW.RevoluteJointDef;
      
      // Identify the connected bodies.
      joint.bodyA = this.jto1.b2d;
      joint.bodyB = this.jto2.b2d;
      
      // Connect to the attachment point on each body.
      joint.localAnchorA = wS.b2Vec2_from_Vec2D( this.jto1_ap_l_2d_m);
      joint.localAnchorB = wS.b2Vec2_from_Vec2D( this.jto2_ap_l_2d_m);
            
      // Will the connected bodies collide?
      joint.collideConnected = false;

      // Add the joint to the world. And keep a reference to it here (this joint) as b2d.
      this.b2d = gW.b2d.world.CreateJoint( joint);
      
      this.b2d.EnableLimit( this.enableLimit);
      this.b2d.SetLimits( this.lowerLimit_deg * Math.PI/180, this.upperLimit_deg * Math.PI/180);
   }
   Joint.prototype.deleteThisOne = function( pars) {
      var deleteMode = uT.setDefault( pars.deleteMode, null);
      gW.b2d.world.DestroyJoint( this.b2d);
      this.b2d = null;
      delete gW.aT.jointMap[ this.name];
   }
   Joint.prototype.copyThisOne = function(to1, to2) {
      // Make a copy of the mutable objects that are passed into the Joint constructor.
      var pars = Object.assign({}, this.parsAtBirth);
      // Null the name so the auto-naming feature is used in the constructor.
      pars.name = null;
      
      pars.jto1_ap_l_2d_m = this.jto1_ap_l_2d_m.copy();
      pars.jto2_ap_l_2d_m = this.jto2_ap_l_2d_m.copy();
      
      // Note that this instantiation adds this new joint to the joint map. 
      var tempJoint = new Joint( to1, to2, pars);
      
      return tempJoint.name;
   }
   Joint.prototype.updateWorldPositions = function() {
      // Find the world position of the attachment points.
      // if not attached to the center
      if ( ! this.jto1_ap_l_2d_m.zeroLength() ) {
         this.jto1_ap_w_2d_m = wS.Vec2D_from_b2Vec2( this.jto1.b2d.GetWorldPoint( this.jto1_ap_l_2d_m));
      // if attached to the center
      } else {
         this.jto1_ap_w_2d_m = this.jto1.position_2d_m;
      }
      this.jto1_ap_w_2d_px = wS.screenFromWorld( this.jto1_ap_w_2d_m);
   }
   Joint.prototype.inMultiSelect = function() {
      if ((this.jto1.name in gW.hostMSelect.map) && (this.jto2.name in gW.hostMSelect.map)) {
         return true;
      } else {
         return false;
      }
   }
   Joint.prototype.report = function( ) {
      let enableLimitString = (this.enableLimit) ? "on":"off";
      let lowerLimitString = (this.lowerLimit_deg) ? this.lowerLimit_deg.toFixed(0) : "n/a";
      let upperLimitString = (this.upperLimit_deg) ? this.upperLimit_deg.toFixed(0) : "n/a";
      
      let messageString = "revolute joint: [base,yellow]" + this.name + "[base]" +
                          "\\   angle limits (" + enableLimitString + "): " + lowerLimitString + " to " + upperLimitString +
                          "\\   angle = " + (this.b2d.GetJointAngle() * 180.0/Math.PI).toFixed(0);
      // For the case where there is a single spring and a single revolute joint, add the revolute report to the end of the spring report.
      if (gW.messages['help2'].message.includes('spring')) {
         gW.messages['help2'].addToIt( "\\ \\" + messageString, {'additionalTime_s':0.0});
      } else {
         gW.messages['help2'].newMessage( messageString, 0.05);
      }
   }
   Joint.prototype.draw = function(drawingContext) {
      this.updateWorldPositions();
      
      // If this.color is not black, it will be used as the fill color (to get your attention) until the 3 second timer ends.
      var transitionColor;
      if (this.colorInTransition) {
         transitionColor = this.color;
      } else {
         transitionColor = 'black';
      }
      window.setTimeout( function() { 
         this.colorInTransition = false;
      }.bind(this), 3000);
      
      if ( (this.visible) && ( ! gW.getPauseErase()) ) {
         let fillColor, borderColor;
         let outerRadius_px = 5;
         
         if (this.selected) {
            fillColor = 'yellow';
            borderColor = 'black';
         } else {
            if (this.name == gW.hostMSelect.candidateReportPasteDelete) {
               fillColor = 'white';
               borderColor = 'black'
               outerRadius_px = 8;
            } else {
               fillColor = transitionColor;
               borderColor = 'white'
            }
         }
         // larger circle on the bottom
         this.drawCircle( drawingContext, this.jto1_ap_w_2d_px, {'borderColor':borderColor, 'borderWidth_px':1, 'fillColor':fillColor, 'radius_px':outerRadius_px});
         // smaller circle on top
         this.drawCircle( drawingContext, this.jto1_ap_w_2d_px, {'borderColor':borderColor, 'borderWidth_px':1, 'fillColor':fillColor, 'radius_px':3});
      }
   }



   function Spring( puckOrPin1, puckOrPin2, pars) {
      dFM.DrawingFunctions.call(this); // inherit
      
      // Must have both objects to attach the spring.
      // Throwing an error forces an exit from this constructor.
      if ( !((puckOrPin1) && (puckOrPin2)) ) {
         var errorObj = new Error('Attempting to construct a spring with one or both connected objects missing.');
         errorObj.name = 'from Spring constructor';
         throw errorObj;
      }
      this.parsAtBirth = pars;
      
      let result = assignName( pars.name, Spring.nameIndex, "s", "springMap");
      this.name = result.name;
      Spring.nameIndex = result.index;
      
      gW.aT.springMap[this.name] = this;
      
      this.color = uT.setDefault( pars.color, "red");
      this.visible = uT.setDefault( pars.visible, true);
      this.length_m = uT.setDefault( pars.length_m, 0.0);
      this.stretch_m = uT.setDefault( pars.stretch_m, 0.0);
      this.strength_Npm = uT.setDefault( pars.strength_Npm, 0.5);  // 60.0
      this.unstretched_width_m = uT.setDefault( pars.unstretched_width_m, 0.025);
      
      // Note that pucks have an attribute linDamp, with an effect similar to drag_c. Both can be
      // used to model a drag force on the pucks at the end of the spring.
      this.drag_c = uT.setDefault( pars.drag_c, 0.0);
      this.damper_Ns2pm2 = uT.setDefault( pars.damper_Ns2pm2, 0.5);
      
      this.selected = uT.setDefault( pars.selected, false);
      this.navigationForNPC = uT.setDefault( pars.navigationForNPC, false);
      this.forCursor = uT.setDefault( pars.forCursor, false);
      
      // Spring-puck/pin Object (spo1, not p1). Giving this a distinctive name so that it can be filtered
      // out in the JSON capture. This filtering avoids some wordiness in the capture.
      this.spo1 = puckOrPin1;
      this.p1_name = puckOrPin1.name;
      // Pin one end of the spring to a fixed location.
      if (this.spo1.constructor.name == "Pin") {
         this.pinned = true;
      } else {
         this.pinned = false;
      }
      // local point where spring is attached on spo1
      this.spo1_ap_l_2d_m = uT.setDefaultVector( pars.spo1_ap_l_2d_m, new wS.Vec2D(0,0), "copy");
      
      // Same reasoning here for the distinctive name (spo2, not p2).
      this.spo2 = puckOrPin2;
      this.p2_name = puckOrPin2.name;
      // Pin one end of the spring to a fixed location.
      if (this.spo2.constructor.name == "Pin") {
         this.pinned = true;
      } else {
         this.pinned = false;
      }
      // local point where spring is attached on spo2
      this.spo2_ap_l_2d_m = uT.setDefaultVector( pars.spo2_ap_l_2d_m, new wS.Vec2D(0,0), "copy");
      
      this.p1p2_separation_2d_m = new wS.Vec2D(0,0);
      this.p1p2_separation_m = 0;
      this.p1p2_normalized_2d = new wS.Vec2D(0,0);
      
      this.fixedLength = uT.setDefault( pars.fixedLength, false);
      this.collideConnected = uT.setDefault( pars.collideConnected, true);
      
      // All parameters should be set above this point.
      
      // To model the spring as a distance joint in b2d. 
      // Don't allow this for the navigation springs. 
      // If fixedLength is specified, make sure
      // that softConstraints (i.e. the distance joint) is also specified because it is
      // needed for modeling the fixed-length join.
      this.b2d = null;
      if (this.fixedLength) {
         this.softConstraints_setInPars = true;
         this.softConstraints = true;
      } else {
         this.softConstraints_setInPars = (typeof pars.softConstraints !== "undefined") ? true : false;
         this.softConstraints = uT.setDefault( pars.softConstraints, gW.getSoftConstraints_default());
      }
      
      if (this.softConstraints && ( ! this.navigationForNPC)) {
         this.createDistanceJoint();
      } else if (this.navigationForNPC) {
         this.softConstraints = false;
      }
   }
   Spring.nameIndex = 0;
   Spring.nameForPasting = null;
   Spring.countInMultiSelect = 0;
   Spring.applyToAll = function ( doThis) {
      // Run the doThis code on each spring.
      for (var springName in gW.aT.springMap) {
         var spring = gW.aT.springMap[ springName];
         var result = doThis( spring);
         if (result && result['breakRequest']) break;
      }
   }
   Spring.checkIfAttached = function ( objName) {
      let yesFoundIt = false;
      Spring.applyToAll( spring => {
         if ( (!spring.forCursor) && ((spring.spo1.name == objName) || (spring.spo2.name == objName)) ) {
            yesFoundIt = true;
            return {'breakRequest':true};
         }
      });
      return yesFoundIt;
   }
   Spring.deleteAll = function () {
      // If any of these springs are b2d distance joints, remove these from the b2d world.
      Spring.applyToAll( spring => {
         if (spring.softConstraints) {
            gW.b2d.world.DestroyJoint( spring.b2d);
            spring.b2d = null;
         }
      });
      gW.aT.springMap = {};
      Spring.nameIndex = 0;
      Spring.nameForPasting = null;
   }
   Spring.findAll_InMultiSelect = function ( doThis) {
      // Find all the springs that have both ends (puck or pin) in the multi-select map.
      // Then run the doThis function that has been passed in here.
      Spring.countInMultiSelect = 0;
      Spring.applyToAll( spring => {
         if (spring.inMultiSelect()) {
            Spring.countInMultiSelect++;
            // For each spring you find there.
            doThis( spring);
         }
      });
   }
   Spring.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   Spring.prototype.constructor = Spring; // Rename the constructor (after inheriting)
   Spring.prototype.createDistanceJoint = function() {
      var distance_joint = new b2DW.DistanceJointDef;
      
      // Identify the connected bodies.
      distance_joint.bodyA = this.spo1.b2d;
      distance_joint.bodyB = this.spo2.b2d;
      
      // Connect to the attachment point on each body.
      distance_joint.localAnchorA = wS.b2Vec2_from_Vec2D( this.spo1_ap_l_2d_m);
      distance_joint.localAnchorB = wS.b2Vec2_from_Vec2D( this.spo2_ap_l_2d_m);
      
      // Initialize the soft constraints.
      distance_joint.length = this.length_m;
      if ( ! this.fixedLength) {
         distance_joint.frequencyHz  = 1.0;
         distance_joint.dampingRatio = 0.0;
      }
      
      // Will the connected bodies collide?
      distance_joint.collideConnected = this.collideConnected;

      // Add the joint to the world. And keep a reference to it here (this spring) as b2d.
      this.b2d = gW.b2d.world.CreateJoint( distance_joint);
      
      // Update it to reflect the traditional spring parameters and the effective mass.
      this.updateB2D_spring();
   }
   Spring.prototype.updateB2D_spring = function() {
      // Use the smaller of the two pucks in the frequency calculation.
      var smallerMass_kg = 10000;
      if (this.spo1.constructor.name == 'Puck') smallerMass_kg = Math.min(this.spo1.mass_kg, smallerMass_kg);
      if (this.spo2.constructor.name == 'Puck') smallerMass_kg = Math.min(this.spo2.mass_kg, smallerMass_kg);
      
      this.b2d.SetLength( this.length_m);
      
      if ( ! this.fixedLength) {
         // The frequency and damping ratio expressions are based on the equations on page 45 of this
         // presentation by Erin Catto.
         // https://triquence.org/GDC2011_Catto_Erin_Soft_Constraints.pdf
         
         // omega = (k/m)^0.5
         // f = omega / 2Pi = (k/m)^0.5 / 2Pi
         var freq_hz = Math.sqrt( this.strength_Npm/ smallerMass_kg)/(2.0 * Math.PI);
         this.b2d.SetFrequency( freq_hz);
         
         // dampingRatio = c / (2 * m * omega)
         var dampingRatio = this.damper_Ns2pm2 / (2.0 * smallerMass_kg * (2.0 * Math.PI * this.b2d.GetFrequency()));
         var dampingRatio_tweaked = dampingRatio /1.0 ;
         this.b2d.SetDampingRatio( dampingRatio_tweaked);
      }
   }
   Spring.prototype.deleteThisOne = function( pars) {
      var deleteMode = uT.setDefault( pars.deleteMode, null);
      
      if (this.softConstraints) {
         gW.b2d.world.DestroyJoint( this.b2d);
         this.b2d = null;
      }
      
      if (this.navigationForNPC) {
         // Dissociate the NPC puck from the navigation pin. Do this to prevent the 
         // navigation spring from regenerating when the capture is restored.
         // Also disable the jet, since the NPC puck won't be motoring until attached to navigation again.
         if (this.spo1.constructor.name == "Puck") {
            this.spo1.pinName = null;
            this.spo1.parsAtBirth.pinName = null;
            this.spo1.disableJet = true;
         }
         if (this.spo2.constructor.name == "Puck") {
            this.spo2.pinName = null;
            this.spo2.parsAtBirth.pinName = null;
            this.spo2.disableJet = true;
         }
      }
      
      // Remove this spring from the spring map.
      delete gW.aT.springMap[ this.name];
   }
   Spring.prototype.copyThisOne = function(p1, p2, copyMode) {
      copyMode = uT.setDefault( copyMode, "regular");
      
      // Make a copy of the mutable objects that are passed into the Spring constructor.
      var pars = Object.assign({}, this.parsAtBirth);
      // Null the name so the auto-naming feature is used in the constructor.
      pars.name = null;
      // Update attributes that may have been changed (from birth) with editing.
      pars.length_m = this.length_m;
      pars.unstretched_width_m = this.unstretched_width_m
      pars.strength_Npm = this.strength_Npm;
      pars.damper_Ns2pm2 = this.damper_Ns2pm2;
      // factor for drag force on attached pucks (proportional to velocity)
      pars.drag_c = this.drag_c;
      
      // Set local attachment points when pasting a spring.
      if (copyMode == "pasteSingle") {
         if (gW.dC.comSelection.checked) {
            pars.spo1_ap_l_2d_m = new wS.Vec2D(0,0);
            pars.spo2_ap_l_2d_m = new wS.Vec2D(0,0);
         } else {
            // Always paste onto the center of a pin.
            pars.spo1_ap_l_2d_m = (p1.constructor.name == "Pin") ? new wS.Vec2D(0,0) : p1.selectionPoint_l_2d_m.copy();
            pars.spo2_ap_l_2d_m = (p2.constructor.name == "Pin") ? new wS.Vec2D(0,0) : p2.selectionPoint_l_2d_m.copy();
         }
      } else {
         pars.spo1_ap_l_2d_m = (p1.constructor.name == "Pin") ? new wS.Vec2D(0,0) : this.spo1_ap_l_2d_m.copy();
         pars.spo2_ap_l_2d_m = (p2.constructor.name == "Pin") ? new wS.Vec2D(0,0) : this.spo2_ap_l_2d_m.copy();
      }
      
      // Note that this instantiation adds this new spring to the spring map. 
      var tempSpring = new Spring( p1, p2, pars);
      
      // Also enable the jet for NPC pucks, since the NPC puck will be motoring now that it is attached to navigation again.
      if (tempSpring.navigationForNPC) {
         if (tempSpring.spo1.constructor.name == "Puck") {
            tempSpring.spo1.disableJet = false;
         }
         if (tempSpring.spo2.constructor.name == "Puck") {
            tempSpring.spo2.disableJet = false;
         }
      }
      
      return tempSpring.name;
   }
   Spring.prototype.interpret_editCommand = function( command) {
      var width_factor = 1.0;
      var length_factor = 1.0;
      var damping_factor = 1.0;
      
      gW.aT.hack['pwsEdits'] = true;
      
      if ((command == 'wider') || (command == 'widerAppearance')) {
         width_factor = 1.1;
      } else if ((command == 'thinner') || (command == 'thinnerAppearance')) {
         width_factor = 1.0/1.1; 
         
      } else if (command == 'taller') {
         length_factor = 1.1;
      } else if (command == 'shorter') {
         length_factor = 1.0/1.1;
         
      // For springs, interpret drag as damping.
      } else if (command == 'moreDrag') {
         damping_factor = 1.1;
      } else if (command == 'lessDrag') {
         damping_factor = 1.0/1.1;
         
      } else if (command == 'noChange') {
         // don't change anything.
      }
      
      // First, the special case of the pinned puck that is using a zero length spring. Give
      // it a little length to start with, otherwise the zero will always scale to zero (it will never
      // get longer). 
      if (command=='shorter' || command=='taller') {
         if (this.length_m == 0.0) this.length_m = 0.1;
         this.length_m *= length_factor;
         if (this.length_m < 0.1) this.length_m = 0.0;
         gW.messages['help'].newMessage("spring: [base,yellow]" + this.name + "[base] length = " + this.length_m.toFixed(3), 0.5);
         
      } else if (command=='thinner' || command=='wider') {
         // Use the wider/thinner width_factor to affect both the visual width and strength of the spring.
         // See below, in the draw method, that width_px, the drawing width, has a minimum of 2px.
         this.unstretched_width_m *= width_factor;
         this.strength_Npm *= width_factor;
         gW.messages['help'].newMessage("spring: [base,yellow]" + this.name + "[base] strength (k) = " + this.strength_Npm.toFixed(4), 0.5);
         
      } else if (command=='thinnerAppearance' || command=='widerAppearance') {
         // Use the widerAppearance/thinnerAppearance width_factor to affect ONLY the visual width of the spring.
         // (see comment above on width_px)
         this.unstretched_width_m *= width_factor;
         gW.messages['help'].newMessage("spring: [base,yellow]" + this.name + "[base] unstretched width = " + this.unstretched_width_m.toFixed(4), 0.5);
         
      } else if (command=='lessDrag' || command=='moreDrag') {
         // If at zero, give the scaling factor something to work with.
         if (this.damper_Ns2pm2 == 0.0) this.damper_Ns2pm2 = 0.1;
         // Apply the scaling factor.
         this.damper_Ns2pm2 *= damping_factor;
         // A lower limit.
         if (this.damper_Ns2pm2 < 0.1) this.damper_Ns2pm2 = 0.0;
         gW.messages['help'].newMessage("spring: [base,yellow]" + this.name + "[base] damping = " + this.damper_Ns2pm2.toFixed(4), 0.5);
      }
      
      // If you're using a distance joint in Box2D...
      if (this.softConstraints) {
         this.updateB2D_spring();
      }
   }
   Spring.prototype.updateEndPoints = function() {
      // Find the world position of the attachment points.
      // if not attached to the center
      if ( ! this.spo1_ap_l_2d_m.zeroLength() ) {
         this.spo1_ap_w_2d_m = wS.Vec2D_from_b2Vec2( this.spo1.b2d.GetWorldPoint( this.spo1_ap_l_2d_m));
      // if attached to the center
      } else {
         this.spo1_ap_w_2d_m = this.spo1.position_2d_m;
      }
      this.spo1_ap_w_2d_px = wS.screenFromWorld( this.spo1_ap_w_2d_m);
      
      if ( ! this.spo2_ap_l_2d_m.zeroLength() ) {
         this.spo2_ap_w_2d_m = wS.Vec2D_from_b2Vec2( this.spo2.b2d.GetWorldPoint( this.spo2_ap_l_2d_m));
      } else {
         this.spo2_ap_w_2d_m = this.spo2.position_2d_m;
      }
      this.spo2_ap_w_2d_px = wS.screenFromWorld( this.spo2_ap_w_2d_m);
   }   
   Spring.prototype.calculateSeparation = function() {
      this.updateEndPoints();
      
      // Separation vector and its length:
      // Need these two results for both distance joints and regular springs: 
      this.p1p2_separation_2d_m = this.spo1_ap_w_2d_m.subtract( this.spo2_ap_w_2d_m);
      this.p1p2_separation_m = this.p1p2_separation_2d_m.length();
      this.p1p2_normalized_2d = this.p1p2_separation_2d_m.scaleBy( 1/this.p1p2_separation_m);
      
      this.stretch_m = (this.p1p2_separation_m - this.length_m);
   }
   Spring.prototype.potentialEnergy = function() {
      // PE = (1/2) * k * x^2
      return (0.5) * this.strength_Npm * this.stretch_m**2;
   }
   Spring.prototype.force_on_pucks = function() {
      /*
      If springs are modeled with Hooke's law, determine all the forces 
      (related to the spring) that act on the two attached bodies. This 
      includes forces acting at the attachment points and those acting at the 
      COMs. Calculate:
      -- separation distance (length) and vector between the two attachment points for calculating the spring forces
      -- relative speed of the attachment points for use in calculating the damping forces
      -- absolute speed of each attachment point for use in calculating drag forces
      
      Some of this is also needed for drawing the springs modeled as distance 
      joints (in Box2D engine).
      */
      
      this.calculateSeparation();
      
      //  If not using the native spring modeling (distance joints) in b2d, calculate the spring and damping forces.
      //  note: the logical operator forces a type conversion if softConstraints is undefined (converts to false, so !false is true)
      if ( ! this.softConstraints) {
         /*
         First, calculate the forces that don't necessarily act on the center of the body, non COM.
         
         The pinned case needs to be able to handle the zero length spring. The 
         separation distance will be zero when the pinned spring is at rest.
         This will cause a divide by zero error if not handled here.
         
         The second clause in this if statement checks for use of the editor, 
         the control key. Block cursor-spring forces when doing deterministic 
         movements. This only blocks traditional springs. If in distance-joint 
         mode, the cursor movement will drag the selected puck some (a little) 
         even when control key is down (and using shift or alt keys for 
         rotation). 
         */
         if ( ((this.p1p2_separation_m == 0.0) && (this.length_m == 0.0)) || ((this.forCursor && gW.clients[this.name].key_ctrl == "D")) ) {
            var spring_force_on_1_2d_N = new wS.Vec2D(0.0,0.0);
         } else {
            // Spring force:  acts along the separation vector and is proportional to the stretch distance.
            var spring_force_on_1_2d_N = this.p1p2_normalized_2d.scaleBy( -this.stretch_m * this.strength_Npm);
         }
         
         /*
         These non-COM spring forces must be applied individually, at the
         attachment points. That's why these are appended to the puck's 
         nonCOM_2d_N force array. This array is reset (emptied) after the 
         movements are calculated in the physics engine.
         */
         
         if (this.spo1.constructor.name == "Puck") {
            this.spo1.nonCOM_2d_N.push({'force_2d_N': spring_force_on_1_2d_N.scaleBy( +1), 'point_w_2d_m': this.spo1_ap_w_2d_m});   
            /*
            The following vector is used for aiming the NPC's navigation jets. (Note 
            navigation springs are always conventional springs.) Check to see that 
            this is on a navigation pin before updating navSpringOnly_force_2d_N. We 
            only want the navigation spring force to be affecting the drawing of the 
            navigation jet. This will exclude other springs, like cursor springs, 
            from affecting the jet representation.
            */
            if ((this.spo2.constructor.name == "Pin") && (this.spo2.NPC)) this.spo1.navSpringOnly_force_2d_N = spring_force_on_1_2d_N.scaleBy( +1);
         }
         if (this.spo2.constructor.name == "Puck") {
            this.spo2.nonCOM_2d_N.push({'force_2d_N': spring_force_on_1_2d_N.scaleBy( -1), 'point_w_2d_m': this.spo2_ap_w_2d_m});   
            // (see explanation in spo1 block above)
            if ((this.spo1.constructor.name == "Pin") && (this.spo1.NPC)) this.spo2.navSpringOnly_force_2d_N = spring_force_on_1_2d_N.scaleBy( -1);
         }
         
         // Damper force: acts along the separation vector and is proportional to the relative speed.
         // First, get the velocity at each attachment point.
         var v_spo1_ap_2d_mps = wS.Vec2D_from_b2Vec2( this.spo1.b2d.GetLinearVelocityFromWorldPoint( this.spo1_ap_w_2d_m));
         var v_spo2_ap_2d_mps = wS.Vec2D_from_b2Vec2( this.spo2.b2d.GetLinearVelocityFromWorldPoint( this.spo2_ap_w_2d_m));
         
         var v_relative_2d_mps = v_spo1_ap_2d_mps.subtract( v_spo2_ap_2d_mps);
         var v_relative_alongNormal_2d_mps = v_relative_2d_mps.projection_onto( this.p1p2_separation_2d_m);
         if (v_relative_alongNormal_2d_mps == null) v_relative_alongNormal_2d_mps = v_relative_2d_mps.scaleBy(0.0);
         
         var damper_force_on_1_2d_N = v_relative_alongNormal_2d_mps.scaleBy( this.damper_Ns2pm2);
         // This damper force acts in opposite directions for each of the two pucks. 
         if (this.spo1.constructor.name == "Puck") {
            // Again, notice the negative sign here, opposite to the spring force.
            this.spo1.nonCOM_2d_N.push({'force_2d_N': damper_force_on_1_2d_N.scaleBy( -1), 'point_w_2d_m': this.spo1_ap_w_2d_m});
         }
         if (this.spo2.constructor.name == "Puck") {
            this.spo2.nonCOM_2d_N.push({'force_2d_N': damper_force_on_1_2d_N.scaleBy( +1), 'point_w_2d_m': this.spo2_ap_w_2d_m});   
         }
      }
      /* 
      The following drag forces act at the puck's COM.

      These forces are not calculated for the b2d distance joints. So, 
      need these in order to reproduce the behavior of the old cursor strings 
      (now springs). These are based on the velocity of the pucks (not 
      relative speed as is the case above for damper forces). 
      
      This adds to (vector add using addTo) the puck's sprDamp_force_2d_N 
      vector. By the time you've looped through all the springs, you get the 
      NET damping force, on each puck COM, applied by all the individual springs. 
      This aggregate is reset (zeroed) after the movements are calculated. 
      */
      if (this.spo1.constructor.name == "Puck") {
         this.spo1.sprDamp_force_2d_N.addTo( this.spo1.velocity_2d_mps.scaleBy( -1 * this.drag_c));
      }
      if (this.spo2.constructor.name == "Puck") {
         this.spo2.sprDamp_force_2d_N.addTo( this.spo2.velocity_2d_mps.scaleBy( -1 * this.drag_c));
      }
   }
   Spring.prototype.inMultiSelect = function() {
      if ((this.spo1.name in gW.hostMSelect.map) && (this.spo2.name in gW.hostMSelect.map)) {
         return true;
      } else {
         return false;
      }
   }
   Spring.prototype.report = function( ) {
      let stretchValue, lengthPhrase, dragPhrase, springNature;
      if ( ! this.fixedLength) {
         // Getting a little fancy here: putting a sign (+-) a space away from the absolute value of the stretch.
         if (this.stretch_m > 0) {
            stretchValue = " [base]+ " + this.stretch_m.toFixed(2) + "[base]";
         } else {
            // &#8722; is the code for a minus sign. A true minus sign is better than a dash from keyboard (which is wider than a plus sign).
            stretchValue = " [base,cyan]" + String.fromCharCode(8722) + " " + Math.abs(this.stretch_m).toFixed(2) + "[base]";
         }
         lengthPhrase = "\\  length + stretch : " + this.length_m.toFixed(2) + stretchValue + " = " + (this.length_m + this.stretch_m).toFixed(2);
         
         // This spring is modeled as Hooke's if this.softConstraints is undefined or false.
         springNature = (this.softConstraints === true) ? "soft constraint" : "Hooke's Law";
         
      } else {
         lengthPhrase = "\\  length = " + this.length_m.toFixed(2);
         springNature = "fixed length";
      }
      
      dragPhrase = (this.drag_c > 0) ? ", drag = " + this.drag_c.toFixed(2) : "";
      
      let objReport = "spring: [base,yellow]" + this.name + "[base]" + " (" + springNature + ")" +
                      "\\  k = " + this.strength_Npm.toFixed(2) + ", unstretched width = " + this.unstretched_width_m.toFixed(3) + 
                      lengthPhrase +
                      "\\  damping = " + this.damper_Ns2pm2.toFixed(2) + dragPhrase;
      if (gW.getDemoVersion().slice(0,3) == "5.c") {
        let pendulumPeriod = 2 * Math.PI * Math.sqrt( (this.length_m + this.stretch_m) / gW.getG_mps2() );
        let springPeriod   = 2 * Math.PI * Math.sqrt( gW.aT.puckMap['puck2'].mass_kg / this.strength_Npm );
        let ratio_PS = pendulumPeriod / springPeriod;
        objReport+= 
                    "\\ \\pendulum T = " + pendulumPeriod.toFixed(1) + " s" +
                    "\\spring T = " + springPeriod.toFixed(1) + " s" +
                    "\\ratio = " + ratio_PS.toFixed(2);
      }
      gW.messages['help2'].newMessage( objReport, 0.05);
   }
   Spring.prototype.draw = function( drawingContext) {
      let alpha = 0.7, width_m;
      // Update endpoints and the normal vector calculated from them...
      this.calculateSeparation();
      
      if ((this.navigationForNPC && gW.dC.editor.checked) || (!this.visible && gW.dC.editor.checked) || (this.visible && !this.navigationForNPC)) {
         /*
         // These two width calculations will cause some discontinuity in how the springs look if they are being
         // length adjusted between zero and non-zero, especially for a puck in gravity on a zero-length spring. It's a compromise.
         if (this.length_m == 0) {
            // This version looks better for zero-length (pinned pucks)
            var width_m = this.unstretched_width_m * (1 - (0.40 * this.p1p2_separation_m));
         } else {
            // This version of the width calculation conserves the area of the spring.
            var width_m = (this.unstretched_width_m * this.length_m) / this.p1p2_separation_m;
         }
         */
         
         /* This is one way to deal with zero-length springs in the width 
         calculation that follow and does not produce the discontinuity of the 
         old method (above). The length_min_m effectively gives the spring some 
         cross-sectional area to stretch, and calculate a non-zero width. You may 
         still see some less-than-ideal behavior for a zero-length spring in 
         gravity as the length is dynamically increased from zero. */ 
         let length_min_m = (this.length_m < 0.6) ? 0.6 : this.length_m; // 0.8
         
         // protect from divide-by-zero
         let separation_min_m = (this.p1p2_separation_m < 0.01) ? 0.01 : this.p1p2_separation_m;
         // conservation of area:  unstretched_width * length  =  width * (length + stretch)
         width_m = this.unstretched_width_m * length_min_m / separation_min_m;
         
         // conservation of volume:  unstretched_width^2 * length  =  width^2 * (length + stretch)
         //width_m = Math.sqrt( Math.pow( this.unstretched_width_m, 2) * length_min_m / separation_min_m);
         
         // note: also played with this non-conserving width calculation
         //let width_m = this.unstretched_width_m * (1 -  0.25 * (this.stretch_m / length_min_m));
         
         // Prevent the width value from getting too large.
         if (width_m > (3 * this.unstretched_width_m)) {
            width_m = 3 * this.unstretched_width_m;
         }
         
         var width_px = wS.px_from_meters( width_m);
         if (width_px < 2) width_px = 2;
         
         var fillColor = (drawingContext.globalCompositeOperation == 'screen') ? 'white' : this.color;
         
         if (this.selected) {
            var dashArray = [3];
            // Must use the default 'butt' ends if the lines are dashed.
            // Note: dashed lines require surprising CPU drain.
            var lineCap = 'butt';
         } else {
            if (this.name == Spring.nameForPasting) {
               var dashArray = [5,1]; // pattern: 5px solid, 1px gap, ...
               var lineCap = 'butt';
               alpha = 1.0; // source spring for pasting will render brighter.
            } else if (this.name == gW.hostMSelect.candidateReportPasteDelete) {
               var dashArray = [5];
               var lineCap = 'butt';
               fillColor = 'white';
               alpha = 1.0;
            } else {
               // If not dashed, you can use the fancy 'round' ends. Nice.
               var dashArray = [0];
               var lineCap = 'round';
            }
         }
         
         if ( ! gW.getPauseErase()) {
            
            // This spring may be a cursor spring (this.forCursor is true). In that case, the name of the spring is also the client name. So
            // you'll see references to this.forCursor followed by references to the client in the clients map using the spring's name.             
            
            // Draw the spring.
            if (this.spo1_ap_w_2d_px && this.spo2_ap_w_2d_px) {
               this.drawLine( drawingContext, this.spo1_ap_w_2d_px, this.spo2_ap_w_2d_px,
                  {'width_px':width_px, 'color':fillColor, 'dashArray':dashArray, 'alpha':alpha, 'lineCap':lineCap} );
                  
               // small circle at each end
               this.drawCircle( drawingContext, this.spo1_ap_w_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'lightgray', 'radius_px':3});
               this.drawCircle( drawingContext, this.spo2_ap_w_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'lightgray', 'radius_px':3});
               
               // draw extension line for monkeyhunt...
               if ( gW.getDemoVersion().includes('monkeyhunt') &&
                   (this.forCursor) && (gW.clients[this.name].ctrlShiftLock) && (gW.clients[this.name].selectedBody.constructor.name == "Puck") && (gW.clients[this.name].key_ctrl != "D") &&
                   ( ! gW.clients[this.name].compoundBodySelected()) ) {
                  
                  let extensionPoint_2d_m = this.spo1_ap_w_2d_m.add( this.p1p2_normalized_2d.scaleBy( 20.0));
                  let extensionPoint_2d_px = wS.screenFromWorld( extensionPoint_2d_m);
                  this.drawLine( drawingContext, this.spo1_ap_w_2d_px, extensionPoint_2d_px,
                     {'width_px':2, 'color':'white', 'dashArray':[3], 'alpha':0.5, 'lineCap':lineCap} );
               }
            }
               
            // Draw a line to indicate the locked-speed value for puck shots.
            var readyToShoot = (this.forCursor) && (((gW.clients[this.name].key_ctrl == "D") && (gW.clients[this.name].key_shift == "D")) || (gW.clients[this.name].ctrlShiftLock));
            if ((readyToShoot) && (gW.clients[this.name].poolShotLocked)) {
               // normal vector along the spring.
               if ( ! this.p1p2_separation_2d_m.zeroLength()) {
                  // 1/2*m*v^2 = 1/2*k*x^2
                  var energyAtLockSpeed_J = 0.5 * gW.clients[this.name].selectedBody.mass_kg * Math.pow( gW.clients[this.name].poolShotLockedSpeed_mps, 2);
                  var stretchAtLockSpeed_m = Math.pow( 2 * energyAtLockSpeed_J / this.strength_Npm, 0.5);
                  
                  // Don't extend the indicator line past the ghost ball (ghost must be separated enough to show the speed lock segment).  
                  if (stretchAtLockSpeed_m < this.p1p2_separation_m) {
                     var endPoint_2d_m = this.p1p2_normalized_2d.scaleBy( stretchAtLockSpeed_m).add( this.spo2_ap_w_2d_m);
                  } else {
                     var endPoint_2d_m = this.spo1_ap_w_2d_m;
                  }
                  var endPoint_2d_px = wS.screenFromWorld( endPoint_2d_m);
                  
                  // For the yellow client, shift to a red indicator.
                  var indicatorColor = (fillColor == 'yellow') ? 'red':'yellow';
                  
                  // Draw line from the source ball (object 2) out to the endpoint, toward the cursor and the ghost ball (object 1).
                  this.drawLine( drawingContext, this.spo2_ap_w_2d_px, endPoint_2d_px,
                     {'width_px':width_px * 2.0, 'color':indicatorColor, 'dashArray':dashArray, 'alpha':alpha, 'lineCap':lineCap} );
               }
            }
         }
      }
   }
   
   
   
   function Wall( position_2d_m, pars) {
      dFM.DrawingFunctions.call(this); // inherit
      
      this.parsAtBirth = pars;
      
      let result = assignName( pars.name, Wall.nameIndex, "wall", "wallMap");
      this.name = result.name;
      Wall.nameIndex = result.index;
      
      gW.aT.wallMap[this.name] = this;
      
      // Position of Center of Mass (COM)
      this.position_2d_m = wS.Vec2D_check( position_2d_m);
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
      
      this.fence = uT.setDefault( pars.fence, false);
      this.fenceLeg = uT.setDefault( pars.fenceLeg, null);
      if (this.fenceLeg == 'top') Wall.topFenceLegName = this.name; // For use in pi-calc demos
      
      this.sensor = uT.setDefault( pars.sensor, false);
      this.visible = uT.setDefault( pars.visible, true);
      
      this.velocity_2d_mps = uT.setDefault( pars.velocity_2d_mps, new wS.Vec2D(0.0, 0.0));
      // Make sure this is a Vec2D vector (e.g. when restoring from a capture).
      this.velocity_2d_mps = wS.Vec2D_from_b2Vec2( this.velocity_2d_mps);
      
      this.angle_r = uT.setDefault( pars.angle_r, 0.0);
      this.angularSpeed_rps = uT.setDefault( pars.angularSpeed_rps, 0.0);
      
      // Dimensions (as specified in box2D)
      this.half_width_m  = uT.setDefault( pars.half_width_m , 0.5);
      this.half_height_m = uT.setDefault( pars.half_height_m, 2.5);
      
      // Calculate these characteristics in screen units (pixels).
      this.half_width_px = wS.px_from_meters( this.half_width_m);
      this.half_height_px = wS.px_from_meters( this.half_height_m);

      Wall.color_default = "darkgray"; // white
      this.color = uT.setDefault( pars.color, Wall.color_default);
      
      // Local selection point where candidate revolute joints can be attached.
      this.selectionPoint_l_2d_m = new wS.Vec2D(0,0);
      
      this.deleted = false;
      
      this.monkeyHunt = uT.setDefault( pars.monkeyHunt, false);
      
      // All parameters should be set above this point.
      
      this.b2d = null;
      this.create_b2d_wall();
      // Create a reference back to this wall from the b2d wall.
      gW.tableMap.set(this.b2d, this);
   }
   Wall.nameIndex = 0;
   Wall.topFenceLegName = null; // For use in pi-calc demos
   Wall.applyToAll = function( doThis) {
      for (var wallName in gW.aT.wallMap) {
         //console.log("name in applyToAll="+wallName);
         var wall = gW.aT.wallMap[ wallName];
         doThis( wall);
      }
   }
   Wall.deleteAll = function() {
      Wall.applyToAll( wall => {
         gW.tableMap.delete( wall.b2d);
         if (wall.b2d) gW.b2d.world.DestroyBody( wall.b2d);
      });
      gW.aT.wallMap = {};
      Wall.nameIndex = 0;
   }
   Wall.makeFence = function( pars = {}, canvas) {
      // Build perimeter fence (4 walls) using the canvas dimensions.
      
      var width_m  = wS.meters_from_px( canvas.width );
      var half_width_m = width_m / 2.0;
      
      var height_m = wS.meters_from_px( canvas.height);
      var half_height_m = height_m / 2.0;
      
      var wall_thickness_m = 0.10;
      
      var pull_in_m = 0.0;
      
      // By default, all four walls of the fence are generated.
      var tOn = uT.setDefault( pars.tOn, true);
      var bOn = uT.setDefault( pars.bOn, true);
      var lOn = uT.setDefault( pars.lOn, true);
      var rOn = uT.setDefault( pars.rOn, true);
      
      var short_wide_dimensions  = {'fence':true, 'half_width_m':half_width_m,         'half_height_m':wall_thickness_m/2.0};
      var tall_skinny_dimensions = {'fence':true, 'half_width_m':wall_thickness_m/2.0, 'half_height_m':half_height_m};
            
      // Add four bumper walls to the table.
      // top
      if (tOn) new Wall( new wS.Vec2D( half_width_m, height_m - pull_in_m), Object.assign({'fenceLeg':'top'},    short_wide_dimensions) );
      // bottom
      if (bOn) new Wall( new wS.Vec2D( half_width_m,     0.00 + pull_in_m), Object.assign({'fenceLeg':'bottom'}, short_wide_dimensions) );
      // left
      if (lOn) new Wall( new wS.Vec2D(    0.00 + pull_in_m, half_height_m), Object.assign({'fenceLeg':'left'},   tall_skinny_dimensions) );
      // right
      if (rOn) new Wall( new wS.Vec2D( width_m - pull_in_m, half_height_m), Object.assign({'fenceLeg':'right'},  tall_skinny_dimensions) );
   }
   Wall.deleteFence = function() {
      Wall.applyToAll( wall => {
         if (wall.fence) {
            wall.deleteThisOne({});
         }
      });
   }
   Wall.deleteAllButFence = function() {
      Wall.applyToAll( wall => {
         if ( ! wall.fence) {
            wall.deleteThisOne({});
         }
      });
   }
   Wall.checkForFence = function() {
      let foundFence = false;
      Wall.applyToAll( wall => {
         if (wall.fence) {
            foundFence = true;
         }
      });
      return foundFence;
   }
   Wall.getFenceParms = function() {
      let fenceParms = {'bOn':false, 'tOn':false, 'rOn':false, 'lOn':false};
      Wall.applyToAll( wall => {
         if (wall.fence) {
            if (wall.fenceLeg) {
               if (wall.fenceLeg == "top") {
                  fenceParms['tOn'] = true; 
               } else if (wall.fenceLeg == "bottom") {
                  fenceParms['bOn'] = true; 
               } else if (wall.fenceLeg == "right") {
                  fenceParms['rOn'] = true; 
               } else if (wall.fenceLeg == "left") {
                  fenceParms['lOn'] = true; 
               }
            } else {
               // Try to identify the section of fence by its location.
               if (wall.position_2d_m.x == 0) {
                  fenceParms['lOn'] = true;
               } else if (wall.position_2d_m.y == 0) {
                  fenceParms['bOn'] = true;
               } else if (wall.position_2d_m.y > wall.position_2d_m.x) {
                  fenceParms['tOn'] = true;
               } else if (wall.position_2d_m.x > wall.position_2d_m.y) {
                  fenceParms['rOn'] = true;
               }
            }
         }
      });
      return fenceParms;
   }
   Wall.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods
   Wall.prototype.constructor = Wall; // Rename the constructor (after inheriting)
   Wall.prototype.inMultiSelect = function() {
      return (this.name in gW.hostMSelect.map);
   }
   Wall.prototype.deleteThisOne = function( pars) {
      var deleteMode = uT.setDefault( pars.deleteMode, null);
      
      // Delete reference in the tableMap.
      gW.tableMap.delete( this.b2d);
      
      // Delete the corresponding Box2d object.
      gW.b2d.world.DestroyBody( this.b2d);
      
      // Mark this wall as deleted. Therefore, any springs or joints that
      // have a reference to this wall will be removed in the game loop.
      this.deleted = true;
      
      // Remove this wall from the wall map.
      delete gW.aT.wallMap[ this.name];
      // ...and from the multi-select map.
      gW.hostMSelect.removeOne( this);
   }
   Wall.prototype.copyThisOne = function( pars) {
      var position_2d_m = uT.setDefault( pars.position_2d_m, this.position_2d_m);
      
      return new Wall( position_2d_m, 
                        {'half_width_m':this.half_width_m, 
                         'half_height_m':this.half_height_m, 
                         'angle_r':this.angle_r, 
                         'angularSpeed_rps':this.angularSpeed_rps,
                         'monkeyHunt':this.monkeyHunt});
   }
   Wall.prototype.define_fixture = function( pars) {
      // Note that the default behavior is to have all scaling factors at 1.0 which only updates the box2d attributes
      // to correspond to those of the Wall object.
      this.width_scaling = uT.setDefault( pars.width_scaling, 1.0);
      this.height_scaling = uT.setDefault( pars.height_scaling, 1.0);
      
      var fixDef = new b2DW.FixtureDef;      
      fixDef.shape = new b2DW.PolygonShape;
      
      if (this.sensor) fixDef.isSensor = true;
      
      // Apply the scaling factors to the current width and height.
      this.half_width_m *= this.width_scaling;
      this.half_height_m *= this.height_scaling;
      
      this.half_width_px = wS.px_from_meters( this.half_width_m);
      // Don't let it get too skinny because it becomes hard to select.
      if (this.half_width_px < 1) {
         this.half_width_px = 1;
         this.half_width_m = wS.meters_from_px( this.half_width_px);
      }
      
      this.half_height_px = wS.px_from_meters( this.half_height_m);
      if (this.half_height_px < 1) {
         this.half_height_px = 1;
         this.half_height_m = wS.meters_from_px( this.half_height_px);
      }
      
      fixDef.shape.SetAsBox(this.half_width_m, this.half_height_m);
      
      return fixDef;
   }
   Wall.prototype.create_b2d_wall = function() {
      // Create a rectangular box2d object.
      
      var bodyDef = new b2DW.BodyDef;
      // When initially tried the b2_kinematicBody type, had trouble with collisions after using the mouse to
      // rotate the wall. Collisions (post wall rotation) would clear off the table, delete all pucks.
      // So played around with animating (see updateStaticBodyState method below) a static body, to avoid this issue. 
      // But of course, kinematic bodies can have their movement represented in the engine and so can model
      // collisions with things like a moving paddle. So the kinematic body is really needed if the walls are
      // going to be rotating. Also see the key_t block of the keydown event handler in gwModule.
      bodyDef.type = b2DW.Body.b2_kinematicBody; // b2_kinematicBody b2_staticBody
      
      this.b2d = gW.b2d.world.CreateBody( bodyDef);
      this.b2d.CreateFixture( this.define_fixture({}));
      
      // Set the state: position and velocity (angle and angular speed).
      this.b2d.SetPosition( this.position_2d_m);
      this.b2d.SetAngle( this.angle_r);
      if (this.b2d.m_type != b2DW.Body.b2_staticBody) {
         this.b2d.SetLinearVelocity( this.velocity_2d_mps);
         this.b2d.SetAngularVelocity( this.angularSpeed_rps);
      }
   }
   Wall.prototype.setPosition = function( newPosition_2d_m, angle_r = 0.0) {
      this.position_2d_m = newPosition_2d_m;
      this.b2d.SetPosition( newPosition_2d_m);
      this.angle_r = angle_r;
      this.b2d.SetAngle( this.angle_r);
   }
   Wall.prototype.setVelocity = function( newVelocity_2d_mps) {
      if ( ! this.b2d.IsAwake()) this.b2d.SetAwake( true);
      this.velocity_2d_mps = newVelocity_2d_mps;
      this.b2d.SetLinearVelocity( newVelocity_2d_mps);
   }
   Wall.prototype.interpret_editCommand = function( command) {
      // If you are going to modify the fixture dimensions you have to delete
      // the old one and make a new one. The m_fixtureList linked list always
      // points to the most recent addition to the linked list. If there's only
      // one fixture, then m_fixtureList is a reference to that single fixture.
      
      var width_factor = 1.0;
      var height_factor = 1.0;
      
      gW.aT.hack['pwsEdits'] = true;
      
      if (command == 'wider') {
         width_factor = 1.1;
      } else if (command == 'thinner') {
         width_factor = 1.0/1.1;
         
      } else if (command == 'taller') {
         height_factor = 1.1;
      } else if (command == 'shorter') {
         height_factor = 1.0/1.1;
         
      } else if (command == 'noChange') {
         // don't change anything.
      }
      
      this.b2d.DestroyFixture( this.b2d.m_fixtureList);
      this.b2d.CreateFixture( this.define_fixture({'width_scaling':width_factor,'height_scaling':height_factor}));
      
      var dimensionsReport = "half width, half height = " + this.half_width_m.toFixed(3) + ", " + this.half_height_m.toFixed(3) + " m";
      gW.messages['help'].newMessage( dimensionsReport, 1.0);
      
      // As the wall is resized, adjust attachment points, and multiselect points.
      adjustAttachments( this, width_factor, height_factor);
   }
   Wall.prototype.draw_MultiSelectPoint = function( drawingContext) {
      var selectionPoint_2d_px;
      if ( ! gW.dC.comSelection.checked) {
         selectionPoint_2d_px = wS.screenFromWorld( this.b2d.GetWorldPoint( this.selectionPoint_l_2d_m));
      } else {
         selectionPoint_2d_px = this.position_2d_px;
      }
      this.drawCircle( drawingContext, selectionPoint_2d_px, {'borderColor':'black', 'borderWidth_px':1, 'fillColor':'yellow', 'radius_px':5});
   }
   Wall.prototype.getPosition = function() {
      this.position_2d_m = wS.Vec2D_from_b2Vec2( this.b2d.GetPosition());
      this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
   }
   Wall.prototype.updateStaticBodyState = function() { 
      // If modeling walls with static box2d bodies, must animate them directly. Compare
      // with pins, which always use kinematic bodies; they don't have animation code like this.
      // (see comment in create_b2d_wall)
      if (this.b2d.m_type == b2DW.Body.b2_staticBody) {
         this.position_2d_m = wS.Vec2D_from_b2Vec2( this.b2d.GetPosition());      
         this.position_2d_px = wS.screenFromWorld( this.position_2d_m);
         this.position_2d_m.addTo( this.velocity_2d_mps.scaleBy( gW.getDeltaT_s()));
         this.b2d.SetPosition( wS.b2Vec2_from_Vec2D( this.position_2d_m));
         
         this.angle_r += this.angularSpeed_rps * gW.getDeltaT_s();
         this.b2d.SetAngle( this.angle_r);
      }
   }   
   Wall.prototype.draw = function( drawingContext) {
      // (see comment in create_b2d_wall)
      
      // Update the position of the wall's center point and it's body angle.
      if (this.b2d.m_type == b2DW.Body.b2_kinematicBody) {
         this.angle_r = this.b2d.GetAngle();
         this.getPosition();
      }
      
      // However, directly use the vertices of the rectangle for drawing.
      if (this.visible) {
         this.drawPolygon( drawingContext, bS.b2d_getPolygonVertices_2d_px( this.b2d), {'borderColor':this.color, 'borderWidth_px':0, 'fillColor':this.color});
      }
   }
   
      
   
   // Energy, Momentum, and Angular Momentum (and Speed) report
   // Note: no prototypes here.
   var m_EpL = {
      'displayReport': false, 
      'reportType': 'EpL',
      'reportString': 'initial test',
      'angularAxis_2d_m': new wS.Vec2D(1.75,1.75),
      'pinName': null,
      'COM': false,
   };
   m_EpL.toggle = function( pars={}) { 
      let angularAxis_2d_m = uT.setDefault( pars.angularAxis_2d_m, m_EpL.angularAxis_2d_m);
      
      if (m_EpL.displayReport) {
         m_EpL.turnDisplayOff({});
      } else {
         m_EpL.turnDisplayOn({'angularAxis_2d_m': angularAxis_2d_m});
      }
   }
   m_EpL.turnDisplayOff = function( pars={}) { 
      m_EpL.displayReport = false;
      if (m_EpL.pinName) m_EpL.deleteEditPin();
   }
   m_EpL.turnDisplayOn = function( pars={}) {
      m_EpL.angularAxis_2d_m = uT.setDefault( pars.angularAxis_2d_m, m_EpL.angularAxis_2d_m);
      
      // If the EpL axis is not visible on the current canvas, move it into view.
      let inCanvas = wS.pointInCanvas( gW.get_hostCanvasWH(), wS.screenFromWorld( m_EpL.angularAxis_2d_m))
      if ( ! inCanvas) m_EpL.angularAxis_2d_m = new wS.Vec2D(1.75,1.75);
      
      m_EpL.displayReport = true;
      if (m_EpL.pinName) { 
         gW.aT.pinMap[ m_EpL.pinName].setPosition( m_EpL.angularAxis_2d_m);
      } else if (gW.dC.editor.checked) {
         m_EpL.createEditPin( m_EpL.angularAxis_2d_m);
      } 
   }
   m_EpL.createEditPin = function( pars={}) {
      m_EpL.pinName = 'L-axis';
      new Pin( m_EpL.angularAxis_2d_m, {'visible':false, 'name':m_EpL.pinName});
   }
   m_EpL.deleteEditPin = function( pars={}) {
      let thisPin = gW.aT.pinMap[ m_EpL.pinName];
      thisPin.deleteThisOne({'deleteMode':'fromEpL'});
      m_EpL.pinName = null;
   }
   m_EpL.updateAxisPosition = function( pars={}) {
      m_EpL.angularAxis_2d_m = gW.aT.pinMap[ m_EpL.pinName].position_2d_m;
   }
   m_EpL.generateReport = function() {
      if (gW.dC.editor.checked && m_EpL.pinName) m_EpL.updateAxisPosition();
      m_EpL.reportString = "";
      
      if (m_EpL.reportType == "EpL") {
         let l_total = 0, l_total_spin = 0, l_total_orbital = 0;
         let ke_total = 0, ke_total_rotational = 0, ke_total_translational = 0;
         let pe_total = 0;
         let e_total = 0, pe = 0;
         let px_total = 0, px, py_total = 0, py;
         
         Puck.applyToAll( puck => {
            let l_orbital = puck.angularMomentum_Orbital();
            let l_spin = puck.angularMomentum_Spin();
            l_total_spin += l_spin;
            l_total_orbital += l_orbital;
            l_total = l_total_orbital + l_total_spin;
            
            let ke_translational = puck.energyKinetic_translational();
            let ke_rotational = puck.energyKinetic_rotational();
            ke_total_rotational += ke_rotational; 
            ke_total_translational += ke_translational;
            ke_total = ke_total_translational + ke_total_rotational;
            
            pe = puck.potentialEnergy();
            pe_total += pe;
            
            px = puck.mass_kg * puck.velocity_2d_mps.x;
            py = puck.mass_kg * puck.velocity_2d_mps.y;
            px_total += px;
            py_total += py;
            
            let shortName = puck.name.replace('puck','p');
            
            m_EpL.reportString += shortName.padStart(5,' ') + " "  + uT.fixed( pe, 1) +
                                                              ""  + uT.fixed( ke_translational, 2) + "" + uT.fixed( ke_rotational, 2) + 
                                                              ""  + uT.fixed( l_orbital, 2)        + "" + uT.fixed( l_spin, 2) + 
                                                              ""  + uT.fixed( px, 2)               + "" + uT.fixed( py, 2) + "\\";
         });
         
         Spring.applyToAll( spring => {
            pe = spring.potentialEnergy();
            m_EpL.reportString += spring.name.padStart(5,' ') + " " + uT.fixed( pe, 1) + "\\";
            pe_total += pe;
         });
         
         e_total = ke_total + pe_total;
         let totalsString = "                                " + "\\" +
                        "[base,cyan]  AGG " + uT.fixed( e_total, 1) + "[base]<----E--------[base,cyan]" + uT.fixed( l_total, 2) + "[base]<----L--  --P--------\\" +
                        "          PE    KEt    KEr     Lo     Ls     Px     Py \\" +
                        "[base,cyan]total " + uT.fixed( pe_total, 1) + "" +
                                               uT.fixed( ke_total_translational, 2) + "" + uT.fixed( ke_total_rotational, 2) + "" +
                                               uT.fixed( l_total_orbital, 2)        + "" + uT.fixed( l_total_spin, 2) + "" +
                                               uT.fixed( px_total, 2)               + "" + uT.fixed( py_total, 2) + "[base]\\";
         
         m_EpL.reportString = totalsString + m_EpL.reportString;
      
      } else if (m_EpL.reportType == "speed") {
         let orbit_result = "", orbit_title = "", orbit_radius_m; 
         
         // Before displaying the orbit rate, check to see if the current demo (or a capture there of) is in this list.
         let demoHasOrbits = uT.oneOfThese(['4.b','5.b','5.b.two','5.a.orbitingOnSpring'], gW.getDemoVersion());
         let stillHasSpring = (Object.keys( gW.aT.springMap).length >= 1);
         
         Puck.applyToAll( puck => {
            let shortName = puck.name.replace('puck','p');
            let puckSpeed_mps = puck.velocity_2d_mps.length();
            
            if (demoHasOrbits && stillHasSpring) {
               let orbit_radius_2d_m = puck.position_2d_m.subtract( Puck.findCenterOfMass());
               orbit_radius_m = orbit_radius_2d_m.length();
               // This cross product is negative if the motion is clockwise.
               let rCrossV = orbit_radius_2d_m.cross( puck.velocity_2d_mps);
               let orbit_tangentialSpeed_mps = rCrossV / orbit_radius_m;
               let orbit_angularSpeed_rps = orbit_tangentialSpeed_mps / orbit_radius_m;
               
               orbit_result = "" + uT.fixed( orbit_angularSpeed_rps, 2);
               orbit_title = "  Orbit";               
            }
            
            m_EpL.reportString += shortName.padStart(5,' ') + " " + uT.fixed( puckSpeed_mps, 2) + uT.fixed( orbit_radius_m, 2) + orbit_result + 
                                  ""  + uT.fixed( puck.angularSpeed_rps, 2) + "\\";
         });
         
         let puckHeader = "\\ \\ \\        Speed Radius" + orbit_title + "   Spin  \\";
         
         m_EpL.reportString = puckHeader + m_EpL.reportString;
         
         if (Object.keys( gW.aT.springMap).length >= 1) {
            let springHeader = "\\       Length Stretch Total\\";
            m_EpL.reportString += springHeader;
            
            Spring.applyToAll( spring => {
               let totalLength_m = spring.length_m + spring.stretch_m;
               m_EpL.reportString += spring.name.padStart(5,' ') + " " + uT.fixed( spring.length_m, 2) + 
                                     "" + uT.fixed( spring.stretch_m, 2) + "" + uT.fixed( totalLength_m, 2) + "\\";
            });
         }
      }
      
      gW.messages['EpLreport'].newMessage( m_EpL.reportString, 0.1);
   }
   
   
   
   ///////////////////////////////////////////////////////////////////////////
   // Miscellaneous functions
   ///////////////////////////////////////////////////////////////////////////
   
   function adjustAttachments( puckOrWall, width_factor, height_factor) {
      // As the puck (or wall) is resized, adjust attachment points, and multiselect points.
      if (puckOrWall.inMultiSelect()) {
         puckOrWall.selectionPoint_l_2d_m.x *= width_factor;
         puckOrWall.selectionPoint_l_2d_m.y *= height_factor;
      }
      Spring.applyToAll( spring => {
         if ((puckOrWall == spring.spo1) || (puckOrWall == spring.spo2)) {
            // Adjust the attachment points similar to the puck (or wall) size adjustments.
            if (puckOrWall == spring.spo1) {
               spring.spo1_ap_l_2d_m.x *= width_factor;
               spring.spo1_ap_l_2d_m.y *= height_factor;
            } 
            if (puckOrWall == spring.spo2) {
               spring.spo2_ap_l_2d_m.x *= width_factor;
               spring.spo2_ap_l_2d_m.y *= height_factor;
            } 
            // If there's a spring that has one (or both) of its ends attached to this puckOrWall (and the puckOrWall is a puck),
            // and it's a b2d spring (a distance joint), update that b2d spring because the nature of these b2d springs
            // depends on the mass of the pucks they are attached to.
            if ((puckOrWall.constructor.name == "Puck") && spring.softConstraints) spring.updateB2D_spring();
         }
      });
      Joint.applyToAll( joint => {
         if (puckOrWall == joint.jto1) {
            joint.jto1_ap_l_2d_m.x *= width_factor;
            joint.jto1_ap_l_2d_m.y *= height_factor;
            
            joint.b2d.m_localAnchor1.x *= width_factor;            
            joint.b2d.m_localAnchor1.y *= height_factor;            
         } 
         if (puckOrWall == joint.jto2) {
            joint.jto2_ap_l_2d_m.x *= width_factor;
            joint.jto2_ap_l_2d_m.y *= height_factor;
            
            joint.b2d.m_localAnchor2.x *= width_factor;            
            joint.b2d.m_localAnchor2.y *= height_factor;            
         } 
      });
   }
   
   function assignName( candidate, index, baseName, mapName) {
      let name = "";
      let nameInUse = (candidate && gW.aT[ mapName][ candidate]);
      if (candidate && ( ! nameInUse)) {
         name = candidate;
         // Get the number part of the name
         var numberInName = name.slice( baseName.length);
         // Don't change the index if no number in name.
         if (isNaN( numberInName)) {
            numberInName = 0;
         } else {
            numberInName = Number( numberInName);
         }
         index = Math.max( index, numberInName);
      } else {
         index += 1;
         name = baseName + index;
      }
      if (nameInUse) gW.messages['help'].newMessage("The name " + candidate + " is in use. " + name + " was assigned.", 2.0);
      return {'name':name, 'index':index};
   }
   
   
   
   // Public references to objects, variables, and methods
   
   return {
      // object prototypes
      'Puck': Puck,
      'Joint': Joint,
      'Spring': Spring,
      'Wall': Wall,
      'Pin': Pin,

      // general object containers
      'EpL': m_EpL,
      
   };
   
})();