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

// Events on non-host clients (eVN) module
// eventsNonHost.js 
   console.log('eVN _*-*_');
// 12:46 PM Thu August 3, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.eVN = (function() {
   "use strict";
      
   // Key values.
   var keyMap = {'16':'sh','17':'ct','18':'alt','32':'sp',  //sh:shift, ct:ctrl, sp:space
                 '49':'1', '50':'2', '51':'3', '52':'4', '53':'5', '54':'6', '55':'7', '56':'8', '57':'9',
                 '65':'a', '66':'b', '67':'c', '68':'d', '70':'f', 
                 '73':'i', '74':'j', '75':'k', '76':'l', '78':'n', 
                 '83':'s', '87':'w', '90':'z',
                 '191':'cl'};  // cl (short for color), 191 is the question-mark key.
   
   // Key values, cso (client side only) for use only by the client, not to be sent over network
   // to the host.
   var keyMap_cso = {'16':'key_shift', '17':'key_ctrl', '27':'key_esc', '80':'key_p'}
   var mK_cso = {};
      
   // supporting touch-screen event processing
   var ts = {};
   ts.previousTapTime = new Date().getTime();
   ts.tapCount = 1;
   //ts.firstTouchPointID = null;
   
   var videoMirrorDiv;
   
   // Module globals for objects brought in by initializeModule.
   var clientCanvas_tt, ctx_tt, videoMirror, mK, cl_clientSide, dC
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule(  hC_clientCanvas_tt, hC_ctx_tt, hC_videoMirror, hC_mK, hC_cl_clientSide, hC_dC) { 
      
      clientCanvas_tt = hC_clientCanvas_tt;
      ctx_tt = hC_ctx_tt;
      videoMirror = hC_videoMirror;
      mK = hC_mK;
      cl_clientSide = hC_cl_clientSide;
      dC = hC_dC;
      
      initializeEventListeners();
      
   }
      
   /////////////////////////////////////////////////////
   // Event handlers for non-host clients (user input)
   /////////////////////////////////////////////////////
   
   function openFullscreen( elem) {
      if (elem.requestFullscreen) {
         console.log("fullscreen - normal");
         elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
         console.log("fullscreen - moz");
         elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
         console.log("fullscreen - webkit");
         elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
         console.log("fullscreen - ms");
         elem.msRequestFullscreen();
      } else {
         console.log("openFullscreen: found no match");
      }
   }
   
   function closeFullscreen() {
      if (document.exitFullscreen) {
         document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
         document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
         document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE/Edge */
         document.msExitFullscreen();
      }
   }   

   function changeFullScreenMode( targetElement, mode, animationRestartDelay = 500) {
      if (mode == 'on') {
         if ( ! document.fullscreenElement) {
            if (targetElement.requestFullscreen) {
                targetElement.requestFullscreen()
                  .then((    ) => console.log("(A) fullscreen start went well."))
                  .catch((err) => console.log("(A) error on fullscreen start:" + err));
            } else {
               console.log("can't find requestFullscreen method on target element.");
               // try a more general call (needed for browser in WebOS on an LG TV)
               openFullscreen( targetElement)
                  .then((    ) => console.log("(B) fullscreen start went well."))
                  .catch((err) => console.log("(B) error on fullscreen start:" + err));
            }
         } else {
            console.log('no need, already fullscreen');
         }
         
      } else if (mode == 'off') {
         if (document.exitFullscreen) {
            // This check for fullscreenElement keeps a call to exitFullscreen from being attempted
            // if somehow the user has already exited fullscreen mode.
            // Refer to the event handler for fullscreenechange where this statement runs: twoThumbs.changeDisplay('exit');
            if (document.fullscreenElement) {
               document.exitFullscreen()
                  .then((    ) => console.log("scripted fullscreen exit went well."))
                  .catch((err) => console.log("error on scripted fullscreen exit:" + err));
            } else {
               console.log("no fullscreenElement; changeFullScreenMode ran AFTER fullscreen exit.");
               // Try a more general call.
               closeFullscreen();
            }
         } else {
            console.log("can't find exitFullscreen method.");
         }
      }
      if (hC.get_hostOrClient() == "host") gW.restartAnimationLoop( animationRestartDelay);
   }
   
   function handle_sending_mK_data( mK) {
      var cl = cl_clientSide;
      
      // Use WebRTC datachannel if available
      if ( (cl.rtc) && (cl.rtc.dataChannel) && (cl.rtc.dataChannel.readyState == 'open') && (hC.get_rtc_choke() == false) ) {
         cl.rtc.dataChannel.send( JSON.stringify( mK));
      
      // Otherwise use socket.io (WebSocket)
      } else if (hC.get_socket()) {
         hC.get_socket().emit('client-mK-event', JSON.stringify( mK));
      }
   }
   
   function initialize_mK() {
      // Initialize the Mouse and Keyboard (mK) state object.
      
      // mouseDown: T for touch, M for mouse, false for up state
      mK.MD = false;
      // mouse button number (which of the three: 0,1,2)
      mK.bu = 0;  
      // mouse position in pixels: X_px, Y_px
      mK.mX = 5;
      mK.mY = 5; 
      // mouse wheel
      mK.mW = 'N'; // F,B, or N (forward, backward, or neutral)
      
      // Use the keyMap to define and initialize all the key states (to UP) in the 
      // mK (mouse and keyboard state) object that is sent to the host.
      for (var key in keyMap) {
         mK[ keyMap[ key]] = 'U';
      }
      for (var key in keyMap_cso) {
         mK_cso[ keyMap_cso[ key]] = 'U';
      }
      // Initialize non-keyboard attributes (for the Two Thumbs interface)
      // These values are default when using the keyboard.
      mK['ScRrf'] = 0.00; // gun scope rotation rate fraction (0.00, no constant sweeping)
      mK['ScTr'] = 'U';   // gun scope trigger ('U', scope trigger is off)
      mK['jet_t'] = 1.0;  // jet throttle (1.0, jet is full throttle)
   }
   
   function initializeEventListeners() {
      // Event listeners to capture mouse, keyboard, and touchscreen state from the non-host 
      // clients (user input).
      
      // For the client, keep these listeners on all the time so you can see the client cursor.
      // To avoid some default behavior on the video element, had to set up separate event handlers
      // for that element (videoMirror) and use preventDefault.
      
      initialize_mK();      
      
      // Inhibit the context menu that pops up when right clicking (third button).
      // Alternatively, could apply this only to the canvas. That way you can still
      // source the page.
      document.addEventListener("contextmenu", function(e) {
         e.preventDefault();
         return false;
      }, {capture: false});
      
      
      
      clientCanvas_tt.addEventListener("touchstart", function(e) {
         e.preventDefault();
                  
         mK.MD = 'T';  // T for touch device causing Mouse Down
         mK.bu = 0; // Mouse button
         
         //Pass this initial touch position to the move handler.
         handleMouseOrTouchMove( e, 'touchstart');
      }, {capture: false});   
      
      clientCanvas_tt.addEventListener("touchmove", function(e) {
         e.preventDefault();
         handleMouseOrTouchMove( e, 'touchmove');
      }, {capture: false});
      
      clientCanvas_tt.addEventListener("touchend", function( e) {
         // note: canvas style ====> touch-action: none;
         // prevent mousedown event...
         e.preventDefault();
         resetMouseOrFingerState( e, 'touchend');
      }, {capture: false});
      
      
      
      // This "click" handler on the parent div for the streaming video element
      // prevents click events from pausing the stream when in fullscreen mode (needed for Chrome).
      videoMirrorDiv = document.getElementById('divForClientCanvas');
      videoMirrorDiv.addEventListener("click", function(e) {
         e.preventDefault();
      }, {capture: false});
      
      videoMirror.addEventListener("touchstart", function(e) {
         e.preventDefault();
                  
         mK.MD = 'T';  // Mouse Down, T for touch
         mK.bu = 0; // Mouse button
         
         //Pass this initial touch position to the move handler.
         handleMouseOrTouchMove( e, 'touchstart');
      }, {capture: false}); 
      
      videoMirror.addEventListener("touchmove", function(e) {
         e.preventDefault(); // prevent scrolling behavior when not in fullscreen mode
         handleMouseOrTouchMove( e, 'touchmove');
      }, {capture: false});
      
      videoMirror.addEventListener("touchend", function( e) {
         //note: videoMirror style ====> touch-action: none;
         /*
         e.preventDefault() is needed here in the final touch event to 
         prevent mouse events from firing after touch events. This is especially 
         important since wS.screenFromRaw_2d_px does a stretching operation for 
         touch screens and if a mouse event fires, the cursor will appear to jump 
         around. Here's the usual order that the events fire... 
         
         touchstart
         touchmove
         touchend
         ----------
         mousedown
         mousemove
         mouseup
         click 
         
         */         
         e.preventDefault();
         resetMouseOrFingerState( e, "touchend");
      }, {capture: false});
      
      videoMirror.addEventListener("mousedown", function(e) {  
         // If using the videoMirror with a mouse
         mK.MD = 'M'; // M for mouse, Mouse Down
         mK.bu = e.button; // Mouse button
         
         //Pass this initial mouse position to the move handler.
         handleMouseOrTouchMove( e, 'mousedown');
      }, {capture: false});
      
      videoMirror.addEventListener("mousemove", function(e) {
         handleMouseOrTouchMove( e, 'mousemove');
      }, {capture: false});
         
      videoMirror.addEventListener("mouseup", function( e) {
         if (!mK.MD) return;
         // Unlike what could be done for the host client, DO NOT shut down the mousemove listener. That
         // way we can see the mouse position even if the buttons are released.
         resetMouseOrFingerState( e, "mouseup");
      }, {capture: false});
      
      
      function handleMouseOrTouchMove( e, fromListener) {
         var cl = hC.referenceToClient();
         
         // Process mousedown, mousemove, touchstart, and touchmove events.
         if (twoThumbs.getEnabled()) {
            var touchPoints_2d_px = [];
            
            // Determine event type
            // Mouse (single contact point)
            if ((e.clientX || (e.clientX === 0)) && (mK.MD)) {
               touchPoints_2d_px[0] = wS.screenFromRaw_2d_px( clientCanvas_tt, new wS.Vec2D( e.clientX, e.clientY), {'demoRunningOnHost':hC.get_demoRunningOnHost()});
            
            // Touch screen (possibly multiple contact points)
            } else if (e.touches) {
               /*
               // Tried this but can't. Must start with a gesture on the host.
               // Use 4-finger touch to toggle fullscreen on the host.
               if ((e.touches.length == 4) && (fromListener != 'touchmove')) {
                  var control_message = {'from':cl.name, 'to':'host', 'data':{'fullScreen':'off'} };
                  socket.emit('control message', JSON.stringify( control_message));
               }
               */
               for (var i = 0, len = e.touches.length; i < len; i++) {
                  touchPoints_2d_px[i] = wS.screenFromRaw_2d_px( clientCanvas_tt, new wS.Vec2D( e.touches[i].clientX, e.touches[i].clientY), {'demoRunningOnHost':hC.get_demoRunningOnHost()});
               }
            }
            // Interpret the touch and mouse events using the twoThumbs interface.
            twoThumbs.processMultiTouch( touchPoints_2d_px);
         
         // Non-twoThumbs
         } else {
            // If NOT in twoThumbs AND in the mobile version of this page, don't send mouse or touch data.
            if (hC.getClientDeviceType() == "mobile") return;
            
            var raw_2d_px = new wS.Vec2D(0,0);
            
            // Determine event type
            // Mouse
            if (e.clientX || (e.clientX === 0)) {
               var inputDevice = "mouse";
               raw_2d_px.x = e.clientX;
               raw_2d_px.y = e.clientY;
            
            // Translate touch-screen events (non-twoThumbs) into keyboard data for sending to the host 
            // for ghost-ball pool shots and the projectile games.
            // (see also resetMouseOrFingerState)
            } else if (e.touches) {  
               var inputDevice = "touchScreen";
               gB.interpretTouches( e, {'startOrEnd':'start', 'hostOrClient':hC.get_hostOrClient(), 'cl':cl, 'socket':hC.get_socket(), 
                                        'fromListener':fromListener, 'mK':mK, 'ts':ts, 'raw_2d_px':raw_2d_px, 'demoVersionOnHost':hC.get_demoRunningOnHost()} );
            }
            
            if ( ! ts.fourOrMore) {
               // Convert the raw mouse position into coordinated relative to the corner of the imaging element.
               var screen_2d_px = wS.screenFromRaw_2d_px( videoMirror, raw_2d_px, {'inputDevice':inputDevice, 'demoRunningOnHost':hC.get_demoRunningOnHost()});
               // Send the state to the server (there it will be relayed to the host client).
               mK.mX = parseFloat(  ( screen_2d_px.x ).toFixed(2)  ); // crop down to 2 decimal points before sending over the network
               mK.mY = parseFloat(  ( screen_2d_px.y ).toFixed(2)  );
            }
            
            handle_sending_mK_data( mK);
         }
      };
      
      function resetMouseOrFingerState( e, fromListener) {
         // Process mouseup and touchend events.
         
         var cl = hC.referenceToClient();
         mK.MD = false; // Mouse Down (mouse button is up)
         mK.bu = 0;  // When mouse or touch is up, set button to default value of 0, the left button.
         
         if (twoThumbs.getEnabled() && e.changedTouches) {
            var releasePoint_2d_px = wS.screenFromRaw_2d_px( clientCanvas_tt, new wS.Vec2D( e.changedTouches[0].clientX, e.changedTouches[0].clientY), {'inputDevice':'touchScreen', 'demoRunningOnHost':hC.get_demoRunningOnHost()});
            twoThumbs.processSingleTouchRelease(  releasePoint_2d_px);
         
         // Translate touch-screen events into keyboard data for pool shoots and projectile games (see also handleMouseOrTouchMove).
         } else if ( e.changedTouches) {
            gB.interpretTouches( e, {'startOrEnd':'end', 'hostOrClient':hC.get_hostOrClient(), 'cl':cl, 'socket':hC.get_socket(), 
                                     'fromListener':fromListener, 'mK':mK, 'ts':ts, 'raw_2d_px':null, 'demoVersionOnHost':hC.get_demoRunningOnHost()} );
         }
         
         handle_sending_mK_data( mK);
      }
      
      // Mouse-wheel events
      document.addEventListener("wheel", function(e) {  // 
         // Chrome doesn't seem to listen to these (in the normal way). Had to explicitly set passive:false (should be the default).
         // Also tried putting this listener on document, videoMirror, and videoMirrorDiv. But nothing works unless passive is false.
         // Thu May 20, 2021, had to put the wheel listener on the document (window also works) for this event to fire when videoMirror is fullscreen.
         e.preventDefault();
         // see style for videoMirror (touch-action: none;) in hostAndClient.css: stops scrolling and zooming behavior associated with mouse wheel.
         // Note the Chrome client can use a two-finger gesture on touch pad without getting scrolling/zooming behavior.
         
         if (e.deltaY < 0) {
            mK.mW = 'F';  // roll wheel forward
         } else {
            mK.mW = 'B';  // roll wheel back
         }
         handle_sending_mK_data( mK);
         mK.mW = 'N';

      }, {passive: false, capture: false});
      
      document.addEventListener("keydown", function( e) {
         // This allows the spacebar to be used for the puck shields.
         //console.log(e.keyCode + "(down)=" + String.fromCharCode(e.keyCode));
         if (keyMap[e.keyCode] == 'sp') {
            // Inhibit page scrolling that results from using the spacebar.
            e.preventDefault();
            // The following is necessary in Firefox to avoid the spacebar from re-clicking 
            // page controls (like the demo buttons) if they have focus.
            if (document.activeElement != document.body) document.activeElement.blur();
         }
         
         if (e.keyCode in keyMap_cso) {
            if (mK_cso[keyMap_cso[e.keyCode]] == 'U') {
               // Set the key to DOWN.
               mK_cso[keyMap_cso[e.keyCode]] = 'D';
            }
         }
         
         // Toggle the p2p connection (shift p)
         if ((mK_cso.key_p == 'D') && (mK_cso.key_shift == 'D')) {
            hC.set_rtc_choke( ! hC.get_rtc_choke() );
            hC.refresh_P2P_indicator({'mode':'p2p', 'context':'chokeToggle'});
         
         // Esc out of full-screen mode (only mildly useful if the twothumbs checkbox is not hidden) 
         // If you're in fullscreen mode, this one won't
         // be the first to fire. The fullscreenchange handler fires first. Then, after
         // a second esc key press, this block will execute.
         } else if (keyMap_cso[e.keyCode] == 'key_esc') {
            if (hC.getClientDeviceType() != 'mobile') {
               // Reveal the video element (and hide the canvas).
               videoMirror.removeAttribute("hidden");
               clientCanvas_tt.setAttribute("hidden", null);
            }
            
            dC.chkTwoThumbs.checked = false;
            twoThumbs.setEnabled(false);
         }
         
         if (e.keyCode in keyMap) {
            if (mK[keyMap[e.keyCode]] == 'U') {
               // Set the key to DOWN.
               mK[keyMap[e.keyCode]] = 'D';
               handle_sending_mK_data( mK);
            }
         }
         
      }, {capture: false}); //"false" makes this fire in the bubbling phase (not capturing phase).
      
      document.addEventListener("keyup", function(e) {
         if (e.keyCode in keyMap) {
            // Set the key to UP.
            mK[keyMap[e.keyCode]] = 'U';               
            handle_sending_mK_data( mK);
         }
         if (e.keyCode in keyMap_cso) {
            // Set the key to UP.
            mK_cso[keyMap_cso[e.keyCode]] = 'U';               
         }
      }, {capture: false}); //"false" makes this fire in the bubbling phase (not capturing phase).
      
      // Video stream checkbox.
      dC.chkRequestStream = document.getElementById('chkRequestStream');
      dC.chkRequestStream.checked = false; 
      dC.chkRequestStream.addEventListener("click", function() {
         var cl = hC.referenceToClient();
         // You checked it.
         if (dC.chkRequestStream.checked) {
            // For now, leaving the full-screen button enabled at all times.
            //$('#FullScreen').prop('disabled', false);
            if ($('#roomName').val() == "") {
               displayMessage('');
               displayMessage('You must have a room name in the red box. Try again.');
               displayMessage('');
               dC.chkRequestStream.checked = false;
               
            } else {
               if (dC.chkTwoThumbs.checked) {
                  // Uncheck twoThumbs (but it's probably hidden unless I'm testing)
                  dC.chkTwoThumbs.click();
               }
               // re-negotiate the connection.
               window.setTimeout( function() {
                  hC.connect_and_listen('re-connect-with-stream');
               }, 100);
            }
         // You unchecked it.
         } else {
            // For now, leaving the full-screen button enabled at all times.
            //$('#FullScreen').prop('disabled', true);
            if (hC.get_socket()) {
               var control_message = {'from':cl.name, 'to':'host', 'data':{'videoStream':'off'} };
               hC.get_socket().emit('control message', JSON.stringify( control_message));
               
               // Wait a bit for the above message to get to the host. Then clean out the
               // video element.
               window.setTimeout(function() {
                  if (videoMirror.srcObject) videoMirror.srcObject = null;
               }, 200);
               
            } else {
               displayMessage('');
               displayMessage("If you haven't already, please connect to the host.");
            }
         }
      }, {capture: false});
      
      // This control can be useful for testing but is normally hidden. Edit client.html
      // to un-hide it.
      dC.chkTwoThumbs = document.getElementById('chkTwoThumbs');
      dC.chkTwoThumbs.checked = false;
      dC.chkTwoThumbs.addEventListener("click", function() {
         if (dC.chkTwoThumbs.checked) {
            twoThumbs.changeDisplay('normal');
         } else {
            twoThumbs.changeDisplay('exit');
         }
      }, {capture: false});
      
      // Button (on client) for starting the TwoThumbs interface
      dC.btnTwoThumbs = document.getElementById('twoThumbsButton');
      dC.btnTwoThumbs.addEventListener("click", function() {
         twoThumbs.changeDisplay('fullScreen');
      }, {capture: false});
      
      // Button (on client) for viewing the stream full-screen
      dC.btnFullScreen = document.getElementById('btnFullScreen_Client');
      dC.btnFullScreen.addEventListener('click', function() {
         changeFullScreenMode( videoMirror, 'on');
      }, {capture: false});
      
      // Local cursor is handy if the engine is paused. Also give visual indicator of lag.
      dC.chkLocalCursor = document.getElementById('chkLocalCursor');
      dC.chkLocalCursor.checked = true;
      dC.chkLocalCursor.addEventListener("click", function() {
         if (dC.chkLocalCursor.checked) {
            videoMirror.style.cursor = 'default';
            clientCanvas_tt.style.cursor = 'default';
         } else {
            videoMirror.style.cursor = 'none';
            clientCanvas_tt.style.cursor = 'none';
         }
      }, {capture: false});
      
      // Option for connecting without a puck.
      dC.chkPlayer = document.getElementById('chkPlayer');
      dC.chkPlayer.checked = true;
      
      // For general handling of changes in fullscreen state.
      // Useful for handling the first press of the ESC key (exiting fullscreen mode)
      $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange msfullscreenchange', function(e) {
         // Check for fullscreen-state change.
         
         // Starting fullscreen
         if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            console.log('fullscreen state: TRUE');
            dS.fullScreenState('on');
            videoMirror.style.borderWidth = '0px';  // 0px
            
         // Exiting fullscreen
         } else {
            console.log('fullscreen state: FALSE');
            dS.fullScreenState('off');
            clientCanvas_tt.width  = videoMirror.width;
            clientCanvas_tt.height = videoMirror.height;
            videoMirror.style.borderWidth = '5px';  // 5px
            // The following statement is needed for Firefox, video streaming,
            // and hiding the two-thumbs display (and revealing the video element).
            twoThumbs.changeDisplay('exit');
         }
      });
      
   }
   
   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      //'initializeEventListeners': initializeEventListeners,
        
      'handle_sending_mK_data': handle_sending_mK_data,
      'changeFullScreenMode': changeFullScreenMode,
      'initialize_mK': initialize_mK,

   };   
   
})();