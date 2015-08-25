angular.module('phonertcdemo')
  .factory('signaling', function (socketFactory) {
    return {
      on: function () {},
      off: function () {}
    };
    var socket = io.connect('http://192.168.1.105:3000/');
    
    var socketFactory = socketFactory({
      ioSocket: socket
    });

    return socketFactory;
  });