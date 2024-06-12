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

// Capture and Restore (cR) module
// captureRestore.js
   console.log('cR _*-*_');
// 8:35 PM Sun December 10, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

/*
These functions act to save (capture) a concise representation of the system state for later restoration. 
The engine-related state is limited to position and velocity (translational and rotational). No
attempt is made to capture the collision-related state internal to the Box2D engine.
*/

window.cR = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_fileHandle = 'documents';
   
   // module globals for objects brought in by initializeModule
   var x_canvas, x_ctx;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      x_canvas = canvas;
      x_ctx = ctx;
   }
   
   function json_scrubber( key, value) {
      /*
      Use this function to exclude the b2d objects in the stringify process. 
      Apparently the b2d and rtc objects have circular references that 
      stringify doesn't like. So have to regenerate the b2d objects in the 
      demo area when the json capture is restored. 

      Also have to avoid the client related addons: jet, gun, and shield. 
      These have references back their pucks, this too causes circular issues 
      for stringify. 

      Also remove keys like spo1 and spo2 (in Springs object) mainly to keep 
      the wordiness down; many keys are not needed in the reconstruction 
      process. 

      So be careful here: any key with a name in the OR list of json_scrubber 
      (see if block below) will be excluded from the capture. 
      */
      if ( (key == 'b2d') || (key == 'b2dSensor') || (key == 'rtc') || 
           (key == 'jet') || (key == 'gun') || (key == 'shield') || 
           (key == 'spo1') || (key == 'spo2') || 
           (key == 'jto1') || (key == 'jto2') || 
           (key == 'parsAtBirth') || 
           (key == 'puck') || (key.includes('key_')) || (key.includes('_scaling')) || (key.includes('selectionPoint')) || 
           (key == 'position_2d_px') || (key == 'nonCOM_2d_N') ) {
         return undefined;
      } else {
         return value;
      }
   }
   
   function saveState( pars = {} ) {
      var captureName = uT.setDefault( pars.captureName, null);
      var dataForCleaning = uT.setDefault( pars.dataForCleaning, null);
      var inhibitWriteToCaptureCell = uT.setDefault( pars.inhibitWriteToCaptureCell, false);
      
      var timeString = new Date();
      
      if (dataForCleaning) {
         // Use an old capture, that is passed in via dataForCleaning in pars, as the data sources.
         // (see comment in cleanCapture)
         
         if ( [7,8].includes( dataForCleaning.demoIndex) ) {
            if ( ! dataForCleaning.startingPosAndVels) {
               dataForCleaning.startingPosAndVels = dS.defaultStartingPosAndVel( dataForCleaning.demoVersion);
            }
         } else {
            // remove the key if not in the 7 or 8 demo groups
            delete dataForCleaning.startingPosAndVels;
         }
         
         // Add some canvas dimensions if needed.
         if ( ! (dataForCleaning.canvasDimensions)) {
            if (dataForCleaning.demoIndex == 8) {
               dataForCleaning.canvasDimensions = {'width':1250, 'height':950};
            } else {
               dataForCleaning.canvasDimensions = {'width':600, 'height':600};
            }
         }
       
         var tableState = {'demoIndex':dataForCleaning.demoIndex,
                           'demoVersion':dataForCleaning.demoVersion,
                           'date':timeString.toLocaleString(),
                           'canvasDimensions': {'width':dataForCleaning.canvasDimensions.width, 'height':dataForCleaning.canvasDimensions.height},
                           'gravity':dataForCleaning.gravity,
                           'comSelection':dataForCleaning.comSelection,
                           'fullScreenDemo':dataForCleaning.fullScreenDemo,
                           'lockedAndLoaded':dataForCleaning.lockedAndLoaded,
                           'globalCompositeOperation':dataForCleaning.globalCompositeOperation,
                           'EpL': dataForCleaning.EpL,
                           'wallMapData':dataForCleaning.wallMapData, 
                           'puckMapData':dataForCleaning.puckMapData, 
                           'pinMapData':dataForCleaning.pinMapData, 
                           'springMapData':dataForCleaning.springMapData,
                           'jointMapData':dataForCleaning.jointMapData,
                           'startingPosAndVels':dataForCleaning.startingPosAndVels,
                           'clients':dataForCleaning.clients};
                           
         if (dataForCleaning.piCalcs) {
            tableState = Object.assign({}, tableState, {'piCalcs':dataForCleaning.piCalcs} );
            if (dataForCleaning.piEngine) {
               tableState = Object.assign({}, tableState, {'piEngine':dataForCleaning.piEngine} );
            }
         } else {
            tableState = Object.assign({}, tableState, {'piCalcs':{}} );
         }
      
      // Get a fresh capture (i.e., using the live stuff as the data source).            
      } else {
         if ( ! inhibitWriteToCaptureCell) {
            if (captureName) {
               gW.setDemoVersion( gW.getDemoVersion() + '.' + captureName);
            } else {
               gW.setDemoVersion( gW.getDemoVersion() + '.' + Math.floor((Math.random() * 1000) + 1));
            }
            if (gW.getDemoIndex() != 0) {
               // Adjust the highlighting in the plus row (there's no plus row for demo 0)
               document.getElementById( gW.getDemoVersion().slice(0,1) + ".a").style = '';
               document.getElementById( gW.getDemoVersion().slice(0,3)).style = 'color:white; background-color:gray; border-style:solid; border-color:black; border-width:4px 0px 4px 0px';
            }
         }
         
         // Temporarily turn off the EpL pin to keep it out of the pinMap in the capture. 
         // Then turn the pin back on AFTER tableState gets stringified.
         // (The pin gets created during restoration if the editor is on. Only need one!)
         if (gW.dC.editor.checked && cP.EpL.pinName) {
            cP.EpL.deleteEditPin();
         }
         
         var tableState = {'demoIndex':gW.getDemoIndex(),
                           'demoVersion':gW.getDemoVersion(),
                           'date':timeString.toLocaleString(),
                           'capturedAtFrame':gW.getFrameCount(),
                           'canvasDimensions': {'width':x_canvas.width, 'height':x_canvas.height},
                           'gravity':gW.getG_ON(),
                           'comSelection':gW.dC.comSelection.checked,
                           'fullScreenDemo':gW.getFullScreenDemo(),
                           'lockedAndLoaded':gW.getLockedAndLoaded(),
                           'globalCompositeOperation':x_ctx.globalCompositeOperation,
                           'EpL': {'display':cP.EpL.displayReport, 'reportType':cP.EpL.reportType, 'COM':cP.EpL.COM, 'angularAxis_2d_m':cP.EpL.angularAxis_2d_m},
                           'wallMapData':gW.aT.wallMap, 
                           'puckMapData':gW.aT.puckMap, 
                           'pinMapData':gW.aT.pinMap, 
                           'springMapData':gW.aT.springMap,
                           'jointMapData':gW.aT.jointMap,
                           'startingPosAndVels':cT.Client.startingPandV,
                           'clients':gW.clients};
         
         // For demos using the pi-calc engine, add the engine state to the capture.
         if ( ['1.c','1.d','1.e'].includes( dS.demoVersionBase( gW.getDemoVersion())) ) {
            var piCalcs = {};
            piCalcs['clacks'] = gW.getPiCalcs().clacks;
            piCalcs['enabled'] = gW.getPiCalcs().enabled;
            piCalcs['usePiEngine'] = gW.getPiCalcs().usePiEngine;
            
            let engineStateSubset = {};
            if (piCalcs['usePiEngine']) {
               let piEngineState = pE.currentState();
               
               engineStateSubset['lastCollidedWithWall']       = piEngineState['lastCollidedWithWall'];
               engineStateSubset['atLeastOneCollisionInFrame'] = piEngineState['atLeastOneCollisionInFrame'];
               engineStateSubset['nFinerTimeStepFactor']       = piEngineState['nFinerTimeStepFactor'];               
               
               piCalcs['p1_v_max']       = piEngineState['p1_v_max'];
               piCalcs['collisionCount'] = piEngineState['collisionCount'];
               
            } else {
               piCalcs['p1_v_max']       = gW.aT.puckMap['puck1'].vmax;
               piCalcs['collisionCount'] = gW.aT.collisionCount;
            }
            
            tableState = Object.assign( {}, tableState, {'piCalcs':piCalcs}, {'piEngine':engineStateSubset} );
         }
      
         // Here you still have full state info. That's because this is before the json_scrubber is called. So if you want to keep
         // something that's about to be scrubbed out, do it here. As an example: the angle of the NPC casting rays,
         // that are in the gun attributes. This can be put into the rayCast_init_deg attribute of the NPC's puck. Then it
         // will be used when the NPC's puck and gun are restored (the gun gets this from its puck).
         for (var p_key in tableState.puckMapData) {
            var puck = tableState.puckMapData[ p_key];
            if ((puck.clientName) && (puck.clientName.slice(0,3) == 'NPC')) {
               puck.rayCast_init_deg = puck.gun.rayCastLine_2d_m.get_angle();
            }
         }
      }
      
      // See comments in the json_scrubber function above.
      var table_JSON = JSON.stringify( tableState, json_scrubber, 3);
      
      // Parsing after JSON.stringify makes a deep copy, with no references back to the original objects (and no reference to their methods).
      // So, can delete stuff without mangling the current running demo.
      var tableState_copy = JSON.parse( table_JSON);
      
      // Turn EpL pin back on AFTER the JSON string has been made.
      if (gW.dC.editor.checked && cP.EpL.displayReport) {
         cP.EpL.createEditPin();
      }
      
      // Remove some non-editable puck keys from all pucks.
      var generalPuckKeys = ['age_ms','ageLimit_ms','radius_px','mass_kg','inertia_kgm2','half_height_px','half_width_px','tempInhibitExtForce','spotted',
                             'lowBallFinderCircle_timerLimit_s','lowBallFinderCircle_timer_s','firstClientDirectMove','nameTip_timerLimit_s','nameTip_timer_s',
                             'sprDamp_force_2d_N','springOnly_force_2d_N','jet_force_2d_N','impulse_2d_Ns','navSpringOnly_force_2d_N','drawDuringPE',
                             
                             'poorHealthFraction','whoShotBullet','flash','inComing','flashCount','atLeastOneHit','stayOn',
                             'hitCount','deleted','clientNameOfShooter',
                             'bulletAgeLimit_ms' // this is a client attribute now
                             ];
                             
      // Remove these from pucks with no client controls.
      var simplePuckKeys =  ['disableJet','noRecoil','bullet_restitution','hitLimit','cannibalize'];
      
      // Remove these from the tail of any puck.
      var puckTailKeys = ['firstPoint_2d_m','initial_radius_m','values','markerPingTimer_s','pingColor'];
      
      // Remove these from clients depending on whether NPC or Human
      var NPC_clientPuckKeys = ['angleLine'];
      var nonNPC_puckKeys = ['disableJet','rayCast_init_deg','rayRotationRate_dps','rayCastLineLength_m'];
      
      for (var p_key in tableState_copy.puckMapData) {
         var puck = tableState_copy.puckMapData[ p_key];
         
         // Turning off the machSwitch causes the puck to be restored to the captured velocity rather than a specified Mach value.
         if ((puck.tail) && ( ! dataForCleaning)) puck.tail.machSwitch = false;
         
         // Delete gun bullets and network-client pucks in Puck Popper captures
         if ((tableState_copy.demoIndex == 7) || (tableState_copy.demoIndex == 8)) {
            let gunBullet = puck.bullet && puck.ageLimit_ms; // the gunBullet puck method is not available here
            if ( gunBullet || ((puck.clientName) && (puck.clientName.slice(0,1) == 'u')) ) {
               delete tableState_copy.puckMapData[ p_key];
               continue; // go directly to next key in this for loop
            } 
         }
         
         // Delete keys on pucks:
         
         // all pucks
         for (var key of generalPuckKeys) {
            delete puck[ key];
         }
         // simple pucks (no client controls)
         if ( ! puck.clientName) {
            for (var key of simplePuckKeys) {
               delete puck[ key];
            }
            for (var key of nonNPC_puckKeys) {
               delete puck[ key];
            }
         // client pucks
         } else {
            // all non-NPC client pucks
            if (puck.clientName.slice(0,3) != 'NPC') {
               for (var key of nonNPC_puckKeys) {
                  delete puck[ key];
               }
            } 
            // all NPC client pucks
            if (puck.clientName.slice(0,3) == 'NPC') {
               for (var key of NPC_clientPuckKeys) {
                  delete puck[ key];
               }
            }
         }
         // tail parameters
         if (puck.tail) {
            for (var key of puckTailKeys) {
               delete puck.tail[ key];
            }
         }
      }
      
      // Remove some non-editable pin keys.  
      var pinKeys = ['radius_m'];
      for (var pin_key in tableState_copy.pinMapData) {
         var pin = tableState_copy.pinMapData[ pin_key];
         for (var key of pinKeys) {
            delete pin[ key];
         }
      }
      
      // Remove some non-editable wall keys.
      var wallKeys = ['deleted','half_height_px','half_width_px','firstClientDirectMove'];  // color
      for (var wall_key in tableState_copy.wallMapData) {
         var wall = tableState_copy.wallMapData[ wall_key];
         for (var key of wallKeys) {
            delete wall[ key];
         }
      }
      
      // Remove some spring keys.
      var springKeys = ['pinned','p1p2_separation_2d_m','p1p2_separation_m','p1p2_normalized_2d',
                        'spo1_ap_w_2d_m','spo1_ap_w_2d_px','spo2_ap_w_2d_m','spo2_ap_w_2d_px',
                        'selected','softConstraints_setInPars'];
      for (var spring_key in tableState_copy.springMapData) {
         var spring = tableState_copy.springMapData[ spring_key];
         
         // Don't capture the local ap (attach point) for pins.
         if (spring.p1_name.slice(0,3) == "pin") delete spring['spo1_ap_l_2d_m'];
         if (spring.p2_name.slice(0,3) == "pin") delete spring['spo2_ap_l_2d_m'];
         
         for (var key of springKeys) {
            delete spring[ key];
         }
      }
      // Remove some joint keys.
      var jointKeys = ['jto1_ap_w_2d_m','jto1_ap_w_2d_px','jto2_ap_w_2d_m','jto2_ap_w_2d_px','selected','colorInTransition'];  // color
      for (var joint_key in tableState_copy.jointMapData) {
         var joint = tableState_copy.jointMapData[ joint_key];
         for (var key of jointKeys) { 
            delete joint[ key];
         }
      }
      
      // For client objects, clean off all keys EXCEPT these (i.e. SAVE these): 
      var saveTheseDroneKeys = ['color','name','NPC_pin_timer_s','NPC_pin_timer_limit_s','bulletAgeLimit_ms'];
      var saveTheseHostKeys =  ['color','name','bulletAgeLimit_ms'];
      for (var client_key in tableState_copy.clients) {
         var client = tableState_copy.clients[ client_key];
         
         if ((client.name.slice(0,1) == 'u') || (client.name == 'manWithNoName')) {
            // Delete network clients...
            delete tableState_copy.clients[ client_key];
            
         } else if (client.name.slice(0,3) == 'NPC') {
            // Clean-up keys on drone clients.
            for (var clientKey in client) {
               if ( ! saveTheseDroneKeys.includes( clientKey)) {
                  delete client[ clientKey];
               }
            }
            
            // Add these keys if missing in an old capture...
            client.bulletAgeLimit_ms = (client.bulletAgeLimit_ms) ? client.bulletAgeLimit_ms : null;
            
         } else if (client.name == 'local') {
            // Clean-up keys on the host.
            for (var clientKey in client) {
               if ( ! saveTheseHostKeys.includes( clientKey)) {
                  delete client[ clientKey];
               }
            }
		 
            // Add these keys if missing in an old capture...
            client.color = (client.color) ? client.color : null;
            client.bulletAgeLimit_ms = (client.bulletAgeLimit_ms) ? client.bulletAgeLimit_ms : null;
         }
      }
      
      // Exit if state data was passed in to be cleaned.
      if (dataForCleaning) return tableState_copy;
      //----------------------------------------------------------------------
      
      // Once again, put it in a string...
      table_JSON = JSON.stringify( tableState_copy, null, 3);
      
      if ( ! inhibitWriteToCaptureCell) {
         // Write the json string to this visible input field.
         gW.dC.json.value = table_JSON;
         // Wait 0.5 seconds, then scroll the input field to the top.
         window.setTimeout( function() { scrollCaptureArea();}, 500);
         
         // Select, copy to clipboard, and then remove focus from the input field.
         gW.dC.json.select();
         document.execCommand('copy');
         window.getSelection().removeAllRanges(); // this is necessary for the blur method to work in MS Edge.
         gW.dC.json.blur();
      }

      return table_JSON;
   }
   
   function loadJSON( element) {
      let emptyMessage, errorMessage, emptyMessageDuration;
      
      if (element.id == "jsonCapture") {
         errorMessage = "There's a formatting error in the state capture. Try clicking the 'Clear' button.";
         emptyMessage = "The capture text area is empty.";
         emptyMessageDuration = 2.0;
         
      } else {
         errorMessage = 'There is a formatting error in the JSON in the chat input field.' + 
                        '\nAn example of good format is {"color": "yellow"} or {"friction": 0.5}.' + 
                        '\n\n(You may need to use the "m" key to toggle the left panel and reveal the chat input field.)';
                        
         emptyMessage = 'There is no modifying JSON to use. \\Put some JSON in the chat input field. \\Examples: {"color": "yellow"} or {"friction": 0.5}';
         emptyMessageDuration = 5.0;
      }
      
      let state_capture;
      if (element.value != '') {
         try {
            state_capture = JSON.parse( element.value);
         } catch (err) {
            state_capture = null;
            window.alert( errorMessage);
         }
      } else {
         gW.messages['help'].newMessage( emptyMessage, emptyMessageDuration);
         state_capture = null;
      }
      return state_capture;
   }
   
   function modifyCapture() {
      // Use a small piece of JSON (in the chat field) to change corresponding attributes in the capture
      // for all the selected table objects. This was used mainly to generate demo 1b.
      let state_capture = null, jsonModifier = null;
      
      // Pull in the capture
      state_capture = loadJSON( gW.dC.json);
      
      // Parse the JSON in the chat field.
      jsonModifier = loadJSON( gW.dC.inputField);
      
      if (state_capture && jsonModifier) {
         // Change the attributes of the selected objects
         gW.hostMSelect.applyToAll( tableObj => {
            let mapName = null;
            if (tableObj.constructor.name == "Puck") {
               mapName = 'puckMapData';
            } else if (tableObj.constructor.name == "Wall") {
               mapName = 'wallMapData';
            } else if (tableObj.constructor.name == "Pin") {
               mapName = 'pinMapData';
            }
            for (let key in jsonModifier) {
               if (mapName) state_capture[ mapName][ tableObj.name][ key] = jsonModifier[ key];
            }
         });
         
         // Write out the updated capture.
         state_capture.demoVersion += '.' + Math.floor((Math.random() * 1000) + 1);
         let table_JSON = JSON.stringify( state_capture, null, 3);
         gW.dC.json.value = table_JSON;
      }
   }
   
   // This is the default modification function used by modifyForCalculator.
   let settingsForDemos = function( state_capture, demoName) {
      // Use the speed version of the EpL report.
      state_capture['EpL']['reportType'] = 'speed';
      
      if (demoName == '5.a.orbitingOnSpring') {
         let vx_init_mps = Number( $('#vx_init').val());
         let vy_init_mps = Number( $('#vy_init').val());
         
         state_capture['puckMapData']['puck15']['velocity_2d_mps'].x = vx_init_mps;
         state_capture['puckMapData']['puck15']['velocity_2d_mps'].y = vy_init_mps;
         state_capture['puckMapData']['puck12']['velocity_2d_mps'].x = -vx_init_mps; 
         state_capture['puckMapData']['puck12']['velocity_2d_mps'].y = -vy_init_mps; 
      
      } else if (demoName == '5.b.two') {
         let a_init = Number( $('#a_2p_init').val());
         let b_init = Number( $('#b_2p_init').val());
         
         state_capture['puckMapData']['puck1']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck2']['angularSpeed_rps'] = b_init; 
         
      } else if (demoName == '5.b.four') {
         let a_init = Number( $('#a_4p_init').val());
         let b_init = Number( $('#b_4p_init').val());
         let c_init = Number( $('#c_4p_init').val());
         let d_init = Number( $('#d_4p_init').val());
         
         state_capture['puckMapData']['puck17']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck18']['angularSpeed_rps'] = b_init;               
         state_capture['puckMapData']['puck19']['angularSpeed_rps'] = c_init;               
         state_capture['puckMapData']['puck20']['angularSpeed_rps'] = d_init;               
         
      } else if (demoName == '5.b.six') {
         let a_init = Number( $('#a_6p_init').val());
         let b_init = Number( $('#b_6p_init').val());
         let c_init = Number( $('#c_6p_init').val());
         let d_init = Number( $('#d_6p_init').val());
         let e_init = Number( $('#e_6p_init').val());
         let f_init = Number( $('#f_6p_init').val());
         
         // 1,9,14 2,5,13
         state_capture['puckMapData']['puck1']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck2']['angularSpeed_rps'] = b_init;               
         state_capture['puckMapData']['puck3']['angularSpeed_rps'] = c_init;               
         state_capture['puckMapData']['puck4']['angularSpeed_rps'] = d_init;               
         state_capture['puckMapData']['puck5']['angularSpeed_rps'] = e_init;               
         state_capture['puckMapData']['puck6']['angularSpeed_rps'] = f_init;               
         
      } else if (demoName == '5.b') {
         let a_init = Number( $('#a_init').val());
         let b_init = Number( $('#b_init').val());
         let c_init = Number( $('#c_init').val());
         
         state_capture['puckMapData']['puck9']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck10']['angularSpeed_rps'] = b_init;               
         state_capture['puckMapData']['puck11']['angularSpeed_rps'] = c_init;               
      }
      
      //state_capture.demoVersion += '.' + Math.floor((Math.random() * 1000) + 1);
      let table_JSON = JSON.stringify( state_capture, null, 3);
      gW.dC.json.value = table_JSON;
   }
   
   function modifyForCalculator( demoName, pars={}) {
      let okToRunCapture = uT.setDefault( pars.okToRunCapture, true);
      // note: settingsForDemos is the function above.
      let theFunction = uT.setDefault( pars.theFunction, settingsForDemos);
      
      let demoFileNames = {
         '5.a.orbitingOnSpring': 'demo5a.orbitingOnSpring.js',
         '5.b.two': 'demo5b.two.js',
         '5.b.four': 'demo5b.four.js',
         '5.b.six': 'demo5b.six.js',
         '5.b': 'demo5b.js',
      };
      let demoIndex = demoName.split('.')[0];
      
      // Check for the correct demo capture in the textarea.
      let state_capture = loadJSON( gW.dC.json);
      let loadWaitNeeded = false;
      if ( ! (state_capture && (state_capture.demoVersion == demoName))) {
         gW.messages['help'].newMessage('Loading the [base,yellow]' + demoName + '[base] demo.', 3.0);
         demoStart_fromCapture( demoIndex, {'fileName':demoFileNames[ demoName], 'runIt':false});
         loadWaitNeeded = true;
      }
      
      // Give it some time to finish loading...
      let loadWait = (loadWaitNeeded) ? 500 : 0; 
      window.setTimeout( function() { 
         state_capture = loadJSON( gW.dC.json);
         if (state_capture) {
            // Ok, now run the modification function that is passed in.
            theFunction( state_capture, demoName);
            if (okToRunCapture) runCapture();
         }
      }, loadWait);
   }
   
   function shiftCapture() {
      // Shift the position of the pucks, pins, and walls so that the capture appears centered on a new larger canvas.
      // Calculate the shift vector using: 
      //   center of the original canvas
      //   center of the larger final canvas
      
      let state_capture = null;
      let originalCenter_2d_px = null, originalCenter_2d_m = null;
      let finalCenter_2d_px = null, finalCenter_2d_m = null;
      
      // Pull in the capture
      state_capture = loadJSON( gW.dC.json);
      
      if (state_capture) {
         
         if (state_capture["canvasDimensions"]) {
            originalCenter_2d_px = new wS.Vec2D( state_capture["canvasDimensions"].width / 2.0, state_capture["canvasDimensions"].height / 2.0);
         } else {
            originalCenter_2d_px = new wS.Vec2D( gW.get_hostCanvasWH().width / 2.0, gW.get_hostCanvasWH().height / 2.0);
         }
         originalCenter_2d_m = new wS.Vec2D( wS.meters_from_px( originalCenter_2d_px.x), wS.meters_from_px( originalCenter_2d_px.y));
         
         // Increase the size of the canvas to match the window. 
         let w_px = window.innerWidth;
         let h_px = window.innerHeight;
         state_capture["canvasDimensions"] = {"width": w_px, "height": h_px};
         finalCenter_2d_px = new wS.Vec2D( w_px / 2.0, h_px / 2.0);
         finalCenter_2d_m = new wS.Vec2D( wS.meters_from_px( finalCenter_2d_px.x), wS.meters_from_px( finalCenter_2d_px.y));
         
         // calculate shift vector
         let shift_2d_m = finalCenter_2d_m.subtract( originalCenter_2d_m);
         
         let shifter = function( mapName) {
            for (let objName in state_capture[ mapName]) {
               let obj = state_capture[ mapName][ objName];
               obj.position_2d_m.x += shift_2d_m.x;
               obj.position_2d_m.y += shift_2d_m.y;
            }
         }
         // Shift (move) the starting positions of all objects.
         shifter('puckMapData');
         shifter('pinMapData');
         shifter('wallMapData');
         
         // Write out the updated capture.
         state_capture.demoVersion += '.' + Math.floor((Math.random() * 1000) + 1);
         let table_JSON = JSON.stringify( state_capture, null, 3);
         gW.dC.json.value = table_JSON;
      }
   }
   
   function runCapture( pars={}) {
      let fromKeyBoard = uT.setDefault( pars.fromKeyBoard, false);
      let state_capture, demoIndex;
      
      state_capture = loadJSON( gW.dC.json);
      
      let shift_key = gW.clients['local'].key_shift; // before the key-state reset that is in demoStart
      
      if (state_capture) { 
         demoIndex = state_capture.demoIndex;
         dS.demoStart( demoIndex, {'scrollCA':false});
         
         // grab a capture before the engine changes state...
         if ((shift_key == "D") && ( ! fromKeyBoard)) {
            saveState();
            gW.messages['help'].newMessage('The capture has been updated.', 2.0);
         }
         
      } else {
         // grab a capture before the engine changes state...
         if ((shift_key == "D") && ( ! fromKeyBoard)) {
            dS.demoStart( gW.getDemoIndex());
            saveState();
            gW.messages['help'].newMessage('A capture has been taken.', 2.0);
         }
         
         // Make sure the loop isn't paused so the help messages are displayed.
         if (gW.dC.pause.checked) {
            gW.dC.pause.checked = false;
            gW.setPauseState();
         }
      }
   }
   
   function clearState() {
      // Reset the capture state...
      gW.dC.json.value = '';
      // Reset the highlight styles in the row below the number buttons.
      var highlightedLinkInPlusRow = document.getElementById( gW.getDemoVersion().slice(0,3));
      var firstLinkInPlusRow = document.getElementById( gW.getDemoVersion().slice(0,1) + ".a");
      if (highlightedLinkInPlusRow) highlightedLinkInPlusRow.style = '';
      if (firstLinkInPlusRow) firstLinkInPlusRow.style = 'color:white; background-color:gray; padding:2px 0px';
   }
   
   function cleanCapture() {
      /*
      Clean up an old capture that's in the text area (or one of the "_fromFile" files).
      Mainly this removes old keys. You can enlist cleanCapture and saveState to add new editable keys (if it's in
      the code), but it is generally best to run the old capture and then immediately take a new capture.
      
      Recently modified runCapture to be able to do that (immediately take a capture before the engine modifies state) if the shift key is down.
      
      cleanCapture can be run by middle clicking in the text area.
      */
      if (gW.getDemoVersion() == '8.a') {
         var state_data = demo_8_fromFile;
         
      } else if (gW.getDemoVersion() == '6.a') {
         var state_data = demo_6_fromFile;
         
      } else {
         if (gW.dC.json.value != "") {
            var state_data = JSON.parse( gW.dC.json.value);
         } else {
            gW.messages['help'].newMessage('No capture to update.', 2.0);
            return;
         }
      }
      
      // first, process (clean) the capture with saveState
      state_data = saveState( {'dataForCleaning':state_data} );
      
      // Special loop for pucks.
      for (var p_key in state_data.puckMapData) {
         var puck = state_data.puckMapData[ p_key];
         
         if (puck.clientName) {
            puck.groupIndex = -puck.name.slice(4) - 1000;
         } else {
            if ((state_data.demoVersion == '3.b') || (state_data.demoVersion == '3.c')) {
               // leave these alone, puck-puck collisions have been inhibited on these pucks.
            } else {
               puck.groupIndex = 0;
            }
         }
      }
      
      // For all the maps.
      var mapList = ['puckMapData','pinMapData','springMapData','jointMapData','wallMapData','clients'];
      for (var map of mapList) {
         for (var key in state_data[ map]) {
            var element = state_data[ map][ key];
            
            delete element['parsAtBirth'];
            
            delete element['alsoThese'];
            
            // Put the alsoThese key at the beginning of the object. Commented this
            // out for now. Could be useful if want to force an attribute to be recognized
            // in the capture.
            //state_data[ map][ key] = Object.assign({'alsoThese':[]}, element);
         }
      }
      
      gW.dC.json.value = JSON.stringify( state_data, null, 3);
      
      // Select, copy to clipboard, and then remove focus from the input field.
      gW.dC.json.select();
      document.execCommand('copy');
      window.getSelection().removeAllRanges(); // this is necessary for the blur method to work in MS Edge.
      gW.dC.json.blur();   
   
      gW.messages['help'].newMessage('The capture has been updated (scripted, without instantiation).', 2.0);
   }
   
   function newBirth( captureObj, type) {
      // Update the birth object (based on the capture state) and use it for restoration.
      var newBirthState = {}, par_list;
      
      // If there's a parameter that is getting into the capture but should be blocked in the birth process:
      var forgetList = {
         'puck': ['position_2d_m','velocity_2d_mps'], // These are explicitly passed to constructor via arguments (so not needed in birth object)
         'wall': ['position_2d_m'],  // Position is passed via arguments. Velocity can be specified in birth object.
         'pin':  ['position_2d_m'],  // Position is passed via arguments. Velocity can be specified in birth object.
         's':    [], // spring
         'j':    [], // joint
         'NPC':  []  // drones
      };
      for (var birthParm in captureObj) {
         if (!forgetList[ type].includes( birthParm)) {
            // If this parameter's value is a vector, instantiate it using Vec2D.
            // (Note the check for "null." Null is also an object in javascript, but does not have the hasownProperty method.)
            if ( ((typeof(captureObj[ birthParm]) === 'object') && (captureObj[ birthParm] !== null)) && 
                 ((captureObj[ birthParm].hasOwnProperty('x')) && (captureObj[ birthParm].hasOwnProperty('y'))) ) {
                   
                  newBirthState[ birthParm] = new wS.Vec2D( captureObj[ birthParm].x, captureObj[ birthParm].y);
               
            } else {
               newBirthState[ birthParm] = captureObj[ birthParm];
            }
         }
      }
      
      // For all types, override the default naming process, specify a name in the birth parameters. This gives
      // the new object the name used in the capture object. This is needed in reconstructing 
      // springs (that use the original puck name). This is also needed if pucks are
      // deleted in a jello matrix.
      if (captureObj.name) {
         newBirthState.name = captureObj.name;
      }
      return newBirthState;
   }   
   
   function restoreFromState( state_data) {
      try {
         // return the template that is returned from restoreFromState_main
         return restoreFromState_main( state_data);
         
      } catch (err) {
         gW.stopit();
         window.alert(gW.getDemoVersion() +
                     "\nUnable to restore this capture. " +
                     "\n   Possibly you've been boldly editing the JSON text." +
                     "\n   If so, please refine your edits or start from a new capture." +
                     "\n" +
                     "\n" + err.name +
                     "\nmessage:  " + err.message);
         dS.demoStart(0);
      }
   }
      
   function restoreFromState_main( state_data) {
      // Environmental parameters...
      
      // Must do canvas dimensions before setting x_ctx.globalCompositeOperation.
      if (typeof state_data.canvasDimensions !== "undefined") {
         //canvasDiv.style.width = state_data.canvasDimensions.width + "px";
         x_canvas.width =          state_data.canvasDimensions.width;
         
         //canvasDiv.style.height = state_data.canvasDimensions.height + "px";
         x_canvas.height =         state_data.canvasDimensions.height; 
      }
      
      if (state_data.globalCompositeOperation) {
         x_ctx.globalCompositeOperation = state_data.globalCompositeOperation;
      } else {
         x_ctx.globalCompositeOperation = 'source-over';
      }
      
      gW.clearCanvas();
      
      if (typeof state_data.demoVersion !== "undefined") {
         gW.setDemoVersion( state_data.demoVersion);
      }
      
      // Message the user if the COM setting is changed by the capture restore.
      if (typeof state_data.comSelection !== "undefined") {
         if ((gW.dC.comSelection.checked) && ( ! state_data.comSelection)) {
            gW.messages['help'].newMessage('Center of mass (COM) selection: [base,yellow]OFF[base]', 3.0);
            
         } else if (( ! gW.dC.comSelection.checked) && (state_data.comSelection)) {
            gW.messages['help'].newMessage('Center of mass (COM) selection: [base,yellow]ON[base]', 3.0);
         }
         gW.dC.comSelection.checked = state_data.comSelection;
         
      } else {
         if ( ! gW.dC.comSelection.checked) {
            gW.messages['help'].newMessage('Center of mass (COM) selection: [base,yellow]ON[base]', 3.0);
            gW.dC.comSelection.checked = true;
            //comSelection_Toggle(null, 2);
         }
      }
      
      // For the count-to-pi demos, set these in gW, BEFORE any table objects are instantiated (so no puck size minimum). 
      // Then, after instantiation, initialize the pi engine (see below).
      if ( (typeof state_data.piCalcs !== "undefined") && (['1.c','1.d','1.e'].includes( dS.demoVersionBase( gW.getDemoVersion()))) ) {
         gW.setPiCalcs( state_data.piCalcs.enabled, state_data.piCalcs.clacks, state_data.piCalcs.usePiEngine);
      }      
    
      // Rebuild the walls from the capture data.
      for (var wallName in state_data.wallMapData) {
         // wall references one specific wall (from the captured state)
         var wall = state_data.wallMapData[ wallName];
         // Create the new Wall and add it to the wallMap (via its constructor).
         new cP.Wall( wall.position_2d_m, newBirth( wall, 'wall'));
      }
      // Establish the name of the top leg of the fence (for use by the PiEngine).
      if ((cP.Wall.topFenceLegName == null) && (gW.aT.wallMap['wall1'])) {
         if (gW.aT.wallMap['wall1'].fence) {
            cP.Wall.topFenceLegName = 'wall1';
            //console.log("topFenceLegName=" + cP.Wall.topFenceLegName);
         } else {
            //console.log("wall1 is not part of the fence.");
         }
      } else {
         //console.log("topFenceLegName set by restore");
      }      
      
      // NPC clients and host
      for (var clientName in state_data.clients) {
         let client = state_data.clients[ clientName];
         
         if (clientName.slice(0,3) == 'NPC') {
            new cT.Client( newBirth( client, 'NPC'));
            
         } else if (clientName == 'local') {
            // don't regenerate the host, it should still be there.
            gW.clients['local'].color = (client.color) ? client.color : null;
            gW.clients['local'].bulletAgeLimit_ms = (client.bulletAgeLimit_ms) ? client.bulletAgeLimit_ms : null;
         }
      }
      
      // Push (copy) specific local-client attributes (in the capture) to the other human clients.
      cT.Client.applyToAll( client => {
         if ( (client.name.slice(0,1) == 'u') && (client.player) ) {
            client.bulletAgeLimit_ms = gW.clients['local'].bulletAgeLimit_ms;
         }
      });
      
      // Rebuild the pins.
      for (var pinName in state_data.pinMapData) {
         // "pin" is one pin (captured state)
         var pin = state_data.pinMapData[ pinName];
         // Create the new Pin and add it to the pinMap (via its constructor).
         new cP.Pin( pin.position_2d_m, newBirth( pin, 'pin'));
      }
      
      // Rebuild the pucks (and the puck map).
      var localHostPuckName = null, networkClientName = null, puckNameForTemplate = null;
      
      for (var p_key in state_data.puckMapData) {
         // puck is a single puck (captured state)
         var puck = state_data.puckMapData[ p_key];
         
         // If there's a puck for the local host, record the name for use in returning a puck template.
         // Also snag a puck name from the network clients as a second option.
         if (puck.clientName == 'local') {
            localHostPuckName = puck.name;
         } else if ((puck.clientName) && (puck.clientName.slice(0,1) == 'u')) {
            networkClientName = puck.name;
         }
         
         // Now create the puck and give it the old name (see the end of the newBirth function).
         // The "Host player" option must be checked to enable the creation of a puck for the local client.
         // Network-client pucks are not recreation here (because it depends on active network clients for assignment).
         let gunBullet = puck.bullet && puck.ageLimit_ms; // the gunBullet puck method is not available here
         if ( ( ! (gunBullet && (gW.getDemoIndex() == 7 || gW.getDemoIndex() == 8))) &&   // NOT a gun bullet in Puck Popper AND 
              ( (puck.clientName == null) ||                                              // (Regular puck  OR
                (puck.clientName.slice(0,3) == 'NPC') ||                                  //  Drone puck    OR
                ((puck.clientName == 'local') && (gW.dC.player.checked)) ) ) {            //  Local host and puck requested)
            
            // the remainder operator normalizes the angle to be within +/- 2Pi.
            if (puck.angle_r) puck.angle_r = puck.angle_r % (2 * Math.PI);
            
            var newPuck = new cP.Puck( puck.position_2d_m, puck.velocity_2d_mps, newBirth( puck, 'puck'));
            
            if (puck.jello) jM.addPuck( newPuck);
         }
      }
      
      // For the count-to-pi demos (note: this enabled boolean is set above, before instantiation).
      if ( gW.getPiCalcs().enabled ) {
         if (state_data.piCalcs.usePiEngine) {
            // pi engine
            if (state_data.piEngine) {
               let enginePars = Object.assign({}, state_data.piEngine, state_data.piCalcs);
               pE.initializeModule( gW.aT.puckMap['puck1'], gW.aT.puckMap['puck2'], gW.sounds['clack2'], enginePars);               
               
            }
         } else {
            // box2d engine
            gW.aT.puckMap['puck1'].vmax = state_data.piCalcs.p1_v_max;
            gW.aT.collisionCount        = state_data.piCalcs.collisionCount;         
         }
      }
      
      // get a reference to a table object using its name
      function tableObj( name) {
         let first3 = name.slice(0,3);
         let tableObj = null;
         if (first3 == "pin") {
            tableObj = gW.aT.pinMap[ name];
         } else if (first3 == "puc") {
            tableObj = gW.aT.puckMap[ name];
         } else if (first3 == "wal") {
            tableObj = gW.aT.wallMap[ name];
         }
         return tableObj;
      }
      
      // Rebuild the springs.
      for (var springName in state_data.springMapData) {
         var theSpring = state_data.springMapData[ springName];
         
         // Don't try to restore navigation springs. Those are created
         // when the NPC pucks are restored.
         if (!theSpring.navigationForNPC && !theSpring.forCursor) {
            let p1 = tableObj( theSpring.p1_name);
            let p2 = tableObj( theSpring.p2_name);
            
            if ((p1) && (p2)) {
               new cP.Spring(p1, p2, newBirth( theSpring, 's'));
            } else {
               console.log('WARNING: Attempting to rebuild a spring with one or both connected objects missing.');
            }
            
         }
      }
      // Rebuild the joints.
      for (var jointName in state_data.jointMapData) {
         var joint = state_data.jointMapData[ jointName];
         
         let to1 = tableObj( joint.jto1_name);
         let to2 = tableObj( joint.jto2_name);
         
         if ((to1) && (to2)) {
            new cP.Joint( to1, to2, newBirth( joint, 'j'));
         } else {
            console.log('WARNING: Attempting to rebuild a joint with one or both connected objects missing.');
         }
      }
      
      // Note that setGravityRelatedParameters runs at the end of demoStart in demoStart.js.
      gW.setG_ON( state_data.gravity);
      gW.dC.gravity.checked = gW.getG_ON();
      
      // Give priority to the host's puck for use as a template. If there was no host puck when
      // the capture was done, the network puck will be used.
      if (localHostPuckName) {
         puckNameForTemplate = localHostPuckName;
      } else {
         puckNameForTemplate = networkClientName;
      }
      
      // Sometimes just want to be sure the user gets the fullscreen view.
      if (state_data.fullScreenDemo) {
         gW.setFullScreenDemo(true);
      }
      
      // For example, the dandelion demos, turn shooter on for each client.
      if (state_data.lockedAndLoaded ) {
         gW.setLockedAndLoaded(true);
      }  
      
      // The energy, momentum, and angular momentum report
      if (state_data.EpL) {
         if (state_data.EpL.reportType) cP.EpL.reportType = state_data.EpL.reportType;
         
         if (state_data.EpL.COM && state_data.EpL.display) {
            cP.EpL.turnDisplayOn({'angularAxis_2d_m': cP.Puck.findCenterOfMass()});
            cP.EpL.COM = true;
         } else if (state_data.EpL.display) {
            if (state_data.EpL.angularAxis_2d_m) {
               cP.EpL.turnDisplayOn( {'angularAxis_2d_m': state_data.EpL.angularAxis_2d_m} );
            } else {
               cP.EpL.turnDisplayOn({});
            }
         }
      }
      
      // Exit here...
      if (puckNameForTemplate) {
         return state_data.puckMapData[ puckNameForTemplate];
      } else {
         // Looks like a capture was made after host and all network pucks were popped, savage battle.
         // So let's make a puck template from the default pars for the host puck.
         return Object.assign({}, {'position_2d_m':new wS.Vec2D(2.0, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)}, cP.Puck.hostPars);
      } 
   }
   
   // Note that the filePicker and fileWriter require HTTPS (secure).
   function filePicker() {
      // async enlists promise features.
      async function getFile() {
         // m_fileHandle is initialized to 'documents' and then becomes a filepicker object which is useful as
         // a startIn value. This starts the next pick in the directory that the most recent file was picked in.
         let options = {
           'types': [ {'accept': {'text/plain': '.js'} }, ],
           'multiple': false,
           'excludeAcceptAllOption': true,
           'startIn': m_fileHandle, 
         };
         // open file picker, destructure (square brackets) the returned array (one element, because multiple:false)
         [m_fileHandle] = await window.showOpenFilePicker( options);
         
         let file = await m_fileHandle.getFile();
         let contents = await file.text();
         
         let jsonString = (contents.includes(" = ")) ? contents.split(" = ")[1] : contents;
         gW.dC.json.value = jsonString;
         
         window.setTimeout( function() { scrollCaptureArea();}, 500);
         runCapture();
      }                                        
      getFile()
      .then( function() {
         gW.messages['help'].newMessage("Thanks for using the file picker.", 2.0);     
      })
      .catch( function( err) {
         console.log( err);
         let messageString = "Picker use declined, failed, or unavailable.";
         if (gW.messages['help'].message != "") {
            gW.messages['help'].addToIt("\\ \\" + messageString, 3.0);
         } else {
            gW.messages['help'].newMessage( messageString, 3.0);
         }
      });
   }
   // Note that the filePicker and fileWriter require HTTPS (secure).
   function fileWriter() {
      // async enlists promise features.
      async function writeFile() {
         // m_fileHandle is initialized to 'documents' and then becomes a filepicker object which is useful as
         // a startIn value. This starts the next pick in the directory that the most recent file was picked in.
         let options = {
           'types': [ {'accept': {'text/plain': '.txt'} }, ],
           'multiple': false,
           'excludeAcceptAllOption': true,
           'suggestedName': 'demo.' + gW.getDemoVersion() + ".txt",
           'startIn': m_fileHandle, 
         };
         // open handle to the destination folder 
         m_fileHandle = await window.showSaveFilePicker( options);
         const writable = await m_fileHandle.createWritable();
         await writable.write("demo_capture = " + gW.dC.json.value);
         await writable.close();
      }                                        
      writeFile()
      .then( function() {
         if (gW.dC.json.value != "") {
            gW.messages['help'].newMessage("Thanks for using the file writer.", 2.0);     
         } else {
            gW.messages['help'].newMessage("The file was written but note that " + 
                                         "\\the capture text area appears to be empty.", 3.0);
         } 
      })
      .catch( function( err) {
         console.log( err);
         let messageString = "File-writer use declined, failed, or unavailable.";
         if (gW.messages['help'].message != "") {
            gW.messages['help'].addToIt("\\ \\" + messageString, 3.0);
         } else {
            gW.messages['help'].newMessage( messageString, 3.0);
         }
      });
   }
   
   /*
   async function postCaptureToCF() {
      console.log("inside poster v15");
      
      let workerURL = "https://captures.triquence.org/submit/";

      // 'mode': 'no-cors'
      const response = await fetch( workerURL, {
         'method': 'POST',
         'headers': {
            'Content-Type': 'application/json'
         },
         'body': 'test string from client'
      }); 

      if (response.ok) {
         console.log("response ok");   

         let textInResponse = await response.text();
         console.log("response text=" + textInResponse);
         
      } else {
         console.log("response NOT ok");  
      }  
   }
   */

