angular.module('phonertcdemo')

.controller('TestCtrl', function ($scope) {


      var server = "http://buildmachine.mediabox-v2.crowdemotion.co.uk:80/janus";
      var iceServers = [{
        url: "turn:buildmachine.mediabox-v2.crowdemotion.co.uk:3478",
        username: "pino",
        credential: "pino"
      }];
      
      iceServers[0].host = iceServers[0].url;
      iceServers[0].password = iceServers[0].credential;

      var janus = null;
      var echotest = null;
      var bitrateTimer = null;
      var spinner = null;
      var session;

      var audioenabled = false;
      var videoenabled = false;
      var onesec = function (fn) {
        setTimeout(fn, 1000);
      };
      

      $scope.start = function () {
        
          cordova.plugins.phonertc.setVideoView({
            container: document.querySelector('.remote'),
            local: {
              position: [10, 50],
              size: [100, 100]
            }
          });
          cordova.plugins.phonertc.showVideoView();

          // persuade janus we support webrtc
          Janus.isWebrtcSupported = function () {
            return true;
          };
          // Initialize the library (console debug enabled)
          Janus.init({
              debug: true,
              callback: function () {
                // Create session
                janus = new Janus({
                    server: server,
                    iceServers: iceServers,
                    success: function () {
                      console.log('janus session established, attaching plugin');
                      janus.attach({
                            plugin: "janus.plugin.echotest",
                            success: function (pluginHandle) {
                              echotest = pluginHandle;
                              console.log("plugin attached! (" + echotest.getPlugin() +
                                ", id=" + echotest.getId() + ")");
                              // Negotiate WebRTC
                              var body = {
                                "audio": true,
                                "video": true
                              };

                              console.log("janus plugin sending message", body);
                              echotest.send({
                                "message": body
                              });

                              var config = {
                                isInitiator: true,
                                turn: iceServers[0],
                                streams: {
                                  audio: true,
                                  video: true
                                }
                              };

                              console.log("cordova plugin creating session");
                              session = new cordova.plugins.phonertc.Session(config);

                              var tout = null;

                              session.on('sendMessage', function (jsep) { // should have an sdp
                                if (jsep.type == 'offer') {
                                  console.log('cordova plugin generated an offer', jsep);
                                  console.log('janus send local offer to remote', jsep);
                                  echotest.send({
                                    message: body,
                                    jsep: jsep
                                  });
                                }

                                if (jsep.type == 'candidate') {
                                  console.log('cordova plugin generated candidate', jsep);
                                  var c = {
                                    candidate: jsep.candidate,
                                    sdpMLineIndex: jsep.label,
                                    sdpMid: jsep.id
                                  };
                                  console.log('janus send local candidate to remote', c);
                                  echotest.sendTrickle(c);
                                }

                                if (tout !== null) {
                                  clearTimeout(tout);
                                  tout = null;
                                }
                                tout = setTimeout(function () {
                                  console.log("no more candidates in the last 1s, completing");
                                  echotest.sendTrickle({
                                    completed: true
                                  });
                                }, 1000);

                              });

                              session.on('answer', function () {
                                console.log("cordova plugin: someone has answered");
                              });

                              session.on('disconnect', function () {
                                console.log("cordova plugin: disconnected");
                                console.log('session disconnected');
                              });

                              session.call();
                            },
                            error: function (error) {
                              console.log("janus error attaching plugin... " + error);
                            },
                            onmessage: function (msg, jsep) {
                              console.log("janus remote message received", msg, jsep);
                              if (jsep) {
                                if (jsep.type == 'answer') {
                                  session.receiveMessage(jsep);
                                }
                              }
                              var result = msg.result;
                              if (result && (result === "done")) {
                                console.log('janus plugin closed the echo test ');
                                }
                              },
                              oncleanup: function () {
                                console.log("janus plugin cleanup notification");
                              }
                            });
                        },
                        error: function (error) {
                          console.log("janus session error", error);
                        },
                        destroyed: function () {
                          console.log("janus session destroyed");
                        }
                    });
                }
              });

          };

      });
