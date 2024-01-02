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

// Drawing Functions Module (dFM) module
// drawFunc.js 
   console.log('dFM _*-*_');
// 4:37 PM Sun August 13, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.dFM = (function() {
   "use strict";
   
   // module globals for objects brought in by initializeModule
   // (nothing yet)
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      // (nothing yet)
   }

   function DrawingFunctions(){
      // High-level functions for drawing to the canvas element
   }
   DrawingFunctions.prototype.drawLine = function( drawingContext, p1_2d_px, p2_2d_px, pars) {
      drawingContext.strokeStyle = uT.setDefault( pars.color, 'white');
      drawingContext.lineWidth = uT.setDefault( pars.width_px, 2);
      var dashArray = uT.setDefault( pars.dashArray, [0]);
      var alpha = uT.setDefault( pars.alpha, 1.0);
      var lineCap = uT.setDefault( pars.lineCap, 'butt');
      
      drawingContext.globalAlpha = alpha;
      drawingContext.setLineDash( dashArray);
      drawingContext.lineCap = lineCap;
      
      drawingContext.beginPath();
      
      drawingContext.moveTo(p1_2d_px.x, p1_2d_px.y);
      drawingContext.lineTo(p2_2d_px.x, p2_2d_px.y);
      
      drawingContext.stroke();
      drawingContext.globalAlpha = 1.0;
      drawingContext.lineCap = 'butt';
   }
   DrawingFunctions.prototype.drawCircle = function( drawingContext, center_2d_px, pars) {
      drawingContext.strokeStyle = uT.setDefault( pars.borderColor, 'white');
      drawingContext.lineWidth = uT.setDefault( pars.borderWidth_px, 2);
      var radius_px = uT.setDefault( pars.radius_px, 6);
      var fillColor = uT.setDefault( pars.fillColor, 'red');
      var fillAlpha = uT.setDefault( pars.fillAlpha, 1.00);
      var lineAlpha = uT.setDefault( pars.lineAlpha, 1.00);
      var dashArray = uT.setDefault( pars.dashArray, [0]);
      
      drawingContext.setLineDash( dashArray);
      
      drawingContext.beginPath();
      
      drawingContext.arc( center_2d_px.x, center_2d_px.y, radius_px, 0, 2 * Math.PI);
      
      // Note that specifying an alpha of 0.0 is equivalent to a fillColor of 'noFill'.
      if (fillColor != 'noFill') {
         drawingContext.globalAlpha = fillAlpha;
         drawingContext.fillStyle = fillColor;
         drawingContext.fill();
         drawingContext.globalAlpha = 1.00;
      }
      if (pars.borderWidth_px > 0) {
         drawingContext.globalAlpha = lineAlpha;
         drawingContext.stroke();
         drawingContext.globalAlpha = 1.00;
      }
      
      // Turn off the dashes
      drawingContext.setLineDash([0]);
   }
   DrawingFunctions.prototype.drawPolygon = function( drawingContext, poly_px, pars) {
      var borderWidth_px = uT.setDefault( pars.borderWidth_px, 2);
      var lineAlpha = uT.setDefault( pars.lineAlpha, 1.00);
      
      // drawingContext.lineWidth will revert to default or previous value if you attempt to set it to zero. 
      if (borderWidth_px > 0) {
         drawingContext.lineWidth = borderWidth_px;
      } else {
         drawingContext.lineWidth = 1;
      }
      
      drawingContext.fillStyle = uT.setDefault( pars.fillColor,  'red');
      var fillIt = uT.setDefault( pars.fillIt, true);
      
      // Hide the border, using a color match, if zero width.
      if (borderWidth_px > 0) {
         drawingContext.strokeStyle = uT.setDefault( pars.borderColor, 'white');
      } else {
         drawingContext.strokeStyle = drawingContext.fillStyle;
      }
      
      drawingContext.setLineDash([0]);
      
      drawingContext.beginPath();
      drawingContext.moveTo( poly_px[0].x, poly_px[0].y);
      for (var i = 1, len = poly_px.length; i < len; i++) {
         drawingContext.lineTo( poly_px[i].x, poly_px[i].y);
      }
      drawingContext.closePath();
      
      if (fillIt) drawingContext.fill();
      
      drawingContext.globalAlpha = lineAlpha;
      drawingContext.stroke();
      drawingContext.globalAlpha = 1.00;
   }
   DrawingFunctions.prototype.fillRectangle = function( drawingContext, upperLeft_2d_px, pars) {
      // Draw solid rectangle.
      var width_px  = uT.setDefault( pars.width_px, 6);
      var height_px = uT.setDefault( pars.height_px, width_px); // default is square
      drawingContext.fillStyle = uT.setDefault( pars.fillColor, 'red');
      //                       -----------upper left corner--------
      drawingContext.fillRect( upperLeft_2d_px.x, upperLeft_2d_px.y, width_px, height_px);
   }
   DrawingFunctions.prototype.drawMark = function( drawingContext, center_2d_px, pars={}) {
      let borderColor = uT.setDefault( pars.borderColor, 'white');
      let radius_px = uT.setDefault( pars.radius_px, 3);
      let crossHairLength_px = uT.setDefault( pars.crossHairLength_px, 8);
      
      this.drawCircle( drawingContext, center_2d_px, {'borderColor':borderColor, 'borderWidth_px':1, 'fillColor':'black', 'radius_px':radius_px});
      let dx_2d_px = new wS.Vec2D( crossHairLength_px, 0);
      let dy_2d_px = new wS.Vec2D( 0, crossHairLength_px);
      // horizontal line
      this.drawLine( drawingContext, center_2d_px.add( dx_2d_px) , center_2d_px.subtract( dx_2d_px), {'width_px':1, 'color':borderColor});
      // vertical line
      this.drawLine( drawingContext, center_2d_px.add( dy_2d_px) , center_2d_px.subtract( dy_2d_px), {'width_px':1, 'color':borderColor});
   }

   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'DrawingFunctions': DrawingFunctions,
      
   };   
   
})();

// Make an instance for when drawing functions are not inherited.
window.dF = new dFM.DrawingFunctions();