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

// Events on Host (eV) module
// eventsHost.js 
   console.log('eV _*-*_');
// 10:18 AM Sun December 10, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.eV = (function() {
   "use strict";
   
   // Module globals for objects brought in by initializeModule and initializeEventListeners.
   var canvas, ctx, dC, c, aT, keyMap, clients, ts;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( gW_canvas, gW_ctx, gW_dC, gW_c, gW_aT, gW_keyMap, gW_clients, gW_ts) {
      canvas = gW_canvas;
      ctx = gW_ctx;
      
      dC = gW_dC;
      c = gW_c;
      aT = gW_aT;     
      keyMap = gW_keyMap;
      clients = gW_clients;
      ts = gW_ts;
      
      initializeEventListeners();
   }
      
   /////////////////////////////////////////////////////
   // Event handlers for the host client (user input)
   /////////////////////////////////////////////////////
   
   function wheelEvent_handler( clientName, e) {
      var client = clients[ clientName];
      
      // Adjust pool-shot speed value.         
      if (client.poolShotLocked) {
         client.poolShotLockedSpeed_mps = Math.round( client.poolShotLockedSpeed_mps);
         if (e.deltaY < 0) {
            client.poolShotLockedSpeed_mps += 1.0;
         } else {
            client.poolShotLockedSpeed_mps -= 1.0;
         }
         gW.messages['help'].newMessage(client.nameString() + ", shot speed locked: [25px Arial,yellow]" + client.poolShotLockedSpeed_mps.toFixed( 1) + "[base] mps", 1.0);
      }
   }
      
   function key_ctrl_handler( mode, clientName) {
      let client = clients[ clientName];
      
      let messageString = "";
      let wordForPuck = (c.demoVersion.slice(0,3) == "3.d") ? 'ball' : 'puck';
      
      if (mode == 'keydown') {
         // When ctrl is depressed, set cursor spring attachment point to the original selection point (not COM).
         if (client.selectedBody) client.cursorSpring.spo2_ap_l_2d_m = client.selectionPoint_l_2d_m;
         if (client.touchScreenUsage) {
            messageString = client.nameString() + " has " + wordForPuck + "-in-hand [base,yellow]ON[base]";
         }
      } else if (mode == 'keyup') {
         if (client.touchScreenUsage) {
            messageString = client.nameString() + " turned " + wordForPuck + "-in-hand [base,yellow]OFF[base]"; 
         }
         
         // Done with the rotation action. Get ready for the next one.
         gW.hostMSelect.resetCenter();
         
         if (client.selectedBody) {
            // Release the one-at-a-time choke on direct movement.
            if (client.name == client.selectedBody.firstClientDirectMove) client.selectedBody.firstClientDirectMove = null;          
            
            // When releasing the ctrl key, change the cursor spring attachment point according to the
            // COM selection control.
            if (dC.comSelection.checked) {
               client.cursorSpring.spo2_ap_l_2d_m = new wS.Vec2D(0,0);
            } else {
               client.cursorSpring.spo2_ap_l_2d_m = client.selectionPoint_l_2d_m;
            }
         }
         
         // Detach the cursor spring. This prevents unintended movement when releasing the control key.
         if (client.key_shift == "D") client.modifyCursorSpring('detach');
         
      } else {
         console.log("not good to be in here...");
      }
      if (messageString != "") gW.messages['help'].newMessage( messageString, 1.0);
   }
      
   function key_b_handler( clientName) {
      let client = clients[ clientName];
      let nameForHelp = client.nameString(true);
      
      if (client.key_alt == 'D') {
         gB.getTableCapture('previous');
         
      } else {
         let notPool = (c.demoVersion.slice(0,3) != "3.d");
         let poolWithGravityOn = ( (c.demoVersion.slice(0,3) == "3.d") && (c.g_ON) );
         if ( (client.fineMovesState == 'off') && (notPool || poolWithGravityOn) ) {
            client.fineMovesState = 'on';
            client.previousFine_2d_px = client.mouse_2d_px;
            gW.messages['lowHelp'].newMessage("[base,lightgray]high-res positioning ("+ nameForHelp +"): [base,yellow]ON[base]", 1.0);
            
         } else if (client.fineMovesState == 'on') {
            wS.exitFineMoves( client.name);
            gW.messages['lowHelp'].newMessage("[base,lightgray]high-res positioning ("+ nameForHelp +"): [base,yellow]OFF[base]", 1.0);
         }
      }
   }
   
   function key_c_handler( clientName) {
      let client = clients[ clientName];
      
      // Center the attachment (or selection) point along the narrowest dimension of the selected object.
      // And if it's already centered (from the first alt-c), push the attachment point to the nearest end of the object (the second alt-c).
      function centerThePoint( selectedBody, cursorSelected) {
         if (selectedBody.shape != 'circle') {
            let aspectRatioTarget = 1.01;
            
            let aspectRatioWH = selectedBody.half_width_m / selectedBody.half_height_m;
            let helpString = "centered";
            
            let compForCentering, compForPushToEnd, distToEnd_m;
            if (aspectRatioWH > aspectRatioTarget) {
               compForCentering = 'y';
               compForPushToEnd = 'x';
               distToEnd_m = selectedBody.half_width_m;
            } else if ((aspectRatioWH < 1.0/aspectRatioTarget)) {
               compForCentering = 'x';
               compForPushToEnd = 'y';
               distToEnd_m = selectedBody.half_height_m;
            } else {
               gW.messages['lowHelp'].newMessage('[base,lightgray]Puck must be [base,yellow]rectangular[base,lightgray], not a perfect square.', 0.5);
               return;
            }
            
            // push to the nearest end
            if (selectedBody.selectionPoint_l_2d_m[ compForCentering] == 0.0) {
               let directionOfPush = (selectedBody.selectionPoint_l_2d_m[ compForPushToEnd] < 0) ? -1 : +1;
               selectedBody.selectionPoint_l_2d_m[ compForPushToEnd] = directionOfPush * distToEnd_m;
               //console.log("inside pushed to the end");
               helpString = "pushed to the end";
            }
            // center it along the narrowest component
            selectedBody.selectionPoint_l_2d_m[ compForCentering] = 0.0;
            
            // If client cursor selected, must also update these client attributes.
            if (cursorSelected) {
               // push to the nearest end
               if (client.selectionPoint_l_2d_m[ compForCentering] == 0.0) {
                  let directionOfPush = (client.selectionPoint_l_2d_m[ compForPushToEnd] < 0) ? -1 : +1;
                  client.cursorSpring.spo2_ap_l_2d_m[ compForPushToEnd] = directionOfPush * distToEnd_m;
                  client.selectionPoint_l_2d_m[ compForPushToEnd] = directionOfPush * distToEnd_m;
                  helpString = "pushed to the end";
               } else {
                  helpString = "centered";
               }
               // center it along the narrowest component
               client.cursorSpring.spo2_ap_l_2d_m[ compForCentering] = 0.0;
               client.selectionPoint_l_2d_m[ compForCentering] = 0.0;
            }
            
            console.log("before help message");
            gW.messages['lowHelp'].newMessage('[base,lightgray]attachment points have been [base,yellow]' + helpString, 1.5);
         }
      }
      
      if (client.key_alt == 'D') {
         let selectedBody = client.selectedBody;
         if (selectedBody) {
            centerThePoint( selectedBody, true);
            
         } else if (gW.hostMSelect.count() > 0) {
            gW.hostMSelect.applyToAll( msObject => {
               // Don't do push-to-the-end operations on points intended to remain at the center.
               if ( ! msObject.selectionPoint_l_2d_m.zeroLength()) centerThePoint( msObject, false);
            });
         }
         
      } else {
         // All clients can change the COM selection checkbox.
         dC.comSelection.click();  // if (clientName == 'local') dC.comSelection.click();
      }
   }
      
   function key_l_handler( mode, clientName) {
      let client = clients[ clientName];
      
      if (mode == 'keydown') {
         if ((client.key_ctrl == "D") && (client.key_shift == "D")) {
            client.ctrlShiftLock = !client.ctrlShiftLock;
            let mS = (client.ctrlShiftLock) ? 'ON':'OFF';
            gW.messages['help'].newMessage( clients[ clientName].nameString() + ' set ctrl-shift LOCK [base,yellow]' + mS + '[base]', 1.0);
         
         } else if (client.key_ctrl == "D") {
            if (client.key_alt == "D") {
               if ( ! cP.EpL.displayReport) cP.EpL.turnDisplayOn();
               cP.EpL.reportType = (cP.EpL.reportType == "EpL") ? "speed":"EpL";
            } else {
               cP.EpL.toggle();
            }
         
         // alt-l, alt-shift-l : useful in ghost-ball for lining up trick shots
         } else if (client.key_alt == "D") {
            if (client.key_shift == "D") {
               tA.tableActions('arc-selected-pucks');
            } else {
               gW.hostMSelect.align();
            }
         }
      } else if (mode == 'keyup') {
      } else {
         console.log("not good to be in here...");
      }
   }
   
   function key_n_handler( clientName) {
      let client = clients[ clientName];
      
      if (client.key_alt == 'D') {
         gB.getTableCapture('next');
         
      } else if (clientName == 'local') {
         dC.fullCanvas.click();
      }
   }
     
   function resetMouseOrFingerState( clientName) {
      var client = clients[ clientName];
      
      client.mouseDown = false;
      client.button = null;         
      client.mouseX_m = null;
      client.mouseY_m = null;  
   }
   
   function mouseUp_handler( clientName) {
      resetMouseOrFingerState( clientName);
      
      var client = clients[ clientName];
      
      var selectedPuckName = null;
      if (client.selectedBody) {
         // If you're the owner of direct movement, remember the puck name, so can release the choke (after the pool shot).
         if ((client.name == client.selectedBody.firstClientDirectMove) && (client.selectedBody.constructor.name == "Puck")) {
            selectedPuckName = client.selectedBody.name;
         }
         // This used to discriminate against dropping the puck over the hoop.
         if (gW.getDemoVersion().includes('basketball') && (client.selectedBody.constructor.name == "Puck")) {
            bpH.resetShotState({'clientName':client.name, 'puckName':client.selectedBody.name, 
                                'puck_pos_2d_m':client.selectedBody.position_2d_m,  'puck_v_2d_mps':client.selectedBody.velocity_2d_mps});
         }
      }
      
      if (client.cursorSpring) {
         // Shoot the (single-selected) puck with the cursor spring energy.
         var tryingToShoot = ((client.key_ctrl == 'D') && (client.key_shift == 'D')) || (client.ctrlShiftLock);
         if ((tryingToShoot) && (client.selectedBody)) {
            if (client.selectedBody.constructor.name == 'Puck') {
               // This restriction on shooting is a way for the user to NOT shoot (cancel a shot):
               //    move the cursor inside the "cue" ball before launching it.
               var selected_b2d_Body = bS.b2d_getBodyAt( client.mouse_2d_m);
               var selectedBody = gW.tableMap.get( selected_b2d_Body);
               gW.messages['help'].resetMessage(); // stop the help for experienced pool players
               if ((!selectedBody) || ((selectedBody) && (selectedBody.name != client.selectedBody.name))) {
                  
                  // Only the first client to select the puck for direct movement (i.e. rotation) can shoot.
                  if (client.name == client.selectedBody.firstClientDirectMove) {
                     if (client.cursorSpring.p1p2_separation_m > 0.01) {
                        gB.poolShot( client);
                        
                        // delete the platform walls in the Monkey Hunt game
                        if (c.demoVersion.slice(0,3) == '4.e') mH.deleteMonkeyWalls();
                        
                     } else {
                        gW.messages['help'].newMessage("shot prevented:" + 
                                                 "\\    not enough separation between the ghost and cue ball (touching, or nearly so)" +
                                              "\\ \\    Try moving the ghost to the other side of the object ball before shooting" +
                                                 "\\       or try dragging the ghost away from the object ball and then shoot with the alt key down.", 10.0);         
                     }
                  }
               } else {
                  // report if not ball-in-hand
                  if (client.key_ctrl != 'D') gW.messages['help'].newMessage("shot canceled", 1.5);          
               }
            }
         }
         client.modifyCursorSpring('detach');
         
         client.fineMovesState = 'off';
      
      } else {
         // Reset fine-moves if mouse and fingers are up.
         if (client.fineMovesState == 'on') {
            wS.exitFineMoves( client.name);
         }
      }
      
      // Now, after possibly shooting the puck (and detaching from it), release the direct-move choke.
      if (aT.puckMap[ selectedPuckName]) {
         aT.puckMap[ selectedPuckName].firstClientDirectMove = null;
      }
      
      // Close the selection box.
      gW.hostSelectBox.stop();
      
      // Done with rotation action.
      gW.hostMSelect.resetCenter();
      
      // just to sure, clear out the cursor sensor
      client.sensorTargetName = null;
      client.sensorContact = null;
   }
   
   function handleMouseOrTouchMove( e, fromListener) {
      // Mouse
      if (e.clientX || (e.clientX === 0)) {  // note the "=== 0" here, because x can be zero, and 0 is falsy.
         var raw_2d_px = new wS.Vec2D( e.clientX, e.clientY );
      // Touch
      } else if (e.touches) {
         var raw_2d_px = new wS.Vec2D( e.touches[0].clientX, e.touches[0].clientY ); // new wS.Vec2D(0,0);            
         gB.interpretTouches( e, {'startOrEnd':'start', 'hostOrClient':'host', 'cl':clients['local'], 'socket':null, 
                                  'fromListener':fromListener, 'mK':null, 'ts':ts, 'raw_2d_px':raw_2d_px, 'demoVersionOnHost':c.demoVersion} );
      }
      
      clients['local'].raw_2d_px = raw_2d_px;
      
      //var debugString = "in handler:" + raw_2d_px.x + "," + raw_2d_px.y;
      //hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
      
      // Always use 'mouse' for inputDevice, and avoid the stretching of the x,y (call to stretchRaw_px inside of wS.screenFromRaw_2d_px), 
      // which is mainly useful for cell-phone network clients.
      var posOnCanvas_2d_px = wS.screenFromRaw_2d_px( canvas, raw_2d_px, {'inputDevice':'mouse', 'demoRunningOnHost':c.demoVersion});
      
      // facilitate high-resolution cursor movements
      var finalPosOnCanvas_2d_px = wS.fineMoves('local', posOnCanvas_2d_px);
      if (clients['local'].fineMovesState != 'inTransition') {
         clients['local'].mouse_async_2d_px = finalPosOnCanvas_2d_px;
         // You might think this circle would render more frequently than the cursor in the animation loop. However the browser forces
         // the mouse events to coalesces with requestAnimationFrame (see discussion at the beginning of the animation loop in gwModule.js).          
         if (c.lagTesting) dF.drawCircle( ctx, finalPosOnCanvas_2d_px, {'borderWidth_px':0, 'fillColor':'cyan', 'radius_px':3});
      }
   }
               
   function pasteSpring( useNewSpring = false, pars={}) {
      let fixedLength = uT.setDefault( pars.fixedLength, false);
      
      // p (a usefully short name) is an array of non-wall pucks or pins.
      var p = [];
      gW.hostMSelect.applyToAll( msObject => {
         // Unselect the walls (don't allow the user to attach springs to the walls).
         if (msObject.constructor.name == 'Wall') {
            delete gW.hostMSelect.map[ msObject.name];
         } else {
            // Populate the p array so you can pass the pucks and pins as parameters (see call to copyThisOne).
            p.push( msObject);
         }
      });
      
      // Only consider the case where there are two pucks (or pins) selected.
      if (gW.hostMSelect.count() == 2) {
         function samePointSamePuck( springPuck, springPuckPoint, selectedPuck) {
            return ( springPuckPoint.equal( selectedPuck.selectionPoint_l_2d_m) && (springPuck.name == selectedPuck.name) );
         }
         
         var sameLocalPointsWarning = "";
         // Check each spring, between these two pucks in the multi-select, to see if trying to paste
         // onto the same local attachment points of an existing spring (don't allow multiple springs on the same local points).
         cP.Spring.findAll_InMultiSelect( spring => {
            if (( samePointSamePuck( spring.spo1, spring.spo1_ap_l_2d_m, p[0])  &&  samePointSamePuck( spring.spo2, spring.spo2_ap_l_2d_m, p[1]) ) ||
                ( samePointSamePuck( spring.spo2, spring.spo2_ap_l_2d_m, p[0])  &&  samePointSamePuck( spring.spo1, spring.spo1_ap_l_2d_m, p[1]) ) ) {
               
               sameLocalPointsWarning = spring.name; // already on target points
            }
         });
         
         if (useNewSpring) {
            if (sameLocalPointsWarning == "") {
               
               // Attach to the center of pins. (Note the use of copy() to disassociate the new spring from the selection points)
               let p0_attachmentPoint_l_2d_m = (p[0].constructor.name == "Pin") ? new wS.Vec2D(0,0) : p[0].selectionPoint_l_2d_m.copy();
               let p1_attachmentPoint_l_2d_m = (p[1].constructor.name == "Pin") ? new wS.Vec2D(0,0) : p[1].selectionPoint_l_2d_m.copy();
               
               if (fixedLength) {
                  let p0_w_2d_m = p[0].worldPoint( p0_attachmentPoint_l_2d_m);
                  let p1_w_2d_m = p[1].worldPoint( p1_attachmentPoint_l_2d_m);
                  var length_m = p0_w_2d_m.subtract( p1_w_2d_m).length();
               } else {
                  var length_m = 1.0;
               }
               
               let tempSpring = new cP.Spring(p[0], p[1], {'spo1_ap_l_2d_m': p0_attachmentPoint_l_2d_m, 'spo2_ap_l_2d_m': p1_attachmentPoint_l_2d_m, 
                                          'color':'yellow', 'unstretched_width_m':0.10, 'length_m':length_m, 'damper_Ns2pm2':0.30, 'strength_Npm':10.0, 'fixedLength':fixedLength});
               gW.messages['help'].newMessage('Name of the new spring is ' + tempSpring.name, 2.0);
               
            } else {
               gW.messages['help'].newMessage('There is already a spring (' + sameLocalPointsWarning + ') on the selected points.', 2.0);
            }
         
         } else if (cP.Spring.nameForPasting in aT.springMap) {
            
            // Paste a copy of the source spring onto these two selected pucks (or pins).
            if (sameLocalPointsWarning == "") {
               var newSpringName = aT.springMap[ cP.Spring.nameForPasting].copyThisOne( p[0], p[1], "pasteSingle");
               
               // If one of these is a NPC puck and the other a NPC navigation pin, supply the puck attributes needed for navigation.
               if ((p[0].clientName) && (p[0].constructor.name == 'Puck') && (p[0].clientName.slice(0,3) == 'NPC') && (p[1].NPC)) {
                  p[0].navSpringName = newSpringName;
                  p[0].pinName = p[1].name;
               } else if ((p[1].clientName) && (p[1].constructor.name == 'Puck') && (p[1].clientName.slice(0,3) == 'NPC') && (p[0].NPC)) {
                  p[1].navSpringName = newSpringName;
                  p[1].pinName = p[0].name;
               }
               
               gW.messages['help'].newMessage( newSpringName+' copied from '+cP.Spring.nameForPasting, 2.0);
               
               // De-select the pasted spring (and other selected springs) and its pucks (so the user doesn't have to click on empty space).
               gW.hostMSelect.resetAll();
               
            } else {
                gW.messages['help'].newMessage('Pasting onto the same points as another spring is not allowed. \\You may want to try turning off the COM option.', 3.5);
            }
            
         } else {
            gW.messages['help'].newMessage('No spring was selected for copying (maybe deleted).', 2.0);
            cP.Spring.nameForPasting = null;
         }
         
      } else if ((gW.hostMSelect.count() != 2)) {
         gW.messages['help'].newMessage("Need 2 pucks/pins to paste a spring; "+gW.hostMSelect.count()+" selected", 2.0);
      }      
   }
   
   function addRevoluteJoint() {
      if (gW.hostMSelect.count() == 2) {
         // p (a usefully short name) is an array of pucks. There can be a wall in there too.
         var p = [];
         
         // Check for at least one puck in the pair. Can't join two walls.
         let atLeastOnePuck = false;
         gW.hostMSelect.applyToAll( msObject => {
            // Populate the p array so you can pass the pucks as parameters.
            p.push( msObject);
            if (msObject.constructor.name == "Puck") atLeastOnePuck = true;
         });
         
         // Check to see if these two objects are already connected by a revolute joint.
         let p_names = [p[0].name, p[1].name];
         let alreadyJoined = false;
         cP.Joint.findAll_InMultiSelect( joint => {
            if (p_names.includes( joint.jto1.name) && p_names.includes( joint.jto2.name)) {
               alreadyJoined = true;
            }
         });
         
         if (atLeastOnePuck && ( ! alreadyJoined)) {
            let tempJoint = new cP.Joint(p[0], p[1], {'jto1_ap_l_2d_m': p[0].selectionPoint_l_2d_m, 'jto2_ap_l_2d_m': p[1].selectionPoint_l_2d_m, 'color':'darkred'} );
            gW.messages['help'].newMessage('Name of the new joint is ' + tempJoint.name, 2.0);
            
            gW.hostMSelect.resetAll();
            
         } else if ( ! atLeastOnePuck) {
            gW.messages['help'].newMessage('One of the selected objects must be a puck.', 3.0);
            
         } else if (alreadyJoined) {
            gW.messages['help'].newMessage('Only one revolute joint is allowed per pair of objects.', 3.0);
         }
         
      } else {
         gW.messages['help'].newMessage('Select two attachment points using multi-select features.', 3.0);
      }
   }
   
   function comSelection_Toggle(e, duration_s = 1.0) {
      if (dC.comSelection.checked) {
         // Change the attachment point of the cursor springs to be at the center of the selected body.
         cT.Client.applyToAll( client => {if (client.selectedBody) client.cursorSpring.spo2_ap_l_2d_m = new wS.Vec2D(0,0)});
         gW.messages['help'].newMessage('Center of mass (COM) selection: [base,yellow]ON[base]', duration_s);
      } else {
         // Change back to the actual selection points.
         cT.Client.applyToAll( client => {if (client.selectedBody) client.cursorSpring.spo2_ap_l_2d_m = client.selectionPoint_l_2d_m});
         gW.messages['help'].newMessage('Center of mass (COM) selection: [base,yellow]OFF[base]', duration_s);
      }
   }
   
   function freeze() {      
      cP.Puck.applyToAll( puck => puck.b2d.SetLinearVelocity( new b2DW.Vec2(0.0,0.0)) );
   }
   
   function stopRotation() {      
      cP.Puck.applyToAll( puck => puck.b2d.SetAngularVelocity( 0.0) );
   }
   
   function reverseDirection() {      
      cP.Puck.applyToAll( puck => {
         puck.b2d.SetAngularVelocity( -1 * puck.angularSpeed_rps);
         puck.b2d.SetLinearVelocity( wS.b2Vec2_from_Vec2D( puck.velocity_2d_mps.scaleBy( -1)) );
      });
   }
   
   // client related
   function setClientCanvasToMatchHost() {
      // This must run within the context of the host's browser (to get the host's canvas dimensions).
      hC.sendSocketControlMessage({'from':'host', 'to':'roomNoSender', 'data':{'canvasResize':{'width':canvas.width,'height':canvas.height}, 'demoVersion':c.demoVersion} });
   }
         
   
   ////////////////////////////////////////////////
   // Setup the event listeners...
   ////////////////////////////////////////////////
   
   function initializeEventListeners() {
   
      /* */
      // text area for JSON captures
      dC.json = document.getElementById('jsonCapture');
      dC.json.addEventListener("mousedown", function( e) {
         // right click to toggle size
         if (e.button == 2) {
            if (dC.json.style.width == "450px") {
               // back to normal size
               dC.json.style.width = "165px";
               dC.json.style.height = "30px";
            } else {
               // larger size
               dC.json.style.width = "450px";
               dC.json.style.height = "300px";
               window.scrollBy( 600, 0);
               window.setTimeout(function() {
                  window.scrollBy( 200, 0);
               }, 600);
            }
         // mouse-wheel click
         } else if (e.button == 1) {
            e.preventDefault();
            cR.cleanCapture();
         }
      }, {capture: false});
      
      // Inhibit the context menu that pops up when right clicking (third button).
      // Do this on mainDiv to prevent the menu from appearing when you drag the
      // mouse off the canvas.
      var mainDiv = document.getElementById('mainDiv');
      mainDiv.addEventListener("contextmenu", function(e) {
         e.preventDefault();
         return false;
      }, {capture: false});
      
      /*
      // Added this (11:17 AM Fri May 29, 2020) as workaround to a Chromium bug.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1087488
      // Should not need this!
      // Bug is fixed in Chrome Version 83.0.4103.97
      const resizeHandler = new ResizeObserver( entries => {
         for (let entry of entries) {
            const cr = entry.contentRect;
            console.log('Element:', entry.target.id);
            console.log(`Element size: ${cr.width}px x ${cr.height}px`);
            if (entry.target.id == 'hostCanvas') {
               canvasDiv.style.width = cr.width + "px";
               canvasDiv.style.height = cr.height + "px";
            }
         }
      });
      resizeHandler.observe( canvas);
      */
      
      document.addEventListener('visibilitychange', function(e) {
         if (document.visibilityState !== 'hidden') {
            console.log("window restored or regained focus");
            gW.restartAnimationLoop( 600);
         } else {
            console.log("window minimized or lost focus");
         }
      });

      document.addEventListener('wheel', function(e) {
         // note: see comments in the wheel event listener in hostAndClient.js 
         // Thu May 20, 2021, had to put the wheel listener on the document (window also works) for this event to fire when canvas is fullscreen.
         // The wS.mouseOverElement call acts to restrict the handler and the prevention of default behavior to the canvas (scrolling still works in the left panel).
         if ( clients['local'].poolShotLocked  &&  wS.mouseOverElement( canvas, clients['local'].raw_2d_px) ) {
            e.preventDefault();
            wheelEvent_handler('local', e);
         }
      }, {passive: false, capture: false});
      
      // Note: This call to addEventListener for mousemove could be put (and was for a while) inside the mousedown handler. 
      // Then, if there is a corresponding removeEventListen for this in the mouseup handler, effectively the
      // the mousemove listener would only run while a mouse button is down. That works out 
      // nicely if you are using the native Windows cursor. But if you are drawing a cursor into
      // the canvas, you need to keep track of mouse position even if the mouse isn't clicked down.
      document.addEventListener("mousemove", function(e) { 
         handleMouseOrTouchMove( e, 'mousemove');
      }, {capture: false});
      
      canvas.addEventListener("mousedown", function(e) {
         clients['local'].mouseDown = 'M';
         
         // If there's been a click inside the canvas area, flag it as mouse usage for the local user (host).
         if ( wS.pointInCanvas( canvas, clients['local'].mouse_2d_px) ) {
            clients['local'].mouseUsage = true;
         }
         
         clients['local'].button = e.button;
         
         /* for making videos... 
         if (clients['local'].button == 0) {
            gW.messages['lowHelp'].newMessage('[base,yellow]left[base,lightgray] mouse button', 20.0);
         } else if (clients['local'].button == 1) {
            gW.messages['lowHelp'].newMessage('[base,yellow]middle[base,lightgray] mouse button', 20.0);
         } else if (clients['local'].button == 2) {
            gW.messages['lowHelp'].newMessage('[base,yellow]right[base,lightgray] mouse button', 20.0);
         }
         */
         
         // Pass this first mouse position to the move handler. This will establish
         // the world position of the mouse.
         handleMouseOrTouchMove( e, 'mousedown');
      
         // (Note: also see the checkForMouseSelection method in the cT.Client prototype.)
         // Clear out the multi-select map, if user clicks in open area.
         mS.clickToClearMulti('local');
         
         // start a cursor-based selection box (host only)
         if ((clients['local'].key_alt == 'D') && (clients['local'].key_ctrl == 'U') && ([0,1,2].includes(clients['local'].button)) && (!gW.hostSelectBox.enabled)) {
            gW.hostSelectBox.start();
            gW.hostSelectBox.update();
         }
         
         // This prevents the middle mouse button from doing scrolling operations.
         e.preventDefault();
                  
      }, {capture: false});
      
      canvas.addEventListener("touchstart", function(e) {
         // Note: e.preventDefault() not needed here if the following canvas style is set
         // touch-action: none;
         
         clients['local'].mouseDown = true;
         clients['local'].button = 0;
         clients['local'].touchScreenUsage = true;
         
         //Pass this first mouse position to the move handler.
         handleMouseOrTouchMove( e, 'touchstart');
         
      }, {passive: true, capture: false});
      
      document.addEventListener("mouseup", function(e) {
         
         // Remove focus from checkboxes after use (release mouse button). This is needed for 
         // the canvas to get immediate attention when using the control, shift, and alt keys.
         // (for example: multi-select using the alt key after enabling the editor)
         $(":checkbox").blur();
         
         // This is necessary for MS Edge. Some buttons were staying depressed.
         $(":button").blur();
         
         // To get past here, mouseDown state must be down (true).
         if ( ! clients['local'].mouseDown) return;
         
         // See corresponding help message in mousedown handler.
         if (gW.messages['lowHelp'].message.includes('mouse button')) {
            // clear out message from mousedown
            gW.messages['lowHelp'].newMessage('', 0.1);
         }
         
         mouseUp_handler('local');
         
      }, {capture: false});
      
      /*
      Tried to use e.preventDefault() in touchmove to avoid android Firefox scrolling issues for the host page. 
      But when go fullscreen, can't center the view... Might be a timing issue. Had to use a delay to make the TwoThumbs grid render
      with Firefox in fullscreen mode. So for now, commenting preventDefault. Also considered starting touchmove
      in the touchstart event handler. But seems like it might fire multiple times with multiple touch points, unless add
      on first touch and remove when last touch is released.
      */
      canvas.addEventListener("touchmove", function(e) {
         //e.preventDefault();
         handleMouseOrTouchMove( e, 'touchmove');
      }, {capture: false});
      
      canvas.addEventListener("touchend", function(e) {
         gB.interpretTouches( e, {'startOrEnd':'end', 'hostOrClient':'host', 'cl':clients['local'], 'socket':null, 
                                  'fromListener':'touchend', 'mK':null, 'ts':ts, 'raw_2d_px':null, 'demoVersionOnHost':c.demoVersion} );
         
         // Note: e.preventDefault() not needed here if the following canvas style is set
         // touch-action: none;
         
         if (clients['local'].mouseDown) {
            return;
            
         } else {
            mouseUp_handler('local');
         }
         
      }, {passive: true, capture: false});
          
      var editKeysMap = {'key_leftArrow':'thinner', 'key_rightArrow':'wider', 'key_upArrow':'taller', 'key_downArrow':'shorter',
                          'key_[':'lessDamping', 'key_]':'moreDamping',
                          'key_-':'lessFriction',  'key_+':'moreFriction',
                          'key_-_':'lessFriction', 'key_=+':'moreFriction',
                          'key_lt':'lessDrag',     'key_gt':'moreDrag'};
      var allowDefaultKeysMap = {'key_-':null, 'key_+':null, 'key_-_':null, 'key_=+':null};
      
      document.addEventListener("keydown", function(e) {
         // Uncomment the following line for an easy test to see if the default key behavior can be inhibited.
         //e.preventDefault();
         
         //console.log("keyCode=" + e.keyCode + ", code=" + e.code + ", key=" + e.key + ", mapName=" + keyMap[e.code]);
         
         // The following is necessary in Firefox to avoid the spacebar from re-clicking 
         // page controls (like the demo buttons) if they have focus.
         // This also prevents some unwanted spacebar-related button behavior in Chrome.
         // (document.activeElement.tagName != 'BODY') && (document.activeElement.tagName != 'INPUT')
         if ( ! ['BODY','INPUT','TEXTAREA'].includes( document.activeElement.tagName)) {     
            document.activeElement.blur();
         }
         
         /*
         Anything in this first group of blocks will repeat if the key is held down for a 
         while. Holding it down will fire the keydown event repeatedly. Of course 
         this area only affects the local client. Note there is another area in 
         this code where repetition is avoided though use of the key_?_enabled 
         attributes; search on key_s_enabled for example. That repetition is of 
         a different nature in that it comes from action triggered by observing 
         the key state (up/down) each frame. 
         */
         
         if (e.code in keyMap) { 
            // If you want down keys to repeat, put them here.
            
            // First, exit if focus is in the typing areas (exceptions are the modifier keys that might be used with buttons).
            if ( ['INPUT','TEXTAREA'].includes( document.activeElement.tagName) && ( ! ['key_alt','key_shift','key_ctrl'].includes( keyMap[e.code])) ) {
               return;
            }
            
            // Inhibit default behaviors.
            if (['key_space', 'key_l', 'key_s', 'key_q', 'key_alt', 'key_questionMark', 'key_tab'].includes( keyMap[e.code])) {
               // Inhibit page scrolling that results from using the spacebar (when using puck shields)
               // Also inhibit repeat presses of the demo keys when using the spacebar.
               // Inhibit ctrl-s behavior in Firefox (save page).
               // Inhibit ctrl-q behavior in Edge (history panel).
               // Inhibit questionMark key behavior in Firefox (brings up text-search box)
               // Inhibit alt key behavior. Prevents a problem where if the alt key is depressed during the middle of a mouse drag, it
               //    prevents the box select from working on the next try.
               // Inhibit tabbing: jumping to each of the GUI controls on the page.
               e.preventDefault();
                
            } else if ((keyMap[e.code] in editKeysMap) && !(keyMap[e.code] in allowDefaultKeysMap)) {
               // Prevent page scrolling when using the arrow keys in the editor.
               e.preventDefault();
            
            } else if (keyMap[e.code] == 'key_o') {
               if (! dC.pause.checked) {
                  uT.setElementDisplay("fps_wrapper", "none");
                  uT.setElementDisplay("stepper_wrapper", "inline");
               }
               gW.stepAnimation();
            
            // Change body rotation when editing.
            } else if ((keyMap[e.code] == 'key_t')) {
               gW.hostMSelect.applyToAll( tableObj => {
                  if (clients['local'].key_shift == 'D') {
                     // Increase rate counterclockwise
                     var rotRate_change_dps = +5; // degrees per second
                  } else {
                     // clockwise
                     var rotRate_change_dps = -5;
                  }
                  var rotRate_change_rps = rotRate_change_dps * (Math.PI/180); // radians per second
                  
                  tableObj.angularSpeed_rps += rotRate_change_rps;
                  // if not a static body type
                  if (tableObj.b2d.m_type != b2DW.Body.b2_staticBody) {
                     // If you change the rate so that it stops the rotation, or if the body is initially not rotating, it
                     // will be sleeping. In those cases, must wake it before setting the angular speed.
                     if ( ! tableObj.b2d.IsAwake()) tableObj.b2d.SetAwake( true);
                     tableObj.b2d.SetAngularVelocity( tableObj.angularSpeed_rps);
                  }
               });
            }
            
            // Use the keys in the edit-keys map to change the characteristics of the selected body.
            if (keyMap[e.code] in editKeysMap) {
               var command = editKeysMap[ keyMap[e.code]];
               
               function modifyPuckCommand( tableObject, command) {
                  // The host can use the alt key to modify angular drag on pucks...
                  if ((tableObject.constructor.name == "Puck") && (clients['local'].key_alt == 'D')) {
                     if (command == "moreDrag") {
                        command = "moreAngDrag";
                     } else if (command == "lessDrag") {
                        command = "lessAngDrag";
                     } 
                  }
                  return command;
               }
               
               function modifySpringCommand( command) {
                  // The host can use the alt key to modify the spring command...
                  if (clients['local'].key_alt == 'D') {
                     if (command == "wider") {
                        command = "widerAppearance";
                     } else if (command == "thinner") {
                        command = "thinnerAppearance";
                     } 
                  }
                  return command;
               }
               
               // Multi-select
               if (gW.hostMSelect.count() > 0) {
                  // Direct the edit actions at the springs (s key down)
                  if (clients['local'].key_s == 'D') {
                     // Arrow keys and page-up/page-down.
                     if ((gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "springs") && (gW.hostMSelect.candidateReportPasteDelete)) {
                        aT.springMap[ gW.hostMSelect.candidateReportPasteDelete].interpret_editCommand( modifySpringCommand( command));
                     } else {
                        cP.Spring.findAll_InMultiSelect( spring => spring.interpret_editCommand( modifySpringCommand( command)));
                     }
                     
                  // All other object types
                  } else {
                     gW.hostMSelect.applyToAll( msObject => {
                        if (msObject.constructor.name != "Pin") {
                           command = modifyPuckCommand( msObject, command);
                           msObject.interpret_editCommand( command);
                        }
                     });
                  }
                  
               // Single-body selection (client spring)
               } else if (clients['local'].selectedBody) {
                  if (clients['local'].selectedBody.constructor.name != "Pin") {
                     command = modifyPuckCommand( clients['local'].selectedBody, command);
                     clients['local'].selectedBody.interpret_editCommand( command);
                  }
               }
            }
            
            /*
            Keys that are held down will NOT repeat in this next block. Current key 
            state must be UP before it will change the state to DOWN and perform the 
            action. This is for cases where you are toggling the state of the 
            client's key parameter. Also see comment paragraph on repetition above.
            
            Note: when a Client object is initialized, all it's key values are set to 'UP'.
            */
            
            // If the current key state is UP...
            if (clients['local'][keyMap[e.code]] == 'U') {
               
               // Set the key state to be DOWN.
               clients['local'][keyMap[e.code]] = 'D';
               
               // Immediate execution on keydown (that's the event that got you in here):
               
               if (keyMap[e.code] == 'key_ctrl') {
                  key_ctrl_handler('keydown', 'local');
                  
               } else if (keyMap[e.code] == 'key_l') {
                  key_l_handler('keydown', 'local');
               
               // For showing all the count-to-pi demos without exiting full-screen view (for making videos).
               } else if ((clients['local'].key_alt == 'D') && (keyMap[e.code] == 'key_pageDown')) {
                  if (c.demoLoopIndex == 0) {
                     cR.demoStart_fromCapture(1, {'fileName':'demoSeries1b.js'});
                  } else if (c.demoLoopIndex == 1)  {
                     cR.demoStart_fromCapture(1, {'fileName':'demoSeries1c.js'});
                  } else if (c.demoLoopIndex == 2)  {
                     cR.demoStart_fromCapture(1, {'fileName':'demoSeries1d.js'});
                  } else if (c.demoLoopIndex == 3)  {
                     cR.demoStart_fromCapture(1, {'fileName':'demoSeries1e.js'});
                  }
                  if (c.demoLoopIndex == 3) {
                     c.demoLoopIndex = 0;
                  } else {
                     c.demoLoopIndex += 1;
                  }
                  
               } else if ((keyMap[e.code] == 'key_a') && (clients['local'].key_ctrl == 'D')) {
                  c.drawSyncImage = ( ! c.drawSyncImage);
                  cT.Client.applyToAll( client => {client.sendDrawSyncCommand = true;});
                                 
               } else if ((keyMap[e.code] == 'key_b')) {
                  key_b_handler('local');
                  
               } else if ((keyMap[e.code] == 'key_c') && (clients['local'].key_ctrl != 'D')) {
                  key_c_handler('local');
                  
               } else if ((keyMap[e.code] == 'key_backspace') && (clients['local'].key_ctrl == 'D')) {
                  reverseDirection();
                  gW.messages['help'].newMessage('translation and rotation have been [base,yellow]reversed[base]', 0.5);
                  
               } else if (keyMap[e.code] == 'key_f') { 
                  if (clients['local'].key_alt == 'D') {
                     // nothing here yet
                  } else {
                     freeze();
                     gW.messages['help'].newMessage('[base,yellow]translation[base] has been momentarily [base,yellow]stopped[base]', 1.0);
                  }
                  
               } else if (keyMap[e.code] == 'key_r') { 
                  if ((clients['local'].key_alt == 'U') && (clients['local'].key_shift == 'U')) {
                     stopRotation();
                     gW.messages['help'].newMessage('[base,yellow]rotation[base] has been momentarily [base,yellow]stopped[base]', 0.5);
                     
                  } else if (clients['local'].key_alt == 'D') {
                     addRevoluteJoint();
                     
                  } else if (clients['local'].key_shift == 'D') {
                     cR.runCapture({'fromKeyBoard':true});
                  }
               
               } else if (keyMap[e.code] == 'key_g') { 
                  c.g_ON = !c.g_ON;
                  if (c.g_ON) {
                     dC.gravity.checked = true;
                  } else {
                     dC.gravity.checked = false;
                  }
                  dS.setGravityRelatedParameters({'showMessage':true});
                  /*
                  // If there is only one fixture, m_fixtureList (a linked list) is a reference to that single fixture.
                  console.log(' ');
                  console.log("fixture count=" + aT.wallMap['wall1'].b2d.m_fixtureCount);
                  // also might want to look here: m_fixtureList, m_fixtureList.m_shape, m_fixtureList.m_shape.m_vertices
                  for (var x in aT.wallMap['wall1'].b2d.m_fixtureList) {
                     console.log("name=" + x);
                  }
                  */               
               } else if (keyMap[e.code] == 'key_m') { 
                  // Note: ctrl key (down) seems to block this m key event. 
                  //console.log("key_m block, ctrl=" + clients['local'].key_ctrl + ", alt=" + clients['local'].key_alt + ", shift=" + clients['local'].key_shift);
                  if (clients['local'].key_shift == 'D') {
                     if (gW.hostMSelect.count() == 0) { 
                        let message = "You must select at least one object to run this JSON modification function.";
                        pS.viewGeneralDialog({"title":"nothing selected", "message":message, "label_close":"close"});
                     } else {
                        cR.modifyCapture();
                     }
                  } else {
                     $('#chkMultiplayer').trigger('click');
                  }
                  
               } else if (keyMap[e.code] == 'key_n') { 
                  key_n_handler('local');
                  
               } else if (keyMap[e.code] == 'key_u') { 
                  cR.saveState();
                  gW.messages['help'].newMessage('state has been [base,yellow]captured[base]', 0.5);
                  
               } else if ((keyMap[e.code] == 'key_v') && (clients['local'].key_ctrl != 'D')) { 
                  eVN.changeFullScreenMode( canvas, 'on');
                  
               } else if (keyMap[e.code] == 'key_e') { 
                  dC.editor.checked = !dC.editor.checked;
                  toggleEditorStuff();
               
               } else if ((keyMap[e.code] == 'key_p') && (clients['local'].key_shift != 'D') && (clients['local'].key_alt != 'D')) { 
                  dC.pause.checked = !dC.pause.checked;
                  gW.setPauseState();
               
               } else if ((keyMap[e.code] == 'key_p') && (clients['local'].key_alt == 'D')) { 
                  gW.clearCanvas();
                  c.pauseErase = ! c.pauseErase;
                  if ((c.pauseErase) && (c.demoVersion.slice(0,3) == "3.d")) {
                     // For recording the ball paths of a pool shot. This triggers a shot when the pauseErase is set true.
                     clients['local'].key_alt = 'U';
                     mouseUp_handler('local');
                  }
                  if ( ! c.pauseErase) gW.messages['help'].newMessage( 'screen erasing is [base,yellow]ON[base]', 0.5);
               
               // Toggle the default spring type
               } else if ((keyMap[e.code] == 'key_s') && (clients['local'].key_shift == 'D')) {
                  // Clear this zo there is no spring report to conflict with the spring-nature report.
                  mS.clearMultiSelect();
                  
                  c.softConstraints_default = !c.softConstraints_default;
                  if (c.softConstraints_default) {
                     gW.messages['help'].newMessage("new springs: [base,yellow]distance joint[base] with soft constraints", 2.0);
                  } else {
                     gW.messages['help'].newMessage("new springs: [base,yellow]Hooke's Law[base]", 2.0);
                  }
                  if (Object.keys(aT.springMap).length > 0) gW.messages['help'].addToIt("\\ \\   existing springs:");
                  if (clients['local'].key_alt == 'D') {
                     cP.Spring.applyToAll( spring => {
                        
                        delete spring.softConstraints;
                        delete spring.fixedLength;
                        spring.softConstraints_setInPars = false;
                        
                        if (spring.b2d) {
                           gW.b2d.world.DestroyJoint( spring.b2d);
                           spring.b2d = null;
                        }

                        gW.messages['help'].addToIt("\\     " + spring.name + " softConstraint key has been [base,yellow]deleted[base].");
                     });
                  } else {
                     cP.Spring.applyToAll( spring => {
                        let springNature;
                        if (typeof spring.softConstraints === "undefined") {
                           springNature = "[18px Arial,yellow]Hooke's law[18px Arial]";
                        } else {
                           let lockedString = (spring.softConstraints_setInPars) ? " (locked)" : "";
                           if (spring.softConstraints) {
                              let softOrFixed = (spring.fixedLength) ? "fixed length" : "soft constraints";
                              springNature = "a [18px Arial,yellow]distance joint[18px Arial] with " + softOrFixed + lockedString;
                           } else {
                              springNature = "[18px Arial,yellow]Hooke's law[18px Arial]" + lockedString;
                           }
                        }
                        gW.messages['help'].addToIt("\\[18px Arial,lightgray]     " + spring.name + " spring nature is " + springNature + "[base].");
                     });
                  }
                  
               
               // Toggle the lock on the pool shot and set the speed value (z key pressed, while control and shift are down).
               } else if ( (keyMap[e.code] == 'key_z') && (((clients['local'].key_shift == 'D') && (clients['local'].key_ctrl == 'D')) || (clients['local'].ctrlShiftLock)) ) {
                  gB.togglePoolShotLock( clients['local']);
               
               // Pause NPC navigation.
               } else if ((keyMap[e.code] == 'key_q') && (clients['local'].key_ctrl == 'D')) {
                  pP.setNpcSleep( ! pP.getNpcSleep());
                  if (pP.getNpcSleep()) {
                     // Keep track of this during game play.
                     pP.setNpcSleepUsage( true);
                     gW.messages['help'].resetMessage();
                     gW.messages['help'].newMessage("drones are [base,yellow]sleeping[base]", 1.0);
                     // Make sure their i keys are up, i.e. stop trying to shoot (and calling the bullet stream updater).
                     cT.Client.applyToAll( client => {if (client.name.slice(0,3) == 'NPC') client.key_i = "U" });
                  } else {
                     gW.messages['help'].newMessage("drones are [base,yellow]awake[base]", 1.0);
                  }
                  
               // Set delete (and select) mode offered in the tab menu for multiselect.
               } else if (keyMap[e.code] == 'key_tab') {
                  if (gW.hostMSelect.count() > 1) {
                     if (gW.hostMSelect.selectModeIndex < 3) {
                        gW.hostMSelect.selectModeIndex++;
                        
                        gW.hostMSelect.resetStepper();
                        
                        if (gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "springs") {
                           // populate a list of names of the springs in the multiselect
                           cP.Spring.findAll_InMultiSelect( spring => gW.hostMSelect.connectedNames.push( spring.name));
                           
                        } else if (gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "revolute joints") {
                           cP.Joint.findAll_InMultiSelect( joint => gW.hostMSelect.connectedNames.push( joint.name));
                           
                        } else {
                           // nothing yet
                        }
                        
                     } else {
                        gW.hostMSelect.selectModeIndex = 0;
                     }
                     gW.messages['help'].newMessage("select and delete: [base,yellow]" + gW.hostMSelect.selectModeMessage[ gW.hostMSelect.selectModeIndex] + "[base]", 1.0);
                     
                  } else {
                     gW.messages['help'].newMessage("Select at least two objects to view the 'tab' options for multiselect.", 1.5);
                  }
                  
               // Step through the springs and/or joints in the multiselect.
               } else if (keyMap[e.code] == 'key_enter') {
                  
                  if (gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "springs") {
                     gW.hostMSelect.stepThroughArray( aT.springMap);
                  
                  } else if (gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "revolute joints") {
                     gW.hostMSelect.stepThroughArray( aT.jointMap);
                  }
                  
               // Delete stuff   
               } else if ((keyMap[e.code] == 'key_x') && (clients['local'].key_ctrl == 'D')) {
                  
                  // First process multi-select
                  var foundSpringOrJoint = false;
                  let selectMode = gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex];
                  
                  if (gW.hostMSelect.count() > 0) {
                     
                     if (['normal','springs','everything'].includes( selectMode)) {
                        if (gW.hostMSelect.candidateReportPasteDelete) {
                           gW.hostMSelect.deleteCandidate( aT.springMap);
                        } else {
                           // Delete each spring that has both it's pucks (or pins) in the multi-select.
                           cP.Spring.findAll_InMultiSelect( spring => {
                              spring.deleteThisOne({});
                              // This function includes the scope of the function in which it is being defined.
                              // So foundSpringOrJoint, defined in the surrounding function, is accessible (and changeable) here.
                              foundSpringOrJoint = true; 
                           });
                        }
                     }
                     
                     if (['normal','revolute joints','everything'].includes( selectMode)) {
                        if (gW.hostMSelect.candidateReportPasteDelete) {
                           gW.hostMSelect.deleteCandidate( aT.jointMap);
                        } else {
                           // Delete each revolute joint that has both it's pucks in the multi-select.
                           cP.Joint.findAll_InMultiSelect( joint => {
                              joint.deleteThisOne({});
                              foundSpringOrJoint = true;
                           });
                        }
                     }
                     
                     // If springs have been cleared during first delete, now remove pucks, pins and walls that are still selected.
                     if ( (['normal'].includes( selectMode) && ( ! foundSpringOrJoint)) || (['everything'].includes( selectMode)) ) {
                        gW.hostMSelect.applyToAll( msObject => msObject.deleteThisOne({}) );
                        // reset back to normal mode.
                        gW.hostMSelect.selectModeIndex = 0;
                     }
                     gW.aT.hack['deletedSomething'] = true;
                     
                  } else if (clients['local'].selectedBody) {
                     // A single-object selection.
                     if ((clients['local'].selectedBody.constructor.name == 'Puck') && (clients['local'].b2dSensor)) clients['local'].deleteBox2dSensor();
                     clients['local'].selectedBody.deleteThisOne({'deleteMode':'fromEditor'}); // Pucks, pins, and walls all have there own version of this method.
                     clients['local'].selectedBody = null;
                     clients['local'].cursorSpring.deleteThisOne({});
                     clients['local'].cursorSpring = null;
                     gW.aT.hack['deletedSomething'] = true;
                  }
                  
               // Identify a spring for copying.
               } else if ((keyMap[e.code] == 'key_c') && (clients['local'].key_ctrl == 'D')) {
                  // If a candidate was already selected...
                  if ((gW.hostMSelect.selectMode[ gW.hostMSelect.selectModeIndex] == "springs") && (gW.hostMSelect.candidateReportPasteDelete)) {
                     cP.Spring.nameForPasting = gW.hostMSelect.candidateReportPasteDelete;
                     gW.hostMSelect.candidateReportPasteDelete = null;
                     gW.hostMSelect.selectModeIndex = 0;
                     gW.messages['help'].newMessage("[25px Arial,yellow]" + cP.Spring.nameForPasting + "[base] will be used as the source spring for copy and paste.", 3.0);
                     gW.hostMSelect.resetAll();
                     
                  } else {
                     if ((gW.hostMSelect.count() > 0) && (gW.hostMSelect.count() != 2)) {
                        gW.messages['help'].newMessage( gW.hostMSelect.count() + " selected; need 2 to select a spring", 1.0);
                     }
                     // Clear this out each time ctrl-c is used.
                     cP.Spring.nameForPasting = null;
                     
                     // Two bodies in the multi-select, so maybe some springs in there...
                     if (gW.hostMSelect.count() == 2) {
                        // Note: this "no spring" message will be overwritten (immediately) if a spring is found in the block below.
                        gW.messages['help'].newMessage("2 selected, but no spring", 1.0);
                        cP.Spring.findAll_InMultiSelect( spring => {
                           // Make a reference to the spring. If there is more than one spring attached, this will reference the LAST one!
                           // Rendering characteristics will be different for this source puck.
                           cP.Spring.nameForPasting = spring.name;
                           // De-select all the springs on these two pucks (so the user doesn't have to click on empty space).
                           spring.selected = false;
                        });
                        
                        if (cP.Spring.nameForPasting) {
                           gW.messages['help'].newMessage("[25px Arial,yellow]" + cP.Spring.nameForPasting + "[base] will be used as the source spring for copy and paste.", 3.0);
                        }
                        
                        // Added this mainly to be used in probing the name of a joint. Not used for copying the joint. Revolve joints are added via the pull-down menu or 
                        // corresponding keyboard shortcut.
                        cP.Joint.findAll_InMultiSelect( joint => {
                           let jointMessage = "[20px Arial,yellow]" + joint.name + "[base] joint has been deselected.";
                           if (cP.Spring.nameForPasting) {
                              gW.messages['help'].addToIt('\\  ' + jointMessage, {'additionalTime_s':2.0});
                           } else {
                              gW.messages['help'].newMessage( jointMessage, 3.0);
                           }
                           // De-select joints
                           joint.selected = false;
                        });
                        
                        gW.hostMSelect.resetAll();
                        
                     // Give help to user if a single body is selected directly with the cursor.
                     } else if (clients['local'].selectedBody) {
                        // Put this message lower on the screen than the normal help because use of the control key
                        // will display a help message listing puck attributes.
                        gW.messages['lowHelp'].newMessage("If you would like to replicate a single object, try ctrl-v.", 1.0);
                     }
                  }
               
               // Paste a spring onto a pair of pucks.
               } else if (keyMap[e.code] == 'key_s') {
                  if (clients['local'].key_ctrl == 'D') {
                     if (clients['local'].key_alt == 'U') {
                        // paste a copy of a spring.
                        pasteSpring( false);
                     } else if (clients['local'].key_alt == 'D') {
                        // paste a new (default) spring.
                        pasteSpring( true);
                     }
                  } else if (c.demoVersion.slice(0,3)=='4.e') {
                     // Manually, using keyboard, advance to the next shot.
                     mH.setPositions({'disableAutoPosition':true});
                  }
               
               // A general copy and paste of the selected bodies.
               } else if ((keyMap[e.code] == 'key_v') && (clients['local'].key_ctrl == 'D')) {
                  // Single object or a group as selected using the techniques of multiselect.
                  if (gW.hostMSelect.count() > 0) {
                     gW.hostMSelect.pasteCopyAtCursor();
                  
                  // A single object as selected using single select (direct host-cursor selection)
                  } else if (clients['local'].selectedBody) {
                     var cn = clients['local'].selectedBody.constructor.name;
                     if ((cn == "Wall") || (cn == "Pin") || (cn == "Puck")) {
                        // Put the copy a little to the right of the original. The engine will separate them
                        // if they overlap (colliding).
                        var pos_forCopy_2d_m = clients['local'].selectedBody.position_2d_m.addTo( new wS.Vec2D(0.1, 0.0));
                        clients['local'].selectedBody.copyThisOne({'position_2d_m':pos_forCopy_2d_m});
                     }
                  }
                     
               } else if ((clients['local'].key_shift == 'D') && (clients['local'].key_p == 'D') && (clients['local'].key_d == 'D')) {
                     // Make a single-pin drone track at the cursor location (for Puck Popper demos only).
                     if (c.demoIndex == 7 || c.demoIndex == 8) {
                        pP.makeNPC_OnSinglePin(1, cP.Pin.nameIndex + 1, cT.Client.npcIndex + 1, clients['local'].mouse_2d_m);
                     } else {
                        gW.messages['help'].newMessage('This feature is only available for demos 7 and 8 (Puck Popper).', 1.0);
                     }
                  
               // numbers 0 to 9, run a demo
               } else if (e.code.startsWith('Digit')) {
                  if (document.activeElement.tagName == 'BODY') {
                     dS.demoStart( e.code.slice(5), false);
                  }
               }
                             
            }            
         }
      }, {capture: false}); //This "false" makes this fire in the bubbling phase (not capturing phase).
      
      document.addEventListener("keyup", function(e) {
         if (e.code in keyMap) {
            // Set the key state to be UP.
            clients['local'][keyMap[e.code]] = 'U';               
         }
         
         // Some specific actions.
         
         // Done with box-based selection.
         if (keyMap[e.code] == 'key_alt') {
            gW.hostSelectBox.stop();
            // This detach is needed for cases when ctrl-alt is used for multi-body rotations. This suppresses
            // the fling of the selected body that would result when the alt key is lifted. The "if" condition
            // keeps the detach operation from firing in general alt key usage, for example when the alt-p
            // is used to inhibit screen erasing each frame. Wow, that's a lot of explaining for one line of code.
            if (clients['local'].key_ctrl == 'D') clients['local'].modifyCursorSpring('detach');
            
         } else if (keyMap[e.code] == 'key_ctrl') {
            // Detach the cursor spring. This prevents unintended movement when releasing the control key.
            //clients['local'].modifyCursorSpring('detach');
            
            key_ctrl_handler('keyup', 'local');
            
         } else if (keyMap[e.code] == 'key_shift') {
            // Done with the rotation action. Get ready for the next one.
            gW.hostMSelect.resetCenter();
            clients['local'].modifyCursorSpring('detach');
         }
         
      }, {capture: false}); //This "false" makes this fire in the bubbling phase (not capturing phase).
      
      
      // Gravity toggle
      dC.gravity = document.getElementById('chkGravity');
      function gravityToggle(e) {
         if (dC.gravity.checked) {
            c.g_ON = true;
         } else {
            c.g_ON = false;
         }
         dS.setGravityRelatedParameters({'showMessage':true});
      }
      dC.gravity.addEventListener("click", gravityToggle, {capture: false});
      
      // COM (Center of Mass) selection toggle
      dC.comSelection = document.getElementById('chkCOM_Selection');
      dC.comSelection.addEventListener("click", comSelection_Toggle, {capture: false});
      
      // Multi-player toggle
      dC.multiplayer = document.getElementById('chkMultiplayer');
      dC.multiplayer.addEventListener("click", gW.toggleMultiplayerStuff, {capture: false});
      
      // Stream choke
      dC.stream = document.getElementById('chkStream');
      dC.stream.addEventListener("click", toggleStream, {capture: false});
      function toggleStream() {
         // Turn the stream On/Off.
         if (dC.stream.checked) {
            hC.setCanvasStream('on');
         } else {
            hC.setCanvasStream('off');
         }
      }
      
      // Player option
      dC.player = document.getElementById('chkPlayer');
      dC.player.addEventListener("click", toggleLocalPlayer, {capture: false});
      function toggleLocalPlayer() {
         if (dC.player.checked) {
            clients['local'].player = true;
         } else {
            clients['local'].player = false;
         }
      }
      
      // Friendly-fire option
      dC.friendlyFire = document.getElementById('chkFriendlyFire');
      
      // Editor checkbox
      dC.editor = document.getElementById('chkEditor');
      function toggleEditorStuff() {
         if (dC.editor.checked) {
            gW.messages['help'].newMessage('Wall and Pin editing: [base,yellow]ON[base]', 1.0);
            if (cP.EpL.displayReport) cP.EpL.createEditPin();
            gW.aT.hack['editor'] = true;
         } else {
            gW.messages['help'].newMessage('Wall and Pin editing: [base,yellow]OFF[base]', 1.0);
            if (cP.EpL.displayReport && cP.EpL.pinName) cP.EpL.deleteEditPin();
         }
      }
      dC.editor.addEventListener("click", toggleEditorStuff, {capture: false});
            
      // Pause toggle
      dC.pause = document.getElementById('chkPause');
      dC.pause.addEventListener("click", gW.setPauseState, {capture: false});
      
      // Local cursor toggle
      dC.localCursor = document.getElementById('chkLocalCursor');
      dC.localCursor.checked = false;
      dC.localCursor.addEventListener("click", function() {
         if (dC.localCursor.checked) {
            canvas.style.cursor = 'default';
            // user must put this string in the chat field before checking the local-cursor box.
            if (dC.inputField.value == "lagtest") c.lagTesting = true;
         } else {
            canvas.style.cursor = 'none';
            dC.inputField.value = "";
            c.lagTesting = false;
         }
      }, {capture: false});   
      
      // NickName fields in help panel for Puck Popper, Ghost Ball, Monkey Hunt, and Bipartisan Hoops.
      $('input.nickNameField').on('keyup blur', function(e) {
         if (e.key == "Enter") {
            $(this).blur();
            
            // Wait a bit just to be sure the blur event has time to process.
            // Note that the ES6 arrow function has the "this" of the surrounding context. 
            window.setTimeout( () => {
               
               if (this.id == 'nn_pool') {
                  if (c.demoVersion.slice(0,3) == "3.d") {
                     dS.demoStart(3);
                  } else {
                     cR.demoStart_fromCapture(3, {'fileName':'demo3d.js'});
                  }
                  
               } else if (this.id == 'nn_monkeyHunt') {
                  if (c.demoVersion.slice(0,3) == "4.e") {
                     dS.demoStart(4);
                  } else {
                     cR.demoStart_fromCapture(4, {'fileName':'demo4e.monkeyhunt.js'});
                  }
               
               } else if (this.id == 'nn_basketball') {
                  let secretPW = $('#pw_basketball').val(); 
                  // Always run the base of the politician version, no modified captures allowed here.
                  if (secretPW == "2122pw") {
                     cR.demoStart_fromCapture(5, {'fileName':'demo5e.basketball-pol.js'});
                     
                  } else { 
                     // Allow modified versions (altered captures) of the party version.
                     if (c.demoVersion.includes("5.e.basketball-par")) {
                        dS.demoStart(5);
                        
                     } else {
                        cR.demoStart_fromCapture(5, {'fileName':'demo5e.basketball-par.js'});
                     }
                  }
                  
               } else if (this.id == 'nn_popper7') {
                  dS.demoStart(7);
                  
               } else if (this.id == 'nn_popper8') {
                  dS.demoStart(8);
               }
               
               if (this.id != 'nn_popper7') eVN.changeFullScreenMode( canvas, 'on');
               
            }, 100);
            
         
         } else if (e.type == "blur") {
            let inputString = $(this).val();
            let cleanString = inputString.replace(/[^a-zA-Z0-9@]/g, ''); // allow only alphanumeric and the @ character
            
            // if too short, clean out the field
            if (cleanString.length < 2) cleanString = "";
            
            let localNickName = clients['local'].nickName;
            
            let nameString = (localNickName) ? '"'+localNickName+'"' : 'an anonymous host';
            
            if (hC.get_socket() && (cleanString != "") && (cleanString != localNickName)) {
               let message = '\nYou are connected to the server and identified as '+nameString+'.\n\n' +
                     'Please make any changes to your name via the chat field. Then click the "Create" button.\n\n' +
                     'To get to the chat field, you may need to toggle the left panel using the "m" key.'
               alert( message);
               cleanString = localNickName;
            } else if (hC.get_socket() && (cleanString == "") && localNickName) {
               let message = '\nYou are connected to the server and identified as '+nameString+'.\n\n' + 
                     'If you prefer to go back to being anonymous, type "noname" into the chat field. Then click the "Create" button.\n\n' +
                     'To get to the chat field, you may need to toggle the left panel using the "m" key.'
               alert( message);
               cleanString = localNickName;
            }
            
            // sync all the nickname fields to this value
            $('input.nickNameField').val( cleanString);
         }
      });
      
      // password checker for old version of bipartisan hoops
      $('#pw_basketball').on('keyup', function(e) {
         if ( $(this).val() == "2122pw") {
            this.style.backgroundColor = "lightgreen";
         } else if ( $(this).val() == "quiet") {
            this.style.backgroundColor = "cyan"; // lightgray
         } else {
            this.style.backgroundColor = "#FCF55F";
         };
      });
      
      // Calculator for two pucks in orbit.
      function calcTwoInOrbit( event) {
         //if (event.data.message) console.log("message=" + event.data.message);
         
         let modificationFunction = function( state_capture, demoName) {
            let vx_init_mps = Number( $('#vx_init').val());
            let vy_init_mps = Number( $('#vy_init').val());
            
            // m*s_t^2/r_o = k(2*r_o - L)  centripetal force = spring force
            
            // m(rXv) = m(r_o^2 * Omega)   initial angular momentum = final angular momentum
            // Omega = s_t / r_o           Angular rate = speed / radius
            
            // r_o * s_t = rXv
            
            let puck_A = state_capture['puckMapData']['puck15'];
            let puck_B = state_capture['puckMapData']['puck12'];
            
            let position_A_2d_m = wS.Vec2D_from_b2Vec2( puck_A['position_2d_m']);
            let position_B_2d_m = wS.Vec2D_from_b2Vec2( puck_B['position_2d_m']);
            let com_2d_m = position_A_2d_m.add( position_B_2d_m).scaleBy(0.5);
            
            let velocity_A_2d_mps = new wS.Vec2D( vx_init_mps, vy_init_mps); // wS.Vec2D_from_b2Vec2( puck_A['velocity_2d_mps']);
            
            let r_A_2d_m = position_A_2d_m.subtract( com_2d_m);
            let rXv = r_A_2d_m.cross( velocity_A_2d_mps);
            let puck_A_mass_kg = puck_A.density * Math.PI * puck_A.radius_m ** 2;
            let l_total = 2 * puck_A_mass_kg * rXv;
            
            let spring = state_capture['springMapData']['s14'];
            let spring_k = spring['strength_Npm'];
            let spring_l_m = spring['length_m'];
            
            //console.log("rXv = " + rXv);
            //console.log("l_total = " + l_total);
            
            let testFunction = function( r) {
               return ( spring_k*(2*r - spring_l_m) - (puck_A_mass_kg * rXv**2 / r**3)  );
            }
            let orbit_r_m = uT.keepGuessing( testFunction, 50);
            
            let orbit_speed_mps = rXv / orbit_r_m;
            let orbit_rate_rps = orbit_speed_mps / orbit_r_m;
            
            $('#orbit_speed').html( Math.abs(orbit_speed_mps).toFixed(2));
            $('#orbit_radius').html( orbit_r_m.toFixed(2));
            $('#orbit_rate').html( orbit_rate_rps.toFixed(2));
        } 
        cR.modifyForCalculator("5.a.orbitingOnSpring", {"okToRunCapture":false, "theFunction":modificationFunction});
      }
      $('input.twoInOrbit').on('change focus', {"message":"fromInputEvent"}, calcTwoInOrbit);
      $('#runTwoInOrbit').on('click', {"message":"fromRunEvent"}, calcTwoInOrbit);
      
      // Calculator for inelastic three-puck system.
      function calcThreePucks( event) {
         if (event.data.message) console.log("message=" + event.data.message);
         
         let a_init = Number( $('#a_init').val());
         let b_init = Number( $('#b_init').val());
         let c_init = Number( $('#c_init').val());
         
         let final_rps = (1/11)*(a_init + b_init + c_init);
         
         $('#a_final').html( final_rps.toFixed(2));
         $('#b_final').html( final_rps.toFixed(2));
         $('#c_final').html( final_rps.toFixed(2));
         $('#orbit').html( final_rps.toFixed(2));
      }
      $('input.threePuckCalculator').on('change focus', {"message":"fromInputEvent"}, calcThreePucks);
      $('#runFromThreePuckCalc').on('click', {"message":"fromRunEvent"}, calcThreePucks);
      
      // Calculator for inelastic two-puck system.
      function calcTwoPucks( event) {
         //if (event.data.message) console.log("message=" + event.data.message);
         
         let a_init = Number( $('#a_2p_init').val());
         let b_init = Number( $('#b_2p_init').val());
         
         let orbit_rps = (a_init + b_init)/6;
         $('#orbit_2p').html( orbit_rps.toFixed(2));
         
         //let a_final_rps = ((2 * a_init) - b_init)/3;
         let a_final_rps = a_init - (2 * orbit_rps);
         $('#a_2p_final').html( a_final_rps.toFixed(2));
         
         //let b_final_rps = ((2 * b_init) - a_init)/3;
         let b_final_rps = b_init - (2 * orbit_rps);
         $('#b_2p_final').html( b_final_rps.toFixed(2));
      }
      $('input.twoPuckCalculator').on('change focus', {"message":"fromInputEvent"}, calcTwoPucks);
      $('#runFromTwoPuckCalc').on('click', {"message":"fromRunEvent"}, calcTwoPucks);
      
      // Calculator for inelastic four-puck system.
      function calcFourPucks( event) {
         //if (event.data.message) console.log("message=" + event.data.message);
         
         let a_init = Number( $('#a_4p_init').val());
         let b_init = Number( $('#b_4p_init').val());
         let c_init = Number( $('#c_4p_init').val());
         let d_init = Number( $('#d_4p_init').val());
         
         let ac_init_avg = (a_init + c_init)/2;
         let bd_init_avg = (b_init + d_init)/2;
         
         let orbit_rps = (a_init + b_init + c_init + d_init)/20;
         $('#orbit_4p').html( orbit_rps.toFixed(2));
         
         //let a_final_rps = orbit_rps + (ac_init_avg - bd_init_avg)/2;
         let a_final_rps = ac_init_avg - (4 * orbit_rps);
         $('#a_4p_final').html( a_final_rps.toFixed(2));
         
         //let b_final_rps = orbit_rps - (ac_init_avg - bd_init_avg)/2;
         let b_final_rps = bd_init_avg - (4 * orbit_rps) ;
         $('#b_4p_final').html( b_final_rps.toFixed(2));
         
         let c_final_rps = a_final_rps;
         $('#c_4p_final').html( c_final_rps.toFixed(2));
         
         let d_final_rps = b_final_rps;
         $('#d_4p_final').html( d_final_rps.toFixed(2));
      }
      $('input.fourPuckCalculator').on('change focus', {"message":"fromInputEvent"}, calcFourPucks);
      $('#runFromFourPuckCalc').on('click', {"message":"fromRunEvent"}, calcFourPucks);
      
      // Calculator for inelastic six-puck system.
      function calcSixPucks( event) {
         //if (event.data.message) console.log("message=" + event.data.message);
         
         let a_init = Number( $('#a_6p_init').val());
         let b_init = Number( $('#b_6p_init').val());
         let c_init = Number( $('#c_6p_init').val());
         let d_init = Number( $('#d_6p_init').val());
         let e_init = Number( $('#e_6p_init').val());
         let f_init = Number( $('#f_6p_init').val());
         
         let ace_init_avg = (a_init + c_init + e_init)/3;
         let bdf_init_avg = (b_init + d_init + f_init)/3;
         
         let orbit_rps = (a_init + b_init + c_init + d_init + e_init + f_init)/54;
         $('#orbit_6p').html( orbit_rps.toFixed(2));
         
         let a_final_rps = ace_init_avg - (8 * orbit_rps);
         $('#a_6p_final').html( a_final_rps.toFixed(2));
         
         let b_final_rps = bdf_init_avg - (8 * orbit_rps) ;
         $('#b_6p_final').html( b_final_rps.toFixed(2));
         
         let c_final_rps = a_final_rps;
         $('#c_6p_final').html( c_final_rps.toFixed(2));         
         let e_final_rps = a_final_rps;
         $('#e_6p_final').html( e_final_rps.toFixed(2));
         
         let d_final_rps = b_final_rps;
         $('#d_6p_final').html( d_final_rps.toFixed(2));
         let f_final_rps = b_final_rps;
         $('#f_6p_final').html( f_final_rps.toFixed(2));
      }
      $('input.sixPuckCalculator').on('change focus', {"message":"fromInputEvent"}, calcSixPucks);
      $('#runFromSixPuckCalc').on('click', {"message":"fromRunEvent"}, calcSixPucks);
      
      // Fullscreen button (on host)
      dC.fullScreen = document.getElementById('btnFullScreen');
      dC.fullScreen.addEventListener("click", function() {
         eVN.changeFullScreenMode( canvas, 'on');
      }, {capture: false});
      
      // fullscreen links (on host): any link with a class of fullScreenLink
      document.querySelectorAll('.fullScreenLink').forEach( item => {
         item.addEventListener('click', event => {
            dS.setNickNameWithoutConnecting();
            eVN.changeFullScreenMode( canvas, 'on');
         }, {capture: false});
      });
      
      // Fullcanvas button (on host)
      dC.fullCanvas = document.getElementById('btnFullCanvas');
      dC.fullCanvas.addEventListener("click", function() {
         // A longer delay is needed with FireFox.
         var userAgent = window.navigator.userAgent;
         if (userAgent.includes("Firefox")) {
            var waitForFullScreen = 600;
            console.log("firefox detected");
         } else {
            var waitForFullScreen = 100;
         }
         
         // This immediately requests fullscreen and then calls restartAnimationLoop (which pauses the loop if not already paused).
         // The third parameter delays the restart that's in restartAnimationLoop. The restart will be 500ms after this next block
         // which resized the canvas to match the fullscreen viewport.
         eVN.changeFullScreenMode( canvas, 'on', waitForFullScreen + 500);
         
         // Wait for the restart to finish before checking for a pause. The call will cause a single frame to get processed
         // if the loop is paused. Otherwise, a black screen results from fullCanvas if the animation loop is paused.
         gW.oneFrameIfPaused( waitForFullScreen + 500 + 100);
         
         window.setTimeout(function() {
            /*            
            Note that the 5-pixel edge here seems to resolve a system crashing 
            problem on my Intel NUC. The crash happens when exiting fullscreen mode 
            with the esc key when using a 0 or 1 pixel edge. The pattern is 
            full-canvas mode, then esc, then full-screen mode, then esc (crash). 
            */
            var edge_px = 5;           
            /*
            If one or both axes of the original canvas is larger than the window, 
            stretch the axis that has the lowest fractional value (relative to its 
            corresponding window axis). Stretch it in a way that the aspect ratio of 
            the stretched canvas is equal to the aspect ratio of the window. 
            That should yield a canvas that fills the window without cutting 
            off any territory or objects in the original canvas. 
            */
            var subwindow_px_w = window.innerWidth - edge_px;
            var subwindow_px_h = window.innerHeight - edge_px;
            
            var width_ratio = canvas.width / window.innerWidth;
            var height_ratio = canvas.height / window.innerHeight;
            
            if ((canvas.width > subwindow_px_w) || (canvas.height > subwindow_px_h)) {
               if (width_ratio < height_ratio) {
                  canvas.width = canvas.height * (window.innerWidth / window.innerHeight);
               } else {
                  canvas.height = canvas.width * (window.innerHeight / window.innerWidth);
               }
            } else {
               canvas.width  = subwindow_px_w;
               canvas.height = subwindow_px_h;               
            }
                    
            // This apparently needs to be reset after the canvas dimensional changes above.
            // (only needed for the color mixing demo #9)
            if (c.demoIndex == 9) ctx.globalCompositeOperation = 'screen';
            
            // If there is a fence, take it down and put up a new one running along the edge of the canvas.
            // (leave the fence as-is when playing pool) 
            if ( cP.Wall.checkForFence() && (c.demoVersion.slice(0,3) != "3.d") ) {
               if ( ['1.c','1.d','1.e'].includes( dS.demoVersionBase( c.demoVersion)) ) {
                  cP.Wall.deleteFence();
                  // Have only a top wall for the pi-calc demos
                  cP.Wall.makeFence({'bOn':false, 'rOn':false, 'lOn':false}, canvas); 
               } else {
                  let currentFenceParameters = cP.Wall.getFenceParms();
                  //console.log("fenceParms=" + JSON.stringify( currentFenceParameters) );
                  cP.Wall.deleteFence();
                  cP.Wall.makeFence( currentFenceParameters, canvas);
               }
            }
            
            // Let the clients know that the canvas dimensions have changed.
            setClientCanvasToMatchHost();
            // Capture the new layout so the demo can be restarted without having to run this again.
            cR.saveState();
            
         }, waitForFullScreen); // delay needed for Firefox
         
      }, {capture: false});
      
      // Button on host for posting captures to CloudFlare
      dC.postToCloud = document.getElementById('button-postToCloud');
      dC.postToCloud.addEventListener("click", function() {
         let warningMessage, acceptLabel, purpose, title;
         
         let leftPanelInfo = "<li class='dialog'>Responses from the server are displayed in the chat (left panel).";
         let deletAndUpdatInfo = "<ul class='dialog'>" +
                                 "<li class='dialog'>This will target the cloud capture having the same name " +
                                     "as the local capture's demoVersion (right panel)." +
                                 leftPanelInfo + 
                                 "</ul>";
         
         if ((clients['local'].key_ctrl == 'D') && (clients['local'].key_shift == 'D')) {
            warningMessage = "This will attempt to DELETE the corresponding capture in cloud storage.<br>" + 
                             deletAndUpdatInfo +
                             "Continue ?"; 
            acceptLabel = "go ahead, try to DELETE it";
            purpose = "post-delete";
            title = "DELETE";
            
         } else if (clients['local'].key_shift == 'D') {
            warningMessage = "This will attempt to UPDATE the corresponding capture in cloud storage.<br>" +
                             deletAndUpdatInfo +
                             "Continue ?"; 
            acceptLabel = "go ahead, try to UPDATE it";
            purpose = "post-update";
            title = "UPDATE";
            
         } else {
            warningMessage = "This will attempt to POST the current capture to cloud storage.<br>" + 
                             "<ul class='dialog'>" +
                                "<li class='dialog'>To UPDATE a previously posted cloud capture, " +
                                    "click the P button while holding the SHIFT key down." +
                                "<li class='dialog'>To DELETE a cloud capture, click the P button while " + 
                                    "holding the CTRL and SHIFT keys down." +
                                leftPanelInfo + 
                             "</ul>" +
                             "Continue ?";
            acceptLabel = "go ahead, try to POST it";
            purpose = "post-normal";
            title = "POST";
         }
         
         pS.viewGeneralDialog({"title":title, "message":warningMessage,
                               "label_accept":acceptLabel, "label_reject":"cancel", "label_close":"close",
                               "purpose":purpose});
         
      }, {capture: false});
      
      // For handling full-screen mode changes
      $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange msfullscreenchange', function(e) {
         // Check the state:
         // Starting fullscreen
         if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            console.log('fullscreen state: TRUE');
            c.fullScreenState = true;
            canvas.style.borderWidth = '0px';
            canvas.style.backgroundColor = '#000000'; // black for viewing fullscreen
         
         // Exiting fullscreen
         } else {
            console.log('fullscreen state: FALSE');
            c.fullScreenState = false;
            canvas.style.borderWidth = '5px';
            /*
            If background color matches border color, it hides the border-edge 
            problem in Chrome. This fix is inhibited during times when the canvas 
            animation loop is stopped or when the screen erasing is stopped. These 
            conditions, coupled with going in and out of full-screen and full-canvas 
            mode, will leave the whole canvas colored in the border color. So have 
            to handle with care. In these cases, the fix is re-enabled in 
            gW.setPauseState. Note: the problem can still be seen when exiting 
            full-screen (not full-canvas) mode when paused. It's a small gap by the 
            right-side border.
            */
            if (( ! c.pauseErase) && ( ! dC.pause.checked)) {
               canvas.style.backgroundColor = c.borderAndBackGroundColor; 
            }
            
            gW.restartAnimationLoop( 500);
         }
      });
   }
   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'initializeEventListeners': initializeEventListeners,
      
      'wheelEvent_handler': wheelEvent_handler,
      'mouseUp_handler': mouseUp_handler,
      'key_ctrl_handler': key_ctrl_handler,
      'key_b_handler': key_b_handler,
      'key_c_handler': key_c_handler,
      'key_l_handler': key_l_handler,
      'key_n_handler': key_n_handler,
      
      'pasteSpring': pasteSpring,
      'addRevoluteJoint': addRevoluteJoint,
      
      'freeze': freeze,
      'stopRotation': stopRotation,
      'reverseDirection': reverseDirection,

      'setClientCanvasToMatchHost': setClientCanvasToMatchHost,    
      
   };   
   
})();