demo_capture = {
   "demoIndex": 5,
   "demoVersion": "5.a.dandelion",
   "date": "4/2/2022, 10:41:30 PM",
   "canvasDimensions": {
      "width": 1915,
      "height": 1075
   },
   "gravity": false,
   "comSelection": false,
   "fullScreenDemo": false,
   "lockedAndLoaded": false,
   "globalCompositeOperation": "source-over",
   "wallMapData": {},
   "puckMapData": {
      "puck4": {
         "bullet": false,
         "bulletIndication": false,
         "atLeastOneHit": false,
         "jello": false,
         "clientName": null,
         "name": "puck4",
         "position_2d_m": {
            "x": 9.36784533438834,
            "y": 5.550012974123101
         },
         "velocity_2d_mps": {
            "x": 0.0017980544708284345,
            "y": 0.00016362654959393698
         },
         "color": "DarkSlateGray",
         "borderColor": "white",
         "shape": "circle",
         "imageID": "dandelion",
         "imageScale": 1.4,
         "colorSource": false,
         "drawDuringPE": true,
         "density": 1.5,
         "linDamp": 0.9620341961819399,
         "angDamp": 0,
         "hitLimit": 10,
         "createTail": false,
         "tailPars": null,
         "groupIndex": 0,
         "categoryBits": 1,
         "maskBits": 65535,
         "angle_r": -1335.9229130451329,
         "angularSpeed_rps": -0.730153470362727,
         "angleLine": false,
         "borderWidth_px": 0,
         "restitution": 1,
         "restitution_fixed": false,
         "friction": 0,
         "friction_fixed": false,
         "radius_m": 1.5692141883605035,
         "aspectR": 1,
         "half_height_m": null,
         "half_width_m": null
      }
   },
   "pinMapData": {
      "pin1": {
         "cursorPin": false,
         "name": "pin1",
         "position_2d_m": {
            "x": 5.562368054615619,
            "y": 5.53925513722796
         },
         "velocity_2d_mps": {
            "x": 0,
            "y": 0
         },
         "radius_px": 6,
         "groupIndex": 0,
         "categoryBits": 1,
         "maskBits": 0,
         "deleted": false,
         "NPC": false,
         "nextPinName": null,
         "previousPinName": null,
         "visible": true,
         "color": "brown",
         "borderColor": "brown"
      },
      "pin2": {
         "cursorPin": false,
         "name": "pin2",
         "position_2d_m": {
            "x": 13.177706596282285,
            "y": 5.549229095561293
         },
         "velocity_2d_mps": {
            "x": 0,
            "y": 0
         },
         "radius_px": 6,
         "groupIndex": 0,
         "categoryBits": 1,
         "maskBits": 0,
         "deleted": false,
         "NPC": false,
         "nextPinName": null,
         "previousPinName": null,
         "visible": true,
         "color": "brown",
         "borderColor": "brown"
      }
   },
   "springMapData": {
      "s4": {
         "name": "s4",
         "color": "darkgray",
         "visible": true,
         "length_m": 1.91943424957751,
         "strength_Npm": 7.009877989627851,
         "unstretched_width_m": 0.07009877989627852,
         "drag_c": 0,
         "damper_Ns2pm2": 0,
         "navigationForNPC": false,
         "forCursor": false,
         "p1_name": "puck4",
         "spo1_ap_l_2d_m": {
            "x": 1.54,
            "y": 0.01
         },
         "p2_name": "pin1",
         "fixedLength": false,
         "softConstraints": false,
         "collideConnected": true
      },
      "s5": {
         "name": "s5",
         "color": "darkgray",
         "visible": true,
         "length_m": 1.91943424957751,
         "strength_Npm": 7.009877989627851,
         "unstretched_width_m": 0.07009877989627852,
         "drag_c": 0,
         "damper_Ns2pm2": 0,
         "navigationForNPC": false,
         "forCursor": false,
         "p1_name": "puck4",
         "spo1_ap_l_2d_m": {
            "x": -1.54,
            "y": 0
         },
         "p2_name": "pin2",
         "fixedLength": false,
         "softConstraints": false,
         "collideConnected": true
      }
   },
   "jointMapData": {},
   "startingPosAndVels": [],
   "clients": {
      "local": {
         "color": "tomato",
         "name": "local",
         "player": true,
         "nickName": null,
         "NPC_pin_timer_s": 0,
         "NPC_pin_timer_limit_s": 5
      }
   }
}