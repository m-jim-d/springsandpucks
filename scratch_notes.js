// Socket.io sequence when a client connects
@ client, initiate a socket.io connection to the server:
   socket = io.connect( nodeServerURL, {'forceNew':true, 'query':'streamFlag=ON...)
@ server, in io.on('connection') callback, pick a user name and send it back to the client: 
   io.to(socket.id).emit('your name is', cD.userName[socket.id]);
@ client, when connection succeeds, in socket.on('connect') callback, send request to join room to the server: 
   socket.emit('roomJoin', roomName);
@ server, in 'roomJoin' callback, check if the room is hosted, then send the user name to the host
   io.to( cD.hostID[ roomName]).emit('new-game-client', cD.userName[socket.id]);
@ host, in 'new-game-client' callback, initiate the P2P stuff...



// Call sequences when a client puck is deleted.

// in gW (host).
Puck.prototype.deleteThisOne
   // first, host runs this in hC
   hC.forceClientDisconnect( this.clientName);
      //message, host to server:  
      socket.emit('clientDisconnectByHost', clientName);
      //message, server to client:  
      io.to(clientID).emit('disconnectByServer', clientName);
      
         //In hC, client, disconnectByServer handler:
         //message, client to server
         socket.emit('okDisconnectMe', clientName);
            
            //In server, okDisconnectMe handler:
            //message, server to host
            io.to( hostID).emit('client-disconnected', clientName);
               //In hC, host, client-disconnected handler.
               nullReferences_toRTC_on_c( clientName);
                  c.rtc = new RTC({});
               gW.deleteNetworkClient( clientName);
                  deleteRTC_onHost( clientName);
                     clients[ clientName].rtc.shutdown();
                     delete clients[ clientName];
                  
            socket.disconnect();
         
         //Still in hC, client, disconnectByServer handler:
         c.rtc.shutdown();
   
   // In gW...
   deleteRTC_onHost( this.clientName);
      clients[ clientName].rtc.shutdown();
      delete clients[ clientName];


      

// Looks like "delete clients[ clientName]" runs twice in outline above.

// This outline is reproduced in the new function deleteRTC_onClientAndHost
// Try to call this from the client, as call to gW.deleteRTC_onClientAndHost
// or as a socket.io event that handles on the host and runs deleteRTC_onClientAndHost.


Shutting down P2P when reconnecting from the client page...

// at client, emit to server
socket.emit('shutDown-p2p-deleteClient', newClientName);
// at server, emit to host
io.to( hostID).emit('shutDown-p2p-deleteClient', clientName);
// at host
shutDown-p2p-deleteClient
   deleteRTC_onClientAndHost
      forceClientDisconnect
         socket.emit('clientDisconnectByHost', clientName);
            // in clientDisconnectByHost on server
            io.to(clientID).emit('disconnectByServer', clientName);
               // in disconnectByServer on client
               c.rtc.shutdown();
            
               
      deleteRTC_onHost