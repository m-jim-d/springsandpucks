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

// Pi Engine (pE) module
// piEngine.js 
   console.log('pE _*-*_');
// 4:22 PM Tue July 25, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.pE = (function() {
   "use strict";
   
   var m_p1, m_p2,
       m_clackSound,
       m_nFinerTimeStepFactor,
       m_lastCollidedWithWall,
       m_clacks,
       m_reportsEnabled,
       m_atLeastOneCollisionInFrame,
       m_p1_v_max,
       m_collisionCount,
       m_dt_s;
       
   function initializeModule( puck1, puck2, clackSound, pars = {} ) {
      // A 1D engine for calculating the digits of pi by counting the collisions of
      // of two pucks. Pucks must have a mass ratio of 100^(d-1), where d is the number
      // of digits of pi to be determined. Smaller puck is between the wall and the larger puck.
      m_p1 = puck1;
      m_p2 = puck2;
      m_clackSound = clackSound;
      // 1000 works well for up to 5 digits of pi.
      m_nFinerTimeStepFactor = uT.setDefault( pars.nFinerTimeStepFactor, 1000);
      
      m_lastCollidedWithWall = uT.setDefault( pars.lastCollidedWithWall, true);
      m_clacks = uT.setDefault( pars.clacks, true);
      m_reportsEnabled = uT.setDefault( pars.enabled, true);
      m_atLeastOneCollisionInFrame = uT.setDefault( pars.atLeastOneCollisionInFrame, false);
      m_p1_v_max = uT.setDefault( pars.p1_v_max, 0);
      m_collisionCount = uT.setDefault( pars.collisionCount, 0);
   }
   
   function currentState() {
      let state = {};
      state['lastCollidedWithWall'] = m_lastCollidedWithWall;
      state['atLeastOneCollisionInFrame'] = m_atLeastOneCollisionInFrame;
      state['nFinerTimeStepFactor'] = m_nFinerTimeStepFactor;
      state['p1_v_max'] = m_p1_v_max;
      state['collisionCount'] = m_collisionCount;
      
      return state;
   }
   
   function step( dt_oneFrame_s) {      
      m_dt_s = dt_oneFrame_s / m_nFinerTimeStepFactor;
      
      m_atLeastOneCollisionInFrame = false;
      for (var i=0; i < m_nFinerTimeStepFactor; i++) {
         update( m_p1);
         update( m_p2);
         
         checkForCollisions();
      }
      if (m_atLeastOneCollisionInFrame) {
         if (m_clacks) m_clackSound.play();
         if (m_reportsEnabled) report();
      } 
   }
   
   function update( puck) {
      puck.position_2d_m.y += puck.velocity_2d_mps.y * m_dt_s;
      // Since not using the Box2D engine, manually update the pucks in the Box2D world.
      puck.b2d.SetPosition( puck.position_2d_m);
   }
   
   function checkForCollisions() {
      // Note that the lastCollidedWithWall logical mandates alternation between wall and puck collisions.
      // Check pucks for puck-puck collisions
      if (((m_p1.position_2d_m.y - m_p1.radius_m) < (m_p2.position_2d_m.y + m_p2.radius_m)) && (m_lastCollidedWithWall)) {
         m_lastCollidedWithWall = false;
         puckCollisionResult();
         countit();
      }
      // Check puck1 for collisions with the top leg of the fence.
      var botEdgeTopWall_y_m = gW.aT.wallMap[ cP.Wall.topFenceLegName].position_2d_m.y - gW.aT.wallMap[ cP.Wall.topFenceLegName].half_height_m;
      if ( ((m_p1.position_2d_m.y + m_p1.radius_m) > botEdgeTopWall_y_m) && ( ! m_lastCollidedWithWall) ) {
         m_lastCollidedWithWall = true;
         m_p1.velocity_2d_mps.y *= -1.0;
         countit();
      }
   }
   
   function countit() {
      m_atLeastOneCollisionInFrame = true;
      m_collisionCount += 1;
   }
   
   function report() {
      gW.messages['help'].newMessage("count = " + m_collisionCount + "\\v max = " + m_p1_v_max.toFixed(1));
   }
   
   function puckCollisionResult() {
      var CR = 1.0; 
      var p1_v_y =  ( (CR * m_p2.mass_kg * (m_p2.velocity_2d_mps.y - m_p1.velocity_2d_mps.y) +  
                            m_p1.mass_kg *  m_p1.velocity_2d_mps.y +  
                            m_p2.mass_kg *  m_p2.velocity_2d_mps.y) / (m_p1.mass_kg + m_p2.mass_kg) );
   
      var p2_v_y =  ( (CR * m_p1.mass_kg * (m_p1.velocity_2d_mps.y - m_p2.velocity_2d_mps.y) +  
                            m_p1.mass_kg *  m_p1.velocity_2d_mps.y +  
                            m_p2.mass_kg *  m_p2.velocity_2d_mps.y) / (m_p1.mass_kg + m_p2.mass_kg) );
      
      m_p1_v_max = Math.max( p1_v_y, m_p1_v_max);
      
      m_p1.velocity_2d_mps.y = p1_v_y;
      m_p2.velocity_2d_mps.y = p2_v_y;
   }
      
  
  
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      'get_collisionCount': function() { return m_collisionCount; },
      
      // Methods
      'initializeModule': initializeModule,
      'step': step,
      'currentState': currentState,
      
   };   
   
})();