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

// Box2D Stuff (bS) module
// boxStuff.js 
   console.log('bS _*-*_');
// 4:37 PM Sun August 13, 2023

/*
gwModule.js has an alphabetical list of all modules and their nicknames as added to the windows namespace.
*/

window.bS = (function() {
   "use strict";
   
   // module globals for objects brought in by initializeModule
   // (nothing yet)
   
   
   
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
   
   function initializeModule( canvas, ctx) {
      // (nothing yet)
   }

   // Note: there is more contact-related processing in the contactNormals, updateGhostBall, and drawGhostBall functions of ghostBall.js.

   function beginContactHandler( contact) {
      // Any collision will start the fadeout mode for the pathAfter drawing of the ghost ball.
      if (gW.getDemoVersion().slice(0,3) == "3.d") {
         cT.Client.applyToAll( client => { 
            client.gBS.pathAfter.fadeOut = true;
         });
      }
      
      // Use the table map to get a reference back to a gW object.
      var body_A = gW.tableMap.get( contact.GetFixtureA().GetBody());
      var body_B = gW.tableMap.get( contact.GetFixtureB().GetBody());

      // Ghost puck sensor event associated with client cursor. (also see drawGhostBall in ghostBall.js)
      if ((body_A.constructor.name == "Client") || (body_B.constructor.name == "Client")) {
         
         if (body_A.constructor.name == "Client") {
            // Yes, I put the client into the tableMap (wow!). The (ghost) b2d sensor is an attribute on the client.
            var clientTarget = body_B, client = body_A; 
         } else {
            var clientTarget = body_A, client = body_B;
         }
         // ignore contact between the sensor (the ghost) and the source puck (selected by client).
         if ((client.selectedBody) && (clientTarget.name != client.selectedBody.name)) {
            
            // if no longer in contact with the previous target (it's null now), identify this contact as the new target.
            if ( ! client.sensorTargetName) {
               client.sensorTargetName = clientTarget.name;
            }
         }

      // Set the wall color to that of the puck hitting it.
      } else if ((body_A.constructor.name == "Wall") || (body_B.constructor.name == "Wall")) {
         // pi-calcs clacks and counts
         gW.aT.collisionCount += 1;
         gW.aT.collisionInThisStep = true; 
         
         if (body_B.constructor.name == "Puck") {
            var body_Puck = body_B, body_Wall = body_A;
         } else {
            var body_Puck = body_A, body_Wall = body_B;               
         }
         
         // If it's a puck designated as a color source, use its client color for the wall.
         if (body_Puck.colorSource) {
            if (body_Puck.clientName && body_Wall.fence) {
               body_Wall.color = gW.clients[body_Puck.clientName].color;
            } else if (body_Wall.fence) {
               body_Wall.color = body_Puck.color;
            }
         } else {
            // Reset the wall color to it's default.
            if ( ! body_Wall.sensor) body_Wall.color = cP.Wall.color_default;               
         }
         
         // Ghost-ball pool
         if (gW.getDemoVersion().slice(0,3) == "3.d") {
            gB.setCushionCollision(true);
            
         } else if (gW.getDemoVersion().slice(0,14) == "5.e.basketball") {
            bpH.processBasketBallCollisions( body_Wall, body_Puck);
         
         // Monkey Hunt
         } else if (gW.getDemoVersion().slice(0,3) == "4.e") {
            mH.processWallCollisions( body_Puck, body_Wall);
         }
                  
      } else if ((body_A.constructor.name == "Puck") && (body_B.constructor.name == "Puck")) {
         // pi-calcs clacks and counts
         gW.aT.collisionCount += 1;
         gW.aT.collisionInThisStep = true;       
         
         // Handle the case where one puck is a gun bullet and one is not.
         if ((body_A.gunBullet() && !body_B.gunBullet()) || (body_B.gunBullet() && !body_A.gunBullet())) {
            
            if (body_A.gunBullet()) {
               var bullet = body_A, target = body_B;
            } else {
               var bullet = body_B, target = body_A;
            }
            
            if ([7,8].includes( gW.getDemoIndex() )) {
               // Look for restrictions on friendly fire (unchecked) AND that both target and shooter are human.
               var ff_restricted = false;
               if ( target.clientName && ( ! target.clientName.includes('NPC')) && ( ! bullet.clientNameOfShooter.includes('NPC')) ) {
                  if ( ! gW.dC.friendlyFire.checked) {
                     ff_restricted = true;
                  } else {
                     // Check for members of the same team.
                     // Note: if both have null teamNames, they will be appear equal, same team; however, that case is not ff restricted.
                     let atLeastOneIsNotNull = (gW.clients[ target.clientName].teamName || gW.clients[ bullet.clientNameOfShooter].teamName);
                     if (atLeastOneIsNotNull && (gW.clients[ target.clientName].teamName == gW.clients[ bullet.clientNameOfShooter].teamName)) {
                        ff_restricted = true;
                     }
                  }
               }
               
               // Count it as a hit, if not shooting yourself in the foot, and not friendly-fire restricted.
               if ( (bullet.clientNameOfShooter != target.clientName) && ( ! ff_restricted) ) {
                  // if the shield is off or weakened...
                  if (!target.shield.ON || (target.shield.ON && !target.shield.STRONG)) {
                     target.hitCount += 1;
                     target.inComing = true;
                     target.flash = true;
                     bullet.atLeastOneHit = true;
                     
                     // Give credit to the shooter (owner of the bullet).
                     if ( ( ! cT.Client.winnerBonusGiven) && gW.clients[ bullet.clientNameOfShooter] ) {
                        gW.clients[ bullet.clientNameOfShooter].score += 10;
                        // Keep track of the last successful hit to a client. Useful with multiple players and when friendly fire is blocked.
                        if (target.clientName) gW.setLastClientToScoreHit( bullet.clientNameOfShooter);
                     }
                     target.whoShotBullet = bullet.clientNameOfShooter;
                     // Remove credit from the puck that got hit (the not-bullet body).
                     if ( ( ! cT.Client.winnerBonusGiven) && target.clientName && gW.clients[ target.clientName] ) {
                        gW.clients[ target.clientName].score -= 10;
                     }
                  }
               }
            }
            
         // Monkey Hunt
         } else if (gW.getDemoVersion().slice(0,3) == "4.e") {
            mH.processHits( body_A, body_B);
            
         // both bodies are pucks (and both bullets or both non-bullets) and in ghost-ball pool
         } else if (gW.getDemoVersion().slice(0,3) == "3.d") {
            gB.processCueBallFirstCollision( body_A, body_B);
         }
         
         /*
         // exchange the puck colors
         // see colorExchange attribute for pucks
         if ( (body_A.colorExchange) && (body_B.colorExchange) ) {
            let body_B_color = body_B.color;
            body_B.color = body_A.color;
            body_A.color = body_B_color;
         }
         */
      }  
   }

   // box2d functions to interact with the engine //////////////////////////////
   
   function b2d_getBodyAt( mousePVec_2d_m) {
      var x = mousePVec_2d_m.x;
      var y = mousePVec_2d_m.y;
      var aabb = new b2DW.AABB();
      var size_m = 0.001;
      aabb.lowerBound.Set(x - size_m, y - size_m);
      aabb.upperBound.Set(x + size_m, y + size_m);
      
      // Query the world for overlapping bodies, where the body's bounding box overlaps
      // with the aabb box defined above. Run the function, provided to QueryAABB, for each
      // body found to overlap the aabb box.

      var selected_b2d_Body = null;
      var tableBodyMap = {};
      var tableBodyNames = [];
      
      gW.b2d.world.QueryAABB( function( fixture) {
         let b2d_Body = fixture.GetBody();
         let tableBody = gW.tableMap.get( b2d_Body);
         let ghostSensor = (b2d_Body.GetUserData() == "ghost-sensor");
         
         // Don't consider cursor pins or ghost sensors (i.e. don't let a client select 
         // another client's cursor pin or a pool-shot ghost sensor). 
         if (( ! tableBody.cursorPin) && ( ! ghostSensor)) {
            // Take fixtures where this mouse position can be found locally on it. This is
            // final confirmation that yes, this fixture is under the mouse.
            if (fixture.GetShape().TestPoint( b2d_Body.GetTransform(), mousePVec_2d_m)) {
               // update the single-body reference
               selected_b2d_Body = b2d_Body;
               // update the body map
               tableBodyMap[ tableBody.name] = tableBody;
            }
         }
         // return true to continue checking the rest of the fixtures returned by the query
         return true;
      }, aabb);
      
      // If found at least one object there...
      if (selected_b2d_Body) {
         tableBodyNames = Object.keys( tableBodyMap);
         //console.log("names=" + JSON.stringify( tableBodyNames));
         
         // For overlapping non-colliding objects, find the highest numbered pin, puck, and wall.
         // This allows you to cursor select the object that is drawn on top.
         if (tableBodyNames.length > 1) {
            let maxPinNumber = 0;
            let maxPuckNumber = 0;
            let maxWallNumber = 0;
            
            for (let bodyName in tableBodyMap) {
               let tableBody = tableBodyMap[ bodyName];
               
               if (tableBody.constructor.name == "Pin") {
                  let pinNumber = Number( bodyName.slice(3));
                  if (pinNumber > maxPinNumber) maxPinNumber = pinNumber;
                  
               } else if (tableBody.constructor.name == "Puck") {
                  let puckNumber = Number( bodyName.slice(4));
                  if (puckNumber > maxPuckNumber) maxPuckNumber = puckNumber;
                  
               } else if (tableBody.constructor.name == "Wall") {
                  let wallNumber = Number( bodyName.slice(4));
                  if (wallNumber > maxWallNumber) maxWallNumber = wallNumber;
               }
            }
            
            // Pucks are drawn after (on top of) walls. Pins are drawn after pucks.
            // Within a type, the highest number is drawn last.
            // So, give selection priority to pins, then pucks, and finally walls. 
            // Update the single-body reference to point to the highest number.
            if (maxPinNumber > 0) {
               selected_b2d_Body = tableBodyMap["pin" + maxPinNumber].b2d;
            } else if (maxPuckNumber > 0) {
               selected_b2d_Body = tableBodyMap["puck" + maxPuckNumber].b2d;
            } else if (maxWallNumber > 0) {
               selected_b2d_Body = tableBodyMap["wall" + maxWallNumber].b2d;
            }
         }
         return selected_b2d_Body; 
         
      } else {
         return null;
      }
   }  

   function b2d_getPolygonVertices_2d_px( b2d_body) {
      // Make an array that has the world vertices scaled to screen coordinates.
      var poly_2d_px = [];
      for (var i = 0; i < b2d_body.m_fixtureList.m_shape.m_vertices.length; i++) {
         var p_2d_px = wS.screenFromWorld( b2d_body.GetWorldPoint( b2d_body.m_fixtureList.m_shape.m_vertices[i]));
         poly_2d_px.push( p_2d_px);
      }
      return poly_2d_px;
   }
   
   function b2d_getPolygonVertices_2d_m( b2d_body) {
      // Make an array that has the world vertices.
      var poly_2d_m = [];
      for (var i = 0; i < b2d_body.m_fixtureList.m_shape.m_vertices.length; i++) {
         var p_2d_m = wS.Vec2D_from_b2Vec2( b2d_body.GetWorldPoint( b2d_body.m_fixtureList.m_shape.m_vertices[i]));
         poly_2d_m.push( p_2d_m);
      }
      return poly_2d_m;
   }

   
   // Public references to objects, variables, and methods
   
   return {
      // Objects
      
      // Variables
      
      // Methods
      'initializeModule': initializeModule,
      
      'beginContactHandler': beginContactHandler,
      
      'b2d_getBodyAt': b2d_getBodyAt,
      'b2d_getPolygonVertices_2d_px': b2d_getPolygonVertices_2d_px,
      'b2d_getPolygonVertices_2d_m': b2d_getPolygonVertices_2d_m,

   };   
   
})();