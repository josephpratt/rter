angular.module('termview', [
    'ng',       //filers
    'ui',       //ui-sortable and map
    'items',    //ItemCache to load items into termview, various itemDialog services
    'taxonomy', //Rankings
    'alerts',    //Alerter
    'map',
    'timeline'
])

.factory('TermViewRemote', function () {
    function TermViewRemote() {
        this.termViews = [];

        this.addTermView = function(term) {
            for(var i = 0;i < this.termViews.length;i++) {
                if(this.termViews[i].term.Term == term.Term) {
                    this.termViews[i].active = true;
                    return;
                }
            }

            if(term.Term !== "") {
                this.termViews.push({term: term, heading: term.Term, active: true});
            } else {
                this.termViews.push({term: term, heading: "Live Feed", active: true});
            }
        };

        this.removeTermView = function(term) {
            for(var i = 0;i < this.termViews.length;i++) {
                if(this.termViews[i].term.Term == term.Term) {
                    this.termViews.remove(i);
                    return true;
                }
            }

            return false;
        };
    }

    return new TermViewRemote();
})

.controller('TermViewCtrl', function($scope, $filter, $timeout, Alerter, ItemCache, UpdateItemDialog, CloseupItemDialog, TermViewRemote, TaxonomyRankingCache) {
    $scope.isCollapsed = true;

    $scope.viewmode = "grid-view";
    $scope.filterMode = "blur";
    $scope.mapFilterEnable = false;

    /* -- items and rankings  -- */

    $scope.rankingCache = new TaxonomyRankingCache($scope.term.Term);

    $scope.$on("$destroy", function() {
        if($scope.rankingCache.close !== undefined) $scope.rankingCache.close();
    });

    if($scope.term.Term === "" || $scope.term.Term === undefined) {
        $scope.ranking = [];
    } else {
        $scope.ranking = $scope.rankingCache.ranking;
    }

    $scope.items = ItemCache.contents;

    $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
    $scope.orderedByID = $filter('orderBy')($scope.filteredItems, 'ID', true);
    $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);

    $scope.rankedItems = $filter('orderByRanking')($scope.orderedByTime, $scope.ranking);

    $scope.finalMapItems = $scope.rankedItems;
    $scope.finalFilteredItems = $scope.rankedItems;

    $scope.textSearchedItems = $filter('filter')($scope.rankedItems, $scope.filterQuery);
    $scope.mapItems = $filter('filterbyBounds')($scope.textSearchedItems, $scope.mapBounds);

    $scope.$watch('items', function() {
        $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
        $scope.orderedByID = $filter('orderBy')($scope.filteredItems, 'ID', true);
        $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);
    }, true);

    $scope.$watch('[ranking, orderedByTime]', function() {
        $scope.rankedItems = $filter('orderByRanking')($scope.orderedByTime, $scope.ranking);
    }, true);

    $scope.$watch('[rankedItems, filterMode]', function() {
        if($scope.filterMode == 'blur') {
            $scope.finalFilteredItems = $scope.rankedItems;
            // $scope.finalMapItems = $scope.rankedItems;
        }
    }, true);

     $scope.$watch('[rankedItems, mapBounds, mapFilterEnable, filterMode]', function() {
        if($scope.filterMode == 'remove') {
            if($scope.mapFilterEnable) {
                $scope.mapItems = $filter('filterbyBounds')($scope.rankedItems, $scope.mapBounds);
            } else {
                $scope.mapItems = $scope.rankedItems;
            }
        }
    }, true);

    $scope.$watch('[mapItems, textQuery, filterMode]', function() {
        // if($scope.filterMode == 'remove') {
            $scope.textSearchedItems = $filter('filter')($scope.mapItems, $scope.textQuery);
        // }
    }, true);

   

    $scope.$watch('[textSearchedItems, filterMode]', function() {
        if($scope.filterMode == 'remove') {
            $scope.finalFilteredItems = $scope.textSearchedItems;
        }
    }, true);

    $scope.isFiltered = function(item) {
        var filtered = [item];

        filtered = $filter('filter')(filtered, $scope.textQuery);

        if($scope.mapFilterEnable) {
            filtered = $filter('filterbyBounds')(filtered, $scope.mapBounds);
        }

        if(filtered.length === 0) return true;
        else return false;
    };

    $scope.dragFreeze = false; //FIXME: Hack to fix drag bug with firefox http://forum.jquery.com/topic/jquery-ui-sortable-triggers-a-click-in-firefox-15

    $scope.dragCallback = function(e) {     
        if($scope.filterMode == 'remove' && ($scope.mapFilterEnable || ($scope.textQuery !== undefined && $scope.textQuery !== ''))) { //TODO: This should have a blur options instead maybe?
            Alerter.warn("You cannot reorder items while your filters are enabled", 2000);
            return;
        }

        var newRanking = [];
        angular.forEach($scope.rankedItems, function(v) {
            newRanking.push(v.ID);
        });

        if($scope.term.Term !== "" && $scope.term.Term !== undefined) {
            $scope.rankingCache.update(newRanking);
        }

        $scope.dragFreeze = true; //FIXME: Hack to fix drag bug with firefox http://forum.jquery.com/topic/jquery-ui-sortable-triggers-a-click-in-firefox-15

        $timeout(function() { //FIXME: Hack to fix drag bug with firefox http://forum.jquery.com/topic/jquery-ui-sortable-triggers-a-click-in-firefox-15
            $scope.dragFreeze = false;
        }, 50);
    };

    $scope.closeupItemDialog = function(item) {
        if($scope.dragFreeze) return; //FIXME: Hack to fix drag bug with firefox http://forum.jquery.com/topic/jquery-ui-sortable-triggers-a-click-in-firefox-15

        CloseupItemDialog.open(item);
    };

    $scope.updateItemDialog = function(item) {
        if($scope.dragFreeze) return; //FIXME: Hack to fix drag bug with firefox http://forum.jquery.com/topic/jquery-ui-sortable-triggers-a-click-in-firefox-15

        UpdateItemDialog.open(item).then(function() {
            $scope.updateMarkers();
        });
    };

    $scope.close = function() {
        TermViewRemote.removeTermView($scope.term);
    };

})

.directive('termview', function() {
    return {
        restrict: 'E',
        scope: {
            term: "="
        },
        templateUrl: '/template/termview/termview.html',
        controller: 'TermViewCtrl',
        link: function(scope, element, attrs) {
            // navigator.geolocation.getCurrentPosition(scope.centerAt);
        }
    };
});