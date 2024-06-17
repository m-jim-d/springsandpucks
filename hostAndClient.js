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

// Host and Client (hC) module
// hostAndClient.js
   console.log('hC _*-*_');
// 9:53 PM Mon January 2, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

/*
hostAndClient.js communicates with server functionality in server.js running
at Heroku or on a local node server.
*/

window.hC = (function() {
   "use strict";
   
   // Globals within hC. /////////////////////////////////////////////////
   
   if ( window.location.href.includes("client") ) {
      var hostOrClient = "client";
      // cl_clientSide is a global reference to the one and only client-like object on the client.html page.
      var cl_clientSide = {'name':null, 'previous_name':null};
   } else {
      // see comments in referenceToClient function
      var hostOrClient = "host";
   }
   
   var socket = null;
   var nodeServerURL, serverArray;
   var chatStyleToggle = true;
   
   var timer = {};
   timer.start = null;
   timer.end = null;
   timer.pingArray = [];
   
   var clientDeviceType;
   var clientCanvas, ctx;
   var clientCanvas_tt, ctx_tt;
   var videoMirror, videoStream;
   
   var demoRunningOnHost = "N/A";
   
   // Document Controls (dC).
   var dC = {};   
   dC.chkRequestStream = null;
   dC.chkLocalCursor = null;
   dC.chkTwoThumbs = null;
   dC.btnTwoThumbs = null;
   dC.btnFullScreen = null;
   dC.chkPlayer = null;
      
   // Mouse and keyboard (mK) from non-host clients.
   var mK = {};
   mK.name = null;
      
   var clientColors = {'1':'yellow','2':'cyan','3':'green','4':'pink','5':'orange',
                        '6':'brown','7':'greenyellow','8':'blue','9':'tan','0':'purple'};  
   var clientLightColors = ['yellow', 'greenyellow', 'pink', 'cyan', 'tan'];
   
   // The client name of this user. This global is only used on the client page and
   // is some increment of u1, u2, etc for network clients.
   var newClientName = null;
   var rtc_choke = false;
   
   // connection history and metrics
   var connHist = {};
   connHist.connectListenCounts = 0;
   
   var fileName = "hostAndClient.js";
   
   // Pacifier (connecting status) string for connecting...
   var pacifier = {};
   var connMssg = {};
   
   // Switches to enable debugging...
   var db = {};
   db.rtc = false; // WebRTC debug.
   
   // a few misc. globals (gb) that get exposure to other modules
   var gb = {};
   gb.gameReportCounter = 0;
   gb.touchScreenUsage_sendCounter = 0;
   
   var m_myRequest = null;
   
   // for nickname queries to the leaderboard
   google.charts.load('current', {'packages':['corechart']});
   google.charts.load('current', {'packages':['table']});
   
   //////////////////////////////////////////////////   
   // object prototypes
   //////////////////////////////////////////////////   
   
   function RTC( pars) {
      this.user1 = uT.setDefault( pars.user1, null);
      this.user2 = uT.setDefault( pars.user2, null);
      this.streamRequested = uT.setDefault( pars.streamRequested, null);
      
      this.pc = null;
      this.dataChannel = null;
   }
   RTC.prototype.shutdown = function() {
      // Close then nullify any references to the datachannel and the p2p connection.
      if (this.dataChannel) {
         this.dataChannel.close();
      }
      if (this.pc) {
         var senders = this.pc.getSenders();
         if (senders.length >= 1) {
            this.pc.removeTrack( senders[0]);
            senders = this.pc.getSenders();
         }
         this.pc.close();
      }
      if (this.dataChannel) {
         this.dataChannel = null;
      }
      if (this.pc) {
         this.pc = null;
      }
   }
   // This method works only on the host side of the WebRTC connection. So, that's why there's a check here
   // to see if user1 is the host.
   RTC.prototype.turnVideoStreamOff = function() {
      if (this.pc && (this.user1 == 'host')) {
         var senders = this.pc.getSenders();
         if (senders.length >= 1) {
            this.pc.removeTrack( senders[0]);
         }
      }
   }
   
   //////////////////////////////////////////////////   
   // functions supporting the socket.io connections
   //////////////////////////////////////////////////   
   
   function disableClientControls( diableMode) {
      // diableMode: true (disable it) or false
      if (diableMode) {
         $('#ConnectButton').html('Wait');
         $('#ConnectButton').prop('disabled', true);
         
         $('#chkRequestStream').prop('disabled', true);
         
         $('#twoThumbsButton').prop('disabled', true);
         $('#ChatButton').prop('disabled', true);
         
      } else {
         // Change the label from 'Wait' to 'Connect'.
         $('#ConnectButton').html('Connect');
         $('#ConnectButton').prop('disabled', false);
         // Note: the streaming checkbox opens when the p2p data-channel opens (see cl.rtc.dataChannel.onopen).
         //       the two-thumbs button opens when the room is successfully joined.
         //       the chat button opens when the room is successfully joined.
      }
   }
   
   function clearInputDefault( a) {
      if (a.defaultValue == a.value) {
         a.value = "";
      }
   }
   function restoreInputDefault( a) {
      a.value = a.defaultValue;
   }
   
   // The following group of functions work with checkForNickName to query the leaderboard for similar names.
   function processResponse( response, nameType) {
      let cl = referenceToClient();
      let dataTable = response.getDataTable();
      let nRows = dataTable.getNumberOfRows();
      if (nRows > 0) {
         let inUseName, displayString, similarList_string, similarList_array;
         
         // List of unique similar names with exact match in bold.
         similarList_array = [];
         similarList_string = ""; //(
         for (var i = 0; i < dataTable.getNumberOfRows(); i++) {
            let similarName = dataTable.getValue(i,0).split(" ")[0];
            if ( ! similarList_array.includes( similarName)) {
               similarList_array.push( similarName);
               let candidateName = (nameType == "nick") ? cl.nickName : cl.teamName;
               if (candidateName == similarName) {
                  similarList_string += "<strong>" + similarName + "</strong>, ";
               } else {
                  similarList_string += similarName + ", ";
               }
            }
         }
         similarList_string = similarList_string.slice(0,-2);
         similarList_string += ""; //)
         
         let tab = "&nbsp;&nbsp;&nbsp;";
         let nameTypeString = (nameType == "nick") ? "nicknames" : "team names";
         let similarString = (uT.allOfThese(['007','whitefang'], similarList_string)) ? "all" : "similar";
         displayString = "On the leaderboard<br>" + tab + similarString + " " + nameTypeString + ":&nbsp;&nbsp;" + similarList_string + "";
         
         //console.log("name report (lb) = " + similarList_string);
         displayMessage( displayString, {'color':'yellow'});
      }
   }
   function handleNickNameQueryResponse( response) {
      processResponse( response, "nick");
   }
   function handleTeamNameQueryResponse( response) {
      processResponse( response, "team");
   }
   function similarName( name, handleQueryResponse) {
      let nameWithoutNumbersAtEnd = name.replace(/\d+$/, "");
      // If user entered a pure numeric name, query for similar names using the first digit.
      // A special case, the prime numbers series, will produce a pure wild card query, returning all the nicknames on the leaderboard.
      // A single letter followed by a number will pass the filter for two characters, then lose its number, 
      // yielding a single-letter-with-a-wild-card query (e.g. a5 will return a list of all the nicknames starting with the letter "a")
      if (nameWithoutNumbersAtEnd.length == 0) {
         if (name != "235711") {  
            nameWithoutNumbersAtEnd = name.slice(0,1);
         }
      }
      let sqlString = "select A where (A like '" + nameWithoutNumbersAtEnd + "%') order by A";
      let sheetURL = "https://docs.google.com/spreadsheets/d/1TLMLXsfnmsUU24aQxq0CqcfXvAtW0uAKrOwXL2kc2OE/edit?usp=sharing&sheet=games&headers=1"; 
      let query = new google.visualization.Query( sheetURL);
      query.setQuery( sqlString);
      query.send( handleQueryResponse);
   }   
   
   function checkForNickName( mode) {
      var cl = referenceToClient();
      var nickName = {'status':'ok', 'value':null, 'teamName':null};

      // Check the chat input field, e.g. jimbo
      var chatString = $('#inputField').val();
      
      // Ignore anything that looks like JSON: {}
      if (chatString.includes("{")) {
         nickName.status = "JSON";
         return nickName;
      // Ignore commands in the chat.
      } else if (chatString.includes("::")) {
         return nickName;
      // Go back to being anonymous.
      } else if (chatString == "noname") {
         cl.nickName = null;
         cl.teamName = null;
         $('#inputField').val('');
         $('input.nickNameField').val('');
         return nickName;
      }

      // nickname input field in the ghost-ball pool help panel (all the nick-name fields should be in sync, so just snag from any of these fields)
      var nnFieldValue = $('#nn_pool').val(); 
      var defaultValue = $('#inputField').prop('defaultValue'); //this is the value attribute in the html
      if (mode =='normal') {
         // Generally, the chat field will be empty (or a command with :: in it and ignored above). If not, it's a nickname.
         if ((chatString != "") && (chatString != defaultValue)) { 
            let chatString_clean = chatString.replace(/[^a-zA-Z0-9@]/g, ''); // allow alphanumeric and the @ character
            
            if (chatString_clean.includes("@")) {
               let nickNameParts = chatString_clean.split("@");
               nickName.value = nickNameParts[0];
               nickName.teamName = nickNameParts[1];
            } else {
               nickName.value = chatString_clean;
            }
            
            if (nickName.value.length > 10) {
               nickName.status = "too long";
               return nickName;
            } else if (nickName.value.length < 2) {
               nickName.status = "too short";
               return nickName;
            } else {
               cl.nickName = nickName.value;
               cl.teamName = nickName.teamName;
               
               // Clear out the input field where the nick name was entered.
               $('#inputField').val('');
               
               // Set all the inputs in the nickNameField class (these are only on the host) to the nickname.
               $('input.nickNameField').val( nickName.value);
               
               // Wait for sockets to settle and also so that corresponding chat message is the most recent.
               window.setTimeout( function() {
                  // Check the leaderboard for similar names.
                  similarName( nickName.value, handleNickNameQueryResponse);
                  if (nickName.teamName) similarName( nickName.teamName, handleTeamNameQueryResponse);
                  
                  // Check the node server for similar names.
                  if (socket) socket.emit('name report', {'nickName':nickName.value, 'teamName':nickName.teamName});
               }, 2500);
            }
         
         // Nothing new in the chat, so use the current nick name if it's there.
         } else {
            if (hostOrClient == 'client') {
               nickName.value = cl.nickName;
               nickName.teamName = cl.teamName;
               
            } else if (hostOrClient == 'host') {
               let nickNameParts = nnFieldValue.split("@");
               // Note that teamName is not changed here. Only allowed to change the teamName via the chat field.
               nickName.value = nickNameParts[0];
               cl.nickName    = nickName.value;
               $('input.nickNameField').val( nickName.value);
            }
         }
      
      } else if ((mode == 're-connect') && cl.nickName) {
         nickName.value = cl.nickName;
         nickName.teamName = cl.teamName;
      }
      return nickName;
   }
   
   /*
   Overview of the conversation between client, server, and host, for establishing the P2P connection:
   
   Host: 
      starting with the "Create" button, runs "connect_and_listen" to establish socket.io connection with server. 
      io.connect and init_socket_listeners are run
   Server: 
      on connection, listeners are initialized on the server for that connection
      server automatically sends to "connect" listener on host
   Host: 
      from "connect" listener, host sends to "roomJoin" listener on server with room name as indicated on the host's page
   Server: 
      from "roomJoin" listener, server sets up the room, adds the host to the room as host, 
      and sends to "room-joining-message" listener on host: (1) you joined room, (2) you are host
   Client (and Server): 
      Starting with the "Connect" button, the client makes a similar (like the host's above) exchange with the server to establish 
      the socket.io connection and join the room as a member (not as host).
      The server sends to the "your name is" listener on the client where the rtc object is instantiated and openDataChannel is run.
      openDataChannel( false, clientName); // client run this as NOT the initiator 
         the guts of the WebRTC is instantiated ----> new RTCPeerConnection
         onicecandidate event handler established which uses the "signaling message" listeners
         ondatachannel handler is defined (responds to data channel initiation by the host)
   Server: 
      At the end of the client connection process an additional step is done in the server's "roomJoin" listener. 
      The server sends the new client name to the "new-game-client" listener on the host. 
   Host: 
      "new-game-client" listener instantiates a new Client object where the host-side of each P2P connection, for each client, exists:
         createNetworkClient(...)
      Then these two calls start the P2P connection process:
         openDataChannel( true, clientName); // host opens as the initiator
            the guts of the WebRTC is instantiated ----> new RTCPeerConnection
            onicecandidate event handler established
               handler will send ICE info to the server's "signaling message" listener, then relayed to the client's listener.
            createDataChannel: starts the datachannel on the host; client responds with its ondatachannel handler
         createOffer
            an offer is forwarded to the client using the "signaling message" listeners
   Client:
      "signaling message" listener
         handleOffer
            cl.rtc.pc.setRemoteDescription
            cl.rtc.pc.createAnswer
            cl.rtc.pc.setLocalDescription( answer);
            an answer is sent to the Host via "signaling message" listeners
   Host:
      "signaling message" listener
         handleAnswer
            cl.rtc.pc.setRemoteDescription( answer)
   */
   
   function connect_and_listen( mode) { 
      if (hostOrClient == 'client') startAnimation(); // on ctx
      
      // The host always connects in normal mode.
      // Re-connection happens only when the client is starting a stream or when the P2P connection makes a second attempt.
      if (mode == 'normal') {
         // Reset the counter when the connection is initiated from the button.
         connHist.connectListenCounts = 0;
         gb.touchScreenUsage_sendCounter = 0;
      } else if (mode == 're-connect') {
         // Add to the count so the number of retries can be limited.
         connHist.connectListenCounts += 1;
      } else if (mode == 're-connect-with-stream') {
         // Don't count the first re-connect associated with the video stream.
         mode = 're-connect';
         connHist.connectListenCounts = 0;
      }
      
      // Run some checks on the room name.
      var roomName = $('#roomName').val();
      // Gotta have something...
      if (roomName == "") {
         var buttonName = (hostOrClient == 'client') ? '"Connect"' : '"Create"';
         displayMessage('Type in a short "Room" name, then click the ' + buttonName + ' button.');
         document.getElementById("roomName").style.borderColor = "red";
         return;
      // the HTML limit is set to 9 (so you can try a little more then 7, but then get some advice to limit it to 7)
      } else if (roomName.length > 7) {
         displayMessage('The name should have 7 characters or less.');
         document.getElementById("roomName").style.borderColor = "red";
         return;
      }
      
      // Clear the default string (nickname tip) in the chat field.
      clearInputDefault( document.getElementById('inputField'));
            
      // Check to see if there's a nickname in the chat input field.
      var nickName = checkForNickName( mode);
      
      if (nickName.status == 'too long') {
         displayMessage('Nicknames must have 10 characters or less. Shorten the name and then try connecting again.');
         return;
      } else if (nickName.status == 'too short') {
         displayMessage('Nicknames must have at least 2 characters. Lengthen the name and then try connecting again.');
         return;
      }
            
      if (hostOrClient == 'client') {
         // Disable some of the client controls to keep users from repeatedly
         // clicking the connect button.
         disableClientControls(true);
         refresh_P2P_indicator({'mode':'connecting'});
         
         // Open the connect button after 4 seconds. Sometimes there are network delays.
         // Note: most of the disabled controls open based on events. For example: the 
         // streaming checkbox opens when the p2p data-channel opens (see cl.rtc.dataChannel.onopen).
         window.setTimeout(function() {
            disableClientControls( false);
         }, 4000);
      } else if (hostOrClient == 'host') {
         displayMessage('Connecting as host. Please wait up to 20 seconds...');
      }
   
      var nodeString = $('#nodeServer').val();
      if (nodeString == "") {
         // Use one in the list as a default.
         nodeString = serverArray[0];  // [0] or [2]
         $('#nodeServer').val( nodeString);
      }
      if (nodeString.includes("triquence") || nodeString.includes("herokuapp") || nodeString.includes("https://localhost")) {
         var urlPrefix = "https://"
      } else {
         var urlPrefix = "http://"
      }
      nodeServerURL = urlPrefix + nodeString;
            
      console.log("URL = " + nodeServerURL + "/socket.io/socket.io.js");
      
      // Use jquery to load the socket.io client code.  
      $.getScript( nodeServerURL + "/socket.io/socket.io.js", function() {
         // This callback function will run after the getScript finishes loading the socket.io client.
         
         var cl = referenceToClient();
         console.log("socket.io script has loaded."); 
         
         // If there are already active network connections, close them before making new ones. This is 
         // the case if the client repeatedly clicks the connect button trying to get a preferred color.
         if (socket) {
            if (hostOrClient == 'client') {
               // Send a message to the host (via socket.io server) to shutdown RTC connections.
               if (newClientName) {
                  if (videoMirror.srcObject) videoMirror.srcObject = null;
                  // Trigger client shutdown at the host.
                  socket.emit('shutDown-p2p-deleteClient', newClientName);
               }
            }
            window.setTimeout( function() {
               // Close socket.io connection after waiting a bit for the p2p connections to close.
               socket.disconnect();
            }, 500);
         }
         
         // Delay this (connection to the server) longer than the delay for socket.disconnect() above (to be sure the disconnect has finished).
         window.setTimeout( function() {
            // When starting a new normal connection, turn off the stream.
            if ((mode == 'normal') && (hostOrClient == 'client')) dC.chkRequestStream.checked = false;
            
            // Here is where the socket.io client initiates it's connection to the server. The 'connectOptions' object
            // is passed via the auth attribute of the options. This is how you pass extra parameters to the connection 
            // handler in server.js. 
            // This is where the results from checkForNickName (see above) are passed to the server, which, eventually, 
            // emits to the new-game-client listener on the host.
            let connectOptions = {'mode':mode, 'currentName':cl.name, 'nickName':nickName.value, 'teamName':nickName.teamName};
            socket = io( nodeServerURL, {'forceNew':true, 'auth':connectOptions, 'withCredentials':false});
            
            init_socket_listeners( roomName);
            
         }, 600);
         
         // Check for P2P on the client and try again (reconnect) if needed.
         if ((hostOrClient == 'client') && (connHist.connectListenCounts < 1)) {
            if (window.navigator.userAgent.includes("Firefox")) {
               var waitBeforeCheck = 5500; // Mozilla
            } else {
               var waitBeforeCheck = 3500; // Chrome
            }
            window.setTimeout( function() {
               console.log('checking for p2p connection');
               var p2pConnection = ( (!rtc_choke) && (cl.rtc) && (cl.rtc.dataChannel) && (cl.rtc.dataChannel.readyState == 'open') );
               if ( ! p2pConnection) {
                  connect_and_listen('re-connect'); // Yes, connect_and_listen is this function.
               }
            }, waitBeforeCheck);
         }
         
      // Use the "fail" method of getScript to report a connection problem.  
      }).fail(function( jqxhr, settings, exception) {
         displayMessage('The node server is not responding. Try changing to a different server.');
         document.getElementById("roomName").style.borderColor = "red";
         if (hostOrClient == 'client') refresh_P2P_indicator({'mode':'reset'});
      });  
   }
   
   function displayMessage( msgText, pars={}) {
      let color = uT.setDefault( pars.color, "gray");
      
      if (msgText.includes("Game Summary")) {
         if (msgText.includes("do not display")) msgText = "Please wait for query results...<br>";
         gb.gameReportCounter += 1;
         var idString = " id='gR" + gb.gameReportCounter + "'";
      } else {
         var idString = "";
      }
      
      let colorA, colorB;
      if (color == "yellow") {
         colorA = "#E8ED99"; // shade of yellow
         colorB = "#E8ED99"; // same 
      } else if (color == "green") {
         colorA = "#9FE2BF"; // seafoam green
         colorB = "#9FE2BF"; // same
      } else if (color == "gray") {
         colorA = "#efefef"; // gray
         colorB = "#d9d9d9"; // darker gray
      }
      
      // Every other line, toggle the background shading.
      if (chatStyleToggle) {
         var styleString = "style='background: "+colorA+";'";
      } else {
         var styleString = "style='background: "+colorB+";'";
      }
      
      $("#messages").prepend("<li " + styleString + idString + ">"+ msgText +"</li>");
      
      // Remove any help links on the client (because only the host has the help div).
      if (clientDeviceType) $(".helpLinkFromLB").remove();
      
      chatStyleToggle = !chatStyleToggle;
   }

   // Used for broadcasting a message to non-host players.
   function chatToNonHostPlayers( msgTxt) {
      if (socket) socket.emit('chat message but not me', msgTxt + '</br>');
   }
   
   function init_chatFeatures() {
      serverArray = ['connect.triquence.org',
                         'triquence-ca88d70f0e55.herokuapp.com',
                         'localhost:3000',
                         '192.168.1.106:3000',  
                         '192.168.1.109:3000',  //David's computer
                         '192.168.1.116:3000',  //RPi
                         '192.168.1.117:3000']; //Laptop                 
      // Use jquery to loop over the serverArray and build the URL datalist.
      jQuery.each( serverArray, function( i, val ) {
         $('#nodeServerList').append("<option value='" + val + "'>");
      });
      //$("#nodeServer").attr("value", "192.168.1.106:3000");
      //$("#nodeServer").attr("value", "localhost:3000");
   
      var pingTestHelp = "Your ping test has started.<br><br>" +
                         "Please wait a few seconds for the results of the 100-ping test to return. Each time you hit enter or click the chat button " +
                         "a new 100-ping test will be queued. Please manually clear out the words 'ping' or 'ping:host' to stop pinging and start chatting.";
   
      // Function that emits (if a socket has been established) the text in the form's input field.
      $('#chatForm').submit(function() {
         var chatString =   $('#inputField').val(); // user entry
         var defaultValue = $('#inputField').prop('defaultValue'); //this is the value attribute in the html
         if (socket) {
            // ping to server
            if (chatString == 'ping') {
               echoTest('server');
               displayMessage( pingTestHelp);
               
            // ping to host   
            } else if (chatString == 'ping:host') {
               echoTest('host');
               displayMessage( pingTestHelp);
            
            // peer-to-peer ping test...
            } else if (chatString.slice(0,8) == 'ping:p2p') {
               // example command from the host chat field: ping:p2p-u15
               if (hostOrClient == 'host') {
                  displayMessage( pingTestHelp);
                  var clientName = chatString.split('-')[1];
                  if ((gW.clients[ clientName]) && (gW.clients[ clientName].rtc.dataChannel.readyState == 'open')) {
                     timer.start = window.performance.now();
                     gW.clients[ clientName].rtc.dataChannel.send( JSON.stringify( {'ping':true} ));
                  } else {
                     displayMessage('no client by that name (' + clientName + ') or no p2p connection with that client');
                  }
               } else {
                  displayMessage('P2P ping tests must start from the host.');
                  $('#inputField').val('');
               }
            
            } else if (chatString == "noname") {
               connect_and_listen('normal');
               $('#inputField').val('');
            
            } else if (chatString == "help") {
               let tab = "&nbsp;&nbsp;&nbsp;&nbsp";
               let helpString = "Commands:<br>" +
                  tab + "<strong>help</strong>: list of the network commands than can run from the chat field<br>" +
                  tab + "<strong>rr</strong>: room report on connections to this room<br>" +
                  tab + "<strong>dcir</strong>: disconnect the clients in this room<br>" +
                  tab + "<strong>ping</strong>: ping test to the server<br>" +
                  tab + "<strong>ping:host</strong>: ping test to the host<br>" +
                  tab + "<strong>ping:p2p-uN</strong>: ping test to another p2p client, where N is an integer<br>" +
                  tab + "<strong>cmd</strong>: get more detailed help on the cmd commands<br>" +
                  tab + "<strong>lb</strong>: get more detailed help on leaderboard queries<br>" +
                  tab + "<strong>dbrtc</strong>: get more detailed help on debugging WebRTC stuff<br>" +
                  tab + "<strong>noname</strong>: reconnect as anonymous<br>" +
                  "";
               displayMessage( helpString);
               $('#inputField').val('');
            
            } else if (chatString == 'cmd') {
               let tab = "&nbsp;&nbsp;";
               let helpString = "cmd examples:<br>" +
                  tab + 'cmd::{"to":"roomNoSender","data":{"displayThis":"exclude sender"}}<br>' +
                  tab + 'cmd::{"to":"host","data":{"displayThis":"test string to room host"}}<br>' +
                  tab + 'cmd::{"to":"room","data":{"displayThis":"test string to the whole room"}}<br>' +
                  tab + 'cmd::{"to":"u20","data":{"displayThis":"test string to specific user"}}<br>' +
                  tab + 'cmd::{"to":"jack","data":{"displayThis":"test string to specific user"}}<br>' +
                  "";
               displayMessage( helpString);
               // Put the first example into the chat field. This makes it easy to edit and submit.
               $('#inputField').val('cmd::{"to":"host","data":{"displayThis":"test string to room host"}}');
            
            // general command string input...
            } else if (chatString.slice(0,5) == 'cmd::') {
               try {
                  let string = chatString.split('::')[1];
                  let messageCommand = JSON.parse( string);
                  sendSocketControlMessage( messageCommand);
                  if (socket.connected) displayMessage("command sent..."); // reassurance
               } catch(e) {
                  displayMessage('Might be an error in your JSON. Use " not single quotes.<br>' + e);
                  console.log("Error: " + e);
               }
               
            } else if (chatString == 'lb') {
               let tab = "&nbsp;&nbsp;";
               let helpString = "lb (leaderboard) query examples:<br>" +
                  tab + 'lb::7.a<br>' +
                  tab + 'lb::4.e.monkeyhunt<br>' +
                  tab + 'lb::current<br>' +
                  "";
               displayMessage( helpString);
               // Put the first example into the chat field. This makes it easy to edit and submit.
               $('#inputField').val('lb::current');
               
            } else if (chatString.slice(0,4) == 'lb::') {
               if (hostOrClient == 'host') {
                  let gameName = chatString.split("::")[1];
                  if (gameName == "current") {
                     gameName = gW.getDemoVersion();
                  }
                  lB.requestReportOnly( gameName);
               } else {
                  displayMessage("Leaderboard queries are only available to the host.");
               }
               
            } else if (chatString.slice(0,6) == 'dbrtc') {
               let tab = "&nbsp;&nbsp;";
               let helpString = "dbrtc (debug webrtc) examples:<br>" +
                  tab + 'dbrtc:on<br>' +
                  tab + 'dbrtc:off<br>' +
                  "";
               displayMessage( helpString);
               // Put the first example into the chat field. This makes it easy to edit and submit.
               $('#inputField').val('dbrtc:on');
               
            // turn on (off) WebRTC debugging: set the db.rtc boolean   
            } else if (chatString.slice(0,6) == 'dbrtc:') {
               // dbrtc:on   dbrtc:off
               let value = chatString.split(':')[1];
               sendSocketControlMessage({"to":"room","data":{"dbrtc":value}});
               $('#inputField').val('');
               
            // all is well, just a chat message, send it out
            } else {
               if (chatString != defaultValue) {
                  
                  socket.emit('chat message', chatString);
                  
                  // If removing connections on the node server, delete corresponding clients.
                  if (chatString == "dcir") {
                     cT.Client.applyToAll( client => {
                        if ( (client.name != 'local') && ( ! client.name.includes("NPC")) ) {
                           if (client.puck) client.puck.deleteThisOne({});
                           delete gW.clients[ client.name];
                        }
                     });
                  }
               } else {
                  displayMessage('Nickname tip has been cleared from the chat field. Ready to chat now.<br><br>' +
                                 'Note: an alternative way for the host to establish a nickname is to put it in the chat field before starting demos 6, 7, or 8.');
               }
               $('#inputField').val(''); //clear out the input field.
            }
         // no socket...   
         } else {
            // Note that I've grayed out the unconnected (no socket) chat button on both the client and host pages so
            // this little block will not run anymore.
            var buttonName = (hostOrClient == 'client') ? '"Connect"' : '"Create"';
            displayMessage('Type in a short "Room" name, then click the ' + buttonName + ' button.');
         }
         return false;
      });
      
      // Prevent typing in the input fields from triggering document level keyboard events.
      $('#inputField, #nodeServer, #roomName, #jsonCapture').on('keyup keydown keypress', function( e) {
         e.stopPropagation(); // stops bubbling...
      });
      
      // A first message in the chat area
      var helloMessage, helloMessageA;
      
      if (hostOrClient == 'host') {
         helloMessage = '' +
         'From this page you can host a multiplayer room.</br></br>'+
         
         'To get started, type a short room name into the red box, then click the "Create" button.</br></br>'+
         
         'Optionally, provide a nickname in the chat field before clicking the "Create" button or starting a game (e.g. bob). '+
         'You may indicate team membership using the @ character (e.g. bob@green).</br></br>' +
         
         'Use the "m" key (or click the "Multiplayer" checkbox) to toggle between this chat panel (where leaderboard reports are presented) and the ' + 
         "<a onclick= \" $('#chkMultiplayer').trigger('click'); \">help panel</a>. " + 
         'Doing so will not disable connections.</br></br>'+
         
         'Please note the <a href="client.html" target="_blank">client</a> links in the right panel (below the "Friendly fire" checkbox). '+
         'You can also get to the client from the site menu in the upper-left corner.</br></br>'+
         
         'When setting up the room as host, you might not get an immediate response from the server. It can take a little while for the Heroku node application to wake up. '+
         'If waking, give it 10 to 20 seconds before expecting a confimation message in this chat area.</br></br>'+
         
         'To start over, or disconnect from the server, please reload the page.';
         
      } else {
         if (clientDeviceType == 'mobile') {
            helloMessageA = 'This is the mini-client page for multiplayer. This opens the Two Thumbs interface for the Puck Popper game. '+
                            "(Note that there are additional options with the <a href='client.html'>full client</a>.) </br></br>";
            window.resizeTo(475,750);   // 475,750
         } else {
            helloMessageA = 'This is the client page for multiplayer. '+
                            "(Note that the <a href='client.html?m'>mini-client</a> page is dedicated to the Two Thumbs interface for Puck Popper.) </br></br>";
            window.resizeTo(1240,750);  // 1240,750
         }
         
         helloMessage = helloMessageA +
         
         'From here you can be a client in a multiplayer room. The room must be started (hosted) from the main triquence.org page. '+
         'Generally, a separate computer is used for hosting. For testing, the host and multiple clients can be run in separate windows on the same computer.</br></br>'+
         
         'To connect as a client, enter the room name (provided to you by the host), into the red box here, then click the "Connect" button.</br></br>'+ 
         
         'Optionally, provide a nickname in the chat field before clicking the "Connect" button (e.g. bob). '+
         'You may indicate team membership using the @ character (e.g. bob@green).</br></br>' +
         
         'To start over, or disconnect from the server, please reload the page.';
      }
      displayMessage( helloMessage);
   }
   
   function clientColor( clientName) {
      var n = clientName.slice(1);
      var colorIndex = n - Math.trunc(n/10)*10;
      return clientColors[ colorIndex];
   }

   function init_socket_listeners( roomName) {
      // Listeners needed by both the client and the host.
      
      // Listen for chat being forwarded by the server.
      socket.on('chat message', function(msg) {
         displayMessage( msg);
      });
      
      // Listen for similar-names report coming back from the server.
      socket.on('name report', function( msg) {
         var cl = referenceToClient();
         let tab = "&nbsp;&nbsp;&nbsp;";
         
         //console.log("name report (sv) = " + msg.nickName);
         
         let nickNameString = (msg.nickName.indexOf(",") >= 0) ? "<br>"+tab+"similar nicknames:&nbsp;&nbsp;" + msg.nickName : "";
         let teamNameString = (msg.teamName.indexOf(",") >= 0) ? "<br>"+tab+"similar team names:&nbsp;&nbsp;" + msg.teamName : "";
         let teamMemberString = (msg.teamMemberCount > 0) ? "<br>"+tab+"<strong>" + cl.teamName + "</strong> team count:&nbsp;&nbsp;<strong>" + msg.teamMemberCount + "</strong>" : "";
         
         let displayString = "On the server" + nickNameString + teamNameString + teamMemberString;
         
         if ((msg.nickName.indexOf(",") >= 0) || (msg.teamName.indexOf(",") >= 0)) {
            displayMessage( displayString, {'color':'green'});
         } else if (msg.teamMemberCount > 0) {
            displayMessage( displayString, {'color':'gray'});
         }
      });
      
      // Change the border color of the roomName input box depending on the 
      // message from the node server. And add additional info to the message.
      socket.on('room-joining-message', function( msg_object) {
         debug( db.rtc,'inside room-joining-message listener');
         var msg = msg_object.message;
         
         var cl = referenceToClient();
         
         if (msg.includes('You have joined room')) {
            // Some visual indicators that the connection succeeded.
            document.getElementById("roomName").style.borderColor = "#008080"; //Dark green.
            $('#ChatButton').prop('disabled', false);
            
            // If the names are the same, this indicates the network client has rejoined with a video stream.
            if (hostOrClient == 'client') {
               $('#twoThumbsButton').prop('disabled', false);
            
               // If the name is the same, that indicates a reconnection. Either the client has
               // requested a video stream or is making a second attempt at a P2P connection.
               if (cl.name == cl.previous_name) {
                  if (cl.nickName) {
                     var nNstring = ' (' + cl.nickName + ').';
                  } else {
                     var nNstring = '.';
                  }
                  var nameString = cl.name + nNstring;
                  
                  // Adjust the reconnection message for P2P and streaming attempts. Wait for the connection process to finish.
                  if (window.navigator.userAgent.includes("Firefox")) {
                     var waitBeforeCheck = 4500; // Mozilla
                  } else {
                     var waitBeforeCheck = 2000; // Chrome
                  }
                  window.setTimeout( function() {
                     var p2pConnection = ( (!rtc_choke) && (cl.rtc) && (cl.rtc.dataChannel) && (cl.rtc.dataChannel.readyState == 'open') );
                     if (p2pConnection) {
                        if (dC.chkRequestStream.checked) { 
                           msg = 'You have reconnected with a video stream. Your name is still ' + nameString;
                        } else {
                           msg = 'A P2P connection has been established. Your name is still ' + nameString;
                        }
                     // P2P attempt failed
                     } else {
                        if (dC.chkRequestStream.checked) { 
                           msg = 'You attempted to reconnected with a video stream. However, the needed P2P connection could not be established. Your name is still ' + nameString;
                        } else {
                           msg = 'An attempt to upgrade your connection from socket.io to peer-to-peer (P2P) has not succeeded. Your name is still ' + nameString + ' ' +
                                 'You may wish to simply try the "Connect" button again... ' + 
                                 '<br><br>' +
                                 'All the demos work well with a socket.io connection, but there is a little more lag and no streaming option. ' +
                                 '<br><br>' +
                                 'Difficulty establishing a P2P connection can be related to your browser or network conditions. ' +
                                 'As an alternative, you may wish to try running your own local node server as described in the "Installation of a node server" section ' +
                                 'on the <a href="multiplayer.html" target="_blank">Multiplayer</a> page.';
                        }
                     }
                     displayMessage( msg);
                  }, waitBeforeCheck);
               
               // Normal non-host client connection (not a reconnect).
               } else {
                  if (clientDeviceType == 'mobile') {
                     // Let the host know this (pure Two-Thumbs) so the client cursor can be inhibited.
                     var control_message = {'from':cl.name, 'to':'host', 'data':{'clientDeviceType':'mobile'} };
                     socket.emit('control message', control_message);
                     
                     msg += ''+
                     "</br></br>"+
                                       
                     "Touch the <strong>Two Thumbs</strong> button to start the virtual game-pad interface. This requires line-of-sight to the host's monitor. "+
                     "If you don't have line-of-sight, you can start up a second client (in desktop mode) and stream to it.</br>";
                  } else {
                     msg += ''+
                     "</br></br>"+
                     "You are in <strong>normal desktop</strong> mode. Your mouse and keyboard events get sent to the host. You must have direct visual access to the host's monitor."+
                     "</br></br>"+
                     
                     "Two other options:</br></br>"+
                     
                     "<strong>Stream:</strong> This is like normal mode, but the host's canvas is rendered in the video element here. "+
                     "So you can play out-of-sight of the host's monitor, in a separate room, city, country...</br></br>"+
                     
                     "<strong>Two Thumbs:</strong> touch-screen interface for your phone. Similar to normal mode, this requires line-of-sight to the host's monitor. "+
                     "However, you can start up a second client (on a second device) and stream to it if you don't have line-of-sight.</br>";
                  }
               } 
            
            } else if (hostOrClient == 'host') {
               cl.nameFromServer = msg_object.userName;
               // If you have reconnected as host, or if there is another room active, your new nickname may be in use by someone else, and therefore incremented by the server.
               // Accept that incremented version of your nickname (e.g. bob15).
               cl.nickName = msg_object.nickName;
               // Also reset all the nickname fields near each game.
               $('input.nickNameField').val( cl.nickName);
            }
         
         // Client might get this warning...
         } else if (msg.includes('Sorry, there is no host')) {
            document.getElementById("roomName").style.borderColor = "red";
            refresh_P2P_indicator({'mode':'reset'});
         
         // A candidate host might get this warning... 
         } else if (msg.includes('Sorry, there is already a host')) {
            document.getElementById("roomName").style.borderColor = "red";
         
         // Additional instructions for the new host. This room-joining-message event will have to be triggered a second time to get this message to the host after
         // the "You have joined room" message above.
         } else if (msg.includes('You are the host')) {
            var openWindowString = '"' + "window.open('client.html', '_blank', 'width=1240, height=750') " + '"';
            msg += ' Your name is ' + cl.nameString() + '. ' +
            "</br></br>"+
            'You can still establish or change the nickname for the host. Put it in the chat field '+
            'before running the game demos (e.g. 3d, 4e, 6, 7 and 8). Do not submit as chat. This nickname is used in reports to the leaderboard.'+
            '</br></br>'+
            "You can open a test <a href='#' onClick=" + openWindowString + "title='Open a client page in a new window.'>client</a> in a new window. "+
            "Connect the client using the same room name you established here as the host. Then the client mouse and keyboard events will be transmitted to the canvas of the host.";
         }
         displayMessage( msg);
      });
      
      // Once your connection succeeds, join a room.
      socket.on('connect', function() {
         debug( db.rtc,'inside connect listener');
         
         if (hostOrClient == 'host') {
            socket.emit('roomJoin', {'hostOrClient':hostOrClient,'roomName':roomName} );
            
         } else if (hostOrClient == 'client') {
            socket.emit('roomJoin', {'hostOrClient':hostOrClient,'roomName':roomName,
                                     'player':dC.chkPlayer.checked,
                                     'requestStream':dC.chkRequestStream.checked} );
         }
      });
      
      // Listen for echo response from the server.
      socket.on('echo-from-Server-to-Client', function( msg) {
         var echoTarget = msg;
         
         // Stop timer (measure the round trip).
         timer.stop = window.performance.now();
         var elapsed_time = timer.stop - timer.start;
         // Add this new timing result to the array.
         timer.pingArray.push( elapsed_time);
         
         // The echo series STOPs here.
         if (timer.pingArray.length > 99) {
            displayMessage( echoReport( echoTarget));
            timer.pingArray = [];
            return;
         }
         
         // Ping it again (continue the series).
         echoTest( echoTarget);
         
         // Do this after the timer starts (don't slow it down with a write to the console.)
         console.log( echoTarget);
      });
      
      // WebRTC Signaling.
      // This handles signaling from both sides of the peer-to-peer connection.
      socket.on('signaling message', function( msg) {         
         if (msg.from == 'host') {
            var clientName = msg.to;
         } else {
            var clientName = msg.from;
         }
         var cl = referenceToClient( clientName);
         
         // Note that signalData needs to be in a stringified form when writing to the console.
         debug( db.rtc,"signal message from " + msg.from + ", to " + msg.to + ": " + JSON.stringify( msg.signalData));
         
         // Offers and Answers
         if (msg.signalData.sdp) {
            if (msg.signalData.type == 'offer') {
               debug( db.rtc,"an offer");
               handleOffer( clientName, msg.signalData);
               
            } else if (msg.signalData.type == 'answer') {
               debug( db.rtc,"an answer");
               handleAnswer( clientName, msg.signalData);
               
            } else {
               console.log("Woooooo-HoHo-Hoooooo, this can't be good.");
            }
         
         // ICE candidates
         } else if (msg.signalData.candidate) {
            // handle ICE stuff.
            cl.rtc.pc.addIceCandidate( msg.signalData)
            .then( function() {
               debug( db.rtc,'signaling state after handling ICE candidate = ' + cl.rtc.pc.signalingState);
            })
            .catch( function( reason) {
               // An error occurred, so...
               console.log('Error while handling ICE candidate:' + reason);
            });
            
            
         } else {
            //No WebRTC stuff found in the signaling message. Maybe you are testing...
            console.log("No WebRTC stuff found in the signaling message. This is the final else block of 'signaling message' listener.");
         }
      });
      
      socket.on('control message', function( msg) {
         // General receiver of control messages. This can be used by either the host or a client to
         // receive messages from anyone. Note that the server directs the control messages according to its
         // msg.to values: 'host', 'room', 'roomNoSender', or a specific user name like 'u15'.
         
         // (Refer to the handler for command-from-host-to-all-clients for a similar but more specific approach to
         // command processing.)
         
         // Control actions allowed on both the host and client pages.
         if (msg.data['displayThis']) {
            displayMessage( msg.data['displayThis']);
            
         } else if (msg.data['dbrtc']) {
            displayMessage( "RTC debug setting = " + msg.data['dbrtc']);
            if (msg.data['dbrtc'] == "on") {
               db.rtc = true;
            } else {
               db.rtc = false;
            }
         }
         
         // Control actions allowed only on the host's page.
         // Note the use of gW.clients here. This is only available on the host device.
         if (hostOrClient == 'host') {
            if (msg.data['videoStream'] == 'off') {
               gW.clients[ msg.from].rtc.turnVideoStreamOff();
               
            } else if (msg.data['fullScreen'] == 'off') {
               console.log('full screen requested off by client');
               // I played around with trying to do something here, but the browsers fullscreen API requires that
               // a change starts with a gesture. The error: '...API can only be initiated by a user gesture.'
               
            } else if (msg.data['clientDeviceType'] == 'mobile') {
               // Attribute to inhibit client cursor.
               gW.clients[ msg.from].deviceType = 'mobile';
               console.log('client ' + msg.from + ' is in mobile mode');
               
            } else if (msg.data['puckPopped']) {
               if (msg.data['puckPopped'].value == 'probeAtHost') {
                  // Check to see if the requesting client is still in the clients object and still has a puck.
                  if ((msg.from in gW.clients) && (gW.clients[ msg.from].puck)) {
                     var puckPopped = false;
                  } else {
                     var puckPopped = true;
                  }
                  // Send reply message back to the client.
                  var control_message = {'from':'host', 'to':msg.from, 'data':{'puckPopped':{'value':puckPopped}} };
                  sendSocketControlMessage( control_message);
                  
                  // Sync the gun and jet angles, i.e. send angles out to the clients.
                  if (gW.clients[ msg.from]) pP.gunAngleFromHost( gW.clients[ msg.from], 0, true);
                  if (gW.clients[ msg.from]) pP.jetAngleFromHost( gW.clients[ msg.from]);
               }
               
            } else if (msg.data['twoThumbsEnabled']) {
               if (gW.clients[ msg.from]) gW.clients[ msg.from].twoThumbsEnabled = msg.data['twoThumbsEnabled'].value;
               
            } else if (msg.data['androidDebug']) {
               gW.messages['lowHelp'].newMessage( msg.data['androidDebug'].debugString, 10.0);
            }
            
         // Control actions allowed only the client page.
         } else if (hostOrClient == 'client') {
            if (msg.data['canvasResize']) {
               console.log("command to resize canvas: " + msg.data['canvasResize'].width + ", " + msg.data['canvasResize'].height);
               videoMirror.width = msg.data.canvasResize.width; 
               videoMirror.height = msg.data.canvasResize.height;
               
               demoRunningOnHost = msg.data['demoVersion'];
               
            } else if (msg.data['gunAngle']) {
               twoThumbs.processGunAngleFromHost( msg.data);
               
            } else if (msg.data['jetAngle']) {
               twoThumbs.processJetAngleFromHost( msg.data);
               
            } else if (msg.data['drawSync']) {
               if (msg.data['drawSync'].value) {
                  refresh_P2P_indicator({'mode':'sync'});
               } else {
                  refresh_P2P_indicator({'mode':'p2p'});
               }
               
            } else if (msg.data['puckPopped']) {
               twoThumbs.setPuckPopped( msg.data['puckPopped'].value);
               
            } else if (msg.data['controlKey']) {
               mK['ct'] = msg.data['controlKey'].value;
               eVN.handle_sending_mK_data( mK);
            }
         }
      });
      
      // Listeners needed by the client only.

      if (hostOrClient == 'client') {  
         socket.on('your name is', function( msg) {
            var name = uT.setDefault( msg.name, null);
            // To see where nickName and teamName are sent to the host, look at the emit to 
            // new-game-client on the server and the corresponding listener here.
            
            // Put this name in the mouse and keyboard (mK) global that is used to send
            // state data from the client.
            mK.name = name;
            
            // Put your name in this global (on the client side) for (possible) use by the WebRTC functions.
            newClientName = name;
            
            // Before updating cl_clientSide.name with the new client name, store it's current value in previous_name.
            cl_clientSide.previous_name = cl_clientSide.name;
            cl_clientSide.name = newClientName;
            
            debug( db.rtc,'inside "your name is", names: current='+cl_clientSide.name+ ', previous='+ cl_clientSide.previous_name );
            
            // Initialize rtc for the client side of the p2p connection.
            cl_clientSide.rtc = new RTC({'user1':newClientName,'user2':'host'});
            openDataChannel( false); // Open as NOT the initiator
         });
         
         socket.on('disconnectByServer', function( msg) {
            debug( db.rtc,'in client disconnectByServer, msg=' + msg.name + ',' + msg.originator);
            
            var clientName = msg.name;
            displayMessage("This client (" + clientName + ") is being disconnected by the " + msg.originator + ".");
            document.getElementById("roomName").style.borderColor = "red";
            
            // When the server gets this one, it will remove the socket.
            socket.emit('okDisconnectMe', clientName);
            
            // Shutdown and delete the client side of the WebRTC p2p connection.
            cl_clientSide.rtc.shutdown();
            eVN.initialize_mK();
            
            // Delay this so it takes effect after the p2p toggle finishes.
            window.setTimeout( function() {
               displayMessage("");
               displayMessage("Shutdown of the connection for " + clientName + " has finished.");
               displayMessage("");
               displayMessage("");
               displayMessage("");
               refresh_P2P_indicator({'mode':'disconnected'});
            }, 100);
         });
         
         // Refer to the "control message" handler for a more general approach to command processing. Below is a
         // specific host-to-all-clients approach.
         socket.on('command-from-host-to-all-clients', function( msg) {
            // Clients (only) do something based on the message from the host.
            var type = msg.type;
            var command = msg.command;
            
            if (type == 'resize') {
               if (clientDeviceType == 'mobile') command = 'mobile';
               //console.log('command = ' + command);
               dS.adjustSizeOfChatDiv( command);
               
               if (command == 'normal') {
                  videoMirror.width = 600, videoMirror.height = 600;
               } else {
                  videoMirror.width = 1250, videoMirror.height = 950;
               }
            } else {
               console.log("no match in command-from-host-to-all-clients handler");
            }
         });
      }
      
      // Listeners needed by the host only.
      
      if (hostOrClient == 'host') {
         // (Note: this is the one place where calls to gW are made inside of hC.)
         
         // Listen for client mouse and keyboard (mk) events broadcast from the server.
         // StH: Server to Host
         socket.on('client-mK-StH-event', function( msg) {
            let mk_data = msg;
            // On the host, update the mouse-and-keyboard state for the specified client.
            cT.updateClientState( mk_data.name, mk_data);
         });
         
         // As host, create a new client in gW framework.
         socket.on('new-game-client', function( msg) {
            var streamRequested = msg.requestStream;
            
            var clientName = msg.clientName;
            var player     = msg.player;
            var nickName   = msg.nickName;
            var teamName   = msg.teamName;
            
            createNetworkClient({'clientName':clientName, 'player':player, 'nickName':nickName, 'teamName':teamName});
            
            // WebRTC. Start the p2p connection here (from the host) when we hear (from the server)
            // that a client is trying to connect to a room.
            var cl_hostSide = gW.clients[ clientName];
            cl_hostSide.rtc.user1 = 'host';
            cl_hostSide.rtc.user2 = clientName;
            cl_hostSide.rtc.streamRequested = streamRequested;
            debug( db.rtc,'in new-game-client, cl_hostSide.rtc.user2 = ' + cl_hostSide.rtc.user2);
            
            // Start the WebRTC signaling exchange with the new client.
            // Diagnostic tools: chrome://webrtc-internals (in Chrome) and about:webrtc (in Firefox)
            try {
               openDataChannel(true, clientName); // open as the initiator
               debug( db.rtc,'data channel initiated');
               createOffer( clientName);
            } catch(e) {
               console.log("WebRTC startup: " + e);
            }
            
            // Someone just connected. Send the host's layout state to them (actually to everyone, but that
            // should, of course, cover the connecting user also). Delay it a bit...
            window.setTimeout( function() {
               // Adjust client chat panel and canvas to match host (normal or small chat).
               resizeClients( gW.getChatLayoutState());
               // Adjust client canvas to match specific custom dimensions of the host's canvas.
               eV.setClientCanvasToMatchHost();
            }, 300);
         });
         
         socket.on('client-disconnected', function(msg) {
            var clientName = msg;   
            debug( db.rtc,'in client-disconnected, clientName=' + clientName);
            
            nullReferences_toRTC_on_cl( clientName);
            
            // Do corresponding cleanup.
            deleteNetworkClient( clientName);
         });
         
         socket.on('echo-from-Server-to-Host', function(msg) {
            // Bounce this back to server.
            // The msg string is the client id.
            socket.emit('echo-from-Host-to-Server', msg);
         });
         
         socket.on('shutDown-p2p-deleteClient', function( msg) {
            debug( db.rtc,'in shutDown-p2p-deleteClient');
            var clientName = msg;
            // First check for the case where the host has reloaded their page and 
            // then a client attempts to reconnect. In that case the clients map will be empty and
            // this clientName won't be found in there.
            if (gW.clients[ clientName]) {
               // Check for a puck controlled by this client. Delete it first.
               if (gW.clients[ clientName].puck) gW.clients[ clientName].puck.deleteThisOne({});
               // Then start shutting down the WebRTC connection.
               deleteRTC_onClientAndHost( clientName);
            }
         });
      }
   } // end of init_socket_listeners
   
   
   function forceClientDisconnect( clientName) {
      debug( db.rtc,'in forceClientDisconnect');
      socket.emit('clientDisconnectByHost', clientName);
   }
   function resizeClients( command) {
      if (socket) {
         socket.emit('command-from-host-to-all-clients', {'type':'resize', 'command':command} );
      }
   }
   function sendSocketControlMessage( message) {
      // This emit is received and distributed at the server in its 'control message' handler. Then
      // received and processed at the host or client in their 'control message' handler.
      if (socket) {
         socket.emit('control message', message);
      }
   }

   
   ////////////////////////////////////////////////
   // Functions supporting the WebRTC connections.
   ////////////////////////////////////////////////
   
   var configuration = { 'iceServers': [{'urls': 'stun:stun1.l.google.com:19302'}] };
   
   function openDataChannel( isInitiator, clientName = 'N/A') {
      // On the client page: cl refers to the one and only object that holds name info and the RTC object for that client.
      // On the   host page: cl refers to the named client, of possibly many client instances on the host, in the clients array.
      // referenceToClient switches cl to make the appropriate reference depending on the page context.
      var cl = referenceToClient( clientName);
      cl.rtc.pc = new RTCPeerConnection( configuration);
      
      cl.rtc.pc.onicecandidate = function (evt) {
         if (evt.candidate) {
            // send any ice candidates to the other peer
            var signal_message = {'from':cl.rtc.user1, 'to':cl.rtc.user2, 'signalData':evt.candidate};
            socket.emit('signaling message', signal_message);
         }
      };
      
      // Host-side data channel
      if (isInitiator) {
         debug( db.rtc,'host is setting up datachannel...');
         var dc_id = cl.rtc.user2.slice(1);
         var dc_options = {'id':dc_id, 'ordered':false, 'maxRetransmits':1};
         var dc_label = "dc-" + cl.rtc.user2;
         cl.rtc.dataChannel = cl.rtc.pc.createDataChannel( dc_label, dc_options);
         
         cl.rtc.dataChannel.onmessage = function( e) {
            var objFromClient = JSON.parse( e.data);   
            
            // Ping to client test...
            if (objFromClient['ping']) {
               timer.stop = window.performance.now();
               var elapsed_time = timer.stop - timer.start;
               timer.pingArray.push( elapsed_time);
         
               if (timer.pingArray.length < 100) {
                  timer.start = window.performance.now();
                  gW.clients[this.user2].rtc.dataChannel.send( JSON.stringify( {'ping':true} ));
               } else {
                  displayMessage( echoReport( this.user2));
                  timer.pingArray = [];
               }
               
            } else {
               handle_RTC_message( objFromClient);
            }
         }.bind({'user2':cl.rtc.user2});  // bind object to "this" so it (this.user2) is available when onmessage runs.
         
         cl.rtc.dataChannel.onopen    = function( ) {console.log("------ RTC DC(H) OPENED ------");};
         cl.rtc.dataChannel.onclose   = function( ) {console.log("------ RTC DC(H) closed ------");};
         cl.rtc.dataChannel.onerror   = function(e) {
            if (e.error != "OperationError: Transport channel closed") console.log("RTC DC(H) error: " + e.error);
         };
         
         if (cl.rtc.streamRequested) {
            startVideoStream( clientName);
         }
      
      // Client-side data channel
      } else {
         debug( db.rtc,'client is setting up datachannel...');

         // This side of the data channel gets established in response to the channel initialization 
         // on the host side.
         cl.rtc.pc.ondatachannel = function(evt) {
            debug( db.rtc,'client response in ondatachannel handler');
            cl.rtc.dataChannel = evt.channel;
            
            // Must also set up an onmessage handler for the clients.
            cl.rtc.dataChannel.onmessage = function(e) {
               debug( db.rtc,"DC (@client) message:" + e.data);
               var objFromHost = JSON.parse( e.data);
               
               // Ping back to the host
               if (objFromHost['ping']) {
                  cl.rtc.dataChannel.send( JSON.stringify( {'ping':true} ));
               
               } else {
                  // The gun-angle info is on a 'data' key of the sent object.
                  twoThumbs.processGunAngleFromHost( objFromHost.data);
               }
            };
            
            cl.rtc.dataChannel.onopen = function() {
               console.log("------ RTC DC(C) OPENED ------");
               rtc_choke = false;
               $('#chkRequestStream').prop('disabled', false);
               refresh_P2P_indicator({'mode':'p2p', 'context':'dataChannelOpen'});
            };
            cl.rtc.dataChannel.onclose = function() {
               console.log("------ RTC DC(C) closed ------");
               rtc_choke = true;
            };
            cl.rtc.dataChannel.onerror = function(e) {
               if (e.error != "OperationError: Transport channel closed") console.log("RTC DC(C) error: " + e.error);
            };
         }
         
         // Respond to a new track by sending the stream to the video element.
         cl.rtc.pc.ontrack = function (evt) {
            videoMirror.srcObject = evt.streams[0];
         };
      }
      debug( db.rtc,'signaling state at end of openDataChannel = ' + cl.rtc.pc.signalingState);
   }
   
   // This function is used (only) by the host when someone connects and wants a stream.
   function startVideoStream( clientName) {
      var cl = referenceToClient( clientName);
      
      if (!videoStream) {
         var hostCanvas = document.getElementById('hostCanvas');
         videoStream = hostCanvas.captureStream(); //60
      }
      cl.rtc.pc.addTrack( videoStream.getVideoTracks()[0], videoStream);
      // The chkStream is on the host page only (index.html)
      document.getElementById("chkStream").checked = true;
      videoStream.getVideoTracks()[0].enabled = true;
   }
   
   function setCanvasStream( newState) {
      if (videoStream) {
         if (newState == 'on') {
            videoStream.getVideoTracks()[0].enabled = true;
         } else {
            videoStream.getVideoTracks()[0].enabled = false;
         }
      }
   }
   
   function handle_RTC_message( mK_data) {
      //var user2 = Object.assign({}, cl.rtc.user2);
      
      /*
      var user2 = JSON.stringify(cl.rtc.user2);
      console.log("I am (cl.rtc.user2) = " + user2);
      console.log("DC ID = " + JSON.stringify(cl.rtc.dataChannel.id));
      console.log("DC (@host) message: " + e.data);
      */
      
      // On the host, update the mouse-and-keyboard state for the specified client.
      cT.updateClientState( mK_data.name, mK_data);
   }
   
   function createOffer( clientName) {
      var cl = referenceToClient( clientName);
      cl.rtc.pc.createOffer()
      .then( function( offer) {
         return cl.rtc.pc.setLocalDescription( offer);
      })
      .then( function() {
         var signal_message = {'from':cl.rtc.user1, 'to':cl.rtc.user2, 'signalData':cl.rtc.pc.localDescription};
         socket.emit('signaling message', signal_message);
         debug( db.rtc,'signaling state after createOffer = ' + cl.rtc.pc.signalingState);
      })
      .catch( function(reason) {
         console.log('Error while creating offer:' + reason);
      });
   }
   
   function handleOffer( clientName, msg) {
      var cl = referenceToClient( clientName);
      
      cl.rtc.pc.setRemoteDescription( msg)
      .then( function() {
         return cl.rtc.pc.createAnswer( );
      })
      .then( function( answer) {
         return cl.rtc.pc.setLocalDescription( answer);
      })
      .then( function() {
         // Send the answer (localDescription) to the remote peer
         var signal_message = {'from':cl.rtc.user1, 'to':cl.rtc.user2, 'signalData':cl.rtc.pc.localDescription};
         socket.emit('signaling message', signal_message);
         debug( db.rtc,'signaling state after handleOffer = ' + cl.rtc.pc.signalingState);
      })
      .catch( function( reason) {
         console.log('Error while handling offer:' + reason);
      });
   }
   
   function handleAnswer( clientName, answer) {
      var cl = referenceToClient( clientName);
      cl.rtc.pc.setRemoteDescription( answer)
      .then( function() {
         debug( db.rtc, 'signaling state after handleAnswer = ' + cl.rtc.pc.signalingState);
      })
      .catch( function( reason) {
         console.log('Error while handling answer:' + reason);
      });
   }

   function logError( error) {
      console.log( error.name + ': ' + error.message);
   }   
   
   function nullReferences_toRTC_on_cl( clientName) {
      var cl = referenceToClient( clientName);
      // Check the global "cl" pointer (to the most recently connected client) to see if it happens to
      // be pointed at this client.
      if (cl) {
         debug( db.rtc, 'in nullReferences_toRTC_on_cl \n  cl.rtc=' + JSON.stringify( cl.rtc) + ", newClientName=" + clientName);
         if (cl.rtc && (cl.rtc.user2 == clientName)) {
            cl.rtc = new RTC({});
         }
      } else {
         // client not found in clients array; maybe already removed by a disconnection...
         //debug( db.rtc, "can't find " + clientName + " in clients");
      }
   }

   function refresh_P2P_indicator( pars) {
      var mode = uT.setDefault( pars.mode, 'p2p');
      var context = uT.setDefault( pars.context, null);
      
      // Stop the pacifier (note: pacifier is a global object)
      // clearInterval() method clears a timer set with the setInterval() method
      clearInterval( pacifier.intFunction);
      pacifier.string = '';
      
      var cl = referenceToClient();
      
      // If connected, there will be a name (assigned from the server)
      if ((mode == 'p2p') && cl.name) {
         // Show (flood/erase the canvas with) the client's color.
         connMssg.fillColor = clientColor( cl.name);
         
         connMssg.font = "12px Arial";
         // Use dark letters for the lighter client colors.
         if (clientLightColors.includes( clientColor( cl.name))) {
            connMssg.textColor = 'black';
         } else {
            connMssg.textColor = 'white';
         }
         
         // If the rtc choke is off and there's a data channel, display the "P2P" text.
         if (!rtc_choke && cl.rtc && cl.rtc.dataChannel && (cl.rtc.dataChannel.readyState == 'open')) {
            connMssg.string = 'P2P';
         } else {
            connMssg.string = 'socket.io';
         }
         
      } else if (mode == 'connecting') {
         connMssg.fillColor = 'darkgray';
         
         connMssg.font = "12px Arial";
         connMssg.textColor = 'white';
         connMssg.string = 'CONNECTING';
         
         // Start the pacifier
         pacifier.string = '';
         pacifier.intFunction = setInterval( function() { 
            pacifier.string += '--';
         }, 200);
         
      } else if (mode == 'reset') {
         // Light gray fill.
         connMssg.fillColor = '#EFEFEF';
         connMssg.string = '';
         
      } else if (mode == 'sync') {
         connMssg.fillColor = 'black';
         
         connMssg.font = "12px Arial";
         connMssg.textColor = 'white';
         connMssg.string = 'SYNC';
         
      } else if (mode == 'disconnected') {
         connMssg.fillColor = 'darkgray';
         
         connMssg.font = "12px Arial";
         connMssg.textColor = 'white';
         connMssg.string = 'DISCONNECTED';
      }
   }
      
   function draw_connectionIndicators() {
      // Note the use of improveCanvasResolution (see demoStart.js) in making the text crisp.
      
      // First, clear it.
      ctx.fillStyle = connMssg.fillColor;
      ctx.fillRect(0, 0, clientCanvas.width, clientCanvas.height);
      
      // The sync bar, toggled with ctrl-a on the host.
      if (connMssg.string == 'SYNC') {
         dF.drawLine( ctx, new wS.Vec2D(55,8), new wS.Vec2D(85,8), {'width_px':10, 'color':'white'} );
      }
      
      // Then write out the message text.
      ctx.font = connMssg.font;
      ctx.fillStyle = connMssg.textColor;
      ctx.fillText( connMssg.string, 10, 12);
      
      // Add the ---- of the pacifier.
      ctx.fillText( pacifier.string, 95, 12);
   }   
      
   ////////////////////////////////////////////////////////////////////////////////
   // Functions supporting animation for the connection canvas
   ////////////////////////////////////////////////////////////////////////////////
   
   function canvasLoop( timeStamp_ms) {
      updateCanvas();
      m_myRequest = window.requestAnimationFrame( canvasLoop);
   }
   function updateCanvas() {     
      draw_connectionIndicators();
   }
   function startAnimation() {
      // Only start an animation loop if there is no loop running.
      if (m_myRequest === null) {
         // Start the canvas loop.
         m_myRequest = window.requestAnimationFrame( canvasLoop);
      }
   }
   function stopAnimation() {
      window.cancelAnimationFrame( m_myRequest);
      m_myRequest = null;
   }
   
   ////////////////////////////////////////////////////////////////////////////////
   // functions for adding and/or removing a network client
   ////////////////////////////////////////////////////////////////////////////////
   
   function createNetworkClient( pars) {
      var clientName = uT.setDefault( pars.clientName, 'theInvisibleMan');
      // "player" is true/false to indicate if the client is requesting that a player puck be 
      // added to the client instance.
      var player = uT.setDefault( pars.player, true);
      var nickName = uT.setDefault( pars.nickName, null);
      var teamName = uT.setDefault( pars.teamName, null);
      
      var n = clientName.slice(1);
      // Repeat the color index every 10 users (10 colors in clientColors)
      var colorIndex = n - Math.trunc(n/10)*10;
      
      var clientPars = {};
      clientPars.player = player;
      clientPars.nickName = nickName;
      clientPars.teamName = teamName;
      clientPars.color = clientColors[ colorIndex];
      clientPars.nameFromServer = clientName;
      clientPars.name = clientName;
      
      // if client is joining a ghost-ball pool game that's underway, initialize these.
      if (gW.getDemoVersion().slice(0,3) == "3.d") {
         clientPars.ctrlShiftLock = true;
         clientPars.poolShotLocked = true;
         clientPars.poolShotLockedSpeed_mps = 20;
      }
      
      new cT.Client( clientPars);
   }
   
   function deleteNetworkClient( clientName) {
      // This function does not directly remove the client socket at the node server, but
      // that does happen at the server...
      if (db.rtc) console.log('in deleteNetworkClient, clientName=' + clientName + ", fileName="+fileName);
      
      if (gW.clients[clientName]) {
         // If it's driving a puck. First, delete that.
         if (gW.clients[clientName].puck) {
            var thePuck = gW.clients[clientName].puck
            
            // Remove this puck and do associated clean-up.
            thePuck.jet = null;
            thePuck.gun = null;
            thePuck.shield = null;
            gW.tableMap.delete( thePuck.b2d);
            gW.b2d.world.DestroyBody( thePuck.b2d);
            delete gW.aT.puckMap[ thePuck.name];
         }
         deleteRTC_onHost( clientName);
      }
   }
   
   function deleteRTC_onHost( clientName) {
      if (db.rtc) console.log('in deleteRTC_onHost');
   
      // Shutdown and nullify any references to the host side of this WebRTC p2p connection.
      if (gW.clients[clientName].rtc) {
         gW.clients[ clientName].rtc.shutdown();
      }
      
      // Remove the client in the clients map.
      if (gW.clients[clientName]) {
         delete gW.clients[ clientName];
      }
   }
   
   function deleteRTC_onClientAndHost( clientName) {
      if (db.rtc) console.log('in deleteRTC_onClientAndHost');
      
      // Remove network clients on the node server.
      // (Note: this is one of the several places where hC is used inside of gW.)
      if (clientName.slice(0,1) == 'u') {
         // Send message to the server and then to the client to disconnect.
         forceClientDisconnect( clientName);
      }
      
      // Remove the client in the clients map.
      deleteRTC_onHost( clientName);
   }
   
   
   ////////////////////////////////////////////////////////////////////////////////
   // Misc functions
   ////////////////////////////////////////////////////////////////////////////////
   
   /*
   It's important, as multiple players connect, to use referenceToClient, 
   especially in the context of the host's page, to set references within 
   the local scope of the functions and callbacks used below. Global scope, 
   on the host page, could result in references changing, as a new player 
   connects, before the ongoing asynchronous connection process completes. 

   When referenceToClient is called without a parameter, it returns a 
   reference to either gW.clients['local'] (on the host's page) or 
   cl_clientSide (on the client page). If a client name is provided (and on 
   the host page) this points at the particular client in the clients 
   array.
   */
   function referenceToClient( clientName = 'local') {
      if (hostOrClient == 'client') {
         // a reference to the one and only client-similar object on the client page
         var clientRef = cl_clientSide;
      } else if (hostOrClient == 'host') {
         // a reference to one of the clients on the host page
         var clientRef = gW.clients[ clientName];
      }
      return clientRef;
   }
   
   function init_nonHostClients() {
      
      // Get the URL query string. Discard everything after the "&".
      var queryStringInURL = window.location.search.split("&")[0];
      // Take everything after the ? and set a module (hC) level global, clientDeviceType, that will
      // be used in restricting features for a simplified mobile version of the client page.
      var queryStringValue = queryStringInURL.slice(1);
      if (queryStringValue == "m") {
         clientDeviceType = "mobile";
      } else {
         clientDeviceType = "desktop";
      }
      
      if (clientDeviceType == 'mobile') {
         dS.adjustSizeOfChatDiv('mobile');
      } else {
         dS.adjustSizeOfChatDiv('normal');          
      }
      
      clientCanvas = document.getElementById('connectionCanvas');
      ctx = clientCanvas.getContext('2d');
            
      clientCanvas_tt = document.getElementById('twoThumbsCanvas');
      ctx_tt = clientCanvas_tt.getContext('2d');

      videoMirror = document.getElementById('videoMirror');
      
      eVN.initializeModule( clientCanvas_tt, ctx_tt, videoMirror, mK, cl_clientSide, dC); // mK is initialized to {} above
      init_chatFeatures();
      twoThumbs.initializeModule( clientCanvas_tt, ctx_tt, videoMirror, mK, cl_clientSide);
      
      if (clientDeviceType == 'mobile') {
         // Resize (reduce) the button
         $("#twoThumbsButton").css("height", "28px");
         // Move it
         $('#divForTwoThumbsMobile').append( $('#twoThumbsButton') );
         
         // Hide the video streaming element.
         videoMirror.setAttribute("hidden", null);
         
         // Hide controls
         $("#nodeServerDiv").hide();  
         $("#playerAndCursor").hide();  
         $("#streamAndFullscreen").hide();  
         $("#twoThumbsButtonDiv").hide();       

         // page title
         document.title = "S&P mini-client";
      }
      
      // Hide the div that covers the mess (while elements are moving)
      $("#blankWhiteDiv").hide();
   }
   
   function debug( flag, message) {
      if (flag) console.log( message);
   }
   
   function echoTest( hostOrServer) {      
      // Start the timer for one echo.
      timer.start = window.performance.now();
      
      // The echo series STARTs here.
      socket.emit('echo-from-Client-to-Server', hostOrServer);
   }
   function echoReport( echoTarget) {
      // Note the lowercase m on math.mean for example. These methods are from the mathjs library. See script load on index.html and client.html.
      // These are not part of the native Math (upper case M) methods.
      var timeAvg = math.mean( timer.pingArray).toFixed(1);
      var timeSTD = math.std( timer.pingArray).toFixed(1);
      var timeLen = timer.pingArray.length;
      var timeMax = math.max( timer.pingArray).toFixed(1);
      var timeMin = math.min( timer.pingArray).toFixed(1);
      var reportString = 'Echo test to '+ echoTarget +': '+ timeAvg +' ms '+
          '(std='+  timeSTD +
          ', min='+ timeMin +
          ', max='+ timeMax +
          ', n='+   timeLen +')';
      return reportString;
   }
   

   // Reveal public references ///////////////

   return {
      // Objects
      'RTC': RTC,
      'gb': gb,
      'dC': dC,
      'clientLightColors': clientLightColors,

      // Variables
      'getClientDeviceType': function() { return clientDeviceType; },
      'get_hostOrClient': function() { return hostOrClient; },
      'get_demoRunningOnHost': function() { return demoRunningOnHost; },
      
      'get_rtc_choke': function() { return rtc_choke; },
      'set_rtc_choke': function( val) { rtc_choke = val; },
            
      // Methods
      //nodeServerURL: nodeServerURL,
      'forceClientDisconnect': forceClientDisconnect,
      'resizeClients': resizeClients,
      'sendSocketControlMessage': sendSocketControlMessage,
      'init_chatFeatures': init_chatFeatures,
      'init_nonHostClients': init_nonHostClients,
      'connect_and_listen': connect_and_listen,
      'refresh_P2P_indicator': refresh_P2P_indicator,
      'setCanvasStream': setCanvasStream,
      'chatToNonHostPlayers': chatToNonHostPlayers,
      'displayMessage': displayMessage,
      'checkForNickName': checkForNickName,
      'clearInputDefault': clearInputDefault,
      'restoreInputDefault': restoreInputDefault,
      'clientColor': clientColor,
      'referenceToClient': referenceToClient,
      
      'get_socket': function() { return socket; },      
   };
   
})();