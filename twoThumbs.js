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

// Two Thumbs (twoThumbs) module
// twoThumbs.js
   console.log('twoThumbs _*-*_');
// 7:02 PM Fri September 1, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.twoThumbs = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_enabled = false;
   
   // module globals for things passed in by reference in initializeModule
   var m_clientCanvas_tt, m_ctx_tt, m_videoMirror, m_mK, m_cl_clientSide;
   
   var m_bgColor = 'lightgray';
   var m_gridColor = '#232323'; // very dark gray // #008080 dark green
   
   // Grid of rectangles. UL (upper left corner), LR (lower right)
   var m_grid = {
      'jet_360':     {'active':false , 'mK_key':'w',   'statusDotColor':m_gridColor, 'dir_2d':null},
      'gun_360':     {'active':false , 'mK_key':'i',   'statusDotColor':m_gridColor, 'dir_2d':null},
      'shield':      {'active':false , 'mK_key':'sp'},
      'clientInfo':  {'active':false , 'mK_key':'cl'},
      
      'alt':         {'active':false , 'mK_key':null},
      
      // Controls that are dependent on the alt rectangle being touched.
      'esc':         {'active':false , 'mK_key':null,  'sleeping':true },
      'demo7':       {'active':false , 'mK_key':'7',   'sleeping':true },
      'demo8':       {'active':false , 'mK_key':'8',   'sleeping':true },
      'freeze':      {'active':false , 'mK_key':'f',   'sleeping':true },
      
      // Secondary control that fires the gun. Changes angle by controlling the rotation rate.
      'gun_scope':   {'active':false , 'mK_key':'ScTr', 'x_fraction':0}
   };
   
   // the positions of vertical and horizontal lines for the grid
   var m_vert = {};
   var m_horz = {};
         
   // This is the same for both the jet and the gun.
   var m_statusDotRadius_fraction =  0.020;
   var m_statusDotRadius_px = null;
   
   // Control radius in units of screen fraction. The jet has four
   // strength levels: <1, >1 && <2, >2 && <3, >3.
   m_grid['jet_360'].cRadius_1_f = 0.050;  //0.090
   m_grid['jet_360'].cRadius_2_f = 0.090;  //0.130
   m_grid['jet_360'].cRadius_3_f = 0.130;  //0.170
   
   var m_jetRadiusColor_3 = "rgb(255,   0,   0)";
   var m_jetRadiusColor_2 = "rgb(200,   0,   0)";
   var m_jetRadiusColor_1 = "rgb(140,   0,   0)";
   var m_jetRadiusColor_0 = "rgb( 50,   0,   0)";
   
   // The gun has zero level, for bluffing. All touches outside that ring
   // are for firing.
   m_grid['gun_360'].cRadius_0_f = 0.040; //0.060
   
   var m_gunRadiusColor_0 = "rgb(255,   0,   0)";
   
   // 0.10 uses 10% of the rectangle width for the dead spot.
   var m_scopeShootSpot = 0.20;
   
   var m_puckPopped = true;
   
   var m_myRequest = null;
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( clientCanvas_tt, ctx_tt, videoMirror, mK, cl_clientSide) {
      
      m_clientCanvas_tt = clientCanvas_tt;
      m_ctx_tt = ctx_tt;
      m_videoMirror = videoMirror;
      m_mK = mK;
      m_cl_clientSide = cl_clientSide;
      
      m_clientCanvas_tt.style.borderColor = m_gridColor;
      initializeTouchGrid();
   }

   // Calculate point position in canvas coordinates as a function of fractional position.
   function absPos_x_px( fraction) {
      return Math.round(fraction * m_clientCanvas_tt.width);
   }
   
   function absPos_y_px( fraction) {
      return Math.round(fraction * m_clientCanvas_tt.height);
   }
   
   function resetRectangle( rectName) {
      // Update the target rectangle to reflect that there is no touch point in it.
      var rect = m_grid[ rectName];
         
      if (rectName == 'alt') {
         setSleeping( true);
      
      } else if (rectName == 'jet_360') {
         m_mK.jet_d = null; // jet angle in degrees
         
      } else if (rectName == 'gun_360') {
         m_mK.gun_d = null; // gun angle in degrees
         
      } else if (rectName == 'gun_scope') {
         // Deactivate the regular gun rectangle before you deactivate the scope.
         if (m_grid['gun_scope'].active) m_grid['gun_360'].active = false;
         // Scope Rotation Rate Fraction (ScRrf).
         m_mK.ScRrf = 0.00;
      }
         
      // For the rectangle named in the call: deactivate the rect and reset the associated mK attribute.
      rect.active = false;
      if (rect.mK_key) m_mK[rect.mK_key] = 'U';
   }
   
   function processMultiTouch( touchVectors_2d_px) {
      // This get called by handleMouseOrTouchMove in the eventsNonHost module.
      // This calls processPointInRectangle which updates m_mK (shared with eventsNonHost). 
      
      for (var rectName in m_grid) {
         var rect = m_grid[ rectName];
         
         var atLeastOnePointInRect = false;
         for (var i = 0, len = touchVectors_2d_px.length; i < len; i++) {
            var p_2d = touchVectors_2d_px[i];
            
            if ( (p_2d.x > rect.UL.x) && (p_2d.x < rect.LR.x) && (p_2d.y > rect.UL.y) && (p_2d.y < rect.LR.y) ) {
               processPointInRectangle( rectName, p_2d);
               atLeastOnePointInRect = true;
               break;
            }
         }
         // If no touch point in this rectangle. This is needed for when you drag a finger
         // from one rectangle to another without triggering a touchrelease event.
         if ( ! atLeastOnePointInRect) {
            resetRectangle( rectName);
         }
      }
      eVN.handle_sending_mK_data( m_mK);
   }
   
   function setSleeping( value) {
      m_grid['esc'].sleeping = value;
      m_grid['demo7'].sleeping = value;
      m_grid['demo8'].sleeping = value;
      m_grid['freeze'].sleeping = value;
   }
   
   function processSingleTouchRelease( touchVector_2d_px) {
      for (var rectName in m_grid) {
         var rect = m_grid[ rectName];
         var p_2d = touchVector_2d_px;
         if ( (p_2d.x > rect.UL.x) && (p_2d.x < rect.LR.x) && (p_2d.y > rect.UL.y) && (p_2d.y < rect.LR.y) ) {
            
            resetRectangle( rectName);
            
            // When you release the alt rectangle, show as sleeping (not listening),
            // those rectangles that are dependent on the alt rectangle.
            if (rectName == 'alt') {
               setSleeping( true);
            }
            break;
         }
      }
   }
   
   function processGunAngleFromHost( data) {
      // Update the orientation vector
      var rect = m_grid['gun_360'];
      rect.dir_2d.set_angle( -data['gunAngle']);
      rect.endPoint_2d = rect.center_2d.add( rect.dir_2d);
      rect.statusDotColor = m_gridColor;
   }
   function processJetAngleFromHost( data) {
      // Update the orientation vector
      var rect = m_grid['jet_360'];
      // (also see processPointInRectangle)
      rect.dir_2d.set_angle(180 - data['jetAngle']);
      rect.endPoint_2d = rect.center_2d.subtract( rect.dir_2d);
      rect.statusDotColor = m_gridColor;
   }
   
   function drawFatFingerHelper( rectName) {
      let rect = m_grid[ rectName];
      let rectWidth_px = (rect.LR.x - rect.UL.x);
      let arcRadius_px = (rectWidth_px / 2) - 5;
      
      // the arc (eyebrow)
      let fillColor = (rectName == "freeze") ? "red" : "green";
      m_ctx_tt.fillStyle = fillColor;
      m_ctx_tt.beginPath();
      m_ctx_tt.arc( rect.center_2d.x, rect.UL.y + 10, arcRadius_px, 1.1 * Math.PI, 1.9 * Math.PI, false);
      m_ctx_tt.fill();
   }
   
   function drawRectIndicators( rectName) {
      var rect = m_grid[ rectName];
         
      // Draw an arc above these small rectangles to give better feedback of a successful touch.
      if (['demo7','demo8','freeze'].includes( rectName)) {
         if (rect.active && m_grid['alt'].active) {
            drawFatFingerHelper( rectName);
         }
      }
      
      // Draw gun-scope rotation rate indicator (it's kind of a rectangular status dot, sort of..)
      if (rectName == 'gun_scope') {
         let barColor;
         
         // background rectangle
         var upperLeft_2d_px = rect.center_2d.subtract( new wS.Vec2D(m_statusDotRadius_px, m_statusDotRadius_px));
         if (rect.active) {
            barColor = (Math.abs(rect.x_fraction) > m_scopeShootSpot) ? 'yellow' : 'red';
         } else {
            barColor = m_gridColor;
         }
         dF.fillRectangle( m_ctx_tt, upperLeft_2d_px, {'width_px':m_statusDotRadius_px * 2, 'height_px':m_statusDotRadius_px * 1, 'fillColor':barColor});   
      
         // draw a thick line (bar) to indicate the rate of rotation
         if (Math.abs(rect.x_fraction) > m_scopeShootSpot) {
            var rotIndicator_start_2d = rect.center_2d.add( new wS.Vec2D(0,                                      -m_statusDotRadius_px * 0.5));
            var rotIndicator_end_2d   = rect.center_2d.add( new wS.Vec2D(m_statusDotRadius_px * rect.x_fraction, -m_statusDotRadius_px * 0.5));
            dF.drawLine( m_ctx_tt, rotIndicator_start_2d, rotIndicator_end_2d, {'width_px':m_statusDotRadius_px * 0.5, 'color':'black'} );
         }
      
      } else if (rectName == 'clientInfo') {
         drawClientRect();
      
      // Draw the status dot
      } else {
         let dotColor;
         if (rect.active) {
            if (['jet_360','gun_360'].includes( rectName)) {
               dotColor = rect.statusDotColor;
            } else if (['esc','demo7','demo8','freeze'].includes( rectName)) {
               dotColor = (rect.sleeping) ? m_bgColor : 'yellow';
            } else {
               dotColor = 'yellow';
            }
         } else if ( ! rect.active) {
            if (rect.sleeping) {
               dotColor = m_bgColor;
            } else {
               dotColor = m_gridColor;
            }
         }
         
         dF.drawCircle( m_ctx_tt, rect.center_2d, {'radius_px':m_statusDotRadius_px, 'fillColor':dotColor} );
         
         // extra features drawn over the dot
         if (['jet_360','gun_360'].includes( rectName)) {
            // Draw the direction line.
            dF.drawLine( m_ctx_tt, rect.center_2d, rect.endPoint_2d, {'width_px':3, 'color':'white'} );
            
            // Draw nosecone
            if (rectName == 'jet_360') {
               var nose_cone_2d = rect.center_2d.add( rect.dir_2d.scaleBy(0.75));
               dF.drawCircle( m_ctx_tt, nose_cone_2d, {'fillColor': 'white', 'radius_px':absPos_x_px(0.005)} );
            }
         }
      }
   }
   
   function processPointInRectangle( rectName, point_2d) {
      var rect = m_grid[ rectName];
      
      var relativeToCenter_2d = point_2d.subtract( rect.center_2d);
      
      if (rectName == 'jet_360' || rectName == 'gun_360') {
         var rTC_lengthSquared = relativeToCenter_2d.length_squared();
         // Orient dir_2d to match the direction of relativeToCenter_2d
         // Note the negative sign correction (on the angle result) is necessary because of the 
         // negative orientation of the y axis with the screen (pixels) representation (not world here).
         var angle_d = -rect.dir_2d.matchAngle( relativeToCenter_2d);
         
         if (rectName == 'jet_360') {
            // Orient the tube in the opposite direction from the touch point.
            rect.endPoint_2d = rect.center_2d.subtract( rect.dir_2d);
            
            // Check where the point is relative to the control rings.
            // Always use at least the minimum jet power.
            rect.statusDotColor = m_jetRadiusColor_0;
            m_mK.jet_t = 0.1; // Jet throttle
            
            // Stronger jet
            if (rTC_lengthSquared > Math.pow(m_grid['jet_360'].cRadius_1_px, 2)) {
               rect.statusDotColor = m_jetRadiusColor_1;
               m_mK.jet_t = 0.4; 
               
               // Even stronger jet
               if (rTC_lengthSquared > Math.pow(m_grid['jet_360'].cRadius_2_px, 2)) {
                  rect.statusDotColor = m_jetRadiusColor_2;
                  m_mK.jet_t = 0.7; 
                  
                  // Even stronger jet
                  if (rTC_lengthSquared > Math.pow(m_grid['jet_360'].cRadius_3_px, 2)) {
                     rect.statusDotColor = m_jetRadiusColor_3;
                     m_mK.jet_t = 1.0;
                  }                  
               }
            }
            // Update mK for sending to the host.
            m_mK.w = 'D';
            m_mK.jet_d = angle_d + 180; // Use 180 to aim the nose cone; 0 to aim the jet tube
            
         } else if (rectName == 'gun_360') {
            // Orient the tube in the same direction from the touch point.
            rect.endPoint_2d = rect.center_2d.add( rect.dir_2d);
            
            // Check is the point is outside the control ring...
            if (rTC_lengthSquared > Math.pow(m_grid['gun_360'].cRadius_0_px, 2)) {
               rect.statusDotColor = m_gunRadiusColor_0;
               m_mK.i = 'D';
            } else {
               rect.statusDotColor = m_gridColor;
               m_mK.i = 'U';
            }
            // Update mK for sending to the host.
            m_mK.gun_d = angle_d;
         }
        
      } else if (rectName == 'shield') {
         if (rect.mK_key) m_mK[rect.mK_key] = 'D';
         
      } else if (rectName == 'clientInfo') {
         //               m_mK.cl = 'D'
         if (rect.mK_key) m_mK[rect.mK_key] = 'D';
         
      } else if (rectName == 'gun_scope') {
         // Rotation rate fraction (Rrf) for the scope control (Sc), where x_fraction varies 
         // from -1 to +1;
         rect.x_fraction = relativeToCenter_2d.x / ((rect.LR.x - rect.UL.x)/2.0);
         var x_fraction_abs = Math.abs( rect.x_fraction);
         if (x_fraction_abs > 0) {
            var x_fraction_sign = rect.x_fraction / x_fraction_abs;
         } else {
            var x_fraction_sign = 1.0;
         }
         
         // Shooting spot in the middle where it will only shoot, not rotate.
         if (x_fraction_abs < m_scopeShootSpot) {
            var x_fraction_mapped = 0.00;
            m_mK[rect.mK_key] = 'D';
            m_grid['gun_360'].active = true;
            m_grid['gun_360'].statusDotColor = 'red';
         
         // The outer areas will only rotate, not shoot.
         } else {
            // Map the x_fraction value so that near the edge of the dead zone, the rate is small. At the
            // outer edge of the rectangle, the rate is 1.0 times the normal keyboard rotation rate.
            var x_fraction_mapped = x_fraction_sign * (x_fraction_abs - m_scopeShootSpot - 0.01) * 1.0;
            m_mK[rect.mK_key] = 'U';
         }
         // Scope Rotation Rate Fraction (ScRrf)
         m_mK['ScRrf'] = x_fraction_mapped.toFixed(2);
         
      } else if (rectName == 'alt') {
         // Show the alt-dependent rectangles as awake (ready to receive a touch). 
         setSleeping( false);
         
      // Must use the alt button to wake up these sleepy ones:
      } else if (m_grid['alt'].active && (['esc','demo7','demo8','freeze'].includes( rectName)) && ( ! rect.sleeping) ) {
         if (rectName =='esc') {
            m_clientCanvas_tt.width  = m_videoMirror.width;
            m_clientCanvas_tt.height = m_videoMirror.height;
            // Note: the alt and esc rectangles get "released" in this call to changeDisplay.
            changeDisplay('exit');
            return;
         }
         if (rect.mK_key) m_mK[rect.mK_key] = 'D';
      }
      
      // No matter what, set this rectangle to be active.
      rect.active = true;
   }
   
   // Draw the rectangle that indicates the client's puck status and client color.
   function drawClientRect() {  
      // Draw the square a little smaller than the actual rectangle.
      // Fill color should be background when touched, client color when released.
      var shrink_px = 8;
      var ULx = m_grid['clientInfo'].UL.x + shrink_px;
      var ULy = m_grid['clientInfo'].UL.y + shrink_px;
      var LRx = m_grid['clientInfo'].LR.x - shrink_px;
      var LRy = m_grid['clientInfo'].LR.y - shrink_px;
      
      var width_px = LRx - ULx;
      var height_px = LRy - ULy;
      
      // When touched, use background color. Kind of like some of the color is being pushed over the network
      // for use in the help-find-me circle.
      m_ctx_tt.fillStyle = (m_grid['clientInfo'].active) ? m_bgColor : hC.clientColor( m_cl_clientSide.name);
      m_ctx_tt.fillRect(ULx, ULy, width_px, height_px);
      
      // When touched, draw large client-colored circle over background colored square. This appears similar to the large help-find-me circle on the host.
      if (m_grid['clientInfo'].active && ( ! m_puckPopped)) {
         dF.drawCircle( m_ctx_tt, m_grid['clientInfo'].center_2d, 
            {'radius_px':m_statusDotRadius_px * 2.0, 'fillColor':hC.clientColor( m_cl_clientSide.name)} );    //2.5 old value before Pixel 4a 5G
      }
      
      // Active or not, add a black-dot circle to indicate that you still have a puck to drive.
      if ( ! m_puckPopped) {
         dF.drawCircle( m_ctx_tt, m_grid['clientInfo'].center_2d, {'radius_px':m_statusDotRadius_px, 'fillColor':m_gridColor} );
      }
   }
   
   function scaledFont( fontInt) {
      var myFudge = 1.5;
      var scaledFontValue = myFudge * fontInt * (window.innerWidth * window.devicePixelRatio / 1920);
      return scaledFontValue.toFixed(1) + "px Arial";
   }
   
   function initializeTouchGrid() {      
      m_statusDotRadius_px = absPos_x_px( m_statusDotRadius_fraction);
      
      m_grid['jet_360'].cRadius_1_px = absPos_x_px(m_grid['jet_360'].cRadius_1_f);
      m_grid['jet_360'].cRadius_2_px = absPos_x_px(m_grid['jet_360'].cRadius_2_f);
      m_grid['jet_360'].cRadius_3_px = absPos_x_px(m_grid['jet_360'].cRadius_3_f);
      
      m_grid['gun_360'].cRadius_0_px = absPos_x_px(m_grid['gun_360'].cRadius_0_f);
      
      // x position of the vertical lines (from left to right).
      m_vert.x0  = absPos_x_px( 0.00);
      m_vert.x0a = absPos_x_px( 0.10);
      m_vert.x0b = absPos_x_px( 0.20);
      m_vert.x0c = absPos_x_px( 0.30);
      m_vert.x0d = absPos_x_px( 0.315);
      m_vert.x0e = absPos_x_px( 0.455);
      
      m_vert.x1 = absPos_x_px( 0.47);
      m_vert.x2 = absPos_x_px( 0.60);    
      m_vert.x3 = absPos_x_px( 1.00);
      // Center +/- the half width of the scope spot.
      m_vert.x2a = (m_vert.x3 + m_vert.x2)/2.0 - ((m_vert.x3-m_vert.x2) * m_scopeShootSpot/2.0);
      m_vert.x2b = (m_vert.x3 + m_vert.x2)/2.0 + ((m_vert.x3-m_vert.x2) * m_scopeShootSpot/2.0);
      
      // y position of the horizontal lines (from top to bottom).
      m_horz.y0  = absPos_y_px( 0.00);
      m_horz.y0a = absPos_y_px( 0.65);
      m_horz.y0b = absPos_y_px( 0.85);
      m_horz.y1  = absPos_y_px( 0.90);
      m_horz.y2  = absPos_y_px( 1.00);
      
      // Define all the rectangles in the grid. UL: upper left, LR: lower right.
      m_grid['jet_360'].UL = new wS.Vec2D(m_vert.x0, m_horz.y0);
      m_grid['jet_360'].LR = new wS.Vec2D(m_vert.x1, m_horz.y1);
      m_grid['jet_360'].dir_2d = new wS.Vec2D(0, -m_statusDotRadius_px); // as if touch point is high
         
      m_grid['gun_360'].UL = new wS.Vec2D(m_vert.x2, m_horz.y0);
      m_grid['gun_360'].LR = new wS.Vec2D(m_vert.x3, m_horz.y0b);
      m_grid['gun_360'].dir_2d = new wS.Vec2D(0, -m_statusDotRadius_px); // as if touch point is high
      
      m_grid['shield'].UL = new wS.Vec2D(m_vert.x1, m_horz.y0);
      m_grid['shield'].LR = new wS.Vec2D(m_vert.x2, m_horz.y0a);
      
      m_grid['clientInfo'].UL = new wS.Vec2D(m_vert.x1, m_horz.y0a);
      m_grid['clientInfo'].LR = new wS.Vec2D(m_vert.x2, m_horz.y0b);
      
      m_grid['freeze'].UL = new wS.Vec2D(m_vert.x0, m_horz.y1);
      m_grid['freeze'].LR = new wS.Vec2D(m_vert.x0a, m_horz.y2);
      
      m_grid['demo7'].UL = new wS.Vec2D(m_vert.x0a, m_horz.y1);
      m_grid['demo7'].LR = new wS.Vec2D(m_vert.x0b, m_horz.y2);
      
      m_grid['demo8'].UL = new wS.Vec2D(m_vert.x0b, m_horz.y1);
      m_grid['demo8'].LR = new wS.Vec2D(m_vert.x0c, m_horz.y2);
      
      m_grid['esc'].UL = new wS.Vec2D(m_vert.x0d, m_horz.y1);
      m_grid['esc'].LR = new wS.Vec2D(m_vert.x0e, m_horz.y2);
      
      m_grid['alt'].UL = new wS.Vec2D(m_vert.x1, m_horz.y1);
      m_grid['alt'].LR = new wS.Vec2D(m_vert.x2, m_horz.y2);
         
      m_grid['gun_scope'].UL = new wS.Vec2D(m_vert.x2, m_horz.y0b);
      m_grid['gun_scope'].LR = new wS.Vec2D(m_vert.x3, m_horz.y2);
      
      // Calculate the center point of each rectangle.
      for (var rectName in m_grid) {
         var rect = m_grid[ rectName];
         rect.center_2d = rect.UL.add( rect.LR).scaleBy(1.0/2.0);
         if ((rectName == "jet_360") || (rectName == "gun_360")) {
            // endPoint calculations for jet and gun
            if (rectName == 'jet_360') {
               // This endPoint calc will orient the jet tube in the opposite direction from the initial direction of dir_2d.
               rect.endPoint_2d = rect.center_2d.subtract( rect.dir_2d);
            } else if (rectName == 'gun_360') {
               // Orient gun tube in same direction as dir_2d
               rect.endPoint_2d = rect.center_2d.add( rect.dir_2d);
            }
         }
      }
   }
   
   function drawGridAndIndicators() { 
      // Clear off the screen.
      m_ctx_tt.fillStyle = m_bgColor;
      m_ctx_tt.fillRect(0,0, m_clientCanvas_tt.width, m_clientCanvas_tt.height);
         
      // Draw grid...
      // Vertical lines
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0a, m_horz.y1), new wS.Vec2D(m_vert.x0a, m_horz.y2), {'width_px':3, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0b, m_horz.y1), new wS.Vec2D(m_vert.x0b, m_horz.y2), {'width_px':3, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0c, m_horz.y1), new wS.Vec2D(m_vert.x0c, m_horz.y2), {'width_px':3, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0d, m_horz.y1), new wS.Vec2D(m_vert.x0d, m_horz.y2), {'width_px':3, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0e, m_horz.y1), new wS.Vec2D(m_vert.x0e, m_horz.y2), {'width_px':3, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x1, m_horz.y0),  new wS.Vec2D(m_vert.x1, m_horz.y2),  {'width_px':5, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x2, m_horz.y0),  new wS.Vec2D(m_vert.x2, m_horz.y2),  {'width_px':5, 'color':m_gridColor});
      
      // Vertical lines in the scope rectangle
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x2a, m_horz.y0b), new wS.Vec2D(m_vert.x2a, m_horz.y2), {'width_px':1, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x2b, m_horz.y0b), new wS.Vec2D(m_vert.x2b, m_horz.y2), {'width_px':1, 'color':m_gridColor});
      
      // Draw the vertical gradient lines in the scope rectangle.
      var width_px = m_vert.x2a - m_vert.x2;
      var step_px = Math.round(width_px/10.0);
      var length_px = Math.round((m_horz.y2 - m_horz.y0b)/3.0);
      for (var i = step_px; i < width_px; i += step_px) {
         dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x2 + i, m_horz.y2-length_px), new wS.Vec2D(m_vert.x2 + i, m_horz.y2), {'width_px':1, 'color':m_gridColor});
         dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x3 - i, m_horz.y2-length_px), new wS.Vec2D(m_vert.x3 - i, m_horz.y2), {'width_px':1, 'color':m_gridColor});
         step_px *= 0.91; // reduce the step
         if (step_px < 1) step_px = 1;
      }
      
      // Horizontal lines
      // First two run only the width of the shield rectangle.
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x1, m_horz.y0a), new wS.Vec2D(m_vert.x2, m_horz.y0a), {'width_px':5, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x1, m_horz.y0b), new wS.Vec2D(m_vert.x2, m_horz.y0b), {'width_px':5, 'color':m_gridColor});
      // The next pair do the main bottom line: second segment is at a higher y level for the scope rectangle.
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0, m_horz.y1),  new wS.Vec2D(m_vert.x2, m_horz.y1),  {'width_px':5, 'color':m_gridColor});
      dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x2, m_horz.y0b), new wS.Vec2D(m_vert.x3, m_horz.y0b), {'width_px':5, 'color':m_gridColor});
      
      // Status dots and more...
      drawRectIndicators('jet_360');
      drawRectIndicators('gun_360');
      drawRectIndicators('shield');
      drawRectIndicators('clientInfo');
      drawRectIndicators('gun_scope');
      
      drawRectIndicators('alt');
      drawRectIndicators('esc');
      drawRectIndicators('demo7');
      drawRectIndicators('demo8');
      drawRectIndicators('freeze');
      
      // Control ring
      dF.drawCircle( m_ctx_tt, m_grid['jet_360'].center_2d, 
         {'fillColor':'noFill', 'radius_px':m_grid['jet_360'].cRadius_1_px, 'borderWidth_px':3, 'borderColor':m_jetRadiusColor_1} );
      dF.drawCircle( m_ctx_tt, m_grid['jet_360'].center_2d, 
         {'fillColor':'noFill', 'radius_px':m_grid['jet_360'].cRadius_2_px, 'borderWidth_px':3, 'borderColor':m_jetRadiusColor_2} );
      dF.drawCircle( m_ctx_tt, m_grid['jet_360'].center_2d, 
         {'fillColor':'noFill', 'radius_px':m_grid['jet_360'].cRadius_3_px, 'borderWidth_px':3, 'borderColor':m_jetRadiusColor_3} );
      
      dF.drawCircle( m_ctx_tt, m_grid['gun_360'].center_2d,
         {'fillColor':'noFill', 'radius_px':m_grid['gun_360'].cRadius_0_px, 'borderWidth_px':3, 'borderColor':m_gunRadiusColor_0} );
      
      /*
      // Draw some test lines for use in positioning text on the grid (1% by 1% grid cells).
      for (var i = 0; i < 100; i++) {
         // Vertical lines in 1% steps of x range.
         var x_test_px = m_vert.x0 + absPos_x_px( i * 0.01);
         dF.drawLine( m_ctx_tt, new wS.Vec2D(x_test_px, m_horz.y0), new wS.Vec2D(x_test_px, m_horz.y2), {'width_px':1, 'color':m_gridColor});
         
         // Horizontal lines in 1% steps of y range (remember y increased going down the screen)
         var y_test_px = m_horz.y0 + absPos_y_px( i * 0.01);
         dF.drawLine( m_ctx_tt, new wS.Vec2D(m_vert.x0, y_test_px), new wS.Vec2D(m_vert.x3, y_test_px), {'width_px':1, 'color':m_gridColor});
      }
      */
      
      // Text labels
      m_ctx_tt.font = scaledFont(25); //25px Arial
      m_ctx_tt.fillStyle = m_gridColor;
      
      // Set the location on this text using fractional positions. These x,y coordinates specify the position of the lower left corner of the text string.
      m_ctx_tt.fillText('jet',     m_grid['jet_360'].UL.x   + absPos_x_px(0.020),  m_grid['jet_360'].UL.y   + absPos_y_px( 0.06));
      m_ctx_tt.fillText('shooter', m_grid['gun_360'].UL.x   + absPos_x_px(0.020),  m_grid['gun_360'].UL.y   + absPos_y_px( 0.06));
      m_ctx_tt.fillText('scope',   m_grid['gun_scope'].UL.x + absPos_x_px(0.020),  m_grid['gun_scope'].UL.y - absPos_y_px( 0.03));
      
      m_ctx_tt.fillText('shield',  m_grid['shield'].UL.x    + absPos_x_px(0.022),  m_grid['shield'].UL.y    + absPos_y_px( 0.06));
      
      m_ctx_tt.font = scaledFont(20); //20px Arial
      m_ctx_tt.fillText('7',       m_grid['demo7'].UL.x     + absPos_x_px(0.005),  m_grid['demo7'].UL.y     + absPos_y_px( 0.05));
      m_ctx_tt.fillText('8',       m_grid['demo8'].UL.x     + absPos_x_px(0.005),  m_grid['demo8'].UL.y     + absPos_y_px( 0.05));
      m_ctx_tt.fillText('f',       m_grid['freeze'].UL.x    + absPos_x_px(0.085),  m_grid['freeze'].UL.y    + absPos_y_px( 0.05));  //0.005 aligned to the left...
      
      m_ctx_tt.font = scaledFont(19); //19px Arial
      m_ctx_tt.fillText('esc',     m_grid['esc'].UL.x       + absPos_x_px(0.005),  m_grid['esc'].UL.y       + absPos_y_px( 0.05));
      m_ctx_tt.fillText('alt',     m_grid['alt'].UL.x       + absPos_x_px(0.005),  m_grid['alt'].UL.y       + absPos_y_px( 0.05));
      m_ctx_tt.fillText('ccw',     m_vert.x2a               - absPos_x_px(0.052),  m_grid['gun_scope'].UL.y + absPos_y_px( 0.070));
      m_ctx_tt.fillText('cw',      m_vert.x2b               + absPos_x_px(0.009),  m_grid['gun_scope'].UL.y + absPos_y_px( 0.070));
   }
   
   // Function supporting full-screen display mode
   function changeDisplay( mode) {
      if ((mode == 'fullScreen') || (mode == 'normal')) {
         
         if (window.innerWidth < window.innerHeight) {
            var orientationMessage = "The Two-Thumbs client requests that your phone be oriented for landscape viewing. Please turn it sideways, then try touching the Two-Thumbs button again."
            alert( orientationMessage);
            displayMessage( orientationMessage);
            return;
         }
         
         m_enabled = true;
         hC.sendSocketControlMessage( {'from':m_cl_clientSide.name, 'to':'host', 'data':{'twoThumbsEnabled':{'value':true}} } );
         
         // If there's a stream active, shut it down.
         if (hC.dC.chkRequestStream.checked) {
            hC.dC.chkRequestStream.click();
         }
         // Reveal the twoThumbs canvas.
         m_clientCanvas_tt.removeAttribute("hidden");
         // Hide the video streaming element.
         m_videoMirror.setAttribute("hidden", null);

         if (mode == 'fullScreen') {
            var dpr = window.devicePixelRatio;
            //console.log('dpr='+dpr);
            // write to chat area
            //displayMessage('dpr1='+dpr); // for android debugging...
            
            eVN.changeFullScreenMode( m_clientCanvas_tt, 'on');
            
            if (dpr <= 1.25) {
               var scalingFactor = 1.0; // my laptop
            } else if ((dpr > 1.25) && (dpr <= 2.6)) {
               var scalingFactor = dpr * 0.6; // my moto 0.6
            } else if (dpr > 2.6) {
               var scalingFactor = dpr * 0.7; // my Pixel 4a 5G
            }
            
            // A larger delay is needed with FireFox. Some delay is also needed with
            // Chrome on Android. Both seem to work fine at 600ms. So for now...
            var userAgent = window.navigator.userAgent;
            if (userAgent.includes("Firefox")) {
               var waitForFullScreen = 500;
               console.log("firefox detected");
            } else {
               var waitForFullScreen = 500; // 600
            }
         
            // Delay (to wait for fullscreen change to finish) is needed.
            window.setTimeout(function() {
               m_clientCanvas_tt.width  = window.innerWidth  * scalingFactor;
               m_clientCanvas_tt.height = window.innerHeight * scalingFactor; 
               /*
               // Tried the following, similar to improveCanvasResolution in demoStart.js. This
               // renders a zoomed display (not good) on android and normal (correct) fullscreen display on pc.
               m_clientCanvas_tt.style.width = window.innerWidth + "px";
               m_clientCanvas_tt.style.height = window.innerHeight + "px";
               m_ctx_tt.scale( scalingFactor, scalingFactor);
               */
            }, waitForFullScreen);
            
            // Wait until a little after the canvas-resize delay above.
            window.setTimeout(function() {
               initializeTouchGrid();
               
               // Check with the host to see if there is a puck for this client. (Note, of course, that gW.clients of the hosts browser window is
               // not accessible here in the client window.) This will also sync the angles of the jet and gun tubes on the client.
               //hC.sendSocketControlMessage( {'from':m_cl_clientSide.name, 'to':'host', 'data':{'puckPopped':{'value':'probeAtHost'}} } );
               hC.sendSocketControlMessage( {'from':m_cl_clientSide.name, 'to':'host', 'data':{'puckPopped':{'value':'probeAtHost'}} } );
               
            }, waitForFullScreen + 50); // 100
            
            // Wait even longer, then start the loop.
            window.setTimeout(function() {
               startAnimation();
            }, waitForFullScreen + 100); // 200
         
         // used in testing
         } else if (mode == 'normal') {
            initializeTouchGrid();
            drawGridAndIndicators();
         }
         
      } else if (mode == 'exit') {
         if (document.fullscreenElement) eVN.changeFullScreenMode( m_clientCanvas_tt, 'off');
         
         // De-activate the two rectangles that may have gotten you in here (remember, you didn't have to lift
         // your fingers). This effectively resets these rectangles (like releasing your touch).
         m_grid['esc'].active = false;
         m_grid['alt'].active = false;
         // And, since the alt key was used, put the sleepers back to sleep.
         setSleeping( true);
         
         hC.dC.chkTwoThumbs.checked = false;
         m_enabled = false;
         hC.sendSocketControlMessage( {'from':m_cl_clientSide.name, 'to':'host', 'data':{'twoThumbsEnabled':{'value':false}} } );
         eVN.initialize_mK(); // clear out the TT parameters like thrust, as you shift back to keyboard play.
         
         stopAnimation();
         
         // Clear off the screen.
         m_ctx_tt.fillStyle = 'black'; // m_bgColor
         m_ctx_tt.fillRect(0,0, m_clientCanvas_tt.width, m_clientCanvas_tt.height);
         
         // Reveal the video element.
         if (hC.getClientDeviceType() == "desktop") m_videoMirror.removeAttribute("hidden");
         // Hide the two thumbs canvas.
         m_clientCanvas_tt.setAttribute("hidden", null);
      }
   }

   ////////////////////////////////////////////////////////////////////////////////
   // Functions supporting canvas animation
   ////////////////////////////////////////////////////////////////////////////////
   
   function canvasLoop( timeStamp_ms) {
      updateCanvas();
      m_myRequest = window.requestAnimationFrame( canvasLoop);
   }
   function updateCanvas() {      
      drawGridAndIndicators();
   }
   function startAnimation() {
      // Only start a game loop if there is no game loop running.
      if (m_myRequest === null) {
         // Start the canvas loop.
         m_myRequest = window.requestAnimationFrame( canvasLoop);
      }
   }
   function stopAnimation() {
      window.cancelAnimationFrame( m_myRequest);
      m_myRequest = null;
   }

   // see comments before the "return" section of gwModule.js
   return {
      // Variables
      'setPuckPopped': function( val) { m_puckPopped = val; },
      'getEnabled': function() { return m_enabled; },
      'setEnabled': function( val) { m_enabled = val; },
      
      // Methods
      'initializeModule': initializeModule,
      'processGunAngleFromHost': processGunAngleFromHost,
      'processJetAngleFromHost': processJetAngleFromHost,
      'processMultiTouch': processMultiTouch,
      'processSingleTouchRelease': processSingleTouchRelease,
      'changeDisplay': changeDisplay,

   };

})();