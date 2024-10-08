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
   var m_cloudCapture = {};
   
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
      var saveTheseHostKeys =  ['color','name','bulletAgeLimit_ms','ctrlShiftLock','poolShotLocked','poolShotLockedSpeed_mps'];
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
   
   function loadJSON( element, pars={}) {
      let captureMissing = uT.setDefault( pars.captureMissing, 
            "The capture text area is empty.");
      let chatInputMissing = uT.setDefault( pars.chatInputMissing, 
            'There is no modifying JSON to use.<br>' + 
            'Put some JSON in the chat input field.<br>' + 
            'Examples: {"color": "yellow"} or {"friction": 0.5}');
      let chatInputError = uT.setDefault( pars.chatInputError, 
            'There is a formatting error in the JSON in the chat input.<br>' + 
            'An example of good format is {"color": "yellow"} or {"friction": 0.5}.<br><br>' + 
            'You may need to use the "m" key to toggle the left panel and reveal the chat input field.');
      
      let state_capture, message, title;
            
      if (element.value != '') {
         try {
            state_capture = JSON.parse( element.value);
            
         } catch (err) {
            if (element.id == "jsonCapture") {
               title = "JSON error in the capture";
               message = "There is a formatting error in the state capture.<br>" + 
                         "<ul><li>Do not use single quotes, use doubles (" + '""' + ").<br>" + 
                         "<li>Quote strings and attribute names.<br>" + 
                         "<li>Numbers and logicals don't need quotes.<br>" + 
                         "<li>Try reversing recent edits.<br>" +
                         "<li>Try starting over, clear it (click the 'C' button).</ul>";
               
            } else if (element.id == "inputField") {
               title = "JSON error in chat input";
               message = chatInputError;               
            }
            
            pS.viewGeneralDialog({"title":title, "message":message, "label_close":"close"});
            state_capture = null;
         }
         
      } else {
         if (element.id == "jsonCapture") {
            title = "capture missing";
            message = captureMissing;
            
         } else if (element.id == "inputField") {
            title = "chat field is empty";
            message = chatInputMissing; 
         }
         
         pS.viewGeneralDialog({"title":title, "message":message, "label_close":"close"});
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
         
         // Change the attributes of the selected springs
         cP.Spring.findAll_InMultiSelect( spring => {            
            for (let key in jsonModifier) {
               state_capture['springMapData'][ spring.name][ key] = jsonModifier[ key];
            }
         });
         
         // Write out the updated capture.
         state_capture.demoVersion += '.' + Math.floor((Math.random() * 1000) + 1);
         let table_JSON = JSON.stringify( state_capture, null, 3);
         gW.dC.json.value = table_JSON;
         
         runCapture();
      }
   }
   
   function calculateArea( puck) {
      let area_sm; // square meters (sm)
      if (puck.shape == "circle") {
         area_sm = Math.PI * puck.radius_m * puck.radius_m;
      } else {
         area_sm = 4.0 * puck.half_height_m * puck.half_width_m;
      }
      return area_sm;
   }
   
   function sortPucks() {
      let state_capture = null, jsonModifier = null;
      
      // Parse the JSON in the chat field.
      let sortPuckHelp = 'When using "sort pucks", there must be a capture in the capture textarea and there must be control parameters (in JSON format) in the chat input.<br><br>' + 
            'Here are examples of control parameters:' +
            '<ul>' +
            '<li>{}' +
            '<li>{"sort":"area"}' +
            '<li>{"sort":"position"}' +
            '<li>{"offCanvas":"delete"}' +
            '<li>{"sort":"area", "offCanvas":"delete"}' +
            '</ul>' +
            'You may need to use the "m" key to toggle the left panel and reveal the chat input field.' +
            '';
      
      // Pull in the capture
      state_capture = loadJSON( gW.dC.json, {"captureMissing":sortPuckHelp});
      if ( ! state_capture) return;
      
      jsonModifier = loadJSON( gW.dC.inputField, {"chatInputError":sortPuckHelp, "chatInputMissing":sortPuckHelp});
      if ( ! jsonModifier) return;
      
      let sortedPucks; // array
      if (jsonModifier.sort == "position") {
         // sort on x position (left/right)
         console.log("position sort");
         sortedPucks = Object.entries( state_capture.puckMapData).sort((a, b) => a[1].position_2d_m.x - b[1].position_2d_m.x);
      
      } else if (jsonModifier.sort == "area") {
         console.log("area sort");
         // Add an area column.
         let arrayWithArea = Object.entries( state_capture.puckMapData).map( ([name, item]) => [name, item, calculateArea( item)] );
         // Sort on the area.
         let sortedArrayWithArea = arrayWithArea.sort((a, b) => a[2] - b[2]);
         // Remove the area column now that the sort is done.
         sortedPucks = sortedArrayWithArea.map(([name, item]) => [name, item]);
      
      } else {
         // Sort on the old-name index.
         console.log("old-name sort");
         // Add column with numeric index based on the old name.
         let arrayWithNameIndex = Object.entries( state_capture.puckMapData).map( ([name, item]) => [name, item, parseInt( item['name'].slice(4))] );
         // Sort by that index
         let sortedArraybyIndex = arrayWithNameIndex.sort((a, b) => a[2] - b[2]);
         // Remove the index column now that the sort is done.
         sortedPucks = sortedArraybyIndex.map(([name, item]) => [name, item]);
      }
      
      let filteredPucks = sortedPucks.filter( function( item) { 
         // Remove pucks that are positioned outside the boundaries of the canvas.
         if (jsonModifier.offCanvas == "delete") {
            let p_2d_m = new wS.Vec2D( item[1].position_2d_m.x, item[1].position_2d_m.y);
            let p_2d_px = wS.screenFromWorld( p_2d_m);
            let canvasDimensions = {};
            if (state_capture.canvasDimensions) {
               canvasDimensions = state_capture.canvasDimensions;
            } else {
               canvasDimensions = x_canvas;
            }
            return wS.pointInCanvas( canvasDimensions, p_2d_px);
           
         } else {
            return true;
         }
      });
      
      // Rename the pucks.
      let mapFromOldPuckNames = {};
      let newPuckMapData = {};
      filteredPucks.forEach((item, index) => {
         // New name according to sort order.
         let newName = "puck" + (index + 1);
         
         // Make a map from the old names to the new names.
         mapFromOldPuckNames[ item[0]] = newName;
         
         // Update the puck's name attribute. 
         item[1].name = newName;
         
         // Add to the new puck map.
         newPuckMapData[ newName] = item[1];
      });
      
      // Reference the new puck map.
      state_capture.puckMapData = newPuckMapData;
      
      
      let sortedSprings; // array
      sortedSprings = Object.entries( state_capture.springMapData).sort((a, b) => a[1].length_m - b[1].length_m);
      
      // Remove springs that are attached to deleted pucks.
      let filteredSprings = sortedSprings.filter( function( item) {
         //console.log(item[1].p1_name + ", " + item[1].p2_name);
         
         let p1_ok = ((mapFromOldPuckNames[ item[1].p1_name] in newPuckMapData) || item[1].p1_name.includes("pin"));
         let p2_ok = ((mapFromOldPuckNames[ item[1].p2_name] in newPuckMapData) || item[1].p2_name.includes("pin"));
         let goodSpring = (p1_ok && p2_ok) ? true : false;
         return goodSpring;
      });
      
      // Rename the springs and the attached pucks.
      let newSpringMapData = {};
      filteredSprings.forEach((item, index) => {
         // Name according to the sort order.
         let newName = "s" + (index + 1);
         
         // Update the name attribute.
         item[1].name = newName;
         
         // Update the names of the pucks to which the spring is attached (skip if it's a pin).
         if ( ! item[1].p1_name.includes("pin")) item[1].p1_name = mapFromOldPuckNames[ item[1].p1_name];
         if ( ! item[1].p2_name.includes("pin")) item[1].p2_name = mapFromOldPuckNames[ item[1].p2_name];
         
         // Make a new spring map from the array.
         newSpringMapData[ newName] = item[1];
      });
      
      // reference the new spring map.
      state_capture.springMapData = newSpringMapData;
      
      
      // Not all of the original captures have joint maps.
      if (state_capture.jointMapData) {
         let sortedJoints; // array
         // Sort on the name of the first attachment.
         sortedJoints = Object.entries( state_capture.jointMapData).sort((a, b) => a[1].jto1_name - b[1].jto1_name);
         
         // Remove joints that are attached to deleted pucks.
         let filteredJoints = sortedJoints.filter( function( item) {
            //console.log(item[1].jto1_name + ", " + item[1].jto2_name);
            
            let p1_ok = ((mapFromOldPuckNames[ item[1].jto1_name] in newPuckMapData) || uT.oneOfTheseV2(["pin","wall"], item[1].jto1_name));
            let p2_ok = ((mapFromOldPuckNames[ item[1].jto2_name] in newPuckMapData) || uT.oneOfTheseV2(["pin","wall"], item[1].jto2_name));
            let goodJoint = (p1_ok && p2_ok) ? true : false;
            return goodJoint;
         });
         
         // Rename the joints and the attached pucks.
         let newJointMapData = {};
         filteredJoints.forEach((item, index) => {
            // Name according to the sort order.
            let newName = "j" + (index + 1);
            
            // Update the name attribute.
            item[1].name = newName;
            
            // Update the names of the pucks to which the joint is attached (skip if it's a pin or wall).
            if ( ! uT.oneOfTheseV2(["pin","wall"], item[1].jto1_name)) item[1].jto1_name = mapFromOldPuckNames[ item[1].jto1_name];
            if ( ! uT.oneOfTheseV2(["pin","wall"], item[1].jto2_name)) item[1].jto2_name = mapFromOldPuckNames[ item[1].jto2_name];
            
            // Make a new joint map from the array.
            newJointMapData[ newName] = item[1];
         });
         
         // reference the new joint map.
         state_capture.jointMapData = newJointMapData;
      }
      
      // Write out the updated capture.
      state_capture.demoVersion += '.' + Math.floor((Math.random() * 1000) + 1);
      let table_JSON = JSON.stringify( state_capture, null, 3);
      gW.dC.json.value = table_JSON;
      
      runCapture();
   }
   
   // This is the default modification function used by modifyForCalculator.
   let settingsForDemos = function( state_capture, demoName) {
      // Use the speed version of the EpL report.
      state_capture['EpL']['reportType'] = 'speed';
      
      if (demoName == '5.a.orbitingOnSpring') {
         let vx_init_mps = Number( $('#vx_init').val());
         let vy_init_mps = Number( $('#vy_init').val());
         
         state_capture['puckMapData']['puck1']['velocity_2d_mps'].x = vx_init_mps;
         state_capture['puckMapData']['puck1']['velocity_2d_mps'].y = vy_init_mps;
         state_capture['puckMapData']['puck2']['velocity_2d_mps'].x = -vx_init_mps; 
         state_capture['puckMapData']['puck2']['velocity_2d_mps'].y = -vy_init_mps; 
      
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
         
         state_capture['puckMapData']['puck1']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck2']['angularSpeed_rps'] = b_init;               
         state_capture['puckMapData']['puck3']['angularSpeed_rps'] = c_init;               
         state_capture['puckMapData']['puck4']['angularSpeed_rps'] = d_init;               
         
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
         
         state_capture['puckMapData']['puck1']['angularSpeed_rps'] = a_init;
         state_capture['puckMapData']['puck2']['angularSpeed_rps'] = b_init;               
         state_capture['puckMapData']['puck3']['angularSpeed_rps'] = c_init;               
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
      let demoIndex = parseInt( demoName.split('.')[0]);
      
      // Check for the correct demo capture in the textarea.
      let emptyMessage = "The calculators modify captures before running them. " + 
                         "You'll see this message if you directly (first) use a calculator without loading the capture. " + 
                         "This will load the needed capture, modify it, and then run it.";
      let state_capture = loadJSON( gW.dC.json, {"captureMissing":emptyMessage});
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
            
      let shift_key = gW.clients['local'].key_shift; // before the key-state reset that is in demoStart
      
      // Capture available
      if (gW.dC.json.value != "") {
         let state_capture = loadJSON( gW.dC.json);
         if ( ! state_capture) return; // must be error in json
         demoIndex = parseInt( state_capture.demoIndex);
         dS.demoStart( demoIndex, {'scrollCA':false});
         
         // If shift key is down and using a button (not keyboard), after starting the demo from the capture, 
         // immediately grab a capture before the engine changes state. This is an easy way to update
         // an older capture.
         if ((shift_key == "D") && ( ! fromKeyBoard)) {
            saveState();
            gW.messages['help'].newMessage('The capture has been updated.', 2.0);
         }
         
      // No capture 
      } else {
         // If shift key is down and using a button (not keyboard), start the demo, then immediately grab a capture 
         // before the engine changes state. This is a good way to take a capture of an "a" version demo.
         if ((shift_key == "D") && ( ! fromKeyBoard)) {
            dS.demoStart( gW.getDemoIndex());
            saveState();
            gW.messages['help'].newMessage('A capture has been taken.', 2.0);
            
         } else {
            gW.messages['help'].newMessage('The capture text area is empty.', 2.0);
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
         
         let message = gW.getDemoVersion() + "<br>" +
                       "Unable to restore this capture.<br><br>" +
                       "Possibly you've been boldly editing the JSON text (that's good, BTW). " +
                       "If so, please refine your edits or start from a new capture.<br><br>" +
                       "error name: " + err.name + "<br>" +
                       "error message: " + err.message;
         pS.viewGeneralDialog({"title":"error in capture", "message":message, "label_close":"close"});
         
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
            gW.clients['local'].ctrlShiftLock = (client.ctrlShiftLock) ? client.ctrlShiftLock : null;            
            gW.clients['local'].poolShotLocked = (client.poolShotLocked) ? client.poolShotLocked : null;            
            gW.clients['local'].poolShotLockedSpeed_mps = (client.poolShotLockedSpeed_mps) ? client.poolShotLockedSpeed_mps : null;
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
   
   
   async function checkForFile( demoFileName) {
      let result = {'status':null, 'fileText':null};
      
      // A fetch check to see if the file is here, on this webserver.
      try {
         console.log("demoFileName = " + demoFileName);
         
         const response = await fetch( demoFileName); // , {method: 'HEAD'}
         const content = await response.text();
         
         console.log("response.status = " + response.status);
         //console.log("content = " + content);
         
         if (response.status == 404) {
            // A clear indication that the file by that name is not there.
            console.log("webserver fetch: file not found (404)");
            result.status = "file not found";
            
         } else if (response.ok) {
            console.log("webserver fetch: ok, maybe found file.");
            
            // Check the contents to see if it looks like a typical capture file on the server.
            if (content.includes("demoVersion")) {
               result.status = "file exists";
               result.fileText = content;
            
            // Not a capture, so must be a default file on the server, probably index.html.
            } else {
               console.log("probably got index.html");
               result.status = "file not found";
            }
            
         } else {
            console.log("webserver fetch: NOT ok");
            result.status = "file not found";
         }
         
      } catch (error) {
         console.log("---Error caught in Fetch file check.---");
         console.error( error);
         result.status = "error caught";
      }

      return result;
   }
   
   function switchToTheChatPanel() {
      if ( ! gW.dC.multiplayer.checked) {  
         $("#chkMultiplayer").trigger("click");
      }      
   }
   
   async function postCaptureToCF( pars={}) {
      let action = uT.setDefault( pars.action, "list");
      let actionType = uT.setDefault( pars.actionType, "normal");
      let downLoadKey = uT.setDefault( pars.downLoadKey, null); // key for KV (key-value) storage at Cloudflare 
      
      let workerURL = "https://triquence.org/captures/submit";
      
      if (action == "postOne") {
         // Check for valid JSON in textarea.
         let captureObject = null;
         captureObject = loadJSON( gW.dC.json);
         if ( ! captureObject) return;
         
         switchToTheChatPanel();
         
         // check the form of the version-name string
         const pattern = /^[0-9]\.[a-z]\.(?:[a-zA-Z0-9-]+\.?)+[a-zA-Z0-9-]+$/;
         if ( ! pattern.test( captureObject.demoVersion)) {
            hC.displayMessage("Names for cloud posts should have three (or more) parts.<br><br>" +
              "Examples:<br>" + 
              "1.b.new-one <br>2.c.my-version <br>9.b.no-fence <br>3.d.9ball.big-twist<br><br>" +
              'The idea is to start the name with a reference to a similar demo. This should have two parts: a single digit, and a single letter.<br><br>' +
              'Then add a third part that uniquely describes your capture. This can be multiple words separated with dashes.<br><br>' +
              'You establish this name by editing the "demoVersion" in the capture. ' +
              'You may also need to edit the "demoIndex" (located above "demoVersion") so that the index matches the digit in the name.<br><br>' +
              '(Note: right click in the capture area for a larger view.)'
            );
            return;
         }
         let indexInDemoVersion = captureObject.demoVersion.split(".")[0];
         if (indexInDemoVersion != captureObject.demoIndex) {
            hC.displayMessage("In the capture, the index in the demo version name ("+ indexInDemoVersion +") does not match the value of demoIndex ("+ captureObject.demoIndex +").");
            return;
         } 
         
         // Based on actionType in pars, pick which of the three variations of postOne: deleteOne, updateOne, and postOne.
         // Make it a little harder to delete captures.
         let nickName = (gW.clients["local"].nickName) ? gW.clients["local"].nickName : "host";
         
         if (actionType == "delete") {
            if (nickName == "jim") {                  
               if ($('#chkC19').prop('checked')) {
                  action = "deleteOne";
                  console.log("deleteOne request");
               } else {
                  hC.displayMessage("We can't delete Jim's posts.");
                  return;
               }                  
            } else {
               action = "deleteOne";
               console.log("deleteOne request");
            } 
            
         } else if (actionType == "update") {
            if (nickName == "jim") {                  
               if ($('#chkC19').prop('checked')) {
                  action = "updateOne";
                  console.log("updateOne request");
               } else {
                  hC.displayMessage("We can't update Jim's posts.");
                  return;
               }                  
            } else {
               action = "updateOne";
               console.log("updateOne request");
            }
               
         } else {
            action = "postOne";
            console.log("normal postOne request");
         }
         
         // Check if new stuff, by name and by content. Cloud posts should not be copies
         // of capture files on the web server.
         if (action == "postOne") {
            // Determine the corresponding filename from the demoVersion string.
            let demoName = captureObject.demoVersion;
            let parts = demoName.split(".");
            let demoFileName = null;
            console.log('demoName = ' + demoName + ", n=" + parts.length);
            // This first check should also be covered by the regular expression above...
            if (parts.length < 3) {
               hC.displayMessage("names for posts should have at least 3 parts, e.g. 1.b.coolone ");
               return;
               
            } else if (parts.length == 3) {
               // e.g. 3.a.333  --> demo3a.333.js  
               //  or  5.b.rube --> demo5b.rube.js
               demoFileName = "demo" + parts[0] + parts[1] + "." + parts[2] + ".js";
               
            } else if (parts.length > 3) {
               // e.g. 5.b.rube.334 --> demo5b.rube.334.js
               demoFileName = "demo" + parts[0] + parts[1];
               for (let index in parts) {
                  if (index > 1) demoFileName += "." + parts[ index];
               }
               demoFileName += ".js";
            }

            if (demoFileName == "demo3d.9ball.js") demoFileName = "demo3d.js"; // special case
            
            let fileCheckResult = await checkForFile( demoFileName);
            if (fileCheckResult.status == "file exists") {
               hC.displayMessage("This file exists as a demo on the webserver. Please post something new.");
               return;
            } else {
               /*
               Use checkForFile to fetch the base version and compare the content to see if the user has simply renamed a base demo:
                  Remove "demo_capture = " from the file text.
                  Parse it into an object.
                  Replace the version string in the file text to be the base.
                  Do a formated stringify.
                  Then compare to the capture in textarea.
               */
               let baseFileName = "demo" + parts[0] + parts[1] + ".js";
               let fileContentCheck = await checkForFile( baseFileName);
               
               if (fileContentCheck.status == "file exists") {
                  let contentText = fileContentCheck.fileText;
                  // Remove the global assignment at the beginning of the file.
                  contentText = contentText.replace("demo_capture = ", "");
                  
                  // To facilitate a simple content comparison, make the names the same, and then format the JSON.
                  let contentObject = JSON.parse( contentText);
                  console.log("name in file = " + contentObject.demoVersion);
                  contentObject.demoVersion = demoName;
                  let formatedText = JSON.stringify( contentObject, null, 3);
                  if (gW.dC.json.value == formatedText) {
                     console.log("Looks identical to the base demo content.");
                     hC.displayMessage("This capture looks equivalent to the content in the base demo. Please post something new.");
                     return;
                  } else {
                     console.log("Looks like fresh stuff.");
                  }
                  
               } else {
                  console.log("base file not found: " + baseFileName);
               }
            }
         }
         
         console.log("demo version = " + captureObject.demoVersion);
      
         let keyName = captureObject.demoVersion + "__" + nickName;
         let postObject = {"keyName":keyName, "action":action, "capture":captureObject};
         postObject.expiration = (nickName == "host") ? 259200 : "never"; // 3 days

         const response = await fetch( workerURL, {
            'method': 'POST',
            'headers': {
               'Content-Type': 'application/json'
            },
            'body': JSON.stringify( postObject)
         }); 

         if (response.ok) {
            let jsonInResponse = await response.json();
            //console.log("response sender = " + JSON.stringify( jsonInResponse.sender));
            console.log("response sender = " + JSON.stringify( jsonInResponse));
            
            if (jsonInResponse.action == "postOne") { 
               if (jsonInResponse.foundOne) {
                  hC.displayMessage("Cloud capture <strong>" + captureObject.demoVersion + "</strong> found. That name is in use. If you're trying to update an existing capture, hold the shift key down while clicking the 'P' button.");
                  
               } else {
                  hC.displayMessage("Capture <strong>" + captureObject.demoVersion + "</strong> posted to Cloud storage for <strong>" + nickName + "</strong>.<br>" +
                     "Note: it may take 1 to 20 seconds to affect the listing.");
                  if (nickName == "host") hC.displayMessage("Note that <strong>anonymous cloud posts</strong> (using the default nickname of 'host') <strong>expire</strong> (self delete) in 3 days.");
                  
               }
               
            } else if (jsonInResponse.action == "updateOne") {
               if (jsonInResponse.foundOne) {
                  if (jsonInResponse.updated) {
                     hC.displayMessage("Cloud capture <strong>" + captureObject.demoVersion + "</strong> found and updated.");
                  } else {
                     hC.displayMessage("Cloud capture <strong>" + captureObject.demoVersion + "</strong> found. Update not needed. No difference detected.");
                  }
                  
               } else {
                  hC.displayMessage("Cloud capture <strong>" + captureObject.demoVersion + "</strong> not found. You may need to do an initial post (without the shift key down). Then updates should work.");
                  
               }
               
            } else if (jsonInResponse.action == "deleteOne") {
               if (jsonInResponse.deleted) {
                  hC.displayMessage("Cloud capture <strong>" + captureObject.demoVersion + "</strong> found and deleted for <strong>" + nickName + "</strong>.<br>" +
                     "Note: it may take 1 to 20 seconds to affect the listing.");
                  
               } else {
                  hC.displayMessage("Didn't find <strong>" + 
                     captureObject.demoVersion + "</strong> under your nickname (<strong>" + nickName + "</strong>). <br>" + 
                     "You may need to specify (or change) your nickname and try again.");
               }
            }
            
         } else {
            hC.displayMessage("Looks like there's a problem connecting to CloudFlare.");
            console.log("response NOT ok (CF worker)");  
         } 
         
      } else if (action == "downLoadOne") {
         let postObject = {"action":action, "keyName":downLoadKey};

         const response = await fetch( workerURL, {
            'method': 'POST',
            'headers': {
               'Content-Type': 'application/json'
            },
            'body': JSON.stringify( postObject)
         }); 

         switchToTheChatPanel();

         if (response.ok) {
            let jsonInResponse = await response.json();
            console.log("response sender = " + JSON.stringify( jsonInResponse.sender));
            
            // Write to the textarea element.
            if (jsonInResponse.foundIt) {
               // keep the original of the most recent capture for capture-edit checking
               m_cloudCapture.object = jsonInResponse.capture;
               m_cloudCapture.string = JSON.stringify( jsonInResponse.capture, null, 3);
               
               // give it to the user (put the string in the textarea).
               gW.dC.json.value = m_cloudCapture.string;
               
               runCapture();
               
               gW.messages['help'].newMessage("Capture downloaded.", 1.0);
               
            } else {
               hC.displayMessage("Capture not found.");
            }
            
         } else {
            hC.displayMessage("Looks like there's a problem connecting to CloudFlare.");
            console.log("response NOT ok");  
         } 
         
      } else if (action == "list") {
         switchToTheChatPanel();
         
         let searchString = (gW.clients['local'].key_shift == "D") ? "" : gW.getDemoIndex();
         let postObject = {"action":action, "searchString":searchString};

         const response = await fetch( workerURL, {
            'method': 'POST',
            'headers': {
               'Content-Type': 'application/json'
            },
            'body': JSON.stringify( postObject)
         }); 

         if (response.ok) {
            let jsonInResponse = await response.json();
            console.log("response sender = " + JSON.stringify( jsonInResponse.sender));
            /*
            structure of the KW list
              "keys": [
                {
                  "name": "foo",
                  "expiration": 1234,
                  "metadata": { "someMetadataKey": "someMetadataValue" }
                }
              ],
              "list_complete": false,
              "cursor": "6Ck1la0VxJ0djhidm1MdX2FyD"
            */     
            if (jsonInResponse.captureList.keys.length > 0) {
               let tableString = "" + 
                  "<table class='score'><tr align='right'>" +
                  "<td class='scoreHeader' title='capture name, click to download and run'>capture</td>" +
                  "<td class='scoreHeader' title='user nickname, default (for anonymous) is host'>nickname</td>" +
                  "</tr>";
               for (let index in jsonInResponse.captureList.keys) {
                  let keyObject = jsonInResponse.captureList.keys[ index];
                  let clickCommandString = "cR.postCaptureToCF({'action':'downLoadOne','downLoadKey':'" + keyObject.name + "'})";
                  let demoName = keyObject.name.split("__")[0];
                  let userName = keyObject.name.split("__")[1];
                  userName = (userName) ? userName : "???";
                  
                  let linkString = "<a onclick=" + clickCommandString + ">" + demoName + "</a>";
                  tableString += "<tr align='right'>" + 
                  "<td class='score edits'>" + linkString + "</td>" + 
                  "<td class='score'>" + userName + "</td>" + 
                  "</tr>";
               }
               tableString += "</table>"
               hC.displayMessage( tableString);
               
            } else {
               hC.displayMessage("No cloud captures found with names starting with '" + searchString + "'.");
            }
                        
         } else {
            hC.displayMessage("Looks like there's a problem connecting to CloudFlare.");
            console.log("response NOT ok");  
         } 
      }
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
         
      }).fail( function() {
         // Try again...
         $.getScript( fileName, function() {
            if (gW.dC.json.value != JSON.stringify( demo_capture, null, 3)) gW.aT.hack['captureEdit'] = true;
            
         }).fail( function() {
            console.log('capture file not found on server');
         });
      })
   }
   
   function compareCaptureToCloudOriginal() {
      let sameNameAsOriginal = false;
      
      // First check if one has been downloaded.
      if (m_cloudCapture.string) {
         // Check for intent to run that one (as indicated in textarea) 
         if (gW.dC.json.value != "") { 
            let state_data = JSON.parse( gW.dC.json.value);
            let versionInTextArea = state_data.demoVersion;
            let versionInCloudCapture = m_cloudCapture.object.demoVersion;
            if (versionInTextArea == versionInCloudCapture) {
               sameNameAsOriginal = true;
               // Intent is there. Now check for edits.
               if (gW.dC.json.value != m_cloudCapture.string) {
                  gW.aT.hack['captureEdit'] = true;
               }
            }
         }
      }
      
      return sameNameAsOriginal;
   }
   
   // For loading and running a capture from a web page link.
   function demoStart_fromCapture( index, pars) {
      let fileName = uT.setDefault( pars.fileName, 'null');
      let runIt = uT.setDefault( pars.runIt, true);
      
      // Note: demo_capture is a page level global (see declaration in index.html) and is assigned a value, the capture object, in the first line of the loading capture file.
      demo_capture = null;
      
      console.log('Fetching ' + fileName + ' from server.');
      
      /*
      $.getScript( fileName, function() {
         // Put the capture into the capture input box on the page.
         if (demo_capture) {
            gW.dC.json.value = JSON.stringify( demo_capture, null, 3);
            window.setTimeout( function() { scrollCaptureArea();}, 500);
            if (runIt) dS.demoStart( index);
         } else {
            // The file is there, but likely the demo_capture assignment is not at the beginning of the file.
            gW.messages['help'].newMessage("Problem in file: [base,yellow]" + fileName + "[base]" +
                                        "\\It may be an older version.", 7.0);
         }
      }).fail( function() {
         console.log('capture file not found on server');
         gW.messages['help'].newMessage("Unable to get this capture file: [base,yellow]" + fileName + "[base]" +
                                     "\\  from the server. Please try again or " +
                                     "\\  use the file picker to open a local copy.", 7.0);
         // One last thing to try, the file picker...
         //filePicker();
      });
      */
      
      // Switched to ajax (from getScript, see old code above) to have more control over handling the missing-file case. 
      // The Cloudflare server is returning a status of 200 in ".then" and an html warning-message file if it can't find the requested file.
      // So, get the text, check it, and then run it (globalEval) if it looks like a capture.
      // On localhost, a request for a missing file will return a status of 404 from in ".fail".
      $.ajax({
         url: fileName,
         dataType: 'text',
         cache: false
         
      }).then( function(response, textStatus, jqXHR) {
         console.log("in then, jqXHR.status=" + jqXHR.status);
         console.log("in then, textStatus=" + textStatus);
         
         // Check to see if the response looks like a capture file.
         if (response.includes("demoIndex")) {
            $.globalEval( response);
         } else {
            gW.messages['help'].newMessage("File [base,yellow]" + fileName + "[base] not found on server.", 7.0);
            console.log("Response is not a capture, probably an HTML warning message from Cloudflare.");
            return;
         }
         
         // Put the capture into the capture input box on the page.
         if (demo_capture) {
            gW.dC.json.value = JSON.stringify( demo_capture, null, 3);
            window.setTimeout( function() { scrollCaptureArea();}, 500);
            if (runIt) dS.demoStart( index);
         } else {
            // The file is there, but there is a script error. Likely the demo_capture assignment is not at the beginning of the file.
            gW.messages['help'].newMessage("Script error in file: [base,yellow]" + fileName + "[base]", 7.0);
         }
         
      }).fail( function(jqXHR, textStatus, errorThrown) {
         console.log("in fail, jqXHR.status=" + jqXHR.status);
         console.log("in fail, textStatus=" + textStatus);
         
         gW.messages['help'].newMessage("File [base,yellow]" + fileName + "[base] not found on server.", 7.0);
      });   
      
   }
   
   
   function scrollCaptureArea() {
      gW.dC.json.scrollTop = 30; 
      gW.dC.json.scrollLeft = 130;
   }
   
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      'cloudCapture': m_cloudCapture,
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'saveState': saveState,
      'loadJSON': loadJSON,
      'modifyCapture': modifyCapture,
      'modifyForCalculator': modifyForCalculator,
      'shiftCapture': shiftCapture,
      'sortPucks': sortPucks,
      'runCapture': runCapture,
      'cleanCapture': cleanCapture,
      'restoreFromState': restoreFromState,
      'compareCaptureToFile': compareCaptureToFile,
      'compareCaptureToCloudOriginal': compareCaptureToCloudOriginal,
      'demoStart_fromCapture': demoStart_fromCapture,
      'clearState': clearState,
      'filePicker': filePicker,
      'fileWriter': fileWriter,
      'postCaptureToCF': postCaptureToCF,
      'scrollCaptureArea': scrollCaptureArea
      
   };

})();