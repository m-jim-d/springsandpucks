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

// Multi Select (mS) module
// multiSelect.js 
   console.log('mS _*-*_');
// 4:22 PM Tue July 25, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.mS = (function() {
   "use strict";
   
   function MultiSelect() {
      dFM.DrawingFunctions.call(this); // Inherit attributes
      
      // map of pucks and walls in the multiselect as keyed by name
      this.map = {};
      this.center_2d_m = new wS.Vec2D(0,0);
      this.findCenterEnabled = true;
      
      // the select (and delete mode) that is presented via the tab-key menu for multiselect
      this.selectMode = ['normal','everything','springs','revolute joints'];
      this.selectModeIndex = 0;
      this.selectModeMessage = ['normal ([base]springs & revolute joints, then pucks)', 'everything [base]in multi-select', 'springs [base]only', 'revolute joints [base]only'];
      
      // via the enter-key stepper, an array containing the names of springs or revolute joints that are connected to pucks/walls in this.map
      // Stepping through this list, draws focus to a particular spring or revolute joint. 
      this.connectedNames = [];
      this.focusIndex = 0;
      this.candidateReportPasteDelete = null;
   }
   MultiSelect.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods (containing module must load first)
   MultiSelect.prototype.constructor = MultiSelect; // Rename the constructor (after inheriting)
   // A method that loops over the selected objects (this.map) of this instance of MultiSelect
   MultiSelect.prototype.applyToAll = function( doThis) {
      for (var objName in this.map) {
         var tableObj = this.map[ objName];
         doThis( tableObj);
      }
   }
   MultiSelect.prototype.resetAll = function() {
      cP.Spring.applyToAll( spring => { spring.selected = false; } );
      cP.Joint.applyToAll(   joint => {  joint.selected = false; } );

      this.applyToAll( msObject => { 
         msObject.selectionPoint_l_2d_m = new wS.Vec2D(0,0);
      });
      this.map = {};
      this.resetCenter();
   }
   MultiSelect.prototype.resetCenter = function() {
      this.center_2d_m = new wS.Vec2D(0,0);
      this.findCenterEnabled = true;
   }
   MultiSelect.prototype.count = function() {
      return Object.keys(this.map).length;
   }
   MultiSelect.prototype.findCenter = function() {
      this.center_2d_m = new wS.Vec2D(0,0);
      this.applyToAll( tableObj => {
         this.center_2d_m = this.center_2d_m.add( tableObj.position_2d_m);
      });
      this.center_2d_m = this.center_2d_m.scaleBy( 1.0 / this.count());
   }
   MultiSelect.prototype.drawCenter = function( drawingContext) {
      this.findCenter();
      let center_2d_px = wS.screenFromWorld( this.center_2d_m);
      
      dF.drawMark( drawingContext, center_2d_px, {'borderColor':'yellow', 'radius_px':5});
   }
   MultiSelect.prototype.removeOne = function( theBody) {
      // un-select the springs
      cP.Spring.findAll_InMultiSelect( spring => spring.selected = false);
      cP.Joint.findAll_InMultiSelect( joint => joint.selected = false);
      delete this.map[ theBody.name];
      // re-select the springs based on the updated map
      cP.Spring.findAll_InMultiSelect( spring => spring.selected = true);
      cP.Joint.findAll_InMultiSelect( joint => joint.selected = true);
   }
   MultiSelect.prototype.pasteCopyAtCursor = function() {
      if (this.count() < 1) {
         gW.messages['help'].newMessage("Nothing in multi-select. Use shift (or alt) key to multi-select.", 1.0);
         return;
      }
      this.findCenter();
      // Offset between the center of the group and the cursor position.
      var changeInPosition_2d_m = gW.clients['local'].mouse_2d_m.subtract( this.center_2d_m);
      // A temporary map to associated the original pucks to the copies.
      var copyMap = {};
      // Copy pucks, pins, and walls to the cursor position.
      this.applyToAll( tableObj => {
         // Exclude navigation pins and client pucks.
         if ( ! (tableObj.nextPinName || tableObj.clientName) ) {
            var newPosition_2d_m = tableObj.position_2d_m.add( changeInPosition_2d_m);
            var newTableObj = tableObj.copyThisOne({'position_2d_m':newPosition_2d_m});
            copyMap[tableObj.name] = newTableObj;
         } else {
            gW.messages['help'].newMessage("Note: client pucks and navigation pins are excluded\\   from multi-select replication.", 2.0);
         }
      });
      // Copy all the springs onto the newly created pucks. Use the copyMap to determine
      // correspondence.
      cP.Spring.findAll_InMultiSelect( spring => {
         // Exclude navigation springs
         if ( ! (spring.navigationForNPC)) {
            // Copy this spring onto these two pucks.
            var targetPuck1 = copyMap[ spring.spo1.name];
            var targetPuck2 = copyMap[ spring.spo2.name];
            spring.copyThisOne( targetPuck1, targetPuck2);
         }
      });
      cP.Joint.findAll_InMultiSelect( joint => {
            // Copy this joint onto these two table objects.
            var tableObj1 = copyMap[ joint.jto1.name];
            var tableObj2 = copyMap[ joint.jto2.name];
            joint.copyThisOne( tableObj1, tableObj2);
      });
   }
   MultiSelect.prototype.arc = function( placement_2d_m) {
      console.log("inside arc");
      
      // half circle
      let n_rotations = this.count() - 2;  // change to 1 for a true half circle
      let angle_delta_r = (Math.PI)/n_rotations;
      let angle_delta_deg = 180/n_rotations;
      
      let maxRadius_m = 0;
      let allCircularPucks = true;
      this.applyToAll( msObject => { 
         if (msObject.radius_m > maxRadius_m) maxRadius_m = msObject.radius_m;
         if ((msObject.constructor.name != "Puck") || (msObject.shape != "circle")) allCircularPucks = false;
      });
      
      if (( ! allCircularPucks) || (this.count() < 9)) {
         gW.messages['help'].newMessage('Must select at least 9 pucks, all circular.', 3.0);
         return;
      }
      
      let gap_m = 0.10 * maxRadius_m; // 0.05
      /*
      Spoke length is the distance from the center of the group out to the center of one puck such
      that n pucks line up on a half circle. It might help to imagine the circular pucks replaced 
      by line segments (a diameter).
      
         tan( angle_delta_r / 2) = opp/adj = maxRadius_m / spoke_length
      
      This calculation is more properly used with the chain loop and springy-chain loop calculations.
      In those cases the neighboring pucks don't collide. Here, circular pucks may touch at points
      off the diameter, as their diameters are placed on the alignment circle. This is more of an issue 
      as the number of pucks gets smaller, avoided by insisting on a count of 9 or more.
      */
      let spokeLength_m = (maxRadius_m + gap_m) / Math.tan( angle_delta_r/2.0);
      let spoke_2d_m = new wS.Vec2D( spokeLength_m, 0.0);
      
      this.applyToAll( msObject => { 
         let newPuckPosition_2d_m = placement_2d_m.add( spoke_2d_m);
         msObject.setPosition( newPuckPosition_2d_m, 0);
         spoke_2d_m.rotated_by( angle_delta_deg);
      });
   }
   MultiSelect.prototype.align = function() {
      // Align the selected objects between the two outermost (the two most separated) objects and linearize the loss related (e.g. friction and drag) attributes.
      
      // Need at least 3. Otherwise, warn then bail.
      let n_selected = this.count();
      if (n_selected < 3) {
         gW.messages['help'].newMessage('Select at least three objects for alignment. \\  The outermost two define the endpoints of the line. \\  Alternately, use alt-l to run the alignment.', 5.0);
         return;
      }
      
      /*
      Tried this (commented) approach first, but it failed (and sometimes froze the browser tab) to pick two outliers if they were not distinctive.
      For example, a group of objects equally spaced around the parameter of a circle.
      // Calculate each object's distance from the center of the group.
      this.findCenter();
      let distances = [];
      this.applyToAll( msObject => {
         let distanceFromCenter_m = this.center_2d_m.subtract( msObject.position_2d_m).length();
         distances.push({'name':msObject.name , 'distance_m':distanceFromCenter_m});
      });
      
      // Find the two outermost objects by sorting by distance, descending. Use the first two in the sorted list.
      distances.sort(function (a, b) {
        return b.distance_m - a.distance_m;
      });
      */
      
      // Find the most separated pair of objects (the outer two) by considering every possible combination.
      let namesInMultiSelectMap = Object.keys(this.map);
      let max_separation_m = 0;
      let j_max = null;
      let k_max = null;
      for (let j = 0, len = namesInMultiSelectMap.length; j < len; j++) {
         for (let k = j+1; k < len; k++) {
            let pos_j_2d_m = this.map[ namesInMultiSelectMap[j]].position_2d_m;
            let pos_k_2d_m = this.map[ namesInMultiSelectMap[k]].position_2d_m;
            let separation_m = pos_j_2d_m.subtract( pos_k_2d_m).length();
            if (separation_m > max_separation_m) {
               max_separation_m = separation_m;
               j_max = j;
               k_max = k;
            }
         }
      }
      
      let outer_A = this.map[ namesInMultiSelectMap[ j_max] ];
      let outer_A_2d_m = outer_A.position_2d_m;
      let outer_B = this.map[ namesInMultiSelectMap[ k_max] ];
      let outer_B_2d_m = outer_B.position_2d_m;
      
      // Create an equally spaced set of positions between these two objects.
      let line_positions_by_index = {};
      let line_position_index_by_name = {};
      let incremental_2d_m = outer_B_2d_m.subtract( outer_A_2d_m).scaleBy( 1 / (n_selected-1) );
      for (let i = 1; i < n_selected-1 ; i++) {
         let positionOnLine_2d_m = outer_A_2d_m.add( incremental_2d_m.scaleBy( i ) );
         line_positions_by_index[ i] = {};
         line_positions_by_index[ i].p_2d_m = positionOnLine_2d_m;
         line_positions_by_index[ i].used = false;
      }
      
      // Move each of the objects (except the outer two) to one of the line positions.
      this.applyToAll( msObject => {
         if ((msObject.name != namesInMultiSelectMap[ j_max]) && (msObject.name != namesInMultiSelectMap[ k_max])) {
            // Find the closest line position that hasn't already been taken.
            let d_to_candidate_min_m = 100;
            let k_min = null;
            for (let k in line_positions_by_index) {
               if ( ! line_positions_by_index[ k].used) {
                  let d_to_candidate_m = msObject.position_2d_m.subtract( line_positions_by_index[ k].p_2d_m).length();
                  if (d_to_candidate_m < d_to_candidate_min_m) {
                     d_to_candidate_min_m = d_to_candidate_m;
                     k_min = k;
                  }
               }
            }
            msObject.position_2d_m = line_positions_by_index[ k_min].p_2d_m;
            msObject.b2d.SetPosition( msObject.position_2d_m);
            line_position_index_by_name[ msObject.name] = k_min;
            line_positions_by_index[ k_min].used = true;
         }
      });
      
      // Check for deltas in the attributes of the two outer objects, A and B.
      let attributes = { 'restitution':{'delta':null}, 'friction':{'delta':null}, 'linDamp':{'delta':null}, 'angDamp':{'delta':null} };
      for (let attributeName in attributes) {
         if (outer_A[ attributeName] != outer_B[ attributeName]) {
            attributes[ attributeName].delta = outer_B[ attributeName] - outer_A[ attributeName];
         }
      }
      
      this.applyToAll( msObject => {
         // Linearize the attributes (that have a delta) based on line position.
         let helpString_names = ""
         for (let attributeName in attributes) {
            if (attributes[ attributeName].delta) {
               helpString_names += attributeName + ", ";
               let line_position_index = line_position_index_by_name[ msObject.name];
               if (line_position_index) {
                  msObject[ attributeName] = outer_A[ attributeName] + line_position_index * (attributes[ attributeName].delta /(n_selected-1));
               }
            }
         }
         
         if (helpString_names != "") {
            gW.messages['help'].newMessage( helpString_names.slice(0,-2) + " linearized", 1.5);
         }
         
         // Update the box2d fixture attributes
         msObject.b2d.m_fixtureList.SetRestitution( msObject.restitution);
         msObject.b2d.m_fixtureList.SetFriction( msObject.friction);
         // Update the box2d body attributes
         msObject.b2d.SetLinearDamping( msObject.linDamp);
         msObject.b2d.SetAngularDamping( msObject.angDamp);
         
         // Inhibit changes associated with the gravity toggle.
         msObject.restitution_fixed = true;
         msObject.friction_fixed = true;
      });
   }
   MultiSelect.prototype.resetStepper = function() {
      this.connectedNames = [];
      this.focusIndex = -1;
      this.candidateReportPasteDelete = null;
   }
   MultiSelect.prototype.stepThroughArray = function( map) {
      if (this.connectedNames.length > 0) {
         if (gW.clients['local'].key_shift != 'D') {
            if (this.focusIndex < (this.connectedNames.length - 1)) {
               this.focusIndex++;
            } else {
               this.focusIndex = 0;
            }
         } else {
            if (this.focusIndex > 0) {
               this.focusIndex--;
            } else {
               this.focusIndex = this.connectedNames.length - 1;
            }
         }  
         this.candidateReportPasteDelete = this.connectedNames[ this.focusIndex];
         map[ this.candidateReportPasteDelete].selected = false;
      }
   }
   MultiSelect.prototype.deleteCandidate = function( map) {
      map[ this.candidateReportPasteDelete].deleteThisOne({});
      this.connectedNames = this.connectedNames.filter( eachName => (eachName != this.candidateReportPasteDelete) );
      this.candidateReportPasteDelete = null;
      this.focusIndex -= 1;
      if (this.focusIndex < 0) this.focusIndex = 0;
   }
   
   
   
   function SelectBox( pars) {
      dFM.DrawingFunctions.call(this); // Inherit attributes
      this.clickPoint_2d_px   = uT.setDefault( pars.clickPoint_2d_px, new wS.Vec2D(0,0));
      this.currentMouse_2d_px = uT.setDefault( pars.currentMouse_2d_px, new wS.Vec2D(0,0));
      this.enabled = false;
      this.limits = {};
   }
   // Make this a module-level function, not part of the prototype, so it can be used in the callback of the QueryAABB.
   // Check if this point is inside the bounding limits of the box.
   SelectBox.pointInside = function( p_2d_m, limits) {
      if (( p_2d_m.x > limits.min_x ) && ( p_2d_m.x < limits.max_x ) && ( p_2d_m.y > limits.min_y ) && ( p_2d_m.y < limits.max_y )) {
         return true;
      } else {
         return false;
      }
   }
   SelectBox.prototype = Object.create( dFM.DrawingFunctions.prototype); // Inherit methods (containing module must load first)
   SelectBox.prototype.constructor = SelectBox; // Rename the constructor (after inheriting)
   SelectBox.prototype.selectBodiesInBox = function() {
      var aabb = new b2DW.AABB();
      
      // The two corners of the box, 1 and 2, in world coordinates.
      var c1_2d_m = wS.worldFromScreen( this.clickPoint_2d_px);
      var c2_2d_m = wS.worldFromScreen( this.currentMouse_2d_px);
      
      this.limits.min_x = Math.min(c1_2d_m.x, c2_2d_m.x);
      this.limits.max_x = Math.max(c1_2d_m.x, c2_2d_m.x);
      this.limits.min_y = Math.min(c1_2d_m.y, c2_2d_m.y);
      this.limits.max_y = Math.max(c1_2d_m.y, c2_2d_m.y);
      
      // Provide the corners with the lowest values (lower left) and the highest values (upper right)
      aabb.lowerBound.Set( this.limits.min_x, this.limits.min_y);
      aabb.upperBound.Set( this.limits.max_x, this.limits.max_y);
      
      // Query the world for overlapping shapes.
      var objectCount = 0;
      
      // The callback function can't use "this" so make a reference in the local scope.
      var limits = this.limits;
      
      // This runs the box query. The function gets called once for each fixture found
      // to be overlapping the box.
      gW.b2d.world.QueryAABB( function( fixture) {
         
         var bd2_Body = fixture.GetBody();
         var table_body = gW.tableMap.get( bd2_Body);
         
         // COM of this body.
         var p_2d_m = table_body.position_2d_m;
         
         // Check if Center-Of-Mass of this object is within the selection box. This is needed because the
         // query returns all bodies for which their bounding box is overlapping the selection box. So this 
         // give more selection control to avoid nearby objects.
         var itsInside = SelectBox.pointInside( p_2d_m, limits);
         
         // Don't select walls or pins if the editor is off.
         if (itsInside && !(!gW.dC.editor.checked && ((table_body.constructor.name == "Wall") || (table_body.constructor.name == "Pin")))) {
            objectCount += 1;
            // Add this body to the hostMSelect map.
            gW.hostMSelect.map[ table_body.name] = table_body;
         }
         
         // Keep looking at all the fixtures found in the query.
         return true;
      }, aabb);
      /*
      Check each point in hostMSelect map. Remove any that are no longer in the box.
      
      Wrote this in three different ways below: (1) with a loop over the map, (2) passing
      a function to the applyToAll method, and (3) binding the function to the hostMSelect
      object (setting "this") then passing it to applyToAll. The 3rd one is being used.
      
      for (var objName in gW.hostMSelect.map) {
         var tableObj = gW.hostMSelect.map[ objName];
         if ( ! SelectBox.pointInside(tableObj.position_2d_m, this.limits)) {
            gW.hostMSelect.removeOne( tableObj);
         }
      }
      
      or
      
      gW.hostMSelect.applyToAll( function( tableObj) {
         if ( ! SelectBox.pointInside(tableObj.position_2d_m, limits)) {
            gW.hostMSelect.removeOne( tableObj);
         };
      });
      
      or
      
      Note "limits" is defined in the surrounding scope here. The "this"
      reference points to the gW.hostMSelect object as dictated in the call
      to bind method of the function that's being passed in.
      
      gW.hostMSelect.applyToAll( function( tableObj) {
         if ( ! SelectBox.pointInside(tableObj.position_2d_m, limits)) {
            this.removeOne( tableObj);
         };
      }.bind( gW.hostMSelect));
      
      or 
      
      Using arrow-function notation. And without using bind and the "this" to get at the removeOne method.
      Note you can't (and shouldn't want to) bind to an arrow function. Must use a regular function (see above).
      Generally the arrow functions are nice for passing in a function so that the "this" in the function
      refers to the surrounding context. Of course, can't use "this", and the surrounding context here, to 
      get at removeOne, since it is part of the MultiSelect class.
      */
      gW.hostMSelect.applyToAll( tableObj => {
         if ( ! SelectBox.pointInside( tableObj.position_2d_m, limits)) gW.hostMSelect.removeOne( tableObj);
      });
   }
   SelectBox.prototype.start = function() {
      cP.Puck.applyToAll( puck => puck.selectionPoint_l_2d_m = new wS.Vec2D(0,0) );
      this.enabled = true;
      this.clickPoint_2d_px = gW.clients['local'].mouse_2d_px;
   }
   SelectBox.prototype.stop = function() {
      this.enabled = false;
   }
   SelectBox.prototype.update = function() {
      this.currentMouse_2d_px = gW.clients['local'].mouse_2d_px;
      this.selectBodiesInBox();
   }
   SelectBox.prototype.draw = function( drawingContext) {
      var corners_2d_px = [this.clickPoint_2d_px,   new wS.Vec2D(this.currentMouse_2d_px.x, this.clickPoint_2d_px.y), 
                           this.currentMouse_2d_px, new wS.Vec2D(this.clickPoint_2d_px.x,   this.currentMouse_2d_px.y)];
      this.drawPolygon( drawingContext, corners_2d_px, {'borderColor':'red', 'fillIt':false});
   }
   
   
      
   function clickToClearMulti(clientName) {
      var client = gW.clients[ clientName];
      
      // Check for body at the mouse position. If nothing there, and shift (and alt) keys are UP, reset the
      // multi-select map. So, user needs to release the shift (and alt) key and click on open area to 
      // flush out the multi-select.
      var selected_b2d_Body = bS.b2d_getBodyAt( client.mouse_2d_m);
      var selectedBody = gW.tableMap.get( selected_b2d_Body);
      
      gW.hostMSelect.candidateReportPasteDelete = null;
         
      if ((client.key_shift == "U") && (client.key_alt == "U") && (client.key_ctrl == "U")) {
         // Clicked on blank space on air table (un-selecting everything)
         if ( ! selected_b2d_Body) {
            // Un-select everything in the multi-select map.
            gW.hostMSelect.resetAll();
            gW.hostMSelect.selectModeIndex = 0;
         }
      } 
   }
   
   function clearMultiSelect() {
      gW.hostMSelect.resetAll();
      gW.hostMSelect.selectModeIndex = 0;
      gW.hostMSelect.candidateReportPasteDelete = null;
   }

      
   // Public references to objects, variables, and methods
   
   return {
      // Objects      
      'MultiSelect': MultiSelect,
      'SelectBox': SelectBox,

      // Variables
      
      // Methods
      'clickToClearMulti': clickToClearMulti,
      'clearMultiSelect': clearMultiSelect,
      
   };   
   
})();