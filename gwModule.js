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

// Game Window (gW) module
// gwModule.js 
   console.log('gW3 _*-*_');
// 10:13 AM Sun December 10, 2023

/*
modules: filename and global nickname (i.e. window.nickname)
   Box2D.js (b2DW)
   bpHoops.js (bpH)
   boxStuff.js (bS)
   consAndPros.js (cP)
   clientProto.js (cT)
   captureRestore.js (cR)
   drawFunc.js (dFM and dF)
   demoStart.js (dS)
   eventsHost (eV)
   eventsNonHost.js (eVN)
   ghostBall.js (gB)
   gwModule.js (gW)
   hostAndClient.js (hC)
   jellowMadness.js (jM)
   leaderBoard.js (lB)
   monkeyHunt.js (mH)
   multiSelect.js (mS)
   pageStuff.js (pS)
   piEngine.js (pE)
   puckPopper.js (pP)
   tableActs (tA)
   twoThumbs.js (twoThumbs)
   utilities.js (uT)
   worldScreen.js (wS)
*/

window.gW = (function() {
   "use strict";
      
   ////////////////////////////////////////////////////////////////////
   // Common variables inside of gW (game window) module //////////////
   ////////////////////////////////////////////////////////////////////
   
   // The Air Table (aT): a place to call home for pucks, pins, springs, joints, and walls.
   var aT = {};
  
   aT.puckMap = {}; // keyed by puck name.
   
   aT.pinMap = {};  // keyed by pin name.
   
   aT.springMap = {}; // keyed by spring name.
   aT.jointMap = {}; // keyed by joint name.
   
   aT.wallMap = {}; // keyed by wall name.
   
   aT.collisionCount = 0;
   aT.collisionInThisStep = false;
   
   // Make a separate container for constants (c) and control flags used by aT objects. This avoids
   // circular references (and associated problems) with JSON capturing.
   var c = {};
   c.g_mps2 = 9.8;
   c.g_ON = false;
   c.px_per_m = null;
   
   // This 60 corresponds with the selected (default) value on the index.html page.
   c.frameRate = 60.0;
   c.frameCount = 0;
   // Seconds per frame
   c.deltaT_s = 1.0/c.frameRate;
   c.dtFloating = false;
   
   c.borderAndBackGroundColor = '#008080'; // '#008080';
   c.fullScreenState = false;
   
   c.fullScreenDemo = false;
   c.lockedAndLoaded = false;
   
   c.demoIndex = null;
   c.demoLoopIndex = 0;
   c.demoVersion = null;
   
   c.lastClientToScoreHit = null;
   
   c.chatLayoutState = 'notSetYet';
   
   c.singleStep = false;
   c.softConstraints_default = false;
   
   c.canvasColor = 'black';
   
   c.piCalcs = {'enabled':true, 'usePiEngine':false, 'clacks':false};

   c.pauseErase = false;
   // The user can set this true by putting the string "lagtest" in the chat field before checking the local cursor box (under multiplayer). 
   // Use this to see little circles drawn at cursor position in handleMouseOrTouchMove for the host and cT.updateClientState for network client's.
   // Must use p or alt-p to avoid the canvas erasing actions. See comments at the beginning of updateAirTable.
   c.lagTesting = false;
   aT.cursorSpeed_pxps = new uT.RunningAverage(30);
   
   c.drawSyncImage = false;
   
   c.displaySCM = false; // System Center of Mass for all pucks
   c.displayMSC = false; // Multi-Select Center
   
   // Client map keyed by client name.
   var clients = {};
   
   var tableMap = new Map();  // Special map where keys can be objects (specifically, box2d objects here).
   var b2d = {}; // a wrapper for the Box2D world
   var myRequest, time_previous, dt_frame_ms, dt_frame_previous_ms, dt_frame_s, resumingAfterPause;
   
   var canvasDiv;
   var canvas, ctx;
   
   var sounds = {};
   var messages = {};
   
   // these two require that multiSelect.js is loaded before gwModule.js
   var hostSelectBox = new mS.SelectBox({});
   var hostMSelect = new mS.MultiSelect();
   
   // Document Controls (dC).
   var dC = {};
   dC.gravity = null;
   dC.pause = null;
   dC.comSelection = null;
   dC.multiplayer = null;
   dC.stream = null;
   dC.editor = null;
   dC.localCursor = null;
      
   // Key values.
   var keyMap = {'48':'key_0', '49':'key_1', '50':'key_2', '51':'key_3', '52':'key_4', '53':'key_5', '54':'key_6', '55':'key_7', '56':'key_8', '57':'key_9',
                 '65':'key_a', '66':'key_b', '67':'key_c', '68':'key_d', '69':'key_e', '70':'key_f', '71':'key_g', 
                 '73':'key_i', '74':'key_j', '75':'key_k', '76':'key_l', '77':'key_m', '78':'key_n', '79':'key_o', 
                 '80':'key_p', '81':'key_q', '82':'key_r', '83':'key_s', 
                 '84':'key_t', '85':'key_u', '86':'key_v', '87':'key_w', '88':'key_x', '90':'key_z',
                 
                 '8':'key_backspace', '9':'key_tab', '13':'key_enter', '16':'key_shift', '17':'key_ctrl', 
                 '18':'key_alt', // both left and right alt key on Windows
                 '32':'key_space', 
                 
                 // Note that default behavior is blocked on all these arrow-key type keys. Search on
                 // editKeysMap in the handler for the keydown event.
                 // Exceptions to this are the key_+ and key_- number-pad keys that are in the allowDefaultKeysMap.
                 // This allows the desired native zoom feature when using the ctrl key along with these keys.  
                 '33':'key_pageUp', '34':'key_pageDown', 
                 '37':'key_leftArrow', '38':'key_upArrow', '39':'key_rightArrow', '40':'key_downArrow',
                 // These are the number pad +/- keys.
                 '107':'key_+', '109':'key_-',
                 // These are the +/- keys on the main keyboard.
                 '187':'key_=+', '189':'key_-_', // Chrome
                 '61':'key_=+',  '173':'key_-_', // Firefox
                 
                 '188':'key_lt', '190':'key_gt',
                 
                 '191':'key_questionMark',
                 
                 '219':'key_[', '221':'key_]',
                 
                 '225':'key_alt'};   // right-side alt key, needed for RPi
   
   var fileName = "gwModule.js";
   
   // supporting touch-screen event processing
   var ts = {};
   ts.previousTapTime = new Date().getTime();
   ts.tapCount = 1;
   
      
   /////////////////////////////////////////////////////////////////////////////
   ////  Functions
   /////////////////////////////////////////////////////////////////////////////
   
   function toggleMultiplayerStuff() {
      // This double toggle has the effect of switching between the following two divs.
      uT.toggleElementDisplay("multiPlayer", "table-cell");
      uT.toggleElementDisplay("ttcIntro",    "table-cell");
      
      // This toggles (displays/hides) the client links.
      uT.toggleElementDisplay("clientLinks", "block");
      
      // Toggling the help panel can involve a width change, especially if changing to
      // or leaving demo 8. Therefore, need to update the help panel's scroll position.
      if (pS.scrollHistory.currentTarget) {
         pS.scroll( pS.scrollHistory.currentTarget, {'scrollDuration':0});
      } else {
         pS.scroll('d' + c.demoIndex, {'scrollDuration':0});
      }
   }
   
   function resetFenceColor( newColor) {
      cP.Wall.applyToAll( wall => {
         if (wall.fence) {
            wall.color = newColor;
            wall.draw( ctx);
         }
      });
   }
   
   function setPauseState( e) {
      // Make the pause state agrees with the check box.
      if (dC.pause.checked) {
         messages['help'].newMessage('Physics engine is [base,yellow]paused[base]. \\  Use the [base,yellow]"o"[base] key to single-step it, [base,yellow]"p"[base] to resume.', 0.1);
         // Wait for one frame, so the message to be displayed, then pause the engine.
         window.setTimeout( function() {
            stopit();
            uT.setElementDisplay("fps_wrapper", "none");
            uT.setElementDisplay("stepper_wrapper", "inline");
         }, 20);
      } else {
         startit();
         c.singleStep = false;
         uT.setElementDisplay("fps_wrapper", "inline");
         uT.setElementDisplay("stepper_wrapper", "none");
         // This hides the border glitch in Chrome...
         if ( ! c.fullScreenState) canvas.style.backgroundColor = c.borderAndBackGroundColor;
      }
   }
   
   function oneFrameIfPaused( delay_ms = 0) {
      /*
      Force a single-frame update. This is useful for avoiding a black screen if paused and changing to full-canvas.
      Note: this must be delayed until after the pause and restart in restartAnimationLoop.
      (see comments in dC.fullCanvas.addEventListener)
      */
      window.setTimeout( function() {
         if (dC.pause.checked) {
            messages['help'].newMessage('Physics engine is [base,yellow]paused[base]. \\  Use the [base,yellow]"o"[base] key to single-step it, [base,yellow]"p"[base] to resume.', 0.1);
            // Do one step so that this message gets written to the canvas.
            stepAnimation();
         }
      }, delay_ms);
   }

   function restartAnimationLoop( delay_ms) {
      // This pause and restart, helps to minimize the lag in the browser's mouse input. Note you can visualize the lag by putting the string "lagtest" in the chat
      // and then checking the local cursor option under multiplayer. This displays a circle with radius equal to the cursor movement in two frames.
      if ((hC.get_hostOrClient() == "host") && ( ! dC.pause.checked)) {
         dC.pause.checked = true; 
         stopit();
         
         window.setTimeout( function() {
            dC.pause.checked = false; 
            startit();
         }, delay_ms);
         
         console.log("animation restarted");
      }
   }
   
   function startit() {
      // Only start a game loop if there is no game loop running.
      if (myRequest === null) {
         resetFenceColor( cP.Wall.color_default);
         if ( ! c.singleStep) dC.pause.checked = false;

         // Start the game loop.
         myRequest = window.requestAnimationFrame( gameLoop);
      }
   }

   function stopit() {
      resetFenceColor( "red");
      aT.dt_RA_ms.reset();
      dC.fps.innerHTML = '0';

      window.cancelAnimationFrame( myRequest);
      myRequest = null;
      resumingAfterPause = true;
   }
   
   function stepAnimation() {
      dC.pause.checked = true;
      // Set flag to allow only one step.
      c.singleStep = true;
      startit();
   }
   
   function setFrameRateBasedOnDisplayRate() {
      console.log("fps=" + dC.fps.innerHTML);
      var current_fps = dC.fps.innerHTML;
      var fps_choices = [60,75,85,100,120,144,240];
      var min_diff = 1000;
      var min_diff_index = null;
      var len = fps_choices.length;
      for (var i = 0; i < len; i++) {
         var diff = Math.abs( fps_choices[i] - current_fps);
         if (diff < min_diff) {
            min_diff = diff;
            min_diff_index = i;
         }
      }
      var bestMatch = fps_choices[ min_diff_index];
      // Set the value in the pulldown control.
      $('#FrameRate').val( bestMatch);
      setFrameRate();
   }
   
   function setFrameRate() {
      var frameRate = $('#FrameRate').val();
      if (frameRate != 'float') {
         c.frameRate = frameRate;
         c.deltaT_s = 1.0 / frameRate;
         c.dtFloating = false;
      } else {
         c.dtFloating = true;
      }
   }
   
   
   ///////////////////////////////////////////////////////
   // Initialize almost everything ///////////////////////
   ///////////////////////////////////////////////////////

   /*
   init() is called from index.html after the page load. This delays the 
   execution of init() until after all the page elements have loaded in. 
   Listeners are initialize here, after the delay, so that the 
   corresponding page elements exist. 
   
   Note that because of this delay, no objects can be defined here (inside init)
   that need to be revealed in the public pointers at the end of this file.
   */
   
   function init() {
      
      // Initialize Box2D world: set gravity vector to 0, allow sleep.
      b2d.world = new b2DW.World( new b2DW.Vec2(0, -0.0), true);
      
      // Event handlers for Box2D. Get collision information.
      
      var listener = new b2DW.ContactListener;
      
      listener.BeginContact = function( contact) {
         bS.beginContactHandler( contact);
      }
      listener.PreSolve = function( contact) {
         gB.contactNormals('preSolve', contact);
      }
      listener.EndContact = function( contact) {
         gB.contactNormals('endContact', contact);
      }
      b2d.world.SetContactListener( listener);
         
      
      
      // Demo specified in URL query string.
      // Take the first part of the string (ignore, for now, anything after the & character).
      var queryStringInURL = window.location.search.split("&")[0];
      var demoFromURL = {};
      var scrollTargetAtStart = null;
      
      // e.g. triquence.org/?7
      if (queryStringInURL.length == 2) {
         demoFromURL.index = Number( queryStringInURL.slice(1,2));
      
      } else if (queryStringInURL.length >= 3) {
         // for a special version of the demo, e.g. demo5d or demo5d.fullscreen
         // e.g. triquence.org/?7b  or  triquence.org/index.html?3d.8ball
         if ((queryStringInURL.length == 3) || queryStringInURL.includes(".")) {
            // Take everything after the ?
            demoFromURL.file = 'demo' + queryStringInURL.slice(1) + '.js';
            // Take only the first character after the ?
            demoFromURL.index = Number( queryStringInURL.slice(1,2));
            
         // Open to a particular help topic, e.g. triquence.org/?codeLinks
         } else {
            scrollTargetAtStart = queryStringInURL.slice(1);
         }
      }

      sounds['lowPop'] =  new uT.SoundEffect("sounds/puckpop_lower.mp3", 5); // n copies...
      sounds['highPop'] = new uT.SoundEffect("sounds/puckpop.mp3", 5);
      sounds['clack2'] =  new uT.SoundEffect("sounds/clack_long_b.mp3", 35); //35 100 Note: version "b" avoids overly quiet play in chrome.
      
      sounds['monkeyPlacement'] =  new uT.SoundEffect("sounds/monkey-mocking-and-giggling.mp3", 1, 0.10);
      sounds['monkeyPlacement2'] = new uT.SoundEffect("sounds/monkey-mocking-laugh.mp3",        1, 0.10);
      sounds['monkeyOK'] =         new uT.SoundEffect("sounds/monkey-baby-laugh.mp3",           1, 0.10);
      sounds['monkeyAlarmed'] =    new uT.SoundEffect("sounds/monkey-alarmed.mp3",              1, 0.10);


      messages['ppTimer'] =    new uT.HelpMessage({'font':'14px Arial', 'color':'lightgray'});
      messages['jelloTimer'] = new uT.HelpMessage({'font':'25px Arial', 'color':'lightgray'});
      messages['score'] =      new uT.HelpMessage({'font':'18px Arial', 'color':'lightgray'});
      messages['help'] =       new uT.HelpMessage({'font':'20px Arial', 'color':'lightgray'});   
      messages['help2'] =      new uT.HelpMessage({'font':'20px Arial', 'color':'lightgray'});
      messages['EpLreport'] =  new uT.HelpMessage({'font':"17px Courier, 'Courier New', monospace", 'color':'white'});
      messages['win'] =        new uT.HelpMessage({'font':'20px Arial', 'color':'yellow'});
      messages['lowHelp'] =    new uT.HelpMessage({'font':'20px Arial', 'color':'yellow'});
      messages['gameTitle'] =  new uT.HelpMessage({'font':'50px Arial', 'color':'lightgray'});
      messages['videoTitle'] = new uT.HelpMessage({'color':'lightgray'});

      // Initialize the canvas display window.
      
      myRequest = null;
      resumingAfterPause = false;
      time_previous = performance.now(); // Initialize the previous time variable to now.
      
      canvasDiv = document.getElementById('hostCanvasDiv');
      canvas = document.getElementById('hostCanvas');
      ctx = canvas.getContext('2d');
      
      // share some of the globals in gwModule.js with other modules
      
      eV.initializeModule( canvas, ctx, dC, c, aT, keyMap, clients, ts); // keyboard, mouse, and touch event handlers for the host
      dS.initializeModule( canvas, ctx, dC, c, aT, keyMap, clients); // demo starter
      tA.initializeModule( canvas, ctx); // table actions
      
      cT.initializeModule( canvas, ctx); // client prototype and client-state updater
      
      cR.initializeModule( canvas, ctx); // capture and restore
      
      gB.initializeModule( canvas, ctx); // Ghost Ball Pool
      
      // twoThumbs is initialized in hostAndClient.js
      
      // The running average.
      aT.dt_RA_ms = new uT.RunningAverage(60);
      dC.fps = document.getElementById("fps");
      
      dC.extraDemos = document.getElementById("extraDemos");
      dC.indexInPlusRow = document.getElementById("indexInPlusRow");

      
      // Add a local user to the clients dictionary.
      new cT.Client({'name':'local', 'color':'tomato'});

      // Start the blank demo for frame rate testing.
      dS.demoStart( 0, {'restartLoop':false, 'logThis':false});
      var fpsTestDelay = 1800;
      var startupDelay =  2000;
      
      // Wait about 2 seconds for the blank demo (#0) to settle in, then set the physics time-step (frame rate) 
      // based on the observed display rate.
      messages['help'].newMessage('starting...', startupDelay/1000.0);
      window.setTimeout( function() { 
         setFrameRateBasedOnDisplayRate();
      }, fpsTestDelay);
      
      window.setTimeout( function() { 
         // Start the "ready" message about 0.5 seconds before the demo starts.
         messages['help'].newMessage('...ready.', 0.8);
      }, startupDelay - 500);
      
      //////////////////////////////////////////////////////////////////////////
      // Now, about 0.2 seconds after the framerate measurement, start the demo.
      //////////////////////////////////////////////////////////////////////////
      window.setTimeout( function() {
         if (demoFromURL.file) {
            cR.demoStart_fromCapture( demoFromURL.index, {'fileName':demoFromURL.file});
         } else if (( ! demoFromURL.file) && demoFromURL.index) {
            dS.demoStart( demoFromURL.index);
         } else {
            dS.demoStart( 9, {'scrollHelp':false, 'logThis':false}); // don't scroll to demo-9 help when the page loads
            if (scrollTargetAtStart) pS.scroll( scrollTargetAtStart);
         }
      }, startupDelay);
      
   } // end of init()

   
   // It's alive. MuuuUUuuuAhhhh Haaaaaa Ha Ha Ha.
   function gameLoop( timeStamp_ms) {
      // Note: The time-stamp argument can have any name.
      
      dt_frame_ms = timeStamp_ms - time_previous;
      //dt_frame_ms = c.deltaT_s * 1000;
      //dt_frame_ms = 1000 * 1/60.0
      dt_frame_s = dt_frame_ms / 1000.0;
      
      if (resumingAfterPause || (dt_frame_s > 0.1)) {
         // Use the dt info saved in last frame before it was paused.
         dt_frame_ms = dt_frame_previous_ms;
         dt_frame_s = dt_frame_ms / 1000.0;
         time_previous = performance.now();
         resumingAfterPause = false;
      }
      
      if (c.dtFloating) c.deltaT_s = dt_frame_s;
      
      var dt_avg_ms = aT.dt_RA_ms.update( dt_frame_ms);
      
      // Report frame-rate every half second.
      if (aT.dt_RA_ms.totalSinceReport > 500.0) {
         dC.fps.innerHTML = (1/(dt_avg_ms/1000)).toFixed(0);
         aT.dt_RA_ms.totalSinceReport = 0.0;
      }
      
      // Draw the walls, step the engine, draw the pucks.
      updateAirTable();
      
      time_previous = timeStamp_ms;
      dt_frame_previous_ms = dt_frame_ms
      
      myRequest = window.requestAnimationFrame( gameLoop);
      if (c.singleStep) stopit();
   }
   
   function clearCanvas() {
      let canvas_width_px_int = Math.round( canvas.width);
      let canvas_height_px_int = Math.round( canvas.height);
      
      // Clear the canvas (from one corner to the other)
      if (ctx.globalCompositeOperation == 'screen') {
         ctx.clearRect(0,0, canvas_width_px_int, canvas_height_px_int);
         
         ctx.fillStyle = 'black';
         ctx.fillRect(0,0, canvas_width_px_int, canvas_height_px_int);
         
      } else {
         ctx.fillStyle = c.canvasColor;
         ctx.fillRect(0,0, canvas_width_px_int, canvas_height_px_int);
      }
   }
   
   function updateAirTable() {
      /*
      This update function is structured as follows:
      
      1. Based on user input (cursor, keyboard, and network client), update all things that affect the physics engine:
         position the cursor springs and the ghost-puck sensor, deleted objects, and calculate external spring and impulse forces.
      2. Step the physics engine.
      3. Calculate the screen positions of objects as affected by the physics engine
         and draw the results.
      */
      
      /*
      Most of the event-based (asynchronous) input is "allowed" to enter this 
      update function at any time. However, the mouse position input is copied 
      at the beginning of this function. For consistency, all processing of 
      the mouse position is based on this copy, not the mouse_async_2d_px 
      values. In effect, the async mouse input is blocked from entering this 
      function anywhere but here at the beginning. 
      
      I put quotes on "allowed" in the previous paragraph because the 
      mousemove events are coalesced (by the browser) and released at the 
      beginning of requestAnimationFrame cycle. So you will NEVER see host's 
      (local client) mouse position updated during the execution of this 
      updateAirTable function. Network clients mouse position can be updated 
      during updateAirTable since the WebRTC events are not coalesced. So the 
      use of the "copy" actually enforces consistency for the clients mouse 
      position during updateAirTable. 

      Search this code for the c.lagTesting flag (only changeable via code edit) 
      that enables the drawing of a little circle directly in the event handlers 
      for mouse position (), cyan for host, white for network clients.
         * Use alt-p to inhibit erasing
         * Use p to inhibit the requestAnimationFrame loop.
      
      Note: web search on getCoalescedEvents.
      
      Input delay (or lag) is an issue with html games and to some extent 
      this site. If you check the "Multiplayer" option and then check the 
      "Local cursor" option you will be able see the delay to the cursor 
      rendered on the canvas. This delay will generally range from 2 to 5 
      fames. You can calibrate your sense of delay here: 
      
      https://www.vsynctester.com/
      */
      
      // Copy the event-based results for use in the loop.
      cT.Client.applyToAll( client => {
         client.prev_mouse_2d_px = client.mouse_2d_px.copy();
         client.mouse_2d_px = client.mouse_async_2d_px.copy();
         client.mouse_2d_m = wS.worldFromScreen( client.mouse_2d_px);
      });
      
      /*
      Leaving this commented block here as an example of a technique for deleting elements
      from an array when looping over it.
      
      // Clean out old bullets and unhealthy pucks. Note this loops
      // in reverse order over the array to avoid indexing problems as the
      // array elements are deleted.
      for (var j = aT.pucks.length - 1; j >= 0; j--) {
         if (aT.pucks[j].bullet) {
            var age_ms = window.performance.now() - aT.pucks[j].createTime;
            if (age_ms > aT.pucks[j].ageLimit_ms) {  
               deletePuckAndParts( aT.pucks[j]);
               aT.pucks.splice(j, 1);
            }
         } else if (aT.pucks[j].poorHealthFraction >= 1.0) {
            deletePuckAndParts( aT.pucks[j]);
            aT.pucks.splice(j, 1);
         }
      }     
      */
      
      // Update bullet age and clean out old bullets and unhealthy pucks.
      if ((c.demoIndex == 7) || (c.demoIndex == 8)) {
         pP.deleteOldandUnhealthy( c.deltaT_s);
      }
      
      if (aT.collisionInThisStep) {
         // If not using the PiEngine but still doing some pi calculations (e.g. demo 1c), 
         // you'll need to do a few things like play the clack sound.
         if ( ! c.piCalcs.usePiEngine) {
            if (c.piCalcs.clacks) sounds['clack2'].play();
            if (c.piCalcs.enabled) {
               aT.puckMap['puck1'].vmax = Math.max( aT.puckMap['puck1'].vmax, aT.puckMap['puck1'].velocity_2d_mps.y);
               messages['help'].newMessage("count = " + aT.collisionCount + "\\v max = " + aT.puckMap['puck1'].vmax.toFixed(1));
            }
         } 
      }
      
      cP.Spring.applyToAll( spring => {
         // If either puck/pin has been deleted, remove the spring.
         if (spring.spo1.deleted || spring.spo2.deleted) {
            // Remove this spring from the spring map.
            spring.deleteThisOne({});
         } else {
            // Otherwise, business as usual.
            spring.force_on_pucks();
         }
      });
      cP.Joint.applyToAll( joint => {
         // If either table object has been deleted, remove the joint.
         if (joint.jto1.deleted || joint.jto2.deleted) {
            joint.deleteThisOne({});
         }
      });
      
      // Update the games
      if (c.demoVersion.slice(0,3) == "3.d") {
         // A timer limits how often checks are run on pool-game state. Check once for every c.poolTimer_stateCheckLimit_s timer period.
         gB.checkPoolGameState( ctx);
      
      } else if ((c.demoIndex == 6) && (jM.puckCount() > 0)) {
         jM.checkForJelloTangle();
      
      } else if (((c.demoIndex == 7 || c.demoIndex == 8)) && ( ! pP.getNpcSleep())) {
         pP.checkForPuckPopperWinnerAndReport();
      }
      
      // Consider all client-mouse influences on a selected object.
      cT.Client.applyToAll( client => {
         
         // Jets and Guns
         if (client.puck) {
            // Tell the NPCs what to do.
            if (client.name.slice(0,3) == 'NPC') {
               if ( ! pP.getNpcSleep()) pP.thinkForNPC( client, c.deltaT_s);
            }
            // Respond to client controls, calculate corresponding jet and gun recoil forces, and draw.
            client.puck.jet.update( c.deltaT_s);
            client.puck.gun.update( c.deltaT_s);
            
            // If sweeping the gun with the TwoThumbs scope control, send out the resulting gunAngle to the client.
            pP.gunAngleFromHost( client, c.deltaT_s);
         }
         
         // Check to see if the mouse button is down and if there's a body under the cursor.
         // Select it and/or add it to the multi-select group.
         client.checkForMouseSelection();
         
         // Note that network clients are NOT allowed to select walls and pins (see checkForMouseSelection).
         // So only the local client will get into the following block in those (wall and pin) cases.
         if (client.selectedBody) {
            // World position of selection points are needed for direct movements and for spring calculations.
            client.updateSelectionPoint();
            
            gB.resetPathAfterShot( client);
            
            // direct movement
            if ((client.key_ctrl == 'D') || (client.ctrlShiftLock)) {
               
               // If the choke is open (null), take exclusive ownership of direct movements. Note that this client
               // will release its ownership via mouse-up or control-key-up events.
               if (client.selectedBody.firstClientDirectMove == null) {
                  client.selectedBody.firstClientDirectMove = client.name;
               } 
               // Allow only one client at a time to make direct movements.
               if (client.name == client.selectedBody.firstClientDirectMove) {
                  // translation
                  if ((client.key_ctrl == 'D') && (client.key_shift == 'U') && (client.key_alt == 'U')) {
                     client.moveToCursorPosition();
                  // rotation
                  } else if ( ((client.key_ctrl == 'D') && (client.key_shift == 'D')) || ((client.ctrlShiftLock) && (client.selectedBody.constructor.name == 'Puck')) ) {
                     client.rotateToCursorPosition();
                  } else if ((client.key_ctrl == 'D') && (client.key_alt == 'D')) {
                     client.rotateEachAboutItself();
                  }               
               }
            }
         }
         
         // Prepare to draw a cursor for the local and network clients.
         if (client.name.slice(0,3) != 'NPC') {
            if ( (client.deviceType != 'mobile') && ( ! client.twoThumbsEnabled) ) { 
               client.updateCursor(); // and ghost ball...
            }
         } 
      });
      
      // Sum up all the forces and apply them to the pucks.
      cP.Puck.applyToAll( puck => {
         puck.applyForces( c.deltaT_s); 
      });
      
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      // Step the physics engine (calculate the resulting state of the objects)
      //////////////////////////////////////////////////////////////////////////////////////////////////////
      if (c.piCalcs.usePiEngine) {
         pE.step( c.deltaT_s);
      } else {
         aT.collisionInThisStep = false;
         b2d.world.Step( c.deltaT_s, 10, 10);  // dt, vel iterations, pos iterations: dt,10,10
         c.frameCount++;
         b2d.world.ClearForces();
      }
      ///////////////////////////////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////////////////////////////
      
      // Precede all drawing operations by clearing off the canvas.
      if ( ! c.pauseErase) {
         clearCanvas();
      }
      
      // Start with the walls (render these on the bottom).
      cP.Wall.applyToAll( wall => {
         wall.draw( ctx);
      });
      
      if (c.demoVersion.slice(0,3) == "3.d") {
         cT.Client.applyToAll( client => {
            gB.drawPathAfterShot( ctx, client);
         });
      }
      
      cP.Puck.applyToAll( puck => {
         if ( ! c.piCalcs.usePiEngine) {
            puck.updateState();
         }
         puck.draw( ctx, c.deltaT_s);
      });
      
      // Select all springs where both ends are connected to pucks/pins in the multiselect map.
      cP.Spring.findAll_InMultiSelect( spring => {if (spring.name != hostMSelect.candidateReportPasteDelete) spring.selected = true});
      cP.Joint.findAll_InMultiSelect( joint => {if (joint.name != hostMSelect.candidateReportPasteDelete) joint.selected = true});
      
      cP.Spring.applyToAll( spring => {
         // Note that the draw method calls calculateSeparation, updating the stretch calculation.
         spring.draw( ctx);
         // For a single spring, write report.
         if ( ((cP.Spring.countInMultiSelect == 1) && (spring.inMultiSelect())) || ((hostMSelect.candidateReportPasteDelete) && (spring.name == hostMSelect.candidateReportPasteDelete)) ) {
            if ( ! cP.EpL.displayReport) spring.report();
         }
      });
      
      // Run this report after the spring draw above (calculates stretch value) and the puck.updateState method.
      if (cP.EpL.displayReport) cP.EpL.generateReport();
      
      cP.Pin.applyToAll( pin => {
         pin.draw( ctx, pin.radius_px);
      });
      
      cP.Joint.applyToAll( joint => {
         if ( ((cP.Joint.countInMultiSelect == 1) && (cP.Spring.countInMultiSelect <= 1) && (joint.inMultiSelect())) || ((hostMSelect.candidateReportPasteDelete) && (joint.name == hostMSelect.candidateReportPasteDelete)) ) {
            joint.report();
         }
         joint.draw( ctx);
      });
      
      cT.Client.applyToAll( client => {
         if (client.puck) {
            client.puck.jet.draw( ctx);
            client.puck.gun.draw( ctx, c.deltaT_s);
         }
         if (client.gBS.readyToDraw) {
            gB.drawGhostBall( ctx, client);
            client.gBS.readyToDraw = false;
         }
         if (client.selectedBody) {
            client.drawSelectionPoint( ctx);
            if (client.selectedBody.clientName) client.selectedBody.drawClientName( ctx, c.deltaT_s, {'stayOn':true});
         }
         if (c.drawSyncImage) {
            dF.drawLine( ctx, new wS.Vec2D(10,15), new wS.Vec2D(40,15), {'width_px':10, 'color':'white'} );
         }
         if ((client.sendDrawSyncCommand) && (client.name != 'local')) {
            let control_message = {'from':'host', 'to':client.name, 'data':{'drawSync':{'value':c.drawSyncImage}} };
            hC.sendSocketControlMessage( control_message);
            client.sendDrawSyncCommand = false; // so start/stop messages only gets sent once
         }
      });
      
      // Draw mark for axis of angular momentum calculations.
      if (cP.EpL.displayReport) {
         dF.drawMark( ctx, wS.screenFromWorld( cP.EpL.angularAxis_2d_m), {'borderColor':'cyan', 'radius_px':4, 'crossHairLength_px':15});
         if ((messages['help2'].message == "")) messages['EpLreport'].displayIt( c.deltaT_s, ctx);
      }
      
      // Draw a marking circle on each object in the multi-select map.
      if (hostMSelect.count() > 0) {
         hostMSelect.applyToAll( msObject => msObject.draw_MultiSelectPoint( ctx) );
         // Draw a center mark for the multi-select group.
         if ((hostMSelect.count() > 1) && (c.displayMSC)) hostMSelect.drawCenter( ctx);
      }
      
      // Draw mark for SCM
      if (c.displaySCM) cP.Puck.drawSystemCenterOfMass( ctx);
      
      if ( (['3.d','4.e','5.e'].includes( c.demoVersion.slice(0,3))) || [7,8].includes( c.demoIndex) ) {
         messages['score'].displayIt( c.deltaT_s, ctx);
         if (c.demoVersion.slice(0,3) == '3.d') messages['ppTimer'].displayIt( c.deltaT_s, ctx);
      } else if ((c.demoVersion.slice(0,3) == "6.a") || (c.demoVersion.slice(0,3) == "6.d")) { 
         messages['jelloTimer'].displayIt( c.deltaT_s, ctx);
      }
      
      messages['help'].displayIt( c.deltaT_s, ctx);
      messages['help2'].displayIt( c.deltaT_s, ctx);
      
      messages['gameTitle'].displayIt( c.deltaT_s, ctx);
      messages['win'].displayIt( c.deltaT_s, ctx);
      
      messages['lowHelp'].loc_px.y = canvas.height - 50; // adjust this near-the-bottom help as needed
      messages['lowHelp'].displayIt( c.deltaT_s, ctx);
      
      if (messages['videoTitle']) messages['videoTitle'].displayIt( c.deltaT_s, ctx); // See demo #0
      
      // Client cursors
      cT.Client.applyToAll( client => {
         if ( (client.name.slice(0,3) != 'NPC') && (client.deviceType != 'mobile') && ( ! client.twoThumbsEnabled) ) { 
            client.drawCursor( ctx);
         }
      });
      
      // Display the selection box.
      if (hostSelectBox.enabled) {
         hostSelectBox.update();
         hostSelectBox.draw( ctx);
      }
      
   } // End of updateAirTable
      
             
   /*   
   Reveal public references.
   
   You can reveal mutable objects and functions. But javascript primitives 
   (always copied by values instead of reference) must be accessed with 
   corresponding get and set functions. So, any variable that points to a 
   primitive (and can be changed in this module, not a constant) must be 
   revealed through the use of get and set functions.
   
   An alternative, to the get and set functions for the attributes of c, is to 
   reveal the c object, which is mutable (more control with get and set).
   
   Also note that arrays are mutable objects and can be revealed here. But 
   beware if you need to do filter operations or reset the array by assigning
   to a new empty array. This will leave a hanging reference to the old array
   in the return section. Using a functional interface to the array will avoid
   these problems (see jelloMadness.js and its m_jelloPucks array). Otherwise, 
   be careful, avoid filters, and use a pop loop if you need to empty out the 
   array. Another option is the put the array in a wrapper object and reveal 
   that object.
   
   The canvas element, also an object, makes a good instructive example: 
   Defining before init, 
      var canvas = {}.
   After getElementById is used in init, and assigned to canvas, there will
   be a hanging reference (in the return below) to the original defining 
   statement {}.

   One working approach is to pass canvas and ctx, after the using 
   getElementById, into the initializeModule calls in init. There are also 
   get and set methods (below) that can access canvas dimensions. Another 
   option is to start with a wrapper object, then add canvas and ctx as 
   attributes in init.

   A general working approach is to define external objects as empty 
   objects (a non-primitive), wrappers, as I sometimes refer to them. 
   Then add attributes as needed in init or before. If the initialization 
   involves a call to another module it's best to do that in init because 
   all modules (and their methods) will have been loaded. 

   Notice how sounds and messages are handled this way, attributes added 
   in init.

   And note that b2d is a wrapper. The engine is added as an attribute in init.
   
   Note that hostMSelect and hostSelectBox are instantiated before calling init.
   So this requires that multiSelect.js be loaded before this module. A better
   approach would be to define a single wrapper for both, expose that in the
   return below, and instantiate these as attributes of the wrapper. For now,
   it's instructive (and easier) to leave these as they are...
   */

   return {
      // Objects
      'b2d': b2d,
      
      'tableMap': tableMap,
      'hostMSelect': hostMSelect,
      'hostSelectBox': hostSelectBox,
      'clients': clients,
      'sounds': sounds,
      'dC': dC,
      'keyMap': keyMap,
      'messages': messages,
      'aT': aT,
      
      // Variables
      'getG_ON': function() { return c.g_ON; },
      'setG_ON': function( val) { c.g_ON = val; },
      
      'getG_mps2': function() { return c.g_mps2; },
      
      'getPx_per_m': function() { return c.px_per_m; },
      
      'getDeltaT_s': function() { return c.deltaT_s; },
      
      'getSingleStep': function() { return c.singleStep; },
      
      'getFrameRate': function() { return c.frameRate; },
      
      'getFrameCount': function() { return c.frameCount; },
      
      'getChatLayoutState': function() { return c.chatLayoutState; },
      
      'getDemoVersion': function() { return c.demoVersion; },
      'setDemoVersion': function( val) { c.demoVersion = val; },
      
      'getDemoIndex': function() { return c.demoIndex; },
      
      'getPauseErase': function() { return c.pauseErase; },
      
      'getLagTesting': function() { return c.lagTesting; },
      
      'getSoftConstraints_default': function() { return c.softConstraints_default; },
      
      'getLastClientToScoreHit': function() { return c.lastClientToScoreHit; },
      'setLastClientToScoreHit': function( val) { c.lastClientToScoreHit = val; },
      
      'getFullScreenDemo': function() { return c.fullScreenDemo; },
      'setFullScreenDemo': function( val) { c.fullScreenDemo = val; },
      
      'getLockedAndLoaded': function() { return c.lockedAndLoaded; },
      'setLockedAndLoaded': function( val) { c.lockedAndLoaded = val; },
      
      'getPiCalcs': function() {return {'enabled': c.piCalcs.enabled, 'clacks':c.piCalcs.clacks, 'usePiEngine':c.piCalcs.usePiEngine}; },
      'setPiCalcs': function( enabled, clacks, usePiEngine) { c.piCalcs.enabled = enabled, c.piCalcs.clacks = clacks, c.piCalcs.usePiEngine = usePiEngine; }, 
      
      'get_displaySCM': function() { return c.displaySCM; },
      'set_displaySCM': function( val) { c.displaySCM = val; },
      
      'get_displayMSC': function() { return c.displayMSC; },
      'set_displayMSC': function( val) { c.displayMSC = val; },
      
      'get_hostCanvasWH': function() {return {'width':canvas.width, 'height':canvas.height};},
      'set_hostCanvasWH': function( width, height) {canvas.width = width, canvas.height = height;}, 
      
      // Methods
      'toggleMultiplayerStuff': toggleMultiplayerStuff,    
      
      'init': init,
      'setPauseState': setPauseState,
      'startit': startit,
      'stopit': stopit,
      'setFrameRate': setFrameRate,
      'stepAnimation': stepAnimation,
      'oneFrameIfPaused': oneFrameIfPaused,
      'restartAnimationLoop': restartAnimationLoop,
      
      'clearCanvas': clearCanvas,
      'resetFenceColor': resetFenceColor,
      
   };
   
})();