async function postCaptureToCF() {
  console.log("inside poster 1");

  let workerURL = "https://triquence.org/captures/submit";
  const response = await sendRequestWithCORS(workerURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: gW.dC.json.value
  });

  let textInResponse = await response.text();
  console.log("response text=" + textInResponse);

  if (response.ok) {
    console.log("response text=" + await response.text());
  } else {
    console.log("response not ok");
  }
}

async function sendRequestWithCORS(url, options) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // Handle CORS preflight request
      const preflightResponse = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://triquence.org', // Set the Origin header
          'Access-Control-Request-Method': options.method,
          'Access-Control-Request-Headers': options.headers ? Object.keys(options.headers).join(',') : ''
        }
      });

      if (preflightResponse.ok) {
        // CORS preflight request was successful, send the actual request
        const response = await fetch(url, options);
        return response;
      } else {
        // CORS preflight request failed
        throw new Error('CORS preflight request failed');
      }
    } else {
      // Other fetch errors
      throw error;
    }
  }
} 

function wrapper_postCaptureToCF() {
   // hope this helps...
   postCaptureToCF();
}
      
   // This checks to see if the capture has been edited to be different from the original file.
   // It requires taking time to load files. So, this is called at the start of a game. The results
   // of this (in aT.hack) are used later when reports are issued to the leaderboard.
   function compareCaptureToFile( pars) {
      let fileName = uT.setDefault( pars.fileName, 'null');
      gW.aT.hack['captureEdit'] = false;
      
      console.log('fetching ' + fileName + ' from server');
      $.getScript( fileName, function() {
         // Note: demo_capture is a page level global and is assigned a value, the capture object, in the first line of the loading capture file.
         if (gW.dC.json.value != JSON.stringify( demo_capture, null, 3)) gW.aT.hack['captureEdit'] = true;
         console.log("after comparison 1, cE=" + gW.aT.hack['captureEdit']);
         
      }).fail( function() {
         // Try again...
         $.getScript( fileName, function() {
            if (gW.dC.json.value != JSON.stringify( demo_capture, null, 3)) gW.aT.hack['captureEdit'] = true;
            console.log("after comparison 2, cE=" + gW.aT.hack['captureEdit']);
            
         }).fail( function() {
            console.log('capture file not found on server');
         });
      });
   }
      
      
   // For loading and running a capture from a web page link.
   function demoStart_fromCapture( index, pars) {
      let fileName = uT.setDefault( pars.fileName, 'null');
      let runIt = uT.setDefault( pars.runIt, true);
      
      console.log('fetching ' + fileName + ' from server');
      $.getScript( fileName, function() {
         // Note: demo_capture is a page level global and is assigned a value, the capture object, in the first line of the loading capture file.
         // Put the capture into the capture input box on the page.
         gW.dC.json.value = JSON.stringify( demo_capture, null, 3);
         window.setTimeout( function() { scrollCaptureArea();}, 500);
         if (runIt) dS.demoStart( index);
         
      }).fail( function() {
         // Try again...
         gW.messages['help'].newMessage("please wait...", 5.0);
         console.log('attempting second fetch ' + fileName + ' from server');
         $.getScript( fileName, function() {
            gW.dC.json.value = JSON.stringify( demo_capture, null, 3);
            window.setTimeout( function() { scrollCaptureArea();}, 500);
            if (runIt) dS.demoStart( index);

         }).fail( function() {
            console.log('capture file not found on server');
            gW.messages['help'].newMessage("Unable to get this capture file: [base,yellow]" + fileName + "[base]" +
                                        "\\  from the server. Please try again or " +
                                        "\\  use the file picker to open a local copy.", 7.0);
            // One last thing to try, the file picker...
            filePicker();
         });
      });
   }
   
   function scrollCaptureArea() {
      gW.dC.json.scrollTop = 30; 
      gW.dC.json.scrollLeft = 130;
   }
   
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'saveState': saveState,
      'loadJSON': loadJSON,
      'modifyCapture': modifyCapture,
      'modifyForCalculator': modifyForCalculator,
      'shiftCapture': shiftCapture,
      'runCapture': runCapture,
      'cleanCapture': cleanCapture,
      'restoreFromState': restoreFromState,
      'compareCaptureToFile': compareCaptureToFile,
      'demoStart_fromCapture': demoStart_fromCapture,
      'clearState': clearState,
      'filePicker': filePicker,
      'fileWriter': fileWriter,
      'postCaptureToCF': wrapper_postCaptureToCF,
      'scrollCaptureArea': scrollCaptureArea
      
   };

})();