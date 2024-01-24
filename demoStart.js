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

// Demo Starter (dS) module
// demoStart.js 
   console.log('dS _*-*_');
// 10:03 PM Fri December 8, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.dS = (function() {
   "use strict";
   
   // Module globals for objects brought in by initializeModule and initializeEventListeners.
   var canvas, ctx, dC, c, aT, keyMap, clients;
   
   // Two functions in this module are used by the client page: fullScreenState and adjustSizeOfChatDiv. 
   // The client does not call initializeModule (importing name space from the host) so dC and c are initialized here.
   var m_hostOrClient;
   if ( window.location.href.includes("client") ) {
      m_hostOrClient = "client";
      
      dC = {};
      c = {};
      c.fullScreenState = false;
      
   } else {
      m_hostOrClient = "host";
   }
    
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( gW_canvas, gW_ctx, gW_dC, gW_c, gW_aT, gW_keyMap, gW_clients) {
      // the client page doesn't use this initialization (see note above)
      canvas = gW_canvas;
      ctx = gW_ctx;
      
      dC = gW_dC;
      c = gW_c;
      aT = gW_aT;     
      keyMap = gW_keyMap;
      clients = gW_clients;
   }
   
   // Functions in support of the demos ////////////////////////////////////////
   
   function demoVersionBase( demoVersion) {
      var parts = demoVersion.split(".");
      return parts[0] + "." + parts[1];
   }
   
   /*
   // Editor help toggle
   function openDemoHelp() {
      // Not using this anymore. A bit confusing. Might bring it back.
      if (dC.multiplayer.checked) {
         $('#chkMultiplayer').trigger('click');
      }
      uT.toggleElementDisplay('outline1','block');
      uT.toggleSpanValue('moreOrLess','More','Less');
      uT.toggleSpanValue('moreOrLess2','More','Less');
      pS.scroll('editorMark');
   }
   */
   
   function resetToDefaults_gOnOff_RestAndFriction() {    
      cP.Puck.restitution_default_gOn =  0.7;
      cP.Puck.friction_default_gOn =  0.6;
      cP.Puck.restitution_default_gOff = 1.0;
      cP.Puck.friction_default_gOff = 0.1;
      
      cP.Puck.restitution_gOn = cP.Puck.restitution_default_gOn;
      cP.Puck.friction_gOn = cP.Puck.friction_default_gOn;
      
      cP.Puck.restitution_gOff = cP.Puck.restitution_default_gOff;
      cP.Puck.friction_gOff = cP.Puck.friction_default_gOff;
   }
   
   function setGravityRelatedParameters( pars) {
      let restitution, friction;
      let showMessage = uT.setDefault( pars.showMessage, false);
      let updatePucks = uT.setDefault( pars.updatePucks, true);
   
      if (c.g_ON) {
         // Box2D velocityThreshold setting is needed for settling stacks of pucks.
         b2DW.Settings.b2_velocityThreshold = 1.0; // 1.0
         cP.Puck.g_2d_mps2 = new wS.Vec2D(0.0, -c.g_mps2);
         restitution = cP.Puck.restitution_gOn;
         friction =    cP.Puck.friction_gOn;
      } else {
         // But here, with no gravity, it's better to turn the velocityThreshold setting off 
         // so pucks don't stick to walls.
         b2DW.Settings.b2_velocityThreshold = 0.0; // 0.0
         cP.Puck.g_2d_mps2 = new wS.Vec2D(0.0, 0.0);
         restitution = cP.Puck.restitution_gOff;
         friction =    cP.Puck.friction_gOff;
      }
      if (showMessage) {
         gW.messages['help'].newMessage('Gravity = [base,yellow]' + cP.Puck.g_2d_mps2.y + '[base]', 1.0);
      }
      
      // If not fixed, set puck restitution and friction properties.
      if (updatePucks) {
         cP.Puck.applyToAll( puck => {
            if ( ! puck.restitution_fixed) {
               puck.b2d.m_fixtureList.m_restitution = restitution;
               puck.restitution = restitution;
            }
            if ( ! puck.friction_fixed) {
               puck.b2d.m_fixtureList.m_friction    = friction;
               puck.friction = friction;
            }
         });
      }
   }
   
   function em( px) {
      // Convert to em units based on a font-size of 16px.
      return px/16.0;
   }
   
   function fullScreenState( mode = 'get') {      
      // Get or set the fullscreen state. This function is revealed.
      if (mode == 'get') {
         return c.fullScreenState;
      } else if (mode == 'on') {
         c.fullScreenState = true;
      } else if (mode == 'off') {
         c.fullScreenState = false;
      } else {
         console.log('from fullScreenState');
      }
   }
   
   function improveCanvasResolution( canvas, width_px, height_px) {
      let ratio = window.devicePixelRatio;
      ratio *= 3;
      
      canvas.width = width_px * ratio;
      canvas.height = height_px * ratio;
      canvas.style.width = width_px + "px";
      canvas.style.height = height_px + "px";
      canvas.getContext("2d").scale( ratio, ratio);
   }   

   function adjustSizeOfChatDiv( mode) {
      // This is used for both the host and client pages. Any calls to getElementById
      // will return a null for elements not found on that page.
      
      if (mode == 'mobile') mode = 'small';
      
      // Input fields
      dC.nodeServer = document.getElementById('nodeServer');
      dC.roomName = document.getElementById('roomName');
      dC.inputField = document.getElementById('inputField');
      
      // The two divs that toggle
      dC.multiPlayer = document.getElementById('multiPlayer');
      dC.ttcIntro = document.getElementById('ttcIntro');
      
      // connectionCanvas is only on the client page.
      dC.connectionCanvas = document.getElementById('connectionCanvas');
      
      var divW_Large = em(540);
      var divW_Small = em(540-118);  //118

      var tweek = -8;
      var nodeServer_Large = em(332+tweek);
      var roomName_Large   = em( 70+0);
      var inputField_Large = em(534+tweek); //536
      var connectionCanvas_Large_px = 518+tweek;  //518
      
      var shrink_px = 141;
      var shrink = em( shrink_px);
      
      var nodeServer_Small = nodeServer_Large - shrink;
      var roomName_Small   = roomName_Large   -  em(0);
      var inputField_Small = inputField_Large - shrink;
      var connectionCanvas_Small_px = connectionCanvas_Large_px - 117;
      
      let canvasWidth_px, canvasHeight_px;
      
      if (mode == 'small') {
         dC.nodeServer.style.width = (nodeServer_Small) + 'em';
         dC.roomName.style.width   = (roomName_Small  ) + 'em';
         dC.inputField.style.width = (inputField_Small) + 'em';
         
         canvasWidth_px = connectionCanvas_Small_px;
         canvasHeight_px = 15;
         
         if (dC.connectionCanvas) {
            //dC.connectionCanvas.width = canvasWidth_px;
            //dC.connectionCanvas.height = canvasHeight_px;
            hC.refresh_P2P_indicator({'mode':'p2p','context':'sizeAdjust'});
         }
         
         dC.ttcIntro.style.maxWidth    = divW_Small + 'em';
         dC.ttcIntro.style.minWidth    = divW_Small + 'em';
         
         dC.multiPlayer.style.maxWidth = divW_Small + 'em';
         dC.multiPlayer.style.minWidth = divW_Small + 'em';
         
      } else {
         dC.nodeServer.style.width = (nodeServer_Large) + 'em';
         dC.roomName.style.width   = (roomName_Large  ) + 'em';
         dC.inputField.style.width = (inputField_Large) + 'em'; 
         
         canvasWidth_px = connectionCanvas_Large_px;
         canvasHeight_px = 15;
         
         if (dC.connectionCanvas) {
            //dC.connectionCanvas.width = canvasWidth_px;
            //dC.connectionCanvas.height = canvasHeight_px;
            hC.refresh_P2P_indicator({'mode':'p2p','context':'sizeAdjust'});
         }

         dC.ttcIntro.style.maxWidth    = divW_Large + 'em';
         dC.ttcIntro.style.minWidth    = divW_Large + 'em';
         
         dC.multiPlayer.style.maxWidth = divW_Large + 'em';
         dC.multiPlayer.style.minWidth = divW_Large + 'em';
      }
      
      if (dC.connectionCanvas) improveCanvasResolution( dC.connectionCanvas, canvasWidth_px, canvasHeight_px);
   }    
   
   function setNickNameWithoutConnecting() {
      let nickNameResult = hC.checkForNickName('normal');
      
      if (nickNameResult.status == 'too long') {
         hC.displayMessage('Nicknames must have 10 characters or less.');
         
      } else if (nickNameResult.status == 'too short') {
         hC.displayMessage('Nicknames must have more than 1 alphanumeric character.');
         
      } else if (nickNameResult.value) {
         hC.displayMessage('Your nickname is ' + nickNameResult.value + '.');
      }

      // If no nickname yet (unless there's modify-capture JSON in the chat field), put back the nickname reminder tip in the chat input field.
      if (nickNameResult.status != 'JSON') {
         if ( ! (clients['local'].nickName)) hC.restoreInputDefault( document.getElementById('inputField'));
      }
   }
      
   function hL( id) {
      /*      
      hL is short for highlighting...
      This inserts a style string in the links of the "Plus" row below the 
      number button cluster. So, when a link in the plus row is clicked (or a 
      number clicked), the demo is loaded and started, and each link in the 
      row is rebuilt (using calls to hL) and highlighted according to whether 
      it matches the first part of the demo version (e.g. 3.d). See calls to 
      hL in demoStart. See related code (that modifies the plus row) in 
      cR.saveState, cR.clearState, and near the top of demoStart.
      */
      //console.log(id + ',' + c.demoVersion.slice(0,3) + ',' + c.demoVersion.length);
      var idString = " id='" + id + "' ";
      
      // the link id that matches demoVersion (from capture in the text area), e.g. 2.c
      if (id == c.demoVersion.slice(0,3)) {
         // special captures have a black border, e.g. 2.c.334
         if (c.demoVersion.length > 3) {
            var styleString = "style='color:white; background-color:gray; border-style:solid; border-color:black; border-width:4px 0px 4px 0px'";
         // link ids that match a regular selected capture get a gray background (without a black border)
         } else {
            var styleString = "style='color:white; background-color:gray; padding:2px 0px'";
         }
      // link ids that don't match get a normal background color (off white)  
      } else {
         var styleString = "style='padding:2px 0px'";
      }
      
      return idString + styleString;
   }
      
   function defaultStartingPosAndVel( demoVersion) {
      let startingPandV;
      
      if (demoVersion.slice(0,1) == '7') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(2.6, 3.4), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(3.4, 3.4), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(3.4, 2.6), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(2.6, 2.6), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];

      } else if (demoVersion.slice(0,3) == '8.a') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D( 9.34, 5.23), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(10.21, 7.61), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(10.21, 4.46), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D( 9.34, 6.84), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      } else if (demoVersion.slice(0,3) == '8.b') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(1.3, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(2.0, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(3.0, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(4.0, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      } else if (demoVersion.slice(0,3) == '8.c') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(2.77, 4.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(2.77, 3.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(2.77, 2.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(2.77, 1.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      } else if (demoVersion.slice(0,3) == '8.d') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(4.95, 4.91), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(5.95, 4.91), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(6.95, 4.91), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(7.95, 4.91), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      } else if (demoVersion.slice(0,3) == '8.e') {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(2.0, 5.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(3.0, 5.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(4.0, 5.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(5.0, 5.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      
      } else {
         startingPandV = [ {'position_2d_m':new wS.Vec2D(2.0, 6.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(3.0, 6.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(4.0, 6.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)},
                           {'position_2d_m':new wS.Vec2D(5.0, 6.0), 'velocity_2d_mps':new wS.Vec2D(0.0, 0.0)} ];
      }
      
      return startingPandV;
   }
   
   function demoStart( index, pars = {}) {
      var v_init_2d_mps, buttonColor, buttonTextColor;
      var p1, p2, p3, p4;
      
      var scrollCA = uT.setDefault( pars.scrollCA, true);
      var scrollHelp = uT.setDefault( pars.scrollHelp, true);
      var restartLoop = uT.setDefault( pars.restartLoop, true);
      var logThis = uT.setDefault( pars.logThis, true);
      
      aT.collisionCount = 0;
      aT.collisionInThisStep = false;
      
      // by default no blending
      ctx.globalCompositeOperation = 'source-over';
            
      // Scroll the capture, so you can see the name of the capture if it's there.
      // However, nice to be able to edit the capture and run it without losing the spot where
      // you're working. In that case, set scrollCA to be false.
      if (scrollCA) cR.scrollCaptureArea();
      
      // Set this module-level value to support the JSON capture.
      c.demoIndex = index;
      var networkPuckTemplate = null;
      
      dC.extraDemos.innerHTML = '';
      
      // Scaling factor between the Box2d world and the screen (pixels per meter)
      c.px_per_m = 100;  // a module-level value
      
      c.fullScreenDemo = false;
      c.lockedAndLoaded = false;
      
      cP.EpL.turnDisplayOff({});
      cP.EpL.COM = false; // reset this flag that indicates when a capture uses COM for the angular axis.
      
      canvas.width = 600, canvas.height = 600;
      c.canvasColor = 'black';
      ctx.scale(1, 1);
      gW.clearCanvas();
      
      // The canvas background color must match the border color to avoid border edge problems in Chrome. (border is usually '#008080')
      canvas.style.borderColor = c.borderAndBackGroundColor; // border dimensions are initially set for hostCanvas in hostAndClient.css
      if (c.fullScreenState) {
         // There's no border in full-screen mode.
         canvas.style.backgroundColor = 'black';
      } else {
         canvas.style.backgroundColor = c.borderAndBackGroundColor;
      }
      
      cP.Wall.topFenceLegName = null; // For use in pi-calc demos
      
      if (index != 8) {  // see layout adjustments for demo 8 in (index == 8) block below
         adjustSizeOfChatDiv('normal'); // on the host (note: see demo 8 where a smaller chat div is set).
         hC.resizeClients('normal'); // adjust the chat div on all the clients
         // Set this module-level value to help new connecting clients adjust their layout.
         c.chatLayoutState = 'normal';
      }
                
      // Change the color of the demo button that was clicked.
      for (var j = 1; j <= 9; j++) {
         if (j == index) {
            buttonColor = "yellow";
            buttonTextColor = "black";
         } else {
            // Darkgray (with white text) for the game buttons
            if ([3,4,6,7,8].includes(j)) {
               buttonColor = "darkgray";
               buttonTextColor = "white";
            } else {
               buttonColor = "lightgray";
               buttonTextColor = "black";
            }
         }
         document.getElementById('b'+j).style.backgroundColor = buttonColor;
         document.getElementById('b'+j).style.color = buttonTextColor;
         
         dC.indexInPlusRow.innerHTML = index + ":";
      }
      
      tA.clearTable(); 
      
      gB.resetTableHistory();
      cT.Client.startingPandV = [];
      
      gW.hostMSelect.candidateReportPasteDelete = null;
      
      // Reset input devices (key states sometimes get stuck down).
      cT.Client.applyToAll( client => {
         // Force a mouseUp event.
         eV.mouseUp_handler( client.name);
         
         client.touchScreenUsage = false;
         
         // Reset all keys to be up.
         // Don't reset the number key that corresponds to the current demo. That avoids repetition if holding down a demo key (see comments in keydown listener).
         let keyBeingPressed = 'key_' + index;
         for (var key in keyMap) {
            if (keyMap[ key] != keyBeingPressed) {
               client[ keyMap[ key]] = 'U';
            }
         }
         
         client.bulletAgeLimit_ms = null;
      });
      
      setNickNameWithoutConnecting();
      cT.Client.resetScores();
      
      // De-select anything still selected.
      clients['local'].selectedBody = null;
      gW.hostMSelect.resetAll();
            
      gW.resetFenceColor( "white");
      if (dC.pause.checked) {
         dC.pause.checked = false;
      }
      
      // setPauseState will start the game loop only if it IS NOT running.
      c.frameCount = 0;
      gW.setPauseState();
      // restartAnimationLoop will restart the loop only if it IS running.
      let notDemo0ExitFromFC = ( ! (document.fullscreenElement && (index ==0)) );
      if (restartLoop && notDemo0ExitFromFC) gW.restartAnimationLoop( 200);
      
      // Turn gravity off by default.
      if (c.g_ON) {
         c.g_ON = false;
         dC.gravity.checked = false;
      }
      
      // Note that setGravityRelatedParameters runs at the end of demoStart.
      resetToDefaults_gOnOff_RestAndFriction();
      
      dC.comSelection.checked = true;
      
      pP.setBulletAgeLimit_ms(1000);
      
      // reset the pi stuff back to defaults
      c.piCalcs = {'clacks':false, 'usePiEngine':false};
      
      // These message resets shut down any lingering messages from prior demos.
      gW.messages['help'].resetMessage();
      gW.messages['help'].loc_px = {'x':15,'y':30}; // The help location for all the non-game demos.
      
      gW.messages['help2'].resetMessage();
      gW.messages['help2'].loc_px = {'x':15,'y':200}; // report for a selected spring.
      gW.messages['EpLreport'].loc_px = {'x':15,'y':50}; // report for a selected spring.
      gW.messages['win'].resetMessage();
      gW.messages['win'].color = 'yellow';
      
      gW.messages['lowHelp'].resetMessage();
      
      gW.messages['gameTitle'].resetMessage();
      
      gW.messages['score'].resetMessage();
      gW.messages['score'].loc_px = {'x':30, 'y':40};
      
      if (gW.messages['videoTitle']) gW.messages['videoTitle'].resetMessage();
            
      // By default, use "a" for the demoVersion. 
      // (Loading a capture will overwrite this default value, as it should.)
      // When a capture is taken, its name will be based on (added to) this demo version name.
      c.demoVersion = index + '.a';
      
      // Convert (parse) the json capture into a local object.
      if (dC.json.value != '') {
         try {
            var state_capture = JSON.parse( dC.json.value);
         } catch (err) {
            var state_capture = null;
            window.alert("There's a formatting error in the state capture. Try clicking the 'Clear' button.");
         }
      } else {
         var state_capture = null;
      }
      
      // pool game locks and settings
      // (see also "if (c.lockedAndLoaded)" block)
      if ( (state_capture) && (index == 3) && (state_capture.demoVersion.slice(0,3) == "3.d") ) {
         // Initiate new clients that don't have pool-game locks set. Restarting the
         // pool game will not reset values for a continuing player.
         cT.Client.applyToAll( client => {
            if ( ! (client.ctrlShiftLock && client.poolShotLocked) ) {
               client.ctrlShiftLock = true;
               client.poolShotLocked = true;
               client.poolShotLockedSpeed_mps = 20;
               client.fineMovesState = 'off';
            }
         });
      } else {
         // Turn off the pool game locks when starting all other demos.
         // (see also "if (c.lockedAndLoaded)" block below where these are turned on for special demos)
         cT.Client.applyToAll( client => {
            client.ctrlShiftLock = false;
            client.poolShotLocked = false;
            client.poolShotLockedSpeed_mps = 0;
         });
      }
      
      if (index == 0) {
         cR.clearState();
         c.pauseErase = false;
         c.displaySCM = false;
         if (document.fullscreenElement) eVN.changeFullScreenMode( canvas, 'off');
         pS.scroll('scroll-to-very-top');
         dC.extraDemos.innerHTML = " reset";         
         gW.messages['help'].newMessage("The zero key triggers a complete reset.\\   For a stronger reset, try reloading the page.", 3.0);         
                  
         // Normally, the "0" demo is kept blank for observing the framerate.
         
         /*
         // The following is an animation that was used in the beginning of the Puck Popper video.
         //canvas.width = 1250, canvas.height = 950;
         //canvas.width = 1920, canvas.height = 1080;
         canvas.width = 1850, canvas.height = 1060;
         cP.Wall.makeFence({'tOn':false,'rOn':false}, canvas); // Turn top and right walls off.
         
         gW.messages['videoTitle'].font = "35px Arial";
         gW.messages['videoTitle'].loc_px = {'x':300,'y':400};
         gW.messages['videoTitle'].popAtEnd = false;
         var theSeries = {
            1:{'tL_s':1.5, 'message':"an introduction..."},
            2:{'tL_s':1.5, 'message':"maybe less...",            'loc_px':{'x':300,'y':400} },
            3:{'tL_s':1.5, 'message':"maybe more...",            'loc_px':{'x':300,'y':450} },
            4:{'tL_s':1.5, 'message':"than you should know...",  'loc_px':{'x':300,'y':400} },
            6:{'tL_s':1.5, 'message':"about...",                 'loc_px':{'x':300,'y':450},                      'popAtEnd':true},
            7:{'tL_s':1.3, 'message':"Puck",                     'loc_px':{'x':250,'y':350}, 'font':"90px Arial", 'popAtEnd':true},
            8:{'tL_s':1.5, 'message':"Popper",                   'loc_px':{'x':300,'y':450},                      'popAtEnd':false},
            
            9:{'tL_s':1.0, 'message':"...",                                 'loc_px':{'x':300,'y':450}, 'font':"35px Arial"},
            10:{'tL_s':1.5, 'message':"but first...",                       'loc_px':{'x':300,'y':450}, 'font':"35px Arial"},
            11:{'tL_s':3.0, 'message':"a game of the #8c version...", 'loc_px':{'x':300,'y':450} },
         };
         gW.messages['videoTitle'].newMessageSeries( theSeries);
         
         var nBalls = 36; //100 36 180
         var angle_step_deg = 360.0 / nBalls;
         var v_2d_mps = new wS.Vec2D(0, 2.0);
         // 12.5/2, 9.5/2
         for (var i = 1; i <= nBalls; i++) {
               new cP.Puck(new wS.Vec2D(3.0, 3.0), v_2d_mps, {'radius_m':0.1, 'groupIndex':-1, 'color':'white', 'friction':0.0});
               // Rotate for the next ball.
               v_2d_mps.rotated_by( angle_step_deg);
         }
         */
         
      } else if (index == 1) {
         
         if ((state_capture) && (state_capture.demoIndex == 1)) {
            cR.restoreFromState( state_capture);
            
            if ( ['1.c','1.d','1.e','1.f'].includes( demoVersionBase( c.demoVersion)) ) {
               // play the clack sound once at low (not zero) volume to make sure it is loaded and ready for the first collision.
               gW.sounds['clack2'].play(0.05);
               
               if (c.piCalcs.enabled) {
                  var massRatio = Math.round( aT.puckMap['puck2'].mass_kg / aT.puckMap['puck1'].mass_kg);
                  var massRatio_string = massRatio.toLocaleString(); // commas in the string
                  gW.messages['lowHelp'].newMessage("Mass ratio = " + massRatio_string, 3.0);
                  
                  if (c.piCalcs.usePiEngine) {
                     var initialCount = pE.get_collisionCount();
                  } else {
                     var initialCount = aT.collisionCount;
                  }
                  // This initial message is updated for both engines, box2d and piCalcs.
                  gW.messages['help'].newMessage("count = " + initialCount, 30.0);
               }
            }
            
         } else {
            cP.Wall.makeFence({}, canvas);
            
            var v_init_2d_mps = new wS.Vec2D(0.0, -2.0);
            new cP.Puck( new wS.Vec2D(2.0, 4.00),       v_init_2d_mps, {'radius_m':0.15, 'color':'GoldenRod', 'colorSource':true, 'bullet':true});
            new cP.Puck( new wS.Vec2D(2.0, 3.00),       v_init_2d_mps, {'radius_m':0.80                                         , 'bullet':true});
            
            var v_init_2d_mps = new wS.Vec2D(0.0,  2.0);
            new cP.Puck( new wS.Vec2D(5.00, 1.60+1.5*2), v_init_2d_mps, {'radius_m':0.35                                         , 'bullet':true});
            new cP.Puck( new wS.Vec2D(5.00, 1.60+1.5),   v_init_2d_mps, {'radius_m':0.35, 'color':'GoldenRod', 'colorSource':true, 'bullet':true});
            new cP.Puck( new wS.Vec2D(5.00, 1.60),       v_init_2d_mps, {'radius_m':0.35                                         , 'bullet':true});
            
            new cP.Puck( new wS.Vec2D(0.50, 5.60), new wS.Vec2D(0.40, 0.00), {'radius_m':0.15, 'bullet':true});
            
            cP.Puck.applyToAll( puck => { 
               if (puck.name != "puck1111") {
                  puck.angleLine = "stripe";
                  puck.borderWidth_px = 0;
                  puck.b2d.SetAngle( Math.PI/2);
               }
            })
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='big and little'     " + hL('1.a') + " onclick=\"cR.clearState(); dS.demoStart(1)\">&nbsp;a,</a>" +
            "<a title='a gentle landing' "   + hL('1.b') + " onclick=\"cR.demoStart_fromCapture(1, {'fileName':'demo1b.js'})\">&nbsp;b,</a>" +
            "<a title='calculating the first two digits of pi with collisions' " + hL('1.c') + " onclick=\"cR.demoStart_fromCapture(1, {'fileName':'demo1c.js'})\">&nbsp;c,</a>" +
            "<a title='three digits of pi' " + hL('1.d') + " onclick=\"cR.demoStart_fromCapture(1, {'fileName':'demo1d.js'})\">&nbsp;d,</a>" +
            "<a title='five digits of pi' " + hL('1.e') + " onclick=\"cR.demoStart_fromCapture(1, {'fileName':'demo1e.js'})\">&nbsp;e&nbsp;</a>";
         
         if (scrollHelp) {
            if ( ['1.c','1.d','1.e'].includes( demoVersionBase( c.demoVersion)) ) {               
               pS.scroll('d1_pi');
            } else {
               pS.scroll('d1');
            }
         }
         
      } else if (index == 2) {
         
         if (scrollHelp) pS.scroll('d2');
         
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.restitution_gOff = 1.0;
         cP.Puck.friction_gOn =  0.6;
         cP.Puck.friction_gOff = 0.0;
         
         if ((state_capture) && (state_capture.demoIndex == 2)) {
            cR.restoreFromState( state_capture);
            
         } else {
            cP.Wall.makeFence({}, canvas);
            new cP.Puck( new wS.Vec2D(4.5, 4.5), new wS.Vec2D(-4.0, 4.0), {'radius_m':0.20, 'friction':0.0, 'angleLine':false, 'color':'gray', 'colorSource':true, 'borderWidth_px':2,
                                                                  'createTail':true, 'tail':{'propSpeed_ppf_px':2, 'length_limit':35, 'color':'teal'} });
                                                                  
            new cP.Puck( new wS.Vec2D(3.0, 3.0), new wS.Vec2D( 0.0, 0.0), {'radius_m':0.60, 'friction':0.0, 'angleLine':false, 'color':'teal', 'borderWidth_px':0, 'colorSource':true });
                                                                  
            new cP.Puck( new wS.Vec2D(1.5, 1.5), new wS.Vec2D( 0.0, 0.0), {'radius_m':0.20, 'friction':0.0, 'angleLine':false, 'color':'gray', 'colorSource':true, 'borderWidth_px':2,
                                                                  'createTail':true, 'tail':{'propSpeed_ppf_px':2, 'length_limit':35, 'color':'teal'} });
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='sound field'                          " + hL('2.a') + " onclick=\"cR.clearState(); dS.demoStart(2)\">&nbsp;a,</a>" +
            "<a title='pretty'                               " + hL('2.b') + " onclick=\"cR.demoStart_fromCapture(2, {'fileName':'demo2b.js'})\">&nbsp;b,</a>" +
            "<a title='Mach speeds of 1.0, 1.4, and 2.0'     " + hL('2.c') + " onclick=\"cR.demoStart_fromCapture(2, {'fileName':'demo2c.js'})\">&nbsp;c,</a>" +
            "<a title='tag'                                  " + hL('2.d') + " onclick=\"cR.demoStart_fromCapture(2, {'fileName':'demo2d.js'})\">&nbsp;d,</a>" +
            "<a title='rainbow'                              " + hL('2.e') + " onclick=\"cR.demoStart_fromCapture(2, {'fileName':'demo2e.js'})\">&nbsp;e&nbsp;</a>";
            
         if (c.demoVersion.slice(0,3) == "2.e") {
            var messageString =                                 'Play with the rainbow tail:';
            if ( ! document.fullscreenElement) messageString += '\\    click the full-canvas button, then...';
            messageString +=                                    '\\    click and drag the black ball.';
            gW.messages['help'].newMessage( messageString, 3.0);
         }
         
      } else if (index == 3) {
         
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.friction_gOn =  0.6;
         
         cP.Puck.restitution_gOff = 1.0;
         cP.Puck.friction_gOff = 0.0;
         
         v_init_2d_mps = new wS.Vec2D(0.0, 2.0); 
         
         if ((state_capture) && (state_capture.demoIndex == 3)) {
            cR.restoreFromState( state_capture);
            
            if (c.demoVersion.slice(0,3) == "3.d") {               
               c.canvasColor = '#2b473b'; // #36594a
               gB.resetGame(); // ghost-ball
            }
            
         } else {
            cP.Wall.makeFence({}, canvas);
            
            var grid_order = 7;
            var grid_spacing_m = 0.45;
            var startPosition_2d_m = new wS.Vec2D(0.0, 0.0);
            
            for (var i = 1; i <= grid_order; i++) {
               for (var j = 1; j <= grid_order; j++) {
                  var delta_2d_m = new wS.Vec2D( i * grid_spacing_m, j * grid_spacing_m);
                  var position_2d_m = startPosition_2d_m.add( delta_2d_m);
                  new cP.Puck( position_2d_m, v_init_2d_mps, {'radius_m':0.10, 'groupIndex':0, 'borderWidth_px':2});
               }
            }
            
            v_init_2d_mps = new wS.Vec2D(0.2, 0.0);
            new cP.Puck( new wS.Vec2D(5.5, 3.5), v_init_2d_mps, {'radius_m':0.10, 'color':'GoldenRod', 'colorSource':true, 'groupIndex':0, 'borderWidth_px':2} );
            
            /*
            // Expanding ring of non-colliding balls.
            var nBalls = 36; //100 36 180
            var angle_step_deg = 360.0 / nBalls;
            var v_2d_mps = new wS.Vec2D(0, 2.0);
            for (var i = 1; i <= nBalls; i++) {
                  new cP.Puck(new wS.Vec2D(3, 3), v_2d_mps, {'radius_m':0.1, 'groupIndex':-1, 'color':'white'});
                  // Rotate for the next ball.
                  v_2d_mps.rotated_by( angle_step_deg);
            }
            window.setTimeout( function() {
               cR.saveState();
            }, 1);
            */
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='order and disorder'      " + hL('3.a') + " onclick=\"cR.clearState(); dS.demoStart(3)\">&nbsp;a,</a>" +
            "<a title='no puck-puck collisions' " + hL('3.b') + " onclick=\"cR.demoStart_fromCapture(3, {'fileName':'demo3b.js'})\">&nbsp;b,</a>" +
            "<a title='no puck-puck collisions' " + hL('3.c') + " onclick=\"cR.demoStart_fromCapture(3, {'fileName':'demo3c.js'})\">&nbsp;c,</a>" +
            "<a title='pool shots' "              + hL('3.d') + " onclick=\"cR.demoStart_fromCapture(3, {'fileName':'demo3d.js'})\">&nbsp;d&nbsp;</a>";
            
         if (scrollHelp) {
            if ( ['3.d'].includes( demoVersionBase( c.demoVersion)) ) {               
               pS.scroll('d3d');
            } else {
               pS.scroll('d3');
            }
         }
         
      } else if (index == 4) {
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.friction_gOn =  0.6;
         
         cP.Puck.restitution_gOff = 1.0;
         cP.Puck.friction_gOff = 0.0;
                 
         if ((state_capture) && (state_capture.demoIndex == 4)) {
            cR.restoreFromState( state_capture);
            
            if (c.demoVersion.slice(0,3) == "4.e") {  // Monkey Hunt game             
               c.canvasColor = '#324440'; 
               gW.messages['score'].loc_px = {'x':30, 'y':40};
               mH.initializeGame();
            }
            
         } else {
            cP.Wall.makeFence({}, canvas);
            
            new cP.Puck( new wS.Vec2D(3.00, 3.00), new wS.Vec2D( 0.0, 0.0), 
               {'radius_m':0.40, 'color':'GoldenRod', 'colorSource':true , 'shape':'rect', 'angularSpeed_rps':25.0});
            
            new cP.Puck( new wS.Vec2D(0.25, 3.00), new wS.Vec2D( 2.0, 0.0), 
               {'radius_m':0.15, 'shape':'rect', 'aspectR':4.0, 'angularSpeed_rps':0, 'angle_r': Math.PI/2});
            new cP.Puck( new wS.Vec2D(5.75, 3.00), new wS.Vec2D(-2.0, 0.0), 
               {'radius_m':0.15, 'shape':'rect', 'aspectR':4.0, 'angularSpeed_rps':0, 'angle_r': Math.PI/2});
               
            // Include two pins and a spring as a source for replicating. 
            new cP.Spring( new cP.Pin( new wS.Vec2D( 0.3, 0.3),{}), new cP.Pin( new wS.Vec2D( 1.6, 0.3),{}), 
                 {'length_m':1.3, 'strength_Npm':10.0, 'unstretched_width_m':0.1, 'color':'yellow', 'damper_Ns2pm2':1.0});
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='rectangular symmetry'                " + hL('4.a') + " onclick=\"cR.clearState(); dS.demoStart(4)\">&nbsp;a,</a>" +
            "<a title='conservation of angular momentum...' " + hL('4.b') + " onclick=\"cR.demoStart_fromCapture(4, {'fileName':'demo4b.js'})\">&nbsp;b,</a>" +
            "<a title='no surface friction or y momentum' "   + hL('4.c') + " onclick=\"cR.demoStart_fromCapture(4, {'fileName':'demo4c.js'})\">&nbsp;c,</a>" +
            "<a title='little moves big' "                    + hL('4.d') + " onclick=\"cR.demoStart_fromCapture(4, {'fileName':'demo4d.js'})\">&nbsp;d&nbsp;</a>" +
            "<a title='get that monkey' "                     + hL('4.e') + " onclick=\"cR.demoStart_fromCapture(4, {'fileName':'demo4e.monkeyhunt.js'})\">&nbsp;e&nbsp;</a>";
         
         if (scrollHelp) {
            if ( c.demoVersion.includes('4.e.monkeyhunt') ) {
               pS.scroll('hunt');
            } else {
               pS.scroll('d4');
            }   
         } 
         
      } else if (index == 5) {
         
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.friction_gOn =  0.6;
         
         cP.Puck.restitution_gOff = 1.0;
         cP.Puck.friction_gOff = 0.0;

         v_init_2d_mps = new wS.Vec2D(0.0,0.0);         
         
         if ((state_capture) && (state_capture.demoIndex == 5)) {
            cR.restoreFromState( state_capture);
            
            if (c.demoVersion.includes('basketball')) {
               c.canvasColor = '#262626';  // gray 262626 333333 (lighter)
               gW.messages['score'].loc_px = {'x':30, 'y':40};
               bpH.initializeGame();
            }        
            
         } else {
            cP.Wall.makeFence({}, canvas);
            gW.aT.wallMap['wall1'].deleteThisOne({});
            
            cP.EpL.turnDisplayOn();
            cP.EpL.angularAxis_2d_m = {'x':2.5,'y':2.5};
            cP.EpL.reportType = "EpL";
            
            // Spring triangle.
            var d5_puckPars_triangle = {'radius_m':0.20, 'restitution':0.0, 'restitution_fixed':true, 'friction':1.0, 'friction_fixed':true};
            let xNudge_m = 0.10;
            
            var tri_vel_mps = new wS.Vec2D( 5.0, 0.0);
            new cP.Puck( new wS.Vec2D(1.00 + xNudge_m, 0.80 + Math.sqrt(3)/2.0), tri_vel_mps.scaleBy( 1.0), Object.assign({}, d5_puckPars_triangle, {'name':'puck1'}));
            
            tri_vel_mps.rotated_by(-120.0);
            new cP.Puck( new wS.Vec2D(1.50 + xNudge_m, 0.80                   ), tri_vel_mps.scaleBy( 1.0), Object.assign({}, d5_puckPars_triangle, {'name':'puck3'}));
            
            tri_vel_mps.rotated_by(-120.0);
            new cP.Puck( new wS.Vec2D(0.50 + xNudge_m, 0.80                   ), tri_vel_mps.scaleBy( 1.0), Object.assign({}, d5_puckPars_triangle, {'name':'puck2'}));
            
            var springColor1 = 'blue';
            new cP.Spring(aT.puckMap['puck1'], aT.puckMap['puck2'], 
                                        {'length_m':1.1, 'strength_Npm':60.0, 'unstretched_width_m':0.1, 'color':springColor1});
            new cP.Spring(aT.puckMap['puck1'], aT.puckMap['puck3'], 
                                        {'length_m':1.1, 'strength_Npm':60.0, 'unstretched_width_m':0.1, 'color':springColor1});
            new cP.Spring(aT.puckMap['puck2'], aT.puckMap['puck3'], 
                                        {'length_m':1.1, 'strength_Npm':60.0, 'unstretched_width_m':0.1, 'color':springColor1});
            
            // Single puck with two springs and pins.
            let p_radius_m = 1.30;
            new cP.Puck( new wS.Vec2D(4.0, 6.0), new wS.Vec2D(0.0, 0.0), {'radius_m':p_radius_m, 'name':'puck4', 'restitution':0.0, 
                         'angle_r':0.15, 'angDamp':0.0, 'linDamp':1.0, 'friction':1.0, 'friction_fixed':true,
                         'angleLine':'stripe', 'borderWidth_px':0});
            var springColor2 = 'yellow';
            var d5_springPars_onePuck = {'strength_Npm': 1.0, 'unstretched_width_m':0.1, 'color':springColor2, 'damper_Ns2pm2':0.0, 'drag_c':0.0};
            new cP.Spring(aT.puckMap['puck4'], new cP.Pin( new wS.Vec2D( 2.5, 4.0),{borderColor:'yellow'}), 
                  Object.assign({}, d5_springPars_onePuck, {'spo1_ap_l_2d_m':new wS.Vec2D( p_radius_m, 0.00)}) );
            new cP.Spring(aT.puckMap['puck4'], new cP.Pin( new wS.Vec2D( 5.5, 4.0),{borderColor:'yellow'}), 
                  Object.assign({}, d5_springPars_onePuck, {'spo1_ap_l_2d_m':new wS.Vec2D(-p_radius_m, 0.00)}) );
                                        
            // Two pucks (one bigger than the other) on spring orbiting each other (upper left corner)
            new cP.Puck( new wS.Vec2D(0.75, 5.00), new wS.Vec2D(0.0, -5.00                          * 1.2), {'radius_m':0.15, 'name':'puck5'});
            // Scale the y velocity by the square of the radius ratio. This gives a net momentum of zero (so it stays in one place as it spins).
            new cP.Puck( new wS.Vec2D(1.25, 5.00), new wS.Vec2D(0.0, +5.00 * Math.pow(0.15/0.25, 2) * 1.2), {'radius_m':0.25, 'name':'puck6'});
            new cP.Spring(aT.puckMap['puck5'], aT.puckMap['puck6'], 
                                        {'length_m':0.5, 'strength_Npm':5.0, 'unstretched_width_m':0.05, 'color':springColor2});
                                        
            // Same thing (lower right corner)
            new cP.Puck( new wS.Vec2D(4.70, 0.55), new wS.Vec2D(+4.90, 0.0), {'radius_m':0.20, 'name':'puck7'});
            new cP.Puck( new wS.Vec2D(4.70, 1.55), new wS.Vec2D(-4.90, 0.0), {'radius_m':0.20, 'name':'puck8'});
            new cP.Spring(aT.puckMap['puck7'], aT.puckMap['puck8'], 
                                        {'length_m':0.5, 'strength_Npm':5.0, 'unstretched_width_m':0.05, 'color':springColor2});
                                        
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='stretchy things'          " + hL('5.a') + " onclick=\"cR.clearState(); dS.demoStart(5)\">&nbsp;a,</a>" +
            "<a title='conservation of angular momentum'  " + hL('5.b') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5b.js'})\">&nbsp;b,</a>" +
            "<a title='spring pendulum'          " + hL('5.c') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5c.js'})\">&nbsp;c,</a>" +
            "<a title='dandelion seeds'          " + hL('5.d') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5d.js'})\">&nbsp;d,</a>" +
            "<a title='chain-link loop using revolute joints' " + hL('5.e') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5e.js'})\">&nbsp;e,</a>" +
            "<a title='double-compound pendulum' " + hL('5.f') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5f.js'})\">&nbsp;f,</a>" +
            "<a title='wild west action'         " + hL('5.g') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5g.js'})\">&nbsp;g,</a>" +
            "<a title='Newton&#39;s cradle'      " + hL('5.h') + " onclick=\"cR.demoStart_fromCapture(5, {'fileName':'demo5h.js'})\">&nbsp;h&nbsp;</a>";

         
         // Scroll AFTER loading the capture (and setting c.demoVersion) so can scroll to the special help for the 5d demo.
         if (scrollHelp) {
            // distance joints, Newton's cradle
            if ( ['5.h'].includes( demoVersionBase( c.demoVersion)) ) {                 
               pS.scroll('d5h');
               
            // spring pendulum   
            } else if ( ['5.c'].includes( demoVersionBase( c.demoVersion)) ) {
               pS.scroll('d5c');
            
            // dandelions   
            } else if (['5.d'].includes( demoVersionBase( c.demoVersion)) || c.demoVersion.includes('5.a.dandelion')) {
               pS.scroll('d5d');
                              
            // distance joints, non-traditional springs
            } else if ( c.demoVersion.includes('5.a.soft') || c.demoVersion.includes('5.a.twinkle') ) {
               pS.scroll('d5a_soft');
               
            // two puck on a spring in orbit, COM constant.
            } else if ( c.demoVersion.includes('5.a.orbitingOnSpring') ) {
               pS.scroll('d5a-orbit');          
               
            // basketball
            } else if ( c.demoVersion.includes('5.e.basketball') ) {
               pS.scroll('bphoops');
               
            // For this group of 5.b, must check the more specific ones first.
            } else if ( c.demoVersion.includes('5.b.two') ) { // inelastic collision
               pS.scroll('d5btwo');
            } else if ( c.demoVersion.includes('5.b.four') ) { // inelastic collision
               pS.scroll('d5bfour');
            } else if ( c.demoVersion.includes('5.b.five') ) { // inelastic collision
               pS.scroll('d5bfive');
            } else if ( c.demoVersion.includes('5.b.six') ) { // inelastic collision
               pS.scroll('d5bsix');
            } else if ( c.demoVersion.includes('5.b.rube') ) { // Rube's creation
               pS.scroll('d5brube');
            } else if ( c.demoVersion.includes('5.b') ) {
               pS.scroll('d5b');   
               
            // revolute joints
            } else if ( ['5.e','5.f','5.g'].includes( demoVersionBase( c.demoVersion)) ) {               
               pS.scroll('d5e');
               
            // 5a -- 5d
            } else {
               pS.scroll('d5');
            }
         }
      
      } else if (index == 6) {
         
         if (scrollHelp) pS.scroll('d6');
         
         c.g_ON = false;
         dC.gravity.checked = false;
         
         // This is an alternate way to fix the restitution and friction.
         cP.Puck.restitution_gOn =  0.0;
         cP.Puck.friction_gOn =  0.6;
         cP.Puck.restitution_gOff = 0.0;
         cP.Puck.friction_gOff = 0.6;
         
         if ((state_capture) && (state_capture.demoIndex == 6)) {
            cR.restoreFromState( state_capture);
         
         } else if ( demo_6_fromFile) {
            cR.restoreFromState( demo_6_fromFile);
            
         } else {
            cP.Wall.makeFence({}, canvas);
            jM.makeJello({});
         }
         
         jM.setUpPreGameHelp();
      
         // An extra puck to play with.
         //puckParms.restitution = 0.0;
         //new cP.Puck( 3.8, 5.5, v_init_2d_mps, puck_radius_m * 2.8, puckParms);
         
         dC.extraDemos.innerHTML = 
            "<a title='Jello Madness'                            " + hL('6.a') + " onclick=\"cR.clearState(); dS.demoStart(6)\">&nbsp;a,</a>" +
            "<a title='the editor turned the jello into this...' " + hL('6.b') + " onclick=\"cR.demoStart_fromCapture(6, {'fileName':'demo6b.js'})\">&nbsp;b,</a>" +
            "<a title='the editor turned the jello into this...' " + hL('6.c') + " onclick=\"cR.demoStart_fromCapture(6, {'fileName':'demo6c.js'})\">&nbsp;c,</a>" +
            "<a title='a tough tangle...' " + hL('6.d') + " onclick=\"cR.demoStart_fromCapture(6, {'fileName':'demo6d.js'})\">&nbsp;d&nbsp;</a>";
         
      } else if (index == 7) {
         if (scrollHelp) pS.scroll('d7');
         
         gW.messages['help'].loc_px = {'x':15,'y':75};
         
         gW.messages['gameTitle'].loc_px = {'x':15,'y':200};
         gW.messages['gameTitle'].popAtEnd = true;
         
         gW.messages['score'].loc_px =   {'x':15,'y': 25};
         gW.messages['ppTimer'].loc_px = {'x':15,'y': 45};
         gW.messages['win'].loc_px =     {'x':15,'y':125};
         gW.messages['lowHelp'].loc_px = {'x':15,'y':325};
         
         cP.Puck.restitution_gOn =  0.6; 
         cP.Puck.friction_gOn =  0.0;
         
         cP.Puck.restitution_gOff = 0.6; 
         cP.Puck.friction_gOff = 0.0;
         
         pP.setBulletAgeLimit_ms(1000);
         
         if ((state_capture) && (state_capture.demoIndex == 7)) {
            networkPuckTemplate = cR.restoreFromState( state_capture);
            
         } else {
            cP.Wall.makeFence({}, canvas);
            
            // Normal pucks
            new cP.Puck( new wS.Vec2D(0.35, 0.35), new wS.Vec2D( 0.0, 4.0), {'radius_m':0.25}); //   , 'categoryBits':'0x0000', 'maskBits':'0x0000', 'color':'pink'
            new cP.Puck( new wS.Vec2D(5.65, 0.35), new wS.Vec2D( 0.0, 4.0), {'radius_m':0.25}); //   , 'categoryBits':'0x0000', 'maskBits':'0x0000', 'color':'pink'
            
            new cP.Puck( new wS.Vec2D(2.75, 0.35), new wS.Vec2D(+2.0, 0.0), {'radius_m':0.25});
            new cP.Puck( new wS.Vec2D(3.25, 0.35), new wS.Vec2D(-2.0, 0.0), {'radius_m':0.25});
            
            new cP.Puck( new wS.Vec2D(0.35, 5.65), new wS.Vec2D(+2.0, 0.0), {'radius_m':0.25});
            new cP.Puck( new wS.Vec2D(5.65, 5.65), new wS.Vec2D(-2.0, 0.0), {'radius_m':0.25});
            
            // Shelter
            //    Vertical part
            new cP.Wall( new wS.Vec2D( 3.0, 3.0), {'half_width_m':0.02, 'half_height_m':0.50});
            //    Horizontal part
            new cP.Wall( new wS.Vec2D( 3.0, 3.0), {'half_width_m':0.50, 'half_height_m':0.02});
            
            // Note the 'bullet_restitution':0.85 in what follows for the local and NPC client pucks. I have
            // also changed the 7b,c,d (captures) to include this parameter and value for all the driven pucks.
            
            // Puck for the local client (the host) to drive.
            var position_2d_m = new wS.Vec2D(3.0, 4.5);
            var velocity_2d_mps = new wS.Vec2D(0.0, 0.0);
            if (dC.player.checked) {
               // Make the requested puck for the host
               new cP.Puck( position_2d_m, velocity_2d_mps, cP.Puck.hostPars);
            } else {
               // Don't actually create a puck for the host. But collect parameters needed for creating the network pucks in a
               // way that reflects the birth parameters here.
               networkPuckTemplate = Object.assign({}, {'position_2d_m':position_2d_m, 'velocity_2d_mps':velocity_2d_mps}, cP.Puck.hostPars);
            }
            
            // A 4-pin track for NPC client navigation.
            var pinRadius = 3;
            var e1 = 1.5, e2 = 4.5;
            p1 = new cP.Pin( new wS.Vec2D( e1, e1), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin4', 'name':'pin1', 'nextPinName':'pin2'});
            p2 = new cP.Pin( new wS.Vec2D( e2, e1), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin1', 'name':'pin2', 'nextPinName':'pin3'});
            p3 = new cP.Pin( new wS.Vec2D( e2, e2), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin2', 'name':'pin3', 'nextPinName':'pin4'});
            p4 = new cP.Pin( new wS.Vec2D( e1, e2), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin3', 'name':'pin4', 'nextPinName':'pin1'});
            
            // Add local non-player clients (NPC, aka drones) and associated pucks to drive. Assign
            // a starting pin.
            new cT.Client({'name':'NPC1', 'color':'purple'});
            new cP.Puck( p1.position_2d_m, new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':'NPC1', 'hitLimit':20, 'pinName':'pin1', 'rayCast_init_deg':100,
                'bullet_restitution':0.85, 'linDamp':1.0} );
            //new cT.Client({'name':'NPC2', 'color':'purple'});
            //new cP.Puck( p3.position_2d_m, new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':'NPC2', 'linDamp':1.0, 
            //                                                        'hitLimit':20, 'pinName':'pin3', 'rayCast_init_deg':-90} );
            
            // A 2-pin navigation track for a single client.
            //var p5 = new cP.Pin( new wS.Vec2D( 5.0, 2.5), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin6', 'name':'pin5', 'nextPinName':'pin6'});
            //var p6 = new cP.Pin( new wS.Vec2D( 5.0, 3.5), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin5', 'name':'pin6', 'nextPinName':'pin5'});
            //new cT.Client({'name':'NPC3', 'color':'purple'});
            //new cP.Puck( new wS.Vec2D( 5.0, 2.5), new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':'NPC3', 'linDamp':1.0, 
            //                                                               'hitLimit':20, 'pinName':'pin5', 'rayCast_init_deg':0} );
            
            // Make a one single-pin track and corresponding NPC client.
            //pP.makeNPC_OnSinglePin(1, cP.Pin.nameIndex + 1, cT.Client.npcIndex + 1, new wS.Vec2D( 1.0, 1.0));
         }
         
         if (state_capture && (state_capture.demoIndex == 7) && state_capture.startingPosAndVels) {
            cT.Client.startingPandV = state_capture.startingPosAndVels;
         } else {
            cT.Client.startingPandV = defaultStartingPosAndVel( c.demoVersion);
         }
         pP.createPucksForNetworkClients( canvas, networkPuckTemplate, cT.Client.startingPandV);
         pP.preGameSetUp( 7);
         
         dC.extraDemos.innerHTML = 
            "<a title='Puck Popper (1 drone on 4 pins)'  " + hL('7.a') + "  onclick=\"cR.clearState(); dS.demoStart(7)\">&nbsp;a,</a>" +
            "<a title='2 drones on 4 pins'               " + hL('7.b') + "  onclick=\"cR.demoStart_fromCapture(7, {'fileName':'demo7b.js'})\">&nbsp;b,</a>" +
            "<a title='4 drones on 5 pins'               " + hL('7.c') + "  onclick=\"cR.demoStart_fromCapture(7, {'fileName':'demo7c.js'})\">&nbsp;c,</a>" +
            "<a title='1 drone on 2 pins'                " + hL('7.d') + "  onclick=\"cR.demoStart_fromCapture(7, {'fileName':'demo7d.js'})\">&nbsp;d,</a>" +
            "<a title='cannibal inside springy chain'    " + hL('7.e') + "  onclick=\"cR.demoStart_fromCapture(7, {'fileName':'demo7e.js'})\">&nbsp;e&nbsp;</a>";
         
      } else if (index == 8) {
         
         canvas.width = 1250, canvas.height = 950;
         adjustSizeOfChatDiv('small'); // on the host (note: chat div is set to normal as the default, see the beginning of demoStart)  
         hC.resizeClients('small');    // adjust chat div on the clients
         // Set this module-level value to help new connecting clients adjust their layout.
         c.chatLayoutState = 'small';
         
         // Must do this AFTER the chat-div adjustment.
         if (scrollHelp) pS.scroll('d8');
         
         gW.messages['help'].loc_px = {'x':55,'y': 84};
         
         gW.messages['gameTitle'].loc_px = {'x':55,'y':200};
         gW.messages['gameTitle'].popAtEnd = true;
         
         gW.messages['score'].loc_px   = {'x':55,'y': 35};
         gW.messages['ppTimer'].loc_px = {'x':55,'y': 55};
         gW.messages['win'].loc_px =     {'x':55,'y':120};
         gW.messages['lowHelp'].loc_px = {'x':55,'y':325};
         
         c.g_ON = false;
         dC.gravity.checked = false;
         
         // This applies only to pucks without fixed parameters:
         // Keep the restitution low (but not zero) for gOff situations (zero will produce bullets that act like clay). 
         // Low restitution helps the drones fly smoothly through the navigation channels in the terrain.
         // setGravityRelatedParameters runs after the drones are restored.
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.friction_gOn =  0.6;
         cP.Puck.restitution_gOff = 0.5;
         cP.Puck.friction_gOff = 0.6;
         
         pP.setBulletAgeLimit_ms(1500);
         
         if ((state_capture) && (state_capture.demoIndex == 8)) {
            networkPuckTemplate = cR.restoreFromState( state_capture);
         
         } else if (demo_8_fromFile) {
            // Don't need to parse here because read in from a file.
            networkPuckTemplate = cR.restoreFromState( demo_8_fromFile);
            
            // Some little walls in the middle.
            /*
            new cP.Wall( new wS.Vec2D( 2.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02, 'angularSpeed_rps':3.14});
            new cP.Wall( new wS.Vec2D( 3.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 4.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02, 'angularSpeed_rps':3.14/2});
            new cP.Wall( new wS.Vec2D( 5.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 6.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02, 'angularSpeed_rps':3.14});
            new cP.Wall( new wS.Vec2D( 7.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 8.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02, 'angularSpeed_rps':3.14/2});            
            */
            
            /*
            // Puck for the local client (the host) to drive.
            if (dC.player.checked) {
               new cP.Puck( new wS.Vec2D(3.0, 4.5), new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'black', 'colorSource':true, 'clientName':'local', 'linDamp':1.0, 'hitLimit':20} );
            }
            
            var pinRadius = 3;
            p1 = new cP.Pin( new wS.Vec2D( 1.0, 2.0), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin103', 'name':'pin101', 'nextPinName':'pin102'});
            p2 = new cP.Pin( new wS.Vec2D( 1.0, 4.0), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin101', 'name':'pin102', 'nextPinName':'pin103'});
            p3 = new cP.Pin( new wS.Vec2D( 1.0, 5.0), {'radius_px':pinRadius, 'NPC':true, 'previousPinName':'pin102', 'name':'pin103', 'nextPinName':'pin101'});
            */
            
            /*
            // Add some local non-player clients (NPCs)
            new cT.Client({'name':'NPC3', 'color':'purple'});
            new cT.Client({'name':'NPC4', 'color':'purple'});
            
            // Controllable pucks for these NPC clients; assign a starting pin.
            new cP.Puck( new wS.Vec2D( 1.0, 2.0), new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':'NPC3', 'linDamp':1.0, 'hitLimit':20, 'pinName':'pin102'} );
            new cP.Puck( new wS.Vec2D( 1.0, 2.0), new wS.Vec2D(0.0, 0.0), {'radius_m':0.30, 'color':'darkblue', 'colorSource':false, 'clientName':'NPC4', 'linDamp':1.0, 'hitLimit':20, 'pinName':'pin103'} );
            */
            
            // Make a set of drones and single-pin navigation tracks (use editor to add more pins if wanted). 
            //pP.makeNPC_OnSinglePin(3, cP.Pin.nameIndex + 1, cT.Client.npcIndex + 1, new wS.Vec2D( 1.0, 1.0));
            
         } else {
            jM.makeJello({'pinned':true, 'gridsize':4});
          
            cP.Wall.makeFence({}, canvas);
            
            // Some little walls in the middle.
            new cP.Wall( new wS.Vec2D( 2.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02, 'angularSpeed_rps':3.14/2});
            new cP.Wall( new wS.Vec2D( 3.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 4.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 5.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 6.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 7.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            new cP.Wall( new wS.Vec2D( 8.0, 0.5), {'half_width_m':0.4, 'half_height_m':0.02});
            
         }
         
         if (state_capture && (state_capture.demoIndex == 8) && state_capture.startingPosAndVels) {
            cT.Client.startingPandV = state_capture.startingPosAndVels;
         } else {
            cT.Client.startingPandV = defaultStartingPosAndVel( c.demoVersion);
         }
         pP.createPucksForNetworkClients( canvas, networkPuckTemplate, cT.Client.startingPandV);
         pP.preGameSetUp( 8);
         
         // Removing the old version of 8c (similar to 8b). 
         // File is still out there for running from a URL query string. Old one runs as 8f now.
         dC.extraDemos.innerHTML = 
           "<a title='Puck Popper (with jello)' " + hL('8.a') + " onclick=\"cR.clearState(); dS.demoStart(8)\" style='cursor: pointer'>&nbsp;a,</a>" +
           "<a title='high-noon maze' " + hL('8.b') + " onclick=\"cR.demoStart_fromCapture(8, {'fileName':'demo8b.js'})\">&nbsp;b,</a>" +
           "<a title='wide open spaces (no drag)' " + hL('8.c') + " onclick=\"cR.demoStart_fromCapture(8, {'fileName':'demo8c.js'})\">&nbsp;c,</a>" +
           "<a title='bullet energy (no drag, and elastic collisions)' " + hL('8.d') +
                                                   " onclick=\"cR.demoStart_fromCapture(8, {'fileName':'demo8d.js'})\">&nbsp;d,</a>" +
           "<a title='target-leading demo (no recoil, no drag, and elastic collisions)' " + hL('8.e') +
                                                   " onclick=\"cR.demoStart_fromCapture(8, {'fileName':'demo8e.js'})\">&nbsp;e&nbsp;</a>";
                  
      } else if (index == 9) {
         if (scrollHelp) pS.scroll('d9');
         
         canvas.style.borderColor = 'black';
         
         cP.Puck.restitution_gOn =  0.7;
         cP.Puck.friction_gOn =  0.6;
         
         cP.Puck.restitution_gOff = 1.0;
         cP.Puck.friction_gOff = 0.6;
         
         if ((state_capture) && (state_capture.demoIndex == 9)) {
            cR.restoreFromState( state_capture);
            
         } else {            
            cP.Wall.makeFence({}, canvas);
            
            // To simulate additive color mixing.
            ctx.globalCompositeOperation = 'screen'; // 'source-over' 'screen'
            
            // pucks
            var puckStart_2d_m = new wS.Vec2D( 3.0, 3.0);
            var puckBasePars = {'radius_m':1.1, 'borderWidth_px':0, 'angleLine':false, 'colorSource':true, 'linDamp':1.0, 'angDamp':0.2, 'friction':1.0};
            // Green, Red, and Blue
            // Use Object.assign to make an independent pars object (a copy) that builds off the puckBasePars object. Note: it is important to
            // have the {} target in order to make a copy. If you use puckBasePars as the target, you'll just keep updating the reference to 
            // puckBasePars (not good).
            new cP.Puck( puckStart_2d_m, new wS.Vec2D(+0.08, -0.04),   Object.assign({}, puckBasePars, {'name':'puck1', 'color':'#00ff00'}));
            new cP.Puck( puckStart_2d_m, new wS.Vec2D(-0.08, -0.04),   Object.assign({}, puckBasePars, {'name':'puck2', 'color':'#ff0000'}));
            new cP.Puck( puckStart_2d_m, new wS.Vec2D( 0.00,  0.0894), Object.assign({}, puckBasePars, {'name':'puck3', 'color':'#0000ff'}));
            
            // Springs between the three pucks
            var springPars = {'length_m':1.0, 'strength_Npm':25.0, 'unstretched_width_m':0.125, 'visible':false, 'damper_Ns2pm2':0.5, 
                              'softConstraints':true, 'collideConnected':false, 'color':'white'};
            new cP.Spring( aT.puckMap['puck1'], aT.puckMap['puck2'], springPars);
            new cP.Spring( aT.puckMap['puck2'], aT.puckMap['puck3'], springPars);
            new cP.Spring( aT.puckMap['puck3'], aT.puckMap['puck1'], springPars);
            
            // Three weaker springs (on final-position pins) that bring the triangle back to a nice center position.
            var centeringSpringPars = {'length_m':0.0, 'strength_Npm':10.0, 'unstretched_width_m':0.05, 'visible':false, 'damper_Ns2pm2':0.5, 
                                       'softConstraints':true, 'collideConnected':false, 'color':'white'};
            p1 = new cP.Pin( new wS.Vec2D( 3.5, 2.711), {'visible':false, 'borderColor':'white', 'fillColor':'black'});
            p2 = new cP.Pin( new wS.Vec2D( 2.5, 2.711), {'visible':false, 'borderColor':'white', 'fillColor':'black'});
            p3 = new cP.Pin( new wS.Vec2D( 3.0, 3.577), {'visible':false, 'borderColor':'white', 'fillColor':'black'});
            new cP.Spring( aT.puckMap['puck1'], p1, centeringSpringPars);
            new cP.Spring( aT.puckMap['puck2'], p2, centeringSpringPars);
            new cP.Spring( aT.puckMap['puck3'], p3, centeringSpringPars);
         }
         
         dC.extraDemos.innerHTML = 
            "<a title='color mixer' " + hL('9.a') + " onclick=\"cR.clearState(); dS.demoStart(9)\">&nbsp;a,</a>" +
            "<a title='colorful' " + hL('9.b') + " onclick=\"cR.demoStart_fromCapture(9, {'fileName':'demo9b.js'})\">&nbsp;b&nbsp;</a>";
         
      }
      
      // Now, after all the scripted and captured demos have loaded and possibly turned gravity on/off, update the gravity related stuff.
      setGravityRelatedParameters({"updatePucks":false});
      
      // If any demo uses special canvas dimensions, now is a good time to let the clients know.
      // (note: this canvas resize is different from the chat div resizing that is done for demo 8).
      eV.setClientCanvasToMatchHost();
      if (logThis) pS.logEntry( c.demoVersion);
      
      // Sometimes just want to be sure the user gets the fullscreen view.
      if (c.fullScreenDemo) {
         eVN.changeFullScreenMode( canvas, 'on');
      }
      
      // Configure shooter for each client, and optionally set the shot speed.
      // c.lockedAndLoaded is set when the capture is restored (that's why this is at the end).
      // Also see "pool game locks and settings" section above.
      if (c.lockedAndLoaded) {    
         cT.Client.applyToAll( client => {
            // The dandelion demos, start with control-shift locked and a locked high-speed shot.
            if (c.demoVersion.slice(0,3) == "5.d") {
               client.ctrlShiftLock = true;
               client.poolShotLocked = true;
               client.poolShotLockedSpeed_mps = 200;
            
            // Start with control-shift locked, but shot speed variable.
            } else if (c.demoVersion.includes('basketball') || c.demoVersion.includes('monkeyhunt')) {
               client.ctrlShiftLock = true;
            }
         });
      }   
      
      console.log('c.demoVersion=' + c.demoVersion);
   }
   
   function testing() {
      console.log("===================================");
      
      try {
         console.log("dS testing: canvas.width = " + canvas.width);
      } catch(e) {
         console.log("canvas.width Error: " + e);
      }
      
      try {
         console.log("dS testing: gW.aT.testObj.test = " + gW.aT.testObj.test);
      } catch(e) {
         console.log("gW.aT.testObj.test: " + e);
      }
        
      try {
         console.log( "exposed canvas.width = " + gW.canvas.width);
      } catch(e) {
         console.log("gW.canvas.width Error: " + e);
      }
      
      console.log( JSON.stringify( gW.get_hostCanvasWH() ));
      //gW.set_hostCanvasWH(300,300);
      
      try {
         console.log("dS testing: gW.testGlobal.something = " + gW.testGlobal.something);
      } catch(e) {
         console.log("gW.testGlobal.something: " + e);
      }
   }
   
   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      'testing': testing,
      
      'demoStart': demoStart,
      'demoVersionBase': demoVersionBase,
      'setGravityRelatedParameters': setGravityRelatedParameters,
      'fullScreenState': fullScreenState,
      'adjustSizeOfChatDiv': adjustSizeOfChatDiv,
      'setNickNameWithoutConnecting': setNickNameWithoutConnecting,
      'defaultStartingPosAndVel': defaultStartingPosAndVel,

   };   
   
})();