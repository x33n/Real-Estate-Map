'use strict';
angular.module('homeModule', ['ngDreamFactory']).service('homeService', ['DreamFactory',
    function(DreamFactory) {
        var home = function() {

        };
        home.prototype.oCurrentHome = null;
        home.prototype.oCurrentMarker = null;
        home.prototype.oMap = null;
        home.prototype.userid = null;
        home.prototype.setUser = function(userID) {
            this.userid = userID;
        }
        home.prototype.setMap = function(oGoogleMap) {
            this.oMap = oGoogleMap;
        };
        home.prototype.setCurrentHome = function(oPosition) {
            this.oCurrentHome = oPosition;
        }
        home.prototype.createDefaultHomeMarker = function() {
            this.oCurrentMarker = new google.maps.Marker({
                map: this.oMap,
                position: this.oCurrentHome,
                icon: 'img/house_blue.png'
            });
        };
        home.prototype.setHome = function(oPosition) {
            if (this.oCurrentHome) {
                this.oCurrentMarker.setMap(null);
            }
            this.oCurrentMarker = new google.maps.Marker({
                map: this.oMap,
                position: oPosition,
                icon: 'img/house_blue.png'
            });
            this.oCurrentHome = oPosition;
            this.oMap.setOptions({
                draggingCursor: 'grabbing',
                draggableCursor: 'grab'
            });
            var body = {
                    "record": [{
                        "userid": this.userid,
                        "homelat": oPosition.lat(),
                        "homelng": oPosition.lng()
                    }]
                },
                request = {
                    table_name: 'house_user_configure',
                    filter: 'userid = ' + this.userid,
                    body: body
                };
            DreamFactory.api.db.updateRecordsByFilter(request,
                function(data) {

                },
                function(error) {

                });
        };
        home.prototype.gotoHome = function() {
            if (this.oCurrentHome) {
                this.oMap.setCenter(this.oCurrentHome);
            }
        };
        return new home();
    }
]);
angular.module('scaleModule', []).service('scaleService', function() {
    var scale = function() {
        var polyLineOptions = {
            // strokeColor: '#5bc0de',
            strokeWeight: 1
        };
        this.oPolyLine = new google.maps.Polyline(polyLineOptions);
    };
    scale.prototype.aMarker = [];
    scale.prototype.aPosition = [];
    scale.prototype.oMap = null;
    scale.prototype.aInfo = [];
    scale.prototype.userClick = 0;
    scale.prototype.oStartPoint = null;
    scale.prototype.accumDistance = 0;
    scale.prototype.setMap = function(oGoogleMap) {
        this.oPolyLine.setMap(oGoogleMap);
        this.oMap = oGoogleMap;
    };
    scale.prototype.drawLine = function(oPosition) {
        this.aPosition.push(oPosition);
        this.oPolyLine.setPath(this.aPosition);
        var oMarker = new google.maps.Marker({
            map: this.oMap,
            position: oPosition
        });
        this.aMarker.push(oMarker);
        if (this.userClick == 0) {
            this.oStartPoint = oPosition;
        } else {
            var distance = google.maps.geometry.spherical.computeDistanceBetween(this.oStartPoint, oPosition);
            this.oStartPoint = oPosition;
            var formatDistance = distance / 1000;
            this.accumDistance = this.accumDistance + formatDistance;
            var sContent = '<div>' + this.accumDistance.toFixed(2) + ' km</div>';
            var oInfo = new google.maps.InfoWindow({
                content: sContent
            });
            oInfo.open(this.oMap, oMarker);
            this.aInfo.push(oInfo);
        }
        this.userClick++;
    };
    scale.prototype.clearLine = function() {
        for (var i = 0; i <= this.aMarker.length - 1; i++) {
            this.aMarker[i].setMap(null);
        }
        for (var i = 0; i <= this.aInfo.length - 1; i++) {
            this.aInfo[i].close();
        }
        this.aPosition = [];
        this.aMarker = [];
        this.aInfo = [];
        this.userClick = 0;
        this.oStartPoint = null;
        this.accumDistance = 0;
        this.oPolyLine.setPath(this.aPosition);
        this.oMap.setOptions({
            draggingCursor: 'grabbing',
            draggableCursor: 'grab'
        });
    };
    return new scale();
});
angular.module('topModule', ['ngDreamFactory']).service('topService', ['DreamFactory',
    function(DreamFactory) {
        var top = function() {};
        top.prototype.oFilter = [null];
        top.prototype.oSearch = null;
        top.prototype.iTop = 0;
        top.prototype.aPosition = [];
        top.prototype.oMap = null;
        top.prototype.aMarker = [];
        top.prototype.aInfo = [];
        top.prototype.setMarker = function(aMarkerAll) {
            this.aMarker = aMarkerAll;
        };
        top.prototype.setMap = function(oGoogleMap) {
            this.oMap = oGoogleMap;
        };
        top.prototype.setFilter = function(oFilterOption) {
            this.oFilter = oFilterOption;
        };
        top.prototype.setSearchOption = function(oSearchOption) {
            this.oSearch = oSearchOption;
        };
        top.prototype.setTopN = function(iTopN) {
            this.iTop = iTopN;
        };
        top.prototype.setPositionArray = function(aHousePosition) {
            this.aPosition = aHousePosition;
        };
        top.prototype.getTopIndex = function(houseID) {
            var index;
            this.aPosition.forEach(function(element, idx, array) {
                if (element.houseid == houseID) {
                    index = idx;
                    stop;
                }
            });
            return index;
        };
        top.prototype.getTopN = function() {
            var sCity, sArea, iPrice, sFilter;
            if (this.oFilter.city) {
                sCity = this.oFilter.city;
            }
            if (this.oFilter.area) {
                sArea = this.oFilter.area;
            }
            if (this.oFilter.price) {
                iPrice = this.oFilter.price;
            }
            if (sCity) {
                sFilter = 'state = "' + sCity + '"';
            }
            if (sArea) {
                if (sFilter) {
                    sFilter += ' AND area = "' + sArea + '"';
                }
            }
            if (iPrice) {
                if (sFilter) {
                    sFilter += ' AND price <= ' + iPrice;
                }
            }
            var request = {
                table_name: 'house_profile',
                limit: this.iTop,
                order: this.oSearch.field + ' ' + this.oSearch.option,
                filter: sFilter
            };
            var that = this;
            DreamFactory.api.db.getRecordsByFilter(request,
                function(data) {
                    var aTopHouse = data.record;
                    aTopHouse.forEach(function(element, idx, array) {
                        var index = that.getTopIndex(element.houseid),
                            sContent = '',
                            iTop = idx + 1,
                            sColor = '',
                            oInfo = new google.maps.InfoWindow({
                                content: sContent
                            });
                        if (iTop == 1) {
                            sColor = '#df524a';
                        } else if (iTop == 2) {
                            sColor = '#5cb85c';
                        } else if (iTop == 3) {
                            sColor = '#5bc0de';
                        } else if (iTop == 4) {
                            sColor = '#d8d322';
                        } else {
                            sColor = '#ccc';
                        }
                        sContent = '<div id="topPanel" style = "background-color: ' + sColor + ';">' +
                            '<div id="topLink"><a href="#/detail/' + element.houseid + '/' + 'old"' +
                            ' target="_blank">No. ' + iTop + '</a></div>' +
                            '<p>Index: ' + Math.round(element.total_percentage) + '</p>' +
                            '<p>Avg: ' + Math.round(element.price_per_point) + '</p>' +
                            '<p>Price: ' + element.price + '</p>' +
                            '</div>';
                        oInfo.setContent(sContent);
                        oInfo.open(that.oMap, that.aMarker[index]);
                        that.aInfo.push(oInfo);
                    });
                },
                function(error) {
                    alert('get top records failed!');
                });
        };
        top.prototype.clearTop = function() {
            this.aInfo.forEach(function(element, idx, array) {
                element.close();
            });
            this.aInfo = [];
        };
        return new top();
    }
]);