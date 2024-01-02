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

// Page Stuff (pS) module
// pageStuff.js
   console.log('pS _*-*_');
// 2:13 PM Tue January 2, 2024

/*

*/

window.pS = (function() {
   "use strict";
   
   // Globals
   var m_closer, m_opener;
   var m_navMenu;
   var m_scrollAdjust;
   var m_scrollContainer;
   var m_dialog, m_cookieLink;
   
   var m_scrollHistory = {}; // this is revealed below, so MUST do this here and not in initialize.
   var m_keyStates;
   var m_keyMap;
   
   function scroll( targetID, pars={}) {
      let mode = uT.setDefault( pars.mode, 'jump');      
      let addToHistory = uT.setDefault( pars.addToHistory, true);
      let scrollDuration = uT.setDefault( pars.scrollDuration, 300);
      let toPageTop = false;
      
      m_scrollHistory.currentTarget = targetID;
            
      // If can't find ID, search for a named anchor element
      var scrollTarget  = $('#' + targetID);
      if (scrollTarget.length == 0) {
         var anchorSearchString = "a[name='" + targetID + "']";
         var scrollTarget = $( anchorSearchString);
         if (scrollTarget.length == 0) {
            // if trying to scroll to a non-existent top target
            if (['top','TOP','very-top','scroll-to-very-top'].includes( targetID)) {
               toPageTop = true;
            } else {
               console.log('found nothing');
               return null;
            }
         } else {
            console.log('found name');
         }
      } else {
         console.log('found ID');
      }

      // Must have found the ID. Now, scroll the page.
      if (scrollTarget.offset()) {
         if (addToHistory) m_scrollHistory.index = m_scrollHistory.targets.push( targetID) - 1;
         
         let scroll_px = scrollTarget.offset().top;
         let totalScroll_px = scroll_px + m_scrollAdjust;
         
         // If the container is a div that can scroll independent of the main page (e.g. index.html), 
         // then must account for that scroll position.
         if (m_scrollContainer.attr('data-divType') == "scroll") {
            let scrollPosition = m_scrollContainer.scrollTop();
            totalScroll_px += scrollPosition;
         }
         // debug help...
         /*
         console.log("----before movement to " + targetID + "---");
         console.log( "sT.offset=" + scrollTarget.offset().top.toFixed(0) + 
                    ", sT.position=" + scrollTarget.position().top.toFixed(0) + 
                    ", adjust=" + m_scrollAdjust.toFixed(0) + 
                 ", c.scrollTop=" + m_scrollContainer.scrollTop().toFixed(0));
         console.log("total="+totalScroll_px.toFixed(0));
         */
         if (mode == 'pageReload') {
            // Do a fast scroll to the top, wait, then slowly scroll to the target.
            m_scrollContainer.animate( {'scrollTop':'0px'}, 0);
            window.setTimeout( function() {
               console.log('top, then scroll to target,' + totalScroll_px);
               m_scrollContainer.animate( { 'scrollTop': totalScroll_px }, scrollDuration); // 1000
            }, 700);         

         } else if (mode == 'jump') {
            // This mode is used for scrolling to targets on the same page.
            // e.g. put this in the anchor element: onclick="pS.scroll('pygame');"
            console.log('scroll to target, ' + totalScroll_px);
            m_scrollContainer.animate( { 'scrollTop': totalScroll_px }, scrollDuration); // 1000
         }
      // Ok, to the top of the page you go.
      } else if (toPageTop) {
         m_scrollContainer.animate( {'scrollTop': 0}, scrollDuration);
         
      } else {
         console.log("should not be seeing this");
      }
      
      // Prevent default behavior that scrolls to the top.
      return false;
   }
   
   function logEntry( eventDescription, mode='normal') {
      // If this page is coming from the production server...
      var pageURL = window.location.href;
      if (pageURL.includes("timetocode")) {
         var sheetURL = 'https://script.google.com/macros/s/AKfycbymaDOxbOAtZAzgxPwm6yIvWG8Euw8jcHM1weyQ_caVSL0BkBI/exec';
         // AJAX
         var xhttp = new XMLHttpRequest();
         xhttp.open('GET', sheetURL + '?mode=' + mode + '&eventDesc=' + eventDescription, true);
         xhttp.send();
      } else {
         console.log("Event = " + eventDescription);
      }
   }
   
   function openNav() {
      m_navMenu.style.height = "100%";
   }
   function closeNav() {
      m_navMenu.style.height = "0%";
   }
   
   // https://javascript.info/cookie
   // https://www.w3schools.com/js/js_cookies.asp
   // https://github.com/js-cookie/js-cookie/tree/latest
   function cookieSet() {
      // 2592000 = 30 * 24 * 3600 (30 days in seconds)
      // 7776000 = 90 * 24 * 3600 (90 days in seconds)
      document.cookie = "youtube-consent=accept; max-age=7776000; samesite=strict";
   }
   function cookieRemove() {
      document.cookie = "youtube-consent=reject; max-age=0; samesite=strict";
   }
   function cookieCheck() {
      return document.cookie.includes("youtube-consent");
   }
   
   function viewDialog( pars={}) {
      let alwaysShowDialog = uT.setDefault( pars.alwaysShowDialog, true);
      let statusMessage;
      if (m_dialog) {
         if (alwaysShowDialog) m_dialog.showModal();
         if ( cookieCheck()) {
            statusMessage = " \u2713"; // a check mark
         } else {
            statusMessage = "";
            if ( ! alwaysShowDialog) m_dialog.showModal();
         }
         jQuery("#dialog-status").text( statusMessage);
      }
      document.getElementById("firstDialogButton").blur();
   }
   
   function getTopicTitle( videoDivElement) {
      // Find the sibling <p> elements containing the <strong> element with class "title_2"
      var siblingParagraphs = videoDivElement.siblings("p").filter(function() {
         return $(this).find("strong.title_2").length > 0;
      });

      // Get the text within the <strong> element of the first matching sibling <p> element
      var title = siblingParagraphs.first().find("strong.title_2").text();
      
      return title;
   }
   
   function loadLargeImage( img, fileName=null) {
      if (fileName) {
         img.src = "screenshots/" + fileName;
      } else {
         let srcString = img.src;
         img.src = srcString.replace("_550w","");
      }
   }  

   function checkForAbsoluteLinks() {
      let finalHref;
      
      // check for absolute links...  https://www.timetocode.org
      $('a').each( function( index, value) {
         let href = $(this).attr("href");
         
         if (href && (href != "")) {
            
            // local server
            if (window.location.href.includes("192.168.1.106")) {
               if (href.includes("www.timetocode")) {
                  finalHref = href.replace( "https://www.timetocode.org", "http://192.168.1.106/ttc-root");
                  $(this).attr("href", finalHref);
                  
               } else if (href.includes("pet.timetocode")) {
                  finalHref = href.replace( "https://pet.timetocode.org", "http://192.168.1.106/pet-dev");
                  $(this).attr("href", finalHref);
                  
               } else if (href.includes("waconia.timetocode")) {
                  finalHref = href.replace( "https://waconia.timetocode.org", "http://192.168.1.106/waconia-50webs-dev");
                  $(this).attr("href", finalHref);
                  
               } else {
                  // nothing yet...
               }
                        
            // github server
            } else if (window.location.href.includes("m-jim-d")) {
               if (href.includes("www.timetocode")) {
                  finalHref = href.replace( "https://www.timetocode.org", "https://m-jim-d.github.io/ttc");
                  $(this).attr("href", finalHref);
                   
               } else {
                  // nothing yet
               }
               
            // some other server...
            } else {
               // nothing yet
            }
         }
         
      });      
   }
      
   function initialize( pars={}) {
      /*  */
      let dialogOptions = uT.setDefault( pars.dialogOptions, false);
      let navMenu = uT.setDefault( pars.navMenu, true);
      let navDivName = uT.setDefault( pars.navDiv, "navDiv");
      let pageDesc = uT.setDefault( pars.pageDesc, null);
      let pathSiteMap = uT.setDefault( pars.pathSiteMap, "sitemap.html?v2"); // changing the version overrides cache
      let scrollAtLoad = uT.setDefault( pars.scrollAtLoad, true);
      m_scrollAdjust = uT.setDefault( pars.scrollAdjust, 0);
      
      // Currently using the helpScroller id to reference the container.
      m_scrollContainer = $('#helpScroller'); // note: the html element may use this ID.
      // As a backup, use the method below to reference the full page. This does not work for the index.html (S&P) page where the left panel scrolls.
      if (m_scrollContainer.length == 0) {
         console.log("warning: expecting helpScroller ID. Will use html tag.");
         m_scrollContainer = $('html, body');
      }
      
      // Tempting to initialize, make m_scrollHistory an object here (={}). But MUST NOT since it is revealed below. Read comments
      // in gwModule.js above the revealing section.
      m_scrollHistory.targets = ['top'];
      m_scrollHistory.currentTarget = 'top';
      m_scrollHistory.index = 0;
      m_keyStates = {};
      m_keyMap = {
         '16':'key_shift',
         '17':'key_ctrl', 
         '18':'key_alt', // both left and right alt key on Windows
         '37':'key_leftArrow', '38':'key_upArrow', '39':'key_rightArrow', '40':'key_downArrow',
      };
      for (let key in m_keyMap) m_keyStates[ m_keyMap[ key]] = 'U';
      
      // Take note...
      logEntry( pageDesc);
      
      if (navMenu) {
         // put the navigation menu into the div
         let navDiv = document.getElementById( navDivName);
         
         var xhr = new XMLHttpRequest();
         xhr.onreadystatechange = function() {
            if ((xhr.readyState === 4) && (xhr.status === 200)) {
               navDiv.innerHTML = xhr.responseText;
               
               m_navMenu = document.getElementById("myNav");
            
               m_closer = document.getElementById("closer");
               m_closer.addEventListener("click", function(event) {
                  event.preventDefault();
                  closeNav();
               });               
               // Note that the opener is not an anchor element, so no need for preventDefault.
               m_opener = document.getElementById("opener");
               m_opener.addEventListener('click', openNav);
               m_opener.title = "Site Menu";
               
               // Now that navigation menu has loaded, check the page for absolute links. Note: of course, this only runs
               // on pages that load the navigation menu.
               checkForAbsoluteLinks();
            }
         };
         
         function handleXHR_error() {
            let theMessage = "The navigation menu (hamburger icon) depends on a webserver. " + 
                 "If you're opening this page directly, without a webserver, try navigating using any available links.";
            window.alert( theMessage);
         }
         xhr.addEventListener('error', handleXHR_error);
         
         xhr.open("GET", pathSiteMap, true);
         xhr.send();
      }
      
      // This section is intended for use on pages other than index.html and client.html. 
      // The scrollAtLoad parameter should be set to false in the init call for pageStuff on index.html (and client.html).
      // index.html uses the startup-scrolling functionality that is in gwModule.js (see scrollTargetAtStart variable).
      if (scrollAtLoad) {
         // This zero delay seems necessary for Chrome to behave as expected on page refresh (should jump to the top, then scroll to the target)
         window.setTimeout( function() {
            // The ready approach does not work well with a page having many auto-sizing images. Rather, better to wait
            // until EVERYTHING is done loading, including images, as is done in the 'load' method above.
            //$(document).ready( function() {});
            
            // Bailed on using hash parameter in URL. Native jumps to anchors are confusing. So sidestepping that mess by using query parameters.
            //var hashID = window.location.hash;
            
            // Discard everything after the "&".
            var queryStringInURL = window.location.search.split("&")[0];
            // Then use the part after the "?".
            var queryID = queryStringInURL.slice(1);
            if (queryID) {
               console.log("queryID=" + queryID);
               scroll( queryID, {'mode':'pageReload'});
            };
            
         }, 0);
      }
        
      // click-event listener for scroll links
      $('.scroll-link').click( function( event) {
         event.preventDefault();
         let target = $(this).attr('data-scroll-target');
         scroll( target);
      })
      
      // event listener for keyboard operations with the scrolling history
      document.addEventListener("keydown", function(e) {
         if (e.keyCode in m_keyMap) {
            let key = m_keyMap[ e.keyCode];
            
            if (m_keyStates[ key] == 'U') { // inhibit key repeats
               m_keyStates[ key] = 'D';
               
               if ((m_keyStates['key_ctrl']=='D') && (m_keyStates['key_shift']=='D')) {
                  if (key == "key_leftArrow") {
                     if (m_scrollHistory.index > 0) m_scrollHistory.index--;
                     scroll( m_scrollHistory.targets[ m_scrollHistory.index], {'addToHistory':false, 'scrollDuration':0});
                     
                  } else if (key == "key_rightArrow") {
                     if (m_scrollHistory.index < (m_scrollHistory.targets.length-1)) m_scrollHistory.index++;
                     scroll( m_scrollHistory.targets[ m_scrollHistory.index], {'addToHistory':false, 'scrollDuration':0});
                     
                  } else if (key == "key_upArrow") {
                     scroll("TOP", {'addToHistory':false, 'scrollDuration':0});
                     
                  } else if (key == "key_downArrow") {
                     // nothing yet
                     //console.log("current container.scrollTop() = " + m_scrollContainer.scrollTop().toFixed(0));
                  }
               }
            }
         }
      }, {capture: false}); //This "false" makes this fire in the bubbling phase (not capturing phase).
      document.addEventListener("keyup", function(e) {
         if (e.keyCode in m_keyMap) {
            m_keyStates[ m_keyMap[ e.keyCode]] = 'U';               
         }
      }, {capture: false});
      
      
      // dialogOptions is True for all the pages with YouTube videos.
      if (dialogOptions) {
         m_dialog = document.getElementById("cookieConsent");
         m_cookieLink = document.getElementById("cookieLink");
         
         // Check for prior consent. If not there, display the dialog.
         viewDialog({'alwaysShowDialog':false});
         
         m_dialog.addEventListener("close", function() {
            const value = m_dialog.returnValue;
            if (value == "accept") {
               cookieSet();
               //console.log("cookie = " + document.cookie);
            } else if (value == "reject")  {
               cookieRemove();
            } else if (value == "close") {
               console.log('Cookies stay the same.');
            }
         });
         
         m_cookieLink.addEventListener("click", function(event) {
            event.preventDefault();
            viewDialog();
         });
         
         // Define event handlers for each video container.
         $('.video-container').click( function() {
            logEntry( "Video: " + getTopicTitle($(this)) );
           
            if ( ! cookieCheck()) { // (Cookies.get('youtube-consent') == 'accept')
               console.log('url = ' + "https://youtu.be/" + $(this).attr('data-videoID'));
               window.open( "https://youtu.be/" + $(this).attr('data-videoID'), '_blank');
            } else {
               if ( ! $(this).children("img.playButton").is(":hidden")) {
                  // ?autoplay=1&mute=1     an autoplay with mute works, but apparently YouTube does not count these as user-initiated plays.
                  // ?rel=0                 limit the follow-up videos to the same youtube channel
                  var video = '<iframe src="' +  '//www.youtube.com/embed/' + $(this).attr('data-videoID') + '?rel=0' + '"' + 
                                     ' width="' +  $(this).children("img.frameCapture").width()      + '"' + 
                                     ' height="' + $(this).children("img.frameCapture").height()     + '"' + 
                                     ' frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
                                                       
                  $(this).find("img").hide();
                  $(this).append( video);
               }
            }      
            
         }).mouseenter( function() {
            $(this).children("img.playButton").css('opacity', "1.0");
         }).mouseleave( function() {
            $(this).children("img.playButton").css('opacity', "0.7");
         });
         
         // Loop through all the video containers...
         $('.video-container').each( function(i, item) {
            var imageSource = $(item).children("img.frameCapture").attr('src');
            // Use the YouTube default image if an src for a screen-shot isn't given.
            if (imageSource == "") {
               var linkToYTImage = "https://i.ytimg.com/vi/" + $(this).attr('data-videoID') + "/hqdefault.jpg";   // mqdefault hqdefault maxresdefault 
               $(item).children("img.frameCapture").attr('src', linkToYTImage);
            }
            // Add an alt attribute to the image.
            $(item).children("img.frameCapture").attr('alt', getTopicTitle($(this)) );
            
            // Add a play-button image as an overlay.
            $(item).append('<img class="playButton" src="screenshots/play_button.png" alt="play button">');
         });         
      }      
   }
   
   return {
      // Objects
      'scrollHistory': m_scrollHistory,
      
      // Variables

      // Methods
      'init': initialize,
      'scroll': scroll,
      'viewDialog': viewDialog,
      'loadLargeImage': loadLargeImage,
      
   };

})();