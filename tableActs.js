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

// Table Actions (tA) module
// events.js 
   console.log('tA _*-*_');
// 8:18 PM Sun December 10, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.tA = (function() {
   "use strict";
   
   // module globals for objects brought in by initializeModule
   var x_canvas, x_ctx;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      x_canvas = canvas;
      x_ctx = ctx;
   }

   function newtonsCradle( n_balls = 5, n_moving = 1) {
      gW.hostMSelect.resetAll();
      clearTable("all");
      
      x_canvas.width = 950, x_canvas.height = 800;
      
      for (let i = 0; i < n_balls; i++) {
         let jointLength_m = 6.0;  // 6
         
         let puckRadius_m = 0.5;
         // must have some separation
         let puckSeparation_m = (2 * puckRadius_m) + 0.0001; // 0.0001, 0.001 (5 balls, 1 moving)
         
         let puck_placement_2d_m = new wS.Vec2D(5.0 + (i * puckSeparation_m), 1.5);
         let velocity_2d_mps = new wS.Vec2D(0.0, 0.0);
         let puckPars = {'bullet':true, 'radius_m':puckRadius_m, 'restitution':1.00, 'restitution_fixed':true, 'linDamp':0.0, 'friction':0.0, 'friction_fixed':true, 
                         'angleLine':false, 'colorExchange':true, 'color':'tan'};
         let puck = new cP.Puck( puck_placement_2d_m, velocity_2d_mps, puckPars);
         
         // pins are directly above the pucks
         let pin_placement_2d_m = puck_placement_2d_m.add( new wS.Vec2D(0.0, jointLength_m));
         let pin = new cP.Pin( pin_placement_2d_m, {'radius_px':4, 'fillColor':'tan', 'borderColor':'brown'});
         
         new cP.Spring(puck, pin, {'softConstraints':true, 'fixedLength':true, 'length_m':jointLength_m, 'color':'brown'});
         
         if (i <= n_moving-1) {
            puck.velocity_2d_mps = new wS.Vec2D(-8.0, 0.0); 
         } else {
            puck.velocity_2d_mps = new wS.Vec2D(0.0, 0.0);
         }
         puck.b2d.SetLinearVelocity( puck.velocity_2d_mps);
      } 
      gW.setG_ON(true);
      gW.dC.gravity.checked = gW.getG_ON();
      dS.setGravityRelatedParameters({"updatePucks":false});
   }
   
   function addSpringyChain( placement_2d_m, pars = {}) {
      let n_pucks = uT.setDefault( pars.n_pucks, 30);
      let groupIndex = uT.setDefault( pars.groupIndex, 0);
      let useSprings = uT.setDefault( pars.useSprings, true);
      let puckColor = uT.setDefault( pars.puckColor, 'brown');
      let puckBorder_px = uT.setDefault( pars.puckBorder_px, 0);
      let jointVisibility = uT.setDefault( pars.jointVisibility, false);
      
      let firstPuck, puck_A, puck_B, joint_AB, spring_AB;
      
      let half_width_m = 0.20;
      let jointFromEnd_m = 0.0;
      let puckParameters = {'shape':'rect', 'half_height_m':0.05, 'half_width_m':half_width_m, 'color':puckColor, 'borderColor':'gray', 'borderWidth_px':puckBorder_px, 
                            'angle_r': Math.PI/2, 'groupIndex':groupIndex, 'restitution':0, 'restitution_fixed':true};
      let velocity_2d_m = new wS.Vec2D(0.0,0.0);
      
      let newPuckPosition_2d_m = placement_2d_m.copy();
      
      let angle_delta_r = (2 * Math.PI)/n_pucks;
      let angle_delta_deg = 360/n_pucks;
      
      // spoke length is the distance from the center of the group out to the center of one rectangular puck.
      // tan( angle_delta_r / 2) = opp/adj = half_width_m / spoke_length
      let spokeLength_m = half_width_m / Math.tan( angle_delta_r / 2);
      let spoke_2d_m = new wS.Vec2D( spokeLength_m, 0.0);
      
      let attachSpring = function( puck_1, puck_2) {
         let localPoint_1 = new wS.Vec2D( -half_width_m + jointFromEnd_m, 0.0);
         let localPoint_2 = new wS.Vec2D( +half_width_m - jointFromEnd_m, 0.0);
         let length_m = ((half_width_m - jointFromEnd_m) * 4)  +  1 * half_width_m;
         spring_AB = new cP.Spring( puck_1, puck_2, {'spo1_ap_l_2d_m': localPoint_1 , 'spo2_ap_l_2d_m': localPoint_2,
                                                     'color':'gray', 'unstretched_width_m':0.01, 'length_m':length_m, 'damper_Ns2pm2':0.30, 'strength_Npm':10.0, 'fixedLength':false,
                                                     'visible':false});
      }
      
      for (let i = 1; i <= n_pucks; i++) {
         newPuckPosition_2d_m = placement_2d_m.add( spoke_2d_m);
         puck_B = new cP.Puck( newPuckPosition_2d_m, velocity_2d_m, puckParameters);
         
         if (i==1) {
            firstPuck = puck_B;
            
         } else {
            joint_AB = new cP.Joint( puck_A, puck_B, {'jto1_ap_l_2d_m': new wS.Vec2D( half_width_m - jointFromEnd_m, 0.0), 'jto2_ap_l_2d_m': new wS.Vec2D( -half_width_m + jointFromEnd_m, 0.0),
                                                      'visible':jointVisibility}); 
            if (useSprings) attachSpring( puck_A, puck_B);
         } 
         
         puckParameters.angle_r += angle_delta_r;
         spoke_2d_m.rotated_by( angle_delta_deg);
         puck_A = puck_B;
      }
      
      // join the end of the chain to the first puck.
      joint_AB = new cP.Joint( puck_B, firstPuck, {'jto1_ap_l_2d_m': new wS.Vec2D(  half_width_m - jointFromEnd_m, 0.0), 
                                                   'jto2_ap_l_2d_m': new wS.Vec2D( -half_width_m + jointFromEnd_m, 0.0), 'visible':jointVisibility});
      if (useSprings) attachSpring( puck_B, firstPuck);
   }
   
   function clearTable( wallMode = "all") {
      gW.hostMSelect.resetAll();
      
      // Delete pucks, references to them, and their representation in the b2d world.
      cP.Puck.deleteAll();  // this also resets the jello array...
      
      // Clean out the old springs.
      cP.Spring.deleteAll();
      // Clean out the old joints.
      cP.Joint.deleteAll();
      
      // Clean out the non-player clients
      cT.Client.deleteNPCs();
      
      // Clean out the old pins and their representation in the b2d world.
      cP.Pin.deleteAll();
      
      if (wallMode == "all") {
         // Clean out the old walls and their representation in the b2d world.
         cP.Wall.deleteAll();
         
      } else if (wallMode == "all-but-fence") {
         cP.Wall.deleteAllButFence();
         
      } else if (wallMode == "all-but-walls") {
         // Don't delete any walls.
      }
   }
   
   function tableActions( callAction = null) {
      let tableAction, placement_2d_m, placementByMouse;
      
      if (callAction) {
         tableAction = callAction;
      } else {
         // use the selected value in the remove/add menu.
         tableAction = $('#TableActions').val();
      }
      
      // Don't use clients['local'].mouse_2d_px because that gets clipped in the case of ghost-ball to stay on the table.
      // Refer to the "if (runningGhostBallPool)" block in wS.screenFromRaw_2d_px. So instead, start with the raw
      // screen position and run wS.screenFromRaw_2d_px without clipping (don't specify ghost-ball).
      let positionOnCanvas_2d_px = wS.screenFromRaw_2d_px( x_canvas, gW.clients['local'].raw_2d_px);
      
      placementByMouse = false;
      if (wS.pointInCanvas( x_canvas, positionOnCanvas_2d_px)) {
         placement_2d_m = wS.worldFromScreen( positionOnCanvas_2d_px);
         placementByMouse = true;
      } else {
         placement_2d_m = new wS.Vec2D(2.0,2.0);
         placementByMouse = false;
      }
      
      if (tableAction == "puck-rect") {
         new cP.Puck( placement_2d_m, new wS.Vec2D(0.0,0.0), {'half_width_m':0.2, 'half_height_m':0.2, 'shape':'rect'});
         
      } else if (tableAction == "puck-rect-bullet") {
         if ([7,8].includes( gW.getDemoIndex())) {
            gW.messages['help'].newMessage( "Please choose a regular (non-bullet) puck for demos 7 and 8.", 2.0);
         } else {
            new cP.Puck( placement_2d_m, new wS.Vec2D(0.0,0.0), {'half_width_m':0.6, 'half_height_m':0.02, 'shape':'rect', 'bullet':true});
         }
         
      } else if (tableAction == "toggleBulletSelected") {
         if (gW.hostMSelect.count() == 0) {
            gW.messages['help'].newMessage( gW.hostMSelect.count() + " selected; need at least one.", 2.0);
         } else {
            let n_turnedOn = 0;
            let n_turnedOff = 0;
            gW.hostMSelect.applyToAll( tableObj => {
               if (tableObj.constructor.name == "Puck") {
                  tableObj.bullet = ( ! tableObj.bullet);
                  tableObj.b2d.SetBullet( tableObj.bullet);
                  if (tableObj.bullet) {
                     n_turnedOn++;
                     tableObj.bulletIndication = true;
                  } else {
                     n_turnedOff++;
                     tableObj.bulletIndication = false;
                  }
               }
            });
            gW.messages['help'].newMessage( "[base,yellow]" + n_turnedOn + "[base] turned on; [base,yellow]" + n_turnedOff + "[base] turned off", 2.5);
         }
         
      } else if (tableAction == "revealBullets") {
         let n_bullets = 0;
         cP.Puck.applyToAll( puck => {
            if (puck.bullet) {
               n_bullets++;
               puck.bulletIndication = true;
            }
         });         
         let bulletString = (n_bullets == 1) ? 'bullet':'bullets';
         gW.messages['help'].newMessage( "[base,yellow]" + n_bullets + "[base] " + bulletString + " found.", 2.5);
         
      } else if (tableAction == "hideBullets") {
         let n_bullets = 0;
         cP.Puck.applyToAll( puck => {
            if (puck.bullet) {
               n_bullets++;
               puck.bulletIndication = false;
            }
         });         
         let bulletString = (n_bullets == 1) ? 'bullet':'bullets';
         gW.messages['help'].newMessage( "[base,yellow]" + n_bullets + "[base] " + bulletString + " hidden.", 2.5);
         
      } else if (tableAction == "wall") {
         new cP.Wall( placement_2d_m, {'half_width_m':0.6, 'half_height_m':0.02});
         
      } else if (tableAction == "pin") {
         new cP.Pin( placement_2d_m, {'fillColor':'lightBlue'});
         
      } else if (tableAction == "puck-circle") {
         new cP.Puck( placement_2d_m, new wS.Vec2D(0.0,0.0), {'radius_m':0.2});
         
      } else if (tableAction == "puck-circle-bullet") {
         if ([7,8].includes( gW.getDemoIndex())) {
            gW.messages['help'].newMessage( "Please choose a regular (non-bullet) puck for demos 7 and 8.", 2.0);
         } else {
            new cP.Puck( placement_2d_m, new wS.Vec2D(0.0,0.0), {'radius_m':0.2, 'bullet':true});
         }
         
      } else if (tableAction == "puck-circular-tail") {
         new cP.Puck( placement_2d_m, new wS.Vec2D(0.0,0.0), {'radius_m':0.2, 'createTail':true, 'tail':{'propSpeed_ppf_px':2, 'length_limit':35} });
         
      } else if (tableAction == "spring") {
         // paste default spring...
         eV.pasteSpring(true);
      
      } else if (tableAction == "fixed-length-spring") {
         // default spring with fixed length (distance joint)
         eV.pasteSpring(true, {'fixedLength':true});
         
      } else if (tableAction == "toggle-spring-visibility") {
         cP.Spring.findAll_InMultiSelect( spring => {
            spring.visible = ! spring.visible;
         });  
         
      } else if (tableAction == "clear-table") {
         clearTable("all");
         
      } else if (tableAction == "clear-all-but-walls") {
         clearTable("all-but-walls");
         
      } else if (tableAction == "clear-all-but-fence") {
         clearTable("all-but-fence");
         
      } else if (tableAction == "clear-fence") {
         cP.Wall.deleteFence();
         
      } else if (tableAction == "add-fence") {
         cP.Wall.makeFence({}, x_canvas);
         
      } else if (tableAction == "add-jello") {
         if ((gW.getDemoVersion().slice(0,1) == "7") || (gW.getDemoVersion().slice(0,1) == "8")) { 
            // restitution = 0.7, make it a little bouncy for the bullets...
            jM.makeJello({'gridsize':4, 'addToJello':false, 'offset_2d_m':placement_2d_m, 'restitution':0.7});
            
         } else {
            let addToJello;
            if ((gW.getDemoVersion().slice(0,3) == "6.a") || (gW.getDemoVersion().slice(0,3) == "6.d")) {
               gW.messages['help'].newMessage('Jello added for demos 6.a and 6.d will be timed for tangles.', 2.0);
               addToJello = true;
            } else {
               addToJello = false;
            }
            // restitution = 0.0, make it stable for manipulations...
            jM.makeJello({'gridsize':4, 'addToJello':addToJello, 'offset_2d_m':placement_2d_m, 'restitution':0});
         }
       
      } else if (tableAction == "add-puck-grid") {

         let grid_order = 7;
         let grid_spacing_m = 0.45;
         let startPosition_2d_m = placement_2d_m;
         let v_init_2d_mps = new wS.Vec2D(0.0, 0.0);
         
         for (let i = 1; i <= grid_order; i++) {
            for (let j = 1; j <= grid_order; j++) {
               let delta_2d_m = new wS.Vec2D( i * grid_spacing_m, j * grid_spacing_m);
               let position_2d_m = startPosition_2d_m.add( delta_2d_m);
               new cP.Puck(position_2d_m, v_init_2d_mps, {'radius_m':0.10, 'groupIndex':-1, 'friction':0.0, 'friction_fixed':true});
            }
         }
       
      } else if (tableAction == "add-npc") {
         if ((gW.getDemoVersion().slice(0,1) == "7") || (gW.getDemoVersion().slice(0,1) == "8")) { 
            // A 2-pin navigation track for a single client.
            pP.makeNPC_OnTwoPins( placement_2d_m);
            
         } else {
            gW.messages['help'].newMessage('Add drones in 7, 8, or captures of them.', 2.0);
         } 
                                                                  
      } else if (tableAction == "add-revolute") { 
         eV.addRevoluteJoint();
         
      } else if (tableAction == "add-revolute-limits") { 
         if (gW.hostMSelect.count() >= 2) {
            let noMatchCount = 0;
            cP.Joint.findAll_InMultiSelect( joint => {
               let j_angle_d = (joint.b2d.GetJointAngle() * 180.0/Math.PI);
               let angleFromStraight = 20;
               if (Math.abs( j_angle_d) < 70) {
                  joint.setLimits( -angleFromStraight, angleFromStraight);
                  joint.setEnableLimit( true);
               } else if ((j_angle_d > 360-70) && (j_angle_d < 360+70)) {
                  joint.setLimits( (360-angleFromStraight), (360+angleFromStraight));
                  joint.setEnableLimit( true);
               } else if ((j_angle_d > -360-70) && (j_angle_d < -360+70)) {
                  joint.setLimits( (-360-angleFromStraight), (-360+angleFromStraight));
                  joint.setEnableLimit( true);
               } else {
                  noMatchCount++;
                  joint.setEnableLimit( false);
               }
            });
            console.log("no match = " + noMatchCount);
         } else {
            gW.messages['help'].newMessage('Select at least two bodies using multi-select features.', 3.0);
         }
         
      } else if (tableAction == "toggle-revolute-limits") { 
         if (gW.hostMSelect.count() >= 2) {
            cP.Joint.findAll_InMultiSelect( joint => { 
               if ((joint.lowerLimit_deg) && (joint.upperLimit_deg)) {
                  joint.setEnableLimit( ! joint.enableLimit);
               }
            });
         } else {
            gW.messages['help'].newMessage('Select at least two bodies using multi-select features.', 3.0);
         }
         
      } else if (tableAction == "add-chain") { 
         addSpringyChain( placement_2d_m, {'n_pucks':20, 'groupIndex':0, 'useSprings':false, 'puckColor':'DarkSlateGray', 'puckBorder_px':2, 'jointVisibility':true});
      
      } else if (tableAction == "add-springy-stick") {
         let puck_A, puck_B, joint_AB, spring_AB;
         
         let half_width_m = 0.20;
         let jointFromEnd_m = 0.0;
         let puckParameters = {'shape':'rect', 'half_height_m':0.05, 'half_width_m':half_width_m, 'color':'brown', 'borderColor':'gray', 'borderWidth_px':0, 'angle_r':0};
         let velocity_2d_m = new wS.Vec2D(0.0,0.0);
         
         let firstPuck = new cP.Puck( placement_2d_m, velocity_2d_m, puckParameters);
         
         let newPuckPosition_2d_m = placement_2d_m.copy();
         
         let n_pucks = 30;
         
         puck_A = firstPuck;
         
         for (let i = 1; i <= n_pucks; i++) {
            newPuckPosition_2d_m.addTo( new wS.Vec2D( half_width_m * 2, 0) );
            puck_B = new cP.Puck( newPuckPosition_2d_m, velocity_2d_m, puckParameters);
            
            joint_AB = new cP.Joint( puck_A, puck_B, {'jto1_ap_l_2d_m': new wS.Vec2D( half_width_m - jointFromEnd_m, 0.0), 'jto2_ap_l_2d_m': new wS.Vec2D( -half_width_m + jointFromEnd_m, 0.0),
                                                      'visible':false}); 
            
            let localPoint_A = new wS.Vec2D( -half_width_m + jointFromEnd_m, 0.0);
            let localPoint_B = new wS.Vec2D( +half_width_m - jointFromEnd_m, 0.0);
            let length_m = ((half_width_m - jointFromEnd_m) * 4)  +  1 * half_width_m;
            spring_AB = new cP.Spring( puck_A, puck_B, {'spo1_ap_l_2d_m': localPoint_A , 'spo2_ap_l_2d_m': localPoint_B,
                                                        'color':'gray', 'unstretched_width_m':0.01, 'length_m':length_m, 'damper_Ns2pm2':0.30, 'strength_Npm':10.0, 'fixedLength':false,
                                                        'visible':false});
            puck_A = puck_B;
         }
      
      } else if (tableAction == "add-springy-chain") {
         addSpringyChain( placement_2d_m, {'n_pucks':30, 'groupIndex':-10, 'useSprings':true, 'puckColor':'orange', 'puckBorder_px':0});
               
      } else if (tableAction == "add-pyramid") {       
         let half_height_m = 0.08;
         let half_width_m = 0.10;
         let delta_x_m = half_width_m * 2.05;
         let delta_y_m = half_height_m * 2.05;
         
         let puckParms = {'shape':'rect', 'half_height_m':half_height_m, 'half_width_m':half_width_m, 'restitution':0.7, 'restitution_fixed':true, 'bullet':false};
         let pyramid_rows = 15;
         
         // left side of pyramid goes at placement_2d_m (i.e. mouse position, if on canvas)
         if ( ! placementByMouse) {
            // special default placement for pyramid
            placement_2d_m = new wS.Vec2D( 1, 1);
         }
         // center of ledge 
         let ledge_position_2d_m =  placement_2d_m.add( new wS.Vec2D( (pyramid_rows - 1) * delta_x_m / 2.0, 0.0));
         let ledgeWall = new cP.Wall( ledge_position_2d_m, {'half_width_m': (pyramid_rows + 1) * delta_x_m / 2.0, 'half_height_m':0.02});
         var topEdge_of_ledgeWalll = ledgeWall.position_2d_m.y + ledgeWall.half_height_m;
         
         let velocity_2d_m = new wS.Vec2D( 0.0, 0.0);
         let x_original_position_m = placement_2d_m.x;
         let y_position_m = topEdge_of_ledgeWalll + half_height_m;
         
         for (let i = 0; i < pyramid_rows; i++) {
            let x_position_m = x_original_position_m + (i * (delta_x_m/2.0) );
            for (let j = i; j < pyramid_rows; j++) {
               let puck_pos_2d_m = new wS.Vec2D( x_position_m, y_position_m);
               new cP.Puck( puck_pos_2d_m, velocity_2d_m.copy(), Object.assign({}, puckParms) );
               x_position_m += delta_x_m;
            }
            y_position_m += delta_y_m;
         }
         
         // add a bullet for destructive purposes
         let bulletLedge_pos_2d_m = ledge_position_2d_m.add( new wS.Vec2D(2.5,0));
         new cP.Wall( bulletLedge_pos_2d_m, {'half_width_m':0.10, 'half_height_m':0.02});
         new cP.Puck( bulletLedge_pos_2d_m.add( new wS.Vec2D(0.0,0.05)), velocity_2d_m.copy(), {'radius_m':0.15, 'bullet':true, 'restitution':0.7, 'restitution_fixed':true} );
      
      } else if (tableAction == "add-stack") {
         let half_height_m = 0.08;
         let half_width_m = 0.15;
         let delta_y_m = half_height_m * 2.05;
         
         let puckParms = {'shape':'rect', 'half_height_m':half_height_m, 'half_width_m':half_width_m, 'restitution':0.7, 'restitution_fixed':true, 'bullet':false};
         let stack_rows = 15;
         
         // left side of stack goes at placement_2d_m (i.e. mouse position, if on canvas)
         if ( ! placementByMouse) {
            // special default placement for stack
            placement_2d_m = new wS.Vec2D( 3, 1);
         }
         // center of ledge 
         let ledge_position_2d_m =  placement_2d_m;
         let ledgeWall = new cP.Wall( ledge_position_2d_m, {'half_width_m': half_width_m * 1.2, 'half_height_m':0.02});
         var topEdge_of_ledgeWalll = ledgeWall.position_2d_m.y + ledgeWall.half_height_m;
         
         let velocity_2d_m = new wS.Vec2D( 0.0, 0.0);
         let y_position_m = topEdge_of_ledgeWalll + half_height_m;
         
         for (let j = 0; j < stack_rows; j++) {
            let puck_pos_2d_m = new wS.Vec2D( placement_2d_m.x, y_position_m);
            new cP.Puck( puck_pos_2d_m, velocity_2d_m.copy(), Object.assign({}, puckParms) );
            y_position_m += delta_y_m;
         }
      
      /*
      // Examples used in testing:
      } else if (tableAction == "add-newtons-cradle-1mb") {
         // first, load in the 5h demo (3 moving balls)
         cR.demoStart_fromCapture(5, {'fileName':'demo5h.js'});
         // wait, then run the 1-moving-ball version
         window.setTimeout( function() { 
            newtonsCradle(4,1);
            // capture this to be consistent in the demo world
            cR.saveState({'captureName':'4b-1m'});
         }, 100);
         
      } else if (tableAction == "add-newtons-cradle-3mb") {
         cR.demoStart_fromCapture(5, {'fileName':'demo5h.js'});
         
      } else if (tableAction == "run-newtons-script") {
         newtonsCradle(3,1);     
      */
         
      } else if (tableAction == "align-selected-pucks") {
         gW.hostMSelect.align();
         
      } else if (tableAction == "arc-selected-pucks") {
         gW.hostMSelect.arc( placement_2d_m);
         
      } else if (tableAction == "toggle-projectile-forecast") {
         gB.toggleProjectileForecast();
         
      } else if (tableAction == "toggle-SCM-display") {
         gW.set_displaySCM( ! gW.get_displaySCM()); // System Center of Mass for all pucks
         
      } else if (tableAction == "toggle-MSC-display") {
         gW.set_displayMSC( ! gW.get_displayMSC()); // Multi-Select Center
         
      } else if (tableAction == "toggle-E-p-L-report") {
         // Energy (E), Momentum (p), and Angular Momentum (L) report
         cP.EpL.toggle({'angularAxis_2d_m': placement_2d_m});
         
      } else if (tableAction == "toggle-E-p-L-report-type") {
         if ( ! cP.EpL.displayReport) cP.EpL.turnDisplayOn({'angularAxis_2d_m': placement_2d_m});
         cP.EpL.reportType = (cP.EpL.reportType == "EpL") ? "speed":"EpL";
         
      } else if (tableAction == "Laxis_at_SCM") {
         cP.EpL.turnDisplayOn({'angularAxis_2d_m': cP.Puck.findCenterOfMass()}); // set EpL axis at SCM  
         
      } else if (tableAction == "bullets-from-pucks") {
         let cannibalCount = 0, messageString;
         cT.Client.applyToAll( client => { 
            if (client.name.slice(0,3) != 'NPC') {
               if (client.puck) {
                  cannibalCount++;
                  client.puck.cannibalize = true;
                  client.puck.bullet = true;
                  client.bulletAgeLimit_ms = 60000; // 60s
                  client.puck.linDamp = 0;
                  client.puck.b2d.SetLinearDamping( client.puck.linDamp);
               }
            }
         });
         if (cannibalCount > 0) {
            let cannibalString = (cannibalCount == 1) ? "cannibal" : "cannibals";
            messageString = cannibalCount + " new " + cannibalString;
         } else {
            messageString = "no new cannibals";
         }
         gW.messages['help'].newMessage( messageString, 3.0);
         
      } else if (tableAction == "modify-capture") {
         cR.modifyCapture();
         
      } else if (tableAction == "shift-capture") {
         cR.shiftCapture();
      }
      
      // reset the select element to the placeholder (title) value
      $('#TableActions').val("table-action");
   }

   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'tableActions': tableActions,
      'addSpringyChain': addSpringyChain,
      'newtonsCradle': newtonsCradle,
      'clearTable': clearTable,

   };   
   
})();