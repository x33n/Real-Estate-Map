'use strict';
var controllers = angular.module('appControllers', ['ui.bootstrap', 'ngDreamFactory', 'homeModule', 'scaleModule', 'topModule'])
    .constant('DSP_URL', 'http://localhost/dream')
    .constant('DSP_API_KEY', 'test');
controllers.controller('mainController', ["$scope", "DreamFactory", "homeService", "scaleService", "topService",
    function($scope, DreamFactory, homeService, scaleService, topService) {
        var oMarker = [],
            oInfo = [],
            oHousePosition = [],
            i = 0,
            map,
            iCurrent = 0,
            mapOptions;
        $scope.bMarkerSelected = false;
        $scope.bSetHome = false;
        $scope.bScale = false;

        //override success to wait until api is ready
        DreamFactory.api.success = function() {
            $scope.loginFunc();
        };

        //login
        $scope.creds = {
         
        };

        var loginRequest = {
            body: $scope.creds
        };

        $scope.loginFunc = function() {
            DreamFactory.api.user.login(loginRequest,
                function(data) {
                    loadHome();
                },
                function(error) {
                    alert('Error happens');
                }
            );
        };

        //load home position
        function loadHome() {
            var request = {
                table_name: 'house_user_configure',
                filter: 'userid = 1'
            };
            DreamFactory.api.db.getRecords(request,
                function(data) {
                    if (data.record.length == 0) {
                        mapOptions = {
                            center: {
                                lat: 31.11,
                                lng: 121.29
                            },
                            zoom: 12,
                            scaleControl: true,
                            streetViewControl: true
                        };
                        intializeMap();
                        var body = {
                                "record": [{
                                    "userid": 1,
                                    "homelat": 31.11,
                                    "homelng": 121.29
                                }]
                            },
                            request = {
                                table_name: 'house_user_configure',
                                body: body
                            };
                        DreamFactory.api.db.createRecords(request,
                            function(data) {

                            },
                            function(error) {

                            });
                        homeService.setCurrentHome(oPosition);
                        homeService.setMap(map);
                        homeService.setUser(1);
                    } else {
                        var oPosition = {
                            lat: data.record[0].homelat,
                            lng: data.record[0].homelng
                        };
                        mapOptions = {
                            center: {
                                lat: oPosition.lat,
                                lng: oPosition.lng
                            },
                            zoom: 12,
                            scaleControl: true,
                            streetViewControl: true
                        };
                        intializeMap();
                        homeService.setCurrentHome(oPosition);
                        homeService.setMap(map);
                        homeService.setUser(1);
                        homeService.createDefaultHomeMarker();
                    }
                },
                function(error) {

                });
        }
        // map initialization
        function intializeMap() {
            map = new google.maps.Map(document.getElementById('mapCanvas'),
                mapOptions);
            //read markers from db
            var request = {
                table_name: "house_location",
                filter: "userid=1"
            };
            DreamFactory.api.db.getRecords(request,
                function(data) {
                    if (data.record.length > 0) {
                        data.record.forEach(function(element, idx, array) {
                            var oLocation = {
                                latLng: {
                                    lat: element.latitude,
                                    lng: element.longitude
                                }
                            };
                            addMarker(oLocation, 'old', element);
                        });
                    }
                },
                function(error) {
                    alert('Error happens');
                }
            );
            scaleService.setMap(map);
            google.maps.event.addListener(map, 'click', function(event) {
                if ($scope.bSetHome) {
                    homeService.setHome(event.latLng);
                    $scope.bSetHome = false;
                } else if ($scope.bScale) {
                    scaleService.drawLine(event.latLng);
                } else {
                    addMarker(event, 'new', null);
                }
            });
        }

        //add marker
        function addMarker(oClick, sNewFlag, oHouseLocation) {
            oMarker[i] = new google.maps.Marker({
                map: map,
                position: oClick.latLng
            });
            //add marker to db if it is a new click
            if (sNewFlag == 'new') {
                oHousePosition[i] = {
                    position: {
                        lat: oClick.latLng.lat(),
                        lng: oClick.latLng.lng()
                    },
                    houseid: null
                };
                var body = {
                        "record": [{
                            "userid": 1,
                            "latitude": oClick.latLng.lat(),
                            "longitude": oClick.latLng.lng()
                        }]
                    },
                    request = {
                        table_name: "house_location",
                        body: body
                    };
                DreamFactory.api.db.createRecords(request,
                    function(data) {
                        oHousePosition[i].houseid = data.record[0].id;
                        setInfoWindow();
                    },
                    function(error) {
                        alert('Error happens');
                    }
                );
            } else {
                oHousePosition[i] = {
                    position: {
                        lat: oHouseLocation.latitude,
                        lng: oHouseLocation.longitude
                    },
                    houseid: oHouseLocation.id
                };
                setInfoWindow();
            }
        }

        //set info window
        function setInfoWindow() {
            var sContent;
            oInfo[i] = new google.maps.InfoWindow({
                content: sContent
            });
            google.maps.event.addListener(oMarker[i], 'click', function(event) {
                oHousePosition.forEach(function(element, idx, array) {
                    if (Math.abs(element.position.lat - event.latLng.lat()) <= 0.0009 && Math.abs(element.position.lng - event.latLng.lng()) <= 0.0009) {
                        // oInfo[idx].open(map, oMarker[idx]);
                        if (idx != iCurrent) {
                            if (oHousePosition[iCurrent].houseid != 'deleted') {
                                oInfo[iCurrent].close();
                            }
                        }
                        iCurrent = idx;
                        stop;
                    }
                });
                //get house profile
                var selectHouseid = oHousePosition[iCurrent].houseid;
                var request = {
                    table_name: "house_profile",
                    filter: "houseid=" + selectHouseid
                };
                DreamFactory.api.db.getRecords(request,
                    function(data) {
                        //no data found then it is a new house
                        if (data.record.length == 0) {
                            sContent = '<div id="infoWindow"><div id="infoLogo"><img src="img/house.jpg"></img></div>' +
                                '<div id="infoLink"><a href="#/detail/' + selectHouseid + '/' + 'new"' +
                                ' target="_blank">Create a profile for this house</a></div></div>';
                        } else {
                            sContent = '<div id="overview">' +
                                '<div id="index"><h1>' + Math.round(data.record[0].total_percentage) + '</h1></div>' +
                                '<div id="detail">' +
                                '<p>Alias: ' + data.record[0].alias + '</p>' +
                                '<p>State: ' + data.record[0].state + '</p>' +
                                '<p>Area: ' + data.record[0].area + '</p>' +
                                '<p>Street: ' + data.record[0].street + '</p>' +
                                '<p>Price: ' + data.record[0].price + '</p>' +
                                '<p>Square Meter: ' + data.record[0].squaremetre + '</p>' +
                                '<p>Avg price: ' + Math.round(data.record[0].price / data.record[0].squaremetre) + '</p>' +
                                '<p>1 index price: ' + Math.round(data.record[0].price_per_point) + '</p>' +
                                '</div>' +
                                '<div id="infoLink"><a href="#/detail/' + selectHouseid + '/' + 'old"' +
                                ' target="_blank">View house profile</a></div></div>';
                        }
                        oInfo[iCurrent].setContent(sContent);
                        oInfo[iCurrent].open(map, oMarker[iCurrent]);
                        $scope.bMarkerSelected = true;
                    },
                    function(error) {
                        alert('Error happens');
                    });
            });
            i++;
        }

        //delete marker
        $scope.deleteMarker = function(event) {
            if ($scope.bMarkerSelected) {
                oMarker[iCurrent].setMap(null);
                var request = {
                    table_name: 'house_profile',
                    filter: 'houseid = ' + oHousePosition[iCurrent].houseid
                };
                DreamFactory.api.db.deleteRecordsByFilter(request,
                    function(data) {
                        var request = {
                            table_name: 'house_index',
                            filter: 'houseid = ' + oHousePosition[iCurrent].houseid
                        };
                        DreamFactory.api.db.deleteRecordsByFilter(request,
                            function(data) {
                                var request = {
                                    table_name: 'house_location',
                                    filter: 'id = ' + oHousePosition[iCurrent].houseid
                                };
                                DreamFactory.api.db.deleteRecordsByFilter(request,
                                    function(data) {
                                        oHousePosition[iCurrent].houseid = 'deleted';
                                        $scope.bMarkerSelected = false;
                                    },
                                    function(error) {

                                    });
                            },
                            function(error) {

                            });
                    },
                    function(error) {

                    });
            }
        };
        //set home
        $scope.setHome = function(event) {
            $scope.bSetHome = true;
            map.setOptions({
                draggableCursor: 'crosshair'
            });
        };
        //go to home
        $scope.gotoHome = function(event) {
            homeService.gotoHome();
        };
        //scale
        $scope.scale = function(event) {
            $scope.bSetHome = false;
            $scope.bScale = true;
            map.setOptions({
                draggableCursor: 'cell'
            });
        };
        //clear scale
        $scope.clearScale = function(event) {
            $scope.bScale = false;
            scaleService.clearLine();
            // map.setOptions({
            //     draggingCursor:'grabbing',
            //     draggableCursor: 'grab'
            // });
        };
        //get top N
        $scope.top = function(event) {
            topService.setMap(map);
            topService.setMarker(oMarker);
            topService.setTopN(10);
            topService.setPositionArray(oHousePosition);
            topService.setSearchOption({
                field: 'total_percentage',
                option: 'desc'
            });
            topService.setFilter({
                city: 'Mel',
                area: 'bayside',
                price: 9000000
            });
            topService.getTopN();
        };
        //clear Top N
        $scope.clearTop = function(event) {
            topService.clearTop();
        }

    }
]);
controllers.controller('detailController', ['$scope', '$routeParams', 'DreamFactory',
    function($scope, $routeParams, DreamFactory) {
        $scope.houseId = $routeParams.houseId;
        $scope.bSaved = false;
        $scope.readHouseProfile = function(houseid) {
            var request = {
                table_name: 'house_profile',
                filter: 'houseid =' + houseid
            };
            DreamFactory.api.db.getRecords(request,
                function(data) {
                    $scope.house = data.record[0];
                },
                function(error) {
                    alert('Error happens');
                });
        };
        DreamFactory.api.success = function() {
            if ($routeParams.sFlag == 'new') {
                $scope.bEdit = false;
            } else {
                $scope.bEdit = true;
                //read house profile if it exits
                $scope.readHouseProfile($scope.houseId);
            }
        };
        $scope.buildBody = function(sFlag) {
        
        };
        $scope.buildIndexBody = function() {
          
        };
        //close tab
        $scope.close = function(event) {
            window.close();
        };
        // save house info
        $scope.saveHouseInfo = function(event) {
            if (!$scope.bEdit) {
                if ($routeParams.sFlag == 'new') {
                    if (!$scope.bSaved) {
                        var body = $scope.buildBody('new'),
                            idxBody = $scope.buildIndexBody();
                        body.record[0]['apply_total'] = idxBody.record[0].apply_total;
                        body.record[0]['total_percentage'] = idxBody.record[0].total_percentage;
                        body.record[0]['price_per_point'] = idxBody.record[0].price_per_point;
                        var request = {
                            table_name: "house_profile",
                            body: body
                        };
                        DreamFactory.api.db.createRecords(request,
                            function(data) {
                                // alert('Data created successfully!');
                                var request = {
                                    table_name: "house_index",
                                    body: idxBody
                                };
                                DreamFactory.api.db.createRecords(request,
                                    function(data) {
                                        alert('Data created successfully');
                                    },
                                    function(error) {

                                    });
                            },
                            function(error) {
                                alert('Error happens');
                                $scope.bSaved = false;
                            });
                        $scope.bSaved = true;
                    } else {
                        var body = $scope.buildBody('old'),
                            idxBody = $scope.buildIndexBody();
                        body.record[0]['apply_total'] = idxBody.record[0].apply_total;
                        body.record[0]['total_percentage'] = idxBody.record[0].total_percentage;
                        body.record[0]['price_per_point'] = idxBody.record[0].price_per_point;
                        var request = {
                            table_name: "house_profile",
                            body: body,
                            filter: 'houseid = ' + $scope.houseId
                        };
                        DreamFactory.api.db.updateRecordsByFilter(request,
                            function(data) {
                                // alert('Data updated successfully!');
                                var request = {
                                    table_name: "house_index",
                                    body: idxBody,
                                    filter: 'houseid = ' + $scope.houseId
                                };
                                DreamFactory.api.db.updateRecordsByFilter(request,
                                    function(data) {
                                        alert('Data updated successfully');
                                    },
                                    function(error) {

                                    });
                            },
                            function(error) {
                                alert('Error happens');
                            });
                    }
                } else {
                    var body = $scope.buildBody('old'),
                        idxBody = $scope.buildIndexBody();
                    body.record[0]['apply_total'] = idxBody.record[0].apply_total;
                    body.record[0]['total_percentage'] = idxBody.record[0].total_percentage;
                    body.record[0]['price_per_point'] = idxBody.record[0].price_per_point;
                    var request = {
                        table_name: "house_profile",
                        body: body,
                        filter: 'houseid = ' + $scope.houseId
                    };
                    DreamFactory.api.db.updateRecordsByFilter(request,
                        function(data) {
                            // alert('Data updated successfully!');
                            var request = {
                                table_name: "house_index",
                                body: idxBody,
                                filter: 'houseid = ' + $scope.houseId
                            };
                            DreamFactory.api.db.updateRecordsByFilter(request,
                                function(data) {
                                    alert('Data updated successfully');
                                },
                                function(error) {

                                });
                        },
                        function(error) {
                            alert('Error happens');
                        });
                }
                $scope.bEdit = true;
            }
        };
    }
]);
controllers.controller('indexController', ['$scope', '$routeParams', 'DreamFactory',
    function($scope, $routeParams, DreamFactory) {
        $scope.houseProfile = '';
        $scope.houseIndex = '';
        $scope.houseid = $routeParams.houseId;
        $scope.readHouseIndex = function(houseid) {
            var request = {
                table_name: 'house_profile',
                filter: 'houseid = ' + houseid
            };
            DreamFactory.api.db.getRecords(request,
                function(data) {
                    $scope.houseProfile = data.record[0];
                },
                function(error) {

                });
            request.table_name = 'house_index';
            DreamFactory.api.db.getRecords(request,
                function(data) {
                    $scope.houseIndex = data.record[0];
                },
                function(error) {

                });
        };
        DreamFactory.api.success = function() {
            $scope.readHouseIndex($scope.houseid);
        };
        $scope.close = function(event) {
            window.close();
        };
    }
]);