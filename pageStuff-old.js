// Page Stuff (pS) module
// pageStuff.js
// Written by: James D. Miller
// 10:38 AM Wed March 29, 2023

/*
Dependencies:
   jQuery
*/

var pS = (function() {
   "use strict";
   
   // Globals
   var m_closer, m_opener;
   var m_navMenu;
   var m_scrollAdjust;
   var m_dialog;
   
   console.log('pS version 1.2');
   
   // Returns the default if the value is undefined.
   function setDefault( theValue, theDefault) {
      return (typeof theValue !== "undefined") ? theValue : theDefault;
   }
   
   function scroll( targetID, mode='jump') {
      //var container = $('#helpScroller'); // see html tag
      // Ended up using the method below to reference the full page. This works in all three
      // browsers: Chrome, Firefox, and Edge. The method above, using the helpScroller id, does not
      // work in Edge.
      var container = $('html, body');
      
      // Find the position of the anchor named TOP. This varies with browser, so this sets
      // a position baseline.
      let topAnchor = $('a[name=TOP]');
      // If found a "TOP", set a non-zero offset.
      let topPosition = (topAnchor.length) ? topAnchor.offset().top : 0;
      
      // Search for ID 
      var scrollTarget  = $('#' + targetID);
      
      // If can't find ID, search for a named anchor element
      if (scrollTarget.length == 0) {
         var anchorSearchString = 'a[name=' + targetID + ']';
         var scrollTarget = $( anchorSearchString);
         if (scrollTarget.length == 0) {
            console.log('found nothing');
            return null;
         } else {
            console.log('found name');
         }
      } else {
         console.log('found ID');
      }

      // Must have found the ID. Now, scroll the page.
      if (scrollTarget.offset()) {
         let scroll_px = scrollTarget.offset().top - topPosition;
         let totalScroll_px = (['top','TOP'].includes( targetID)) ? scroll_px : (scroll_px + m_scrollAdjust);
         
         if (mode == 'pageReload') {
            console.log('jump to top');
            // Jump to top, wait, then slowly scroll to the target.
            container.animate( {scrollTop:'0px'}, 0);
            window.setTimeout( function() {
               console.log('slowly scroll to target');
               container.animate( { scrollTop: totalScroll_px }, 300); // 1000
            }, 700);         

         } else if (mode == 'jump') {
            // This mode is used for scrolling to targets on the same page.
            // e.g. put this in the anchor element: onclick="pS.scroll('pygame');"
            container.animate( { scrollTop: totalScroll_px }, 300); // 1000
         }
      } else {
         console.log("scrollTarget.offset() not found or defined");
      }
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
   
   function viewDialog( pars={}) {
      let alwaysShowDialog = setDefault( pars.alwaysShowDialog, true);
      let statusMessage;
      if (m_dialog) {
         if (alwaysShowDialog) m_dialog.showModal();
         if (Cookies.get('youtube-consent') == 'true') {
            statusMessage = " \u2713"; // a check mark
         } else {
            statusMessage = "";
            if ( ! alwaysShowDialog) m_dialog.showModal();
         }
         jQuery("#dialog-status").text( statusMessage);
      }
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
   
   function initialize( pars={}) {
      /*  */
      let dialogOptions = setDefault( pars.dialogOptions, false);
      let navMenu = setDefault( pars.navMenu, true);
      let navDivName = setDefault( pars.navDiv, "navDiv");
      let pageDesc = setDefault( pars.pageDesc, null);
      let pathSiteMap = setDefault( pars.pathSiteMap, "sitemap.html?v2"); // changing the version overrides cache
      let scrollAtLoad = setDefault( pars.scrollAtLoad, true);
      m_scrollAdjust = setDefault( pars.scrollAdjust, 0);
      
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
               m_closer.addEventListener('click', closeNav);
               
               m_opener = document.getElementById("opener");
               m_opener.addEventListener('click', openNav);
               m_opener.title = "Site Menu";
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
            console.log("queryID=" + queryID);
            if (queryID) scroll( queryID, 'pageReload');
            
         }, 0);
      }
      
      if (dialogOptions) {
         m_dialog = document.getElementById("cookieConsent");
         
         // Check for prior consent. If not there, display the dialog.
         viewDialog({'alwaysShowDialog':false});
         
         m_dialog.addEventListener("close", function() {
            const value = m_dialog.returnValue;
            if (value == "accept") {
               Cookies.set('youtube-consent', 'true', {expires: 365}); // , SameSite:'None', Secure:true
               //Cookies.set('SameSite', 'None', {Secure:true});
               //document.cookie = 'SameSite=None; Secure';
            } else if (value == "reject")  {
               Cookies.remove('youtube-consent');
            } else if (value == "close") {
               console.log('Cookies stay the same.');
            }
         });
         
         // Define event handlers for each video container.
         $('.video-container').click( function() {
            logEntry( "Video: " + getTopicTitle($(this)) );
           
            if ( ! (Cookies.get('youtube-consent') == 'true')) {
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
         
         // Use the YouTube default image if an src for a screen-shot isn't given.
         $('.video-container').each( function(i, item) {
            var imageSource = $(item).children("img.frameCapture").attr('src');
            if (imageSource == "") {
               var linkToYTImage = "https://i.ytimg.com/vi/" + $(this).attr('data-videoID') + "/hqdefault.jpg";   // mqdefault hqdefault maxresdefault 
               $(item).children("img.frameCapture").attr('src', linkToYTImage);
            }
            // Add a play-button image as an overlay.
            $(item).append('<img class="playButton" src="screenshots/play_button.png" >');
         });         
      }
   }
   
   return {
      // Objects
      
      // Variables

      // Methods
      init: initialize,
      scroll: scroll,
      viewDialog: viewDialog,
      
   };

})();