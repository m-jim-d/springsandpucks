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

// Jello Madness (jM) module
// jelloMadness.js
   console.log('jM _*-*_');
// 3:51 PM Wed June 22, 2022

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.jM = (function() {
   "use strict";
   
   // Names starting with m_ indicate module-scope globals.
   var m_reported;
   var m_tangleTimer_s;
   var m_timerAtDetangle_s;
   var m_verifyingDeTangle;
   // An array for use in testing for tangled jello.
   var m_jelloPucks;
   
   initializeModule();
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule() {
      m_reported = false;
      m_tangleTimer_s = 0;
      m_timerAtDetangle_s = 0;
      m_verifyingDeTangle = false;
      // An array for use in testing for tangled jello.
      m_jelloPucks = [];
   }
   
   function setUpPreGameHelp() {
      m_reported = true;
      m_tangleTimer_s = 0.0;
      // For 6.a or 6.d or any capture based on them, run them like the Jello game.
      if ((gW.getDemoVersion().slice(0,3) == "6.a") || (gW.getDemoVersion().slice(0,3) == "6.d")) {
         gW.messages['jelloTimer'].loc_px = {'x':15,'y': 40};
         gW.messages['win'].loc_px =  {'x':15,'y':135};
         
         gW.messages['help'].loc_px = {'x':15,'y': 75};
         gW.messages['help'].newMessage("Detangle the jello:\\    Try the f key. Try right-click mouse drags.", 3.0);
         
         gW.messages['gameTitle'].newMessage("Jello Madness", 1.0);
         gW.messages['gameTitle'].loc_px = {'x':15,'y':200};
         gW.messages['gameTitle'].popAtEnd = false;
         
         m_reported = false;
         m_verifyingDeTangle = false;
      }
   }
   
   function makeJello( pars) {
      let pinned = uT.setDefault( pars.pinned, false);
      let gridsize = uT.setDefault( pars.gridsize, 4);
      let addToJello = uT.setDefault( pars.addToJello, true);
      let offset_2d_m = uT.setDefault( pars.offset_2d_m, new wS.Vec2D(2.0, 2.0));
      let restitution = uT.setDefault( pars.restitution, 0.7);

      let spacing_factor_m = 0.9;
      
      let v_init_2d_mps = new wS.Vec2D(0.0, 0.0);
      
      let puckParms = {'radius_m':0.20, 'density':5.0, 'jello':true, 'restitution':restitution, 'restitution_fixed':true};
      
      let springParms = {
         'unstretched_width_m': 0.07,
         'strength_Npm': 350.0,          
         'length_m': spacing_factor_m * 1.0,
         'damper_Ns2pm2': 5.0};

      // a local jello array for baking the jello
      let jelloPucks = [];

      // Grid of pucks.
      for (let j = 0; j < gridsize; j++) {
         for (let k = 0; k < gridsize; k++) {
            if ((j==2) && (k==2)) {
               puckParms.color = "orange";
            } else {
               puckParms.color = undefined;  // use default
            }
            let pos_2d_m = new wS.Vec2D( spacing_factor_m * j, spacing_factor_m * k);
            pos_2d_m.addTo( offset_2d_m);
            jelloPucks.push( new cP.Puck( Object.assign({}, pos_2d_m), Object.assign({}, v_init_2d_mps), Object.assign({}, puckParms)));
         }
      }
      // Horizontal springs (between neighbors)
      for (let m = 0; m < gridsize*(gridsize-1); m++) {
         springParms.color = "blue";
         // Note: Object.assign is used here to make a copy of the springParms object (mutable). This avoids the multiple reference to springParms
         // and any associated mutation side effects (from this and the following color changes) when the state is captured.
         new cP.Spring(jelloPucks[m], jelloPucks[m+gridsize], Object.assign({}, springParms));
      }
      // Vertical springs
      for (let m = 0; m < gridsize-1; m++) {
         for (let n = 0; n < gridsize; n++) {
            let o_index = m + (n * gridsize);
            springParms.color = "blue";
            new cP.Spring(jelloPucks[o_index], jelloPucks[o_index+1], Object.assign({}, springParms));
         }
      }
      // Diagonal springs (yellow)
      for (let m = 0; m < gridsize-1; m++) {
         for (let n = 1; n < gridsize; n++) {
            let o_index = m + (n * gridsize);
            springParms.color = "yellow";
            springParms.length_m = spacing_factor_m * 1.41;  // A diagonal
            new cP.Spring(jelloPucks[o_index], jelloPucks[o_index-(gridsize-1)], Object.assign({}, springParms));
         }
      }
      // Diagonal springs (perpendicular to the other diagonals)
      for (let m = 0; m < gridsize-1; m++) {
         for (let n = 0; n < gridsize-1; n++) {
            let o_index = m + (n * gridsize);
            springParms.color = "yellow";
            springParms.length_m = spacing_factor_m * 1.41; // A diagonal
            new cP.Spring(jelloPucks[o_index], jelloPucks[o_index+(gridsize+1)], Object.assign({}, springParms));
         }
      }
      
      // Add two pinned springs.
      if (pinned) {
         let corner_puck = (gridsize * gridsize) - 1;
         new cP.Spring(jelloPucks[ 0], new cP.Pin( new wS.Vec2D( 0.5, 0.5), {radius_px:4}), {strength_Npm:800.0, unstretched_width_m:0.3, color:'brown',damper_Ns2pm2:5.0});
         new cP.Spring(jelloPucks[ corner_puck], new cP.Pin( new wS.Vec2D( 9.0, 9.0), {radius_px:4}), {strength_Npm:800.0, unstretched_width_m:0.3, color:'brown',damper_Ns2pm2:5.0});
      }
      
      // Add this new jello to the global jello array. This allows multiple pieces of jello to
      // be used in the 6a and 6d detangle games.
      if (addToJello) {
         for (let j = 0, len = jelloPucks.length; j < len; j++) {
            m_jelloPucks.push( jelloPucks[j]);
         }
      }
   }
   
   /*
   Tried using the B2D contact listener to detect tangle. But this
   approach fails to deal with a tangled state where the balls are not quite
   touching... So the approach below is used.
   
   function checkForJelloTangle2() {
      if (c.contactCounter > 0) {
         c.jello.tangleTimer_s += c.deltaT_s;
      }
      ctx.font = "30px Arial";
      ctx.fillStyle = 'yellow';
      ctx.fillText(c.jello.tangleTimer_s.toFixed(2),10,50);
   }
   */
   
   function checkForJelloTangle() {
      // Determine if tangled by looking for balls that are fairly close to 
      // each other. This does not require puck contact to detect a tangle.
      
      // A looping structure that avoids self reference and repeated puck-otherpuck references.
      let stillTangled = false;
      
      for (let j = 0, len = m_jelloPucks.length; j < len; j++) {
         for (let k = j+1; k < len; k++) {
            // Check distance between j and k pucks.
            let diff_2d_m = m_jelloPucks[j].position_2d_m.subtract( m_jelloPucks[k].position_2d_m);
            
            // Square of the vector length.
            let lenSquared = diff_2d_m.length_squared();
            
            // Make the separation test a little more than the sum of the radii (add 30% of the radius of the smaller puck).
            // Then square it for comparison with the length squared.
            let radiiSum_m = m_jelloPucks[j].radius_m + m_jelloPucks[k].radius_m;
            let minRadius_m = Math.min( m_jelloPucks[j].radius_m, m_jelloPucks[k].radius_m );
            let separation_check = Math.pow(radiiSum_m + (minRadius_m * 0.30), 2);
            
            if (lenSquared < separation_check) {
               // This one is too close to be in a non-tangled jello block.
               stillTangled = true;
               m_tangleTimer_s += gW.getDeltaT_s();
               j = k = 10000; // break out of the two loops.
            }
         }
      }
      
      gW.messages['jelloTimer'].newMessage( m_tangleTimer_s.toFixed(2), 0.2);
      
      if ( ! stillTangled) {
         // Get a timestamp for use in verification.
         if ( ! m_verifyingDeTangle) {
            m_timerAtDetangle_s = m_tangleTimer_s;
         }
         // Wait 1.000 seconds and verify (that there has been no timer change).
         if ( ( ! m_reported) && ( ! m_verifyingDeTangle)) {
            m_verifyingDeTangle = true;
            window.setTimeout( function() { 
               // If the timer hasn't advanced, must still be detangled.
               if (m_tangleTimer_s == m_timerAtDetangle_s) {
                  if ( ! m_reported) {
                     
                     // leaderboard stuff
                     cT.Client.applyToAll( client => { 
                        client.addScoreToSummary( m_tangleTimer_s.toFixed(2), gW.getDemoIndex(), pP.getNpcSleepUsage());
                     });
                     lB.reportGameResults();
                     // Send a score for each human player to the leaderboard. Build leaderboard report at the end.
                     lB.submitScoresThenReport();
                     // Open up the multi-player panel so you can see the leader-board report.
                     if (!gW.dC.multiplayer.checked) {  
                        $('#chkMultiplayer').trigger('click');
                     }
                     // Make sure this gets reported only once (per demo #6 start).
                     m_reported = true;
                     gW.messages['win'].newMessage("That's better. Thank you.", 3.5);
                     gW.clients['local'].winCount += 1;
                  }
               } else {
                  console.log('not sustainably detangled...');
               }
               m_verifyingDeTangle = false;
            }, 1000);
         }
      }
   }
   
   function puckCount() { 
      return m_jelloPucks.length;
   }
   
   function removeDeletedPucks() {
      // Filter out references to pucks that are marked as deleted.
      m_jelloPucks = m_jelloPucks.filter( function( eachPuck) {
         // Keep these (those NOT deleted)
         return ( ! eachPuck.deleted);
      });
   }
   
   function addPuck( newPuck) {
      m_jelloPucks.push( newPuck);
   }
   
   // see comments before the "return" section of gwModule.js
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'setUpPreGameHelp': setUpPreGameHelp,
      'makeJello': makeJello,
      'checkForJelloTangle': checkForJelloTangle,
      'puckCount': puckCount,
      'removeDeletedPucks': removeDeletedPucks,
      'addPuck': addPuck
   };

})();