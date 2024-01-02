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

// World and Screen (wS) module
// worldScreen.js
   console.log('wS _*-*_');
// 1:50 PM Sat July 22, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.wS = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   
   // module globals for objects brought in by initializeModule
   // none yet
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
      // nothing yet
   }


   // Vector prototype
   function Vec2D(x, y) {
      this.x = x;
      this.y = y;
   }
   Vec2D.prototype.copy = function() {
      return new Vec2D( this.x, this.y);
   }
   Vec2D.prototype.addTo = function( vectorToAdd) {
      // Modify the base vector.
      this.x += vectorToAdd.x;
      this.y += vectorToAdd.y;
   }
   Vec2D.prototype.add = function( vectorToAdd) {
      // Return a new vector.
      var x_sum = this.x + vectorToAdd.x;      
      var y_sum = this.y + vectorToAdd.y;
      return new Vec2D( x_sum, y_sum);
   }
   Vec2D.prototype.subtract = function( vectorToSubtract) {
      // Return a new vector.
      var x_diff = this.x - vectorToSubtract.x;      
      var y_diff = this.y - vectorToSubtract.y;
      return new Vec2D( x_diff, y_diff);
   }   
   Vec2D.prototype.scaleBy = function( scalingFactor) {
      var x_prod = this.x * scalingFactor;
      var y_prod = this.y * scalingFactor;
      return new Vec2D( x_prod, y_prod);
   }
   Vec2D.prototype.length = function() {
      return Math.sqrt(this.x*this.x + this.y*this.y);
   }
   Vec2D.prototype.normal = function() {
      var length = this.length();
      var x = this.x / length;
      var y = this.y / length;
      return new Vec2D(x, y);
   }
   Vec2D.prototype.dot = function( vector) {
      return (this.x * vector.x) + (this.y * vector.y);
   }
   Vec2D.prototype.cross = function( vector) {
      return (this.x * vector.y) - (this.y * vector.x);
   }
   Vec2D.prototype.projection_onto = function( vec_B) {
      var vB_dot_vB = vec_B.dot( vec_B);
      if (vB_dot_vB > 0) {
         return vec_B.scaleBy( this.dot( vec_B) / vB_dot_vB );
      } else {
         // Must catch this null when dealing with pinned springs (can have 
         // zero separation)
         return null;
      }
   }
   Vec2D.prototype.rotate90 = function() {
      return new Vec2D(-this.y, this.x);
   }
   Vec2D.prototype.rotated_by = function( angle_degrees) {
      // Rotate relative to the current orientation
      // angle_degrees is the change in the angle, from current to new.
      var angle_radians = (Math.PI/180) * angle_degrees;
      var cos = Math.cos( angle_radians);
      var sin = Math.sin( angle_radians);
      // The rotation transformation.
      var x = this.x * cos - this.y * sin;
      var y = this.x * sin + this.y * cos;
      // Modify the original vector.
      this.x = x;
      this.y = y;
   }
   Vec2D.prototype.equal = function( p_2d) {
      if ((this.x == p_2d.x) && (this.y == p_2d.y)) {
         return true;
      } else {
         return false;
      }
   }
   Vec2D.prototype.zeroLength = function() {
      if ((this.x == 0) && (this.y == 0)) {
         return true;
      } else {
         return false;
      }
   }
   Vec2D.prototype.length_squared = function() {
      return (this.x*this.x + this.y*this.y);
   }
   Vec2D.prototype.get_angle = function() {
      // Determine the angle (in degrees) that this vector makes with the x axis. Measure
      // counterclockwise from the x axis.
      if (this.length_squared() == 0) {
         return 0;
      } else {
         // Yes, this is correct, y is the first parameter.
         return Math.atan2(this.y, this.x) * (180/Math.PI);
      }
   }
   Vec2D.prototype.set_angle = function( angle_degrees) {
      // Set the direction of the vector to a specific angle.
      this.x = this.length();
      this.y = 0;
      this.rotated_by( angle_degrees);
   }
   Vec2D.prototype.angleBetweenPoints_r = function( p1_2d, p2_2d) {
      // Find the angle formed by the two vectors that originate at this vector, with end points at p1 and p2.
      
      // Angle (degrees relative to x axis) of the differential vector between this vector and p1_2d.
      var angle_1_d = p1_2d.subtract(this).get_angle();
      // Angle (degrees relative to x axis) of the differential vector between this vector and p2_2d.
      var angle_2_d = p2_2d.subtract(this).get_angle();
      
      var delta_d = angle_2_d - angle_1_d;
      
      // Change in angle (radians) from p1 to p2.
      var delta_r = delta_d * (Math.PI/180.0);
      
      return delta_r;
   }
   Vec2D.prototype.angleBetweenVectors_d = function( vector_2d) {
      var angle_1_d = this.get_angle();
      var angle_2_d = vector_2d.get_angle();
      var delta_d = angle_2_d - angle_1_d;
      return delta_d;
   }
   Vec2D.prototype.matchAngle = function( p_2d) {
      var newAngle_d = p_2d.get_angle();
      this.set_angle( newAngle_d);
      return newAngle_d;
   }



   // Relationships between the screen and the b2d world ///////////////////////
   // Scaler conversions
   function meters_from_px( length_px) {
      return length_px / gW.getPx_per_m();
   }
   function px_from_meters( length_m) {
      // Fastest to just let this float (don't convert to integer). Browsers can handle fractional pixels.
      return length_m * gW.getPx_per_m();
   }
   // Vector conversions.
   function screenFromWorld( position_2d_m) {
      var x_px = px_from_meters( position_2d_m.x);
      var y_px = px_from_meters( position_2d_m.y);
      return new Vec2D( x_px, gW.get_hostCanvasWH().height - y_px);
   }
   function worldFromScreen( position_2d_px) {
      var x_m = meters_from_px( position_2d_px.x);
      var y_m = meters_from_px( gW.get_hostCanvasWH().height - position_2d_px.y);
      return new Vec2D( x_m, y_m); 
   }   


   // Translate back to raw screen coordinates from the coordinates of the imaging element.
   function rawScreenFromImagingElement( imagingElement, position_2d_px, border_px) {
      let x_raw_px, y_raw_px, imagingElementRect;
      if (dS.fullScreenState('get')) { 
         imagingElementRect = elementRectInFullScreen( imagingElement);
         x_raw_px = imagingElementRect.left + (position_2d_px.x * imagingElementRect.scaleFactor);
         y_raw_px = imagingElementRect.top  + (position_2d_px.y * imagingElementRect.scaleFactor);
         
      } else {
         imagingElementRect = imagingElement.getBoundingClientRect();
         x_raw_px = imagingElementRect.left + position_2d_px.x + border_px;
         y_raw_px = imagingElementRect.top  + position_2d_px.y + border_px;
      }
      return new Vec2D( x_raw_px, y_raw_px);
   }
   
   // Map (stretch) the raw touch-screen (mainly useful for cell phones) values out closer to the cushions in the pool table.
   function stretchRaw_px( raw_px, range_px, scaleFirstHalf, scaleSecondHalf) {
      var midpoint_px = range_px/2.0;
      if (raw_px < midpoint_px) {
         var stretched_px = midpoint_px - Math.abs(midpoint_px - raw_px) * scaleFirstHalf;
      } else {
         var stretched_px = midpoint_px + Math.abs(midpoint_px - raw_px) * scaleSecondHalf;
      }
      if (stretched_px < 0) stretched_px = 0;
      
      return stretched_px;
   }
   
   function elementRectInFullScreen( imagingElement) {
      var renderedElementRect = {};
      // The magic is in this next line. The image scaling is limited by the axis that is most fractionally similar to the corresponding view-port axis.
      // Scaling that axis until it matches the view-port avoids clipping the image along the other axis.
      // So, take the minimum of the two ratios. That's the limit for scaling without clipping.
      var widthRatio  = window.innerWidth / imagingElement.width;
      var heightRatio = window.innerHeight / imagingElement.height;
      renderedElementRect.whRatio = widthRatio / heightRatio;
      renderedElementRect.scaleFactor = Math.min( widthRatio, heightRatio);
      renderedElementRect.width  = imagingElement.width  * renderedElementRect.scaleFactor;
      renderedElementRect.height = imagingElement.height * renderedElementRect.scaleFactor;
      
      renderedElementRect.left = Math.max( (window.innerWidth  - renderedElementRect.width)/2, 0);
      renderedElementRect.top  = Math.max( (window.innerHeight - renderedElementRect.height)/2, 0);
      
      return renderedElementRect;
   }
   
   // Convert raw mouse value into the coordinates of the imaging element (iE), like the canvas for example.
   function screenFromRaw_2d_px( imagingElement, raw_2d_px, pars = {}) {
      var mouse_iE_2d_px = new Vec2D(0, 0);
      var inputDevice = uT.setDefault( pars.inputDevice, "mouse");  // default input device type
      var demoRunningOnHost = uT.setDefault( pars.demoRunningOnHost, "N/A");
      var x_raw_px = raw_2d_px.x;
      var x_px = x_raw_px;
      var y_raw_px = raw_2d_px.y; 
      var y_px = y_raw_px;
      var runningGhostBallPool = (demoRunningOnHost.slice(0,3) == "3.d");
      let projectileGames = ['4.e','5.e'].includes( demoRunningOnHost.slice(0,3));
      
      if (dS.fullScreenState('get')) { 
         var renderedElementRect = elementRectInFullScreen( imagingElement);
         /*
         let debugString = "whRatio=" + renderedElementRect.whRatio;
         hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
         */
         // Stretch the raw cell-phone touchscreen input:
         // When playing pool on a cell-phone, it can be hard to touch the upper edge of the phone screen (landscape). This stretching also avoids a problem
         // on the left edge where dragging the ghost-ball over the left edge will trigger a release (a shot).
         if (inputDevice == "touchScreen") {
            if (runningGhostBallPool) {
               // Bring left and right touch points in toward the middle. Again, this avoids accidentally touching controls or dragging off the left edge of the screen.
               x_px = stretchRaw_px( x_raw_px, window.innerWidth,  1.15, 1.15);
               // When whRatio is greater than 1.0, the pool table fills the vertical range of the touch screen (landscape). Again, this can make
               // it difficult to reach the top and bottom cushions with thumb touches. In those cases, apply more stretch. This effectively 
               // brings the touch points in (a little) toward the middle of the touch screen.
               if (renderedElementRect.whRatio > 1.0) {
                  // cell phone, my pixel is about 1.22
                  y_px = stretchRaw_px( y_raw_px, window.innerHeight, 1.20, 1.10);
               } else {
                  // laptop, 0.999
                  y_px = stretchRaw_px( y_raw_px, window.innerHeight, 1.10, 1.00);
               }
               
            } else if (projectileGames) {
               if (renderedElementRect.whRatio > 1.0) {
                  // cell phone
                  x_px = stretchRaw_px( x_raw_px, window.innerWidth,  0.95, 0.95);
                  y_px = stretchRaw_px( y_raw_px, window.innerHeight, 1.20, 1.30);
               } else {
                  // laptop
                  x_px = stretchRaw_px( x_raw_px, window.innerWidth,  1.10, 1.10);
                  y_px = stretchRaw_px( y_raw_px, window.innerHeight, 1.20, 1.30);
               }
            }
         }
         
         mouse_iE_2d_px.x = (x_px - renderedElementRect.left) / renderedElementRect.scaleFactor;
         mouse_iE_2d_px.y = (y_px - renderedElementRect.top) / renderedElementRect.scaleFactor;
         
      } else {
         var renderedElementRect = imagingElement.getBoundingClientRect();
         // Nudge it a little to account for the canvas border (5px when not fullscreen). This aligns our mouse tip with the Windows' mouse tip.
         mouse_iE_2d_px.x = x_raw_px - renderedElementRect.left - 5;
         mouse_iE_2d_px.y = y_raw_px - renderedElementRect.top  - 5; 
      }
      
      // This will help keep the ghost-ball from getting behind the cushions in the pool game.
      if (runningGhostBallPool) {
         // canvas width: 1915, height: 1075
         if (mouse_iE_2d_px.x < 5) {
            mouse_iE_2d_px.x = 5;
         } else if ((mouse_iE_2d_px.x > 1910)) {
            mouse_iE_2d_px.x = 1910;
         }
         if (mouse_iE_2d_px.y < 5) {
            mouse_iE_2d_px.y = 5;
         } else if ((mouse_iE_2d_px.y > 1070)) {
            mouse_iE_2d_px.y = 1070;
         }
      }
      /*
      var debugString = "yR:"  + Math.round( y_raw_px) + ",yS:" + Math.round( y_px) + ", xR:" + Math.round( x_raw_px) + ",xS:" + Math.round( x_px) +   "     xF:" + mouse_iE_2d_px.x.toFixed(1) + ",yF:" + mouse_iE_2d_px.y.toFixed(1) + 
                        "\\wW:" + window.innerWidth + ",wH:" + window.innerHeight + ", eW:" + Math.round( imagingElement.width)   + ",eH:" + Math.round( imagingElement.height) + ", whR:" + renderedElementRect.whRatio.toFixed(3) +
                        ", inputDevice=" + inputDevice;
      // This will display for the host's mouse and touch events if the host is connected to the server.
      hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
      */
      return mouse_iE_2d_px; // in coordinates of the imaging element (iE)
   }
   
   // A check to see if the cursor position is over the canvas (or other specified element).
   function mouseOverElement( imagingElement, raw_2d_px) {
      var renderedElementRect = imagingElement.getBoundingClientRect();
      let withinXrange = (raw_2d_px.x >= renderedElementRect.left) && (raw_2d_px.x <= renderedElementRect.right);
      let withinYrange = (raw_2d_px.y >= renderedElementRect.top)  && (raw_2d_px.y <= renderedElementRect.bottom);
      let overElement = (withinXrange && withinYrange);
      return overElement;
   }
   
   function exitFineMoves( clientName) {
      // This is a recursive transition that brings the finemoves cursor back to the main cursor position.
      var fineAdjust_2d_px;
      var client = gW.clients[ clientName];
      
      client.fineMovesState = 'inTransition';
      var transitionSteps = 10; 
      var transitionStepWait_ms = gW.getDeltaT_s() * 1000.0; // one step per frame
      
      setTimeout( function runTransiton() {
         client.fMT.count++;
         /*
         For example, if the initial separation is 22 parts, the following transition series results in equal intervals as follows:
         factor:              1/11,    1/10,    1/9, ...   1/2 
         difference:       22/11=2, 20/10=2, 18/9=2, ... 4/2=2 
         decreasing separation: 22,      20,     18, ...     2 
         This recursive transition always uses the current mouse position, so even if the mouse is moving, this closes in on the mouse position.
         */
         var reductionFraction = 1.0/((transitionSteps + 2) - client.fMT.count);
         
         // difference between center of ghost ball (location of client pin) and the actual cursor position (previous value). 
         var diff_2d_px = client.pin.position_2d_px.subtract( client.prevNormalCursorPosOnCanvas_2d_px).scaleBy( reductionFraction);
         
         fineAdjust_2d_px = client.previousFine_2d_px.subtract( diff_2d_px);
         
         // Save the fine-adjust result.
         client.previousFine_2d_px = fineAdjust_2d_px;
         
         client.mouse_async_2d_px = fineAdjust_2d_px;
         
         if (client.fMT.count <= transitionSteps) {
            // Recursive...
            setTimeout( runTransiton, transitionStepWait_ms);
            
         } else {
            client.fMT.count = 0;
            client.fineMovesState = 'off'
         }
         
      }, transitionStepWait_ms);
   }
   
   function fineMoves( clientName, posOnCanvas_2d_px) {
      /*
      Note: these cursor related results associated with fineMoves are regenerated (instantiated) each frame 
      and so that breaks any frame-to-frame references to these vectors (objects).
      */
      var fineAdjust_2d_px;
      var client = gW.clients[ clientName];
      
      if (client.fineMovesState == 'on') {
         // Move 15% of the normal 1-to-1 movement.
         var diff_2d_px = posOnCanvas_2d_px.subtract( client.prevNormalCursorPosOnCanvas_2d_px).scaleBy(0.15);
         fineAdjust_2d_px = client.previousFine_2d_px.add( diff_2d_px);
      
         // Save the fine-adjust result.
         client.previousFine_2d_px = fineAdjust_2d_px;
      
      } else if (client.fineMovesState == 'off') {
         // do nothing; no high-resolution movement
         fineAdjust_2d_px = posOnCanvas_2d_px;
      }
      
      //var debugString = "fine:" + math.round(fineAdjust_2d_px.x,2) + "," + math.round(fineAdjust_2d_px.y,2) + ", reg:" + posOnCanvas_2d_px.x + "," + posOnCanvas_2d_px.y;
      //hC.sendSocketControlMessage( {'from':'anyone', 'to':'host', 'data':{'androidDebug':{'value':true,'debugString':debugString}} } );
      
      // Save the incoming (primary) cursor position on the canvas.
      client.prevNormalCursorPosOnCanvas_2d_px = posOnCanvas_2d_px;
      
      return fineAdjust_2d_px;
   }
 
   // Functions to convert between vector types
   function Vec2D_from_b2Vec2( b2Vector) {
      return new Vec2D( b2Vector.x, b2Vector.y);
   }
   function b2Vec2_from_Vec2D( vec2D) {
      return new b2DW.Vec2( vec2D.x, vec2D.y);
   }
   
   // This check is useful to prevent problems (objects stripped of their methods) when reconstructing from a 
   // JSON capture.
   function Vec2D_check( vector_2d) {
      if (vector_2d.constructor.name == "Vec2D") {
         return vector_2d;
      } else {
         return new Vec2D( vector_2d.x, vector_2d.y);
      }
   }
   
   
   
   function pointInRectangle( p_2d, rect) {
      // UL: upper left corner, LR: lower right corner.
      if ( (p_2d.x > rect.UL_2d.x) && (p_2d.x < rect.LR_2d.x) && (p_2d.y > rect.UL_2d.y) && (p_2d.y < rect.LR_2d.y) ) {
         return true;
      } else {
         return false;
      }
   }    
   function pointInCanvas( canvas, p_2d_px) {
      var theRectangle = { 'UL_2d':{'x':0,'y':0}, 'LR_2d':{'x':canvas.width,'y':canvas.height} };
      return pointInRectangle( p_2d_px, theRectangle);
   }
   

   
   return {
      // Objects
      'Vec2D': Vec2D,
      
      // Variables
      
      // Methods
      'meters_from_px': meters_from_px,
      'px_from_meters': px_from_meters,
      'screenFromWorld': screenFromWorld,
      'worldFromScreen': worldFromScreen,
      'screenFromRaw_2d_px': screenFromRaw_2d_px,
      'mouseOverElement': mouseOverElement,
      'exitFineMoves': exitFineMoves,
      'fineMoves': fineMoves,
      'Vec2D_from_b2Vec2': Vec2D_from_b2Vec2,
      'b2Vec2_from_Vec2D': b2Vec2_from_Vec2D,
      'Vec2D_check': Vec2D_check,
      'pointInCanvas': pointInCanvas,
      
   };

})();