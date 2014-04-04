angular.module('map', [
    'ui',  //Map
    'ng'   //$timeout
])

.controller('MapCtrl', function($scope, $timeout, $filter, CloseupItemDialog) {   
    $scope.closeupItemDialog = function(item) {
        CloseupItemDialog.open(item);
    };
    
    $scope.boundsChanged = function() {
        $scope.mapBounds = $scope.map.getBounds();
    };

    $scope.markerBundles = [];

    $scope.mapCenter = new google.maps.LatLng(45.50745, -73.5793);

    $scope.mapOptions = {
        center: $scope.mapCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    $scope.resizeMap = function() {
        google.maps.event.trigger($scope.map, "resize");
        $scope.map.setCenter($scope.mapCenter);
        $scope.mapBounds = $scope.map.getBounds();
    };

    $scope.updateMarkers = function() {
        angular.forEach($scope.markerBundles, function(v) {
            v.marker.setMap(null);
        });

        $scope.markerBundles = [];

        angular.forEach($scope.mapItems, function(v) {
            if(v.Lat === undefined || v.Lng === undefined || (v.Lat === 0 && v.Lng === 0)) return;

            var m = new google.maps.Marker({
                map: $scope.map,
                position: new google.maps.LatLng(v.Lat, v.Lng)
            });

            if(v.ThumbnailURI !== undefined && v.ThumbnailURI !== "") {
                m.setIcon(new google.maps.MarkerImage(v.ThumbnailURI, null, null, null, new google.maps.Size(40, 40)));
            }

            $scope.markerBundles.push({marker: m, item: v});
        });
    };

    $scope.centerAt = function(location) {
        var latlng = new google.maps.LatLng(location.coords.latitude, location.coords.longitude);
        $scope.map.setCenter(latlng);
        $scope.mapCenter = latlng;
    };

    $scope.$watch('viewmode', function() {
        $scope.boundsChanged();
        $scope.mapCenter = $scope.map.getCenter();

        $timeout(function() {
            $scope.resizeMap();
        }, 0);
    });

    $scope.$watch('mapItems', function() {
        $scope.updateMarkers();
    }, true);

})

.directive('map', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            mapItems: '=',
            mapBounds: '=',
            viewmode: '='
        },
        templateUrl: '/template/map/map.html',
        controller: 'MapCtrl',
        link: function(scope, element, attrs) {
            navigator.geolocation.getCurrentPosition(scope.centerAt);
        }
    };
});
