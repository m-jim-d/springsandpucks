demo_capture = {
   "demoIndex": 5,
   "demoVersion": "5.f",
   "date": "10/25/2021, 10:48:41 PM",
   "canvasDimensions": {
      "width": 700,
      "height": 600
   },
   "gravity": true,
   "comSelection": false,
   "fullScreenDemo": false,
   "lockedAndLoaded": false,
   "globalCompositeOperation": "source-over",
   "wallMapData": {},
   "puckMapData": {
      "puck2": {
         "bullet": false,
         "atLeastOneHit": false,
         "jello": false,
         "clientName": null,
         "name": "puck2",
         "position_2d_m": {
            "x": 3.5,
            "y": 5.3
         },
         "velocity_2d_mps": {
            "x": 0.0,
            "y": 0.0
         },
         "color": "DarkSlateGray",
         "borderColor": "cyan",
         "shape": "rect",
         "imageID": null,
         "colorSource": false,
         "colorExchange": false,
         "drawDuringPE": true,
         "density": 1.5,
         "linDamp": 0,
         "angDamp": 0,
         "hitLimit": 10,
         "createTail": false,
         "tailPars": null,
         "groupIndex": 0,
         "categoryBits": 1,
         "maskBits": 65535,
         "angle_r": 1.5708,
         "angularSpeed_rps": 9.0,
         "angleLine": true,
         "borderWidth_px": 3,
         "restitution": 1.0,
         "restitution_fixed": true,
         "friction": 0.0,
         "friction_fixed": true,
         "radius_m": 0.15,
         "aspectR": 4,
         "half_height_m": 0.08,
         "half_width_m": 1.8
      },
      "puck3": {
         "bullet": false,
         "atLeastOneHit": false,
         "jello": false,
         "clientName": null,
         "name": "puck3",
         "position_2d_m": {
            "x": 3.5,
            "y": 4.1
         },
         "velocity_2d_mps": {
            "x": 0.0,
            "y": 0.0
         },
         "color": "brown",
         "borderColor": "white",
         "shape": "rect",
         "imageID": null,
         "colorSource": false,
         "colorExchange": false,
         "drawDuringPE": false,
         "density": 1.5,
         "linDamp": 0,
         "angDamp": 0,
         "hitLimit": 10,
         "createTail": false,
         "tailPars": null,
         "groupIndex": 0,
         "categoryBits": 1,
         "maskBits": 65535,
         "angle_r": 1.5708,
         "angularSpeed_rps": 0.0,
         "angleLine": true,
         "borderWidth_px": 0,
         "restitution": 1.0,
         "restitution_fixed": true,
         "friction": 0.0,
         "friction_fixed": true,
         "radius_m": 0.15,
         "aspectR": 4,
         "half_height_m": 0.08,
         "half_width_m": 1.8
      }
   },
   "pinMapData": {
      "pin2": {
         "cursorPin": false,
         "name": "pin2",
         "position_2d_m": {
            "x": 3.5,
            "y": 3.5
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
         "color": "blue",
         "borderColor": "gray"
      }
   },
   "springMapData": {},
   "jointMapData": {
      "j1": {
         "name": "j1",
         "visible": true,
         "jto1_name": "pin2",
         "jto1_ap_l_2d_m": {
            "x": 0,
            "y": 0
         },
         "jto2_name": "puck3",
         "jto2_ap_l_2d_m": {
            "x": -0.6,
            "y": 0.0
         }
      },
      "j3": {
         "name": "j3",
         "visible": true,
         "jto1_name": "puck2",
         "jto1_ap_l_2d_m": {
            "x": -0.6,
            "y": 0.0
         },
         "jto2_name": "puck3",
         "jto2_ap_l_2d_m": {
            "x": 0.6,
            "y": 0.0
         }
      }
   },
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