'use strict';
var app=angular.module('houseMap',['appControllers','ngRoute']);
app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/main', {
        templateUrl: 'partials/main.html',
        controller: 'mainController'
      }).
      when('/detail/:houseId/:sFlag', {
        templateUrl: 'partials/detail.html',
        controller: 'detailController'
      }).
      when('/houseindex/:houseId', {
        templateUrl: 'partials/houseindex.html',
        controller: 'indexController'
      }).
      otherwise({
        redirectTo: '/main'
      });
  }]);
// var a=1;
/* App Module */
