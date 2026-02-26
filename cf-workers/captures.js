/**
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 * 
 * for test posting   
 * https://captures-management.jim-miller-gac.workers.dev/submit
 * 
 */
 

const publicServers = ['https://triquence.org','https://m-jim-d.github.io','https://ttcorg-64150.web.app','https://ttcorg-64150.firebaseapp.com'];
const localServers = ['https://192.168.1.104','http://192.168.1.104','http://bee','https://localhost'];
const addLocalServers = true;
let approvedServers = (addLocalServers) ? publicServers.concat(localServers) : publicServers;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    let goodOrigin = (approvedServers.includes(origin)) ? origin : "https://triquence.org";

    if (request.method === 'OPTIONS') {
      const response = new Response(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', goodOrigin);
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }
    
    let sender = "";
    let captureObject = {};
    let captureString = "";
    let response, responseContent, responseContentString;

    if ((request.method === 'POST') && request.url.endsWith('/submit')) {
      sender = origin;

      //let postObject = await request.text();
      let postObject;
      try {
        postObject = await request.json();
      } catch {
        response = new Response('Bad JSON', { status: 400 });
        response.headers.set('Access-Control-Allow-Origin', goodOrigin);
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Max-Age', '86400');
        return response;
      }
      let keyFromPost = postObject.keyName;
      console.log("keyFromPost = " + keyFromPost);

      if (postObject.action == "postOne") {

        captureObject = postObject.capture;
        captureString = JSON.stringify(captureObject);
        console.log("post=" + captureString);

        // check for existing key  
        let foundOneString, foundOne;
        foundOneString = await env.CKV.get(keyFromPost);

        if ( ! foundOneString) {
          foundOne = false;
          
          // Good, key is not in use. Post it.
          if (postObject.expiration != "never") {
            // expirationTtl is lifetime in seconds from now.
            await env.CKV.put(keyFromPost, captureString, {expirationTtl: postObject.expiration});
          } else {
            await env.CKV.put(keyFromPost, captureString);
          }
          
        } else {
          foundOne = true;
        }

        responseContent = {"sender":sender, "action":"postOne", "foundOne":foundOne, "deleted":false};
        responseContentString = JSON.stringify( responseContent);

      } else if (postObject.action == "updateOne") {

        captureObject = postObject.capture;
        captureString = JSON.stringify(captureObject);
        console.log("post=" + captureString);

        // check for existing key  
        let foundOneString, foundOne, updated;
        foundOneString = await env.CKV.get(keyFromPost);

        if (foundOneString) {
          // Key found. So, can update the capture.
          foundOne = true;

          // check to see if the capture requires an update (if it has changed).
          if (captureString != foundOneString) {
            if (postObject.expiration != "never") {
              // expirationTtl is lifetime in seconds from now.
              await env.CKV.put(keyFromPost, captureString, {expirationTtl: postObject.expiration});
            } else {
              await env.CKV.put(keyFromPost, captureString);
            }
            updated = true;

          } else {
            updated = false;
          }
          
        } else {
          foundOne = false;
          updated = false;
        }

        responseContent = {"sender":sender, "action":"updateOne", "foundOne":foundOne, "deleted":false, "updated":updated};
        responseContentString = JSON.stringify( responseContent);

      } else if (postObject.action == "deleteOne") {

        let foundOneString, foundOne, deleted;

        // First, look for it.
        foundOneString = await env.CKV.get(keyFromPost);

        if (foundOneString) {
          foundOne = true;

          // Now delete it.
          await env.CKV.delete(keyFromPost);
          deleted = true;

        } else {
          foundOne = false;
          deleted = false;
        }

        responseContent = {"sender":sender, "action":"deleteOne", "foundOne":foundOne, "deleted":deleted};
        responseContentString = JSON.stringify( responseContent); 

      } else if (postObject.action == "downLoadOne") {
        console.log("inside downLoadOne, " + keyFromPost);

        let captureString, captureObject, foundIt;

        // look for it...  
        captureString = await env.CKV.get(keyFromPost);

        if (captureString) {
          foundIt = true;
          captureObject = JSON.parse(captureString);
        } else {
          foundIt = false;
          captureObject = null;
        }

        responseContent = {"sender":sender, "capture":captureObject, "foundIt":foundIt, "deleted":false};
        responseContentString = JSON.stringify( responseContent); 

      } else if (postObject.action == "list") {

        let searchString = postObject.searchString;
        const captureList = await env.CKV.list({'prefix':searchString});

        responseContent = {"sender":sender, "captureList":captureList};
        responseContentString = JSON.stringify( responseContent); 
      }

    } else if (request.method === 'GET') {
      sender = request.headers.get('host') + ", goodOrigin = " + goodOrigin;
      responseContentString = sender;
        
    } else {
      responseContentString = "something else";
      console.log("hmmm, something else");
    }

    response = new Response( responseContentString);
    response.headers.set('Access-Control-Allow-Origin', goodOrigin);
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Max-Age', '86400');
    if ((request.method === 'POST') && request.url.endsWith('/submit')) {
      response.headers.set('Content-Type', 'application/json; charset=utf-8');
    } else {
      response.headers.set('Content-Type', 'text/plain; charset=utf-8');
    }

    return response;
  }

};  
