angular.module('timeline', [
    'ng',
    'ui',
    'items',
    'taxonomy',
    'alerts',
    'ngResource',
    'sockjs',
    'ui.bootstrap.accordion',
    'ui.bootstrap.transition',
    'ui.slider',
    'map'
])

.controller('TimelineCtrl', function($scope, $filter, $resource, $timeout, $element, Alerter, ItemCache, ViewonlyItemDialog, TaxonomyRankingCache, TaxonomyResource) {
    $scope.mapFilterEnable = false;

    /* BEGIN Section: items and rankings */

    // Set items to the current contents of the ItemCache
    // $scope.items = ItemCache.contents;

    // // Get rankings from items cache
    // $scope.rankingCache = new TaxonomyRankingCache($scope.term.Term);

    // $scope.$on("$destroy", function() {
    //     if($scope.rankingCache.close !== undefined) $scope.rankingCache.close();
    // });

    // if($scope.term.Term === "" || $scope.term.Term === undefined) {
    //     $scope.ranking = [];
    // } else {
    //     $scope.ranking = $scope.rankingCache.ranking;
    // }

    // $scope.items = $scope.rankedItems;

    $scope.orderedByID;
    $scope.orderedByTime;
    $scope.rankedItems;
    $scope.mapItems;
    $scope.finalFilteredItems;

    // modal window when clicking on timeline items
    $scope.viewonlyItemDialog = function(item) {
        ViewonlyItemDialog.open(item);
    };

    /* END Section*/


    /* BEGIN Section: dynamic timeline ID */

    // Attempt to make the timeline ID in the template a dynamic value
    $scope.timelineTerm = $scope.term.Term === "" ? "timeline" : "timeline-" + $scope.term.Term;

    /* END Section*/


    /* BEGIN Section: tags for select2 tag box in Advanced Settings */

    // Holds all tags (terms) of the current items displayed on the screen
    $scope.tags;

    // Iterates through an items array, finds all unique tags then alphabetizes them
    function getTimelineTags(items) {
        if (items === undefined || items.length === 0) return;

        var array = [];
        var uniqueArray = [];
        // make an array of every item's Terms
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            for (var j = 0; j < item.Terms.length; j++) {
                array.push({'Term': item.Terms[j].Term});
            }
        }
        // check for duplicates, only push unique values
        for(var i = 0; i < array.length; i++) {
            for(var j = i + 1; j < array.length; j++) {
                if (array[i].Term === array[j].Term) {
                    j = ++i;
                }
            }       
            uniqueArray.push(array[i]);
        }
        // sort alphabetically
        uniqueArray.sort(function(a, b) {
            var termA = a.Term.toLowerCase();
            var termB = b.Term.toLowerCase();
            if (termA < termB) {
                return -1;
            }
            if (termA > termB) {
                return 1;
            }
            return 0;
        });
        return uniqueArray;
    }

    /* END Section*/


    /* BEGIN Section: values for Advanced Filtering controls */

    // slider values for manipulating hours and minutes
    $scope.sliderStartVal;
    $scope.sliderStartMinVal;
    $scope.sliderStopVal;
    $scope.sliderStopMinVal;

    // Display strings to show users the timestamp, which the datepicker does NOT do =(
    $scope.startDateString;
    $scope.stopDateString;

    // Forms the string to display the date and time stamp
    function getDateString(date) {
        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var day = date.getDate() < 10 ? "0" + (date.getDate()) : date.getDate();
        var hour = date.getHours() < 10 ? "0" + (date.getHours()) : date.getHours();
        var minute = date.getMinutes() < 10 ? "0" + (date.getMinutes()) : date.getMinutes();
        var second = date.getSeconds() < 10 ? "0" + (date.getSeconds()) : date.getSeconds();
        var millisecond = date.getMilliseconds() < 100 ? date.getMilliseconds() < 10 ? "00" + date.getMilliseconds() : "0" + date.getMilliseconds() : date.getMilliseconds();
        return dayNames[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + day + ", " + date.getFullYear()
            + " " + hour + ":" + minute + ":" + second + ":" + millisecond;
    }

    // Toggles the advanced filtering window
    // $scope.isAdvancedCollapsed = true; // replaced by $scope.isCollapsed in termview.js
    $scope.isStartDateCollapsed = true;
    $scope.isStopDateCollapsed = true;

    // Values for type checkboxes in advanced filtering
    $scope.youtube = true;
    $scope.twitter = true;
    $scope.generic = true;
    $scope.raw = true;

    // typesToDisplay maintains an object with the latest type checkbox values
    $scope.typesToDisplay = function () {
        return {
            'youtube': $scope.youtube,
            'twitter': $scope.twitter,
            'generic': $scope.generic,
            'raw': $scope.raw
        };
    };

    // Start and stop times
    // Can be updated by the timeline, items, date/time picker
    $scope.timelineStartTime;
    $scope.timelineStopTime;

    /* END Section*/


    /* BEGIN Section:timeline library manager -- */
    // Main timeline object
    $scope.timeline;

    // Obtains initialization values for the timeline and initializes it.
    // Also provides a public refresh method to maintain latest values in the timeline
    var TimelineManager = function (dayOffset, items) {
        if (items === undefined || items.length === 0) return;

        var dayOffset = dayOffset || 0;
        var timelineInstance = {};
        var timelineOptions = {};
        var timelineData = [];
        var min = Date.now();
        var max = new Date(0);

        // Concerts items data into an timelineData array, which the timeline.js library handles
        // possibly allow changes to editable, style, content, group in parameters
        function getTimelineData(items) {
            for (var i = 0; i < items.length; i++) {
                var timelineItem = items[i];

                // Forms the interior div element of the timeline box
                var itemData = {};
                itemData.start = timelineItem.StartTime;
                if (timelineItem.StartTime.getTime() !== timelineItem.StopTime.getTime()) {
                    itemData.end = timelineItem.StopTime;
                    itemData.type = 'range';
                } else {
                    itemData.type = 'box';
                }
                switch (timelineItem.Type) {
                    case "youtube":
                        var youtubeID = timelineItem.ContentURI.match(/\/watch\?v=([0-9a-zA-Z].*)/)[1];
                        itemData.content = '<img id=\"' + timelineItem.ID + '\" src=\"http://img.youtube.com/vi/' + youtubeID + '/0.jpg\" width=\"50\" height=\"50\">';
                        break;
                    case "generic":
                        if (timelineItem.ThumbnailURI !== undefined) {
                            itemData.content = '<img id=\"' + timelineItem.ID + '\" src=\"' + timelineItem.ThumbnailURI + '\" width=\"50\" height=\"50\">';
                        } else {
                            itemData.content = '<div id=\"' + timelineItem.ID + '\">' + timelineItem.Type + '</div>';
                        }
                        break;
                    case "twitter":
                        itemData.content = '<img id=\"' + timelineItem.ID + '\" src=\"/asset/twitter-search-logo.png\" width=\"50\" height=\"50\">';
                        break;
                    case "raw":
                        if (timelineItem.ThumbnailURI !== undefined) {
                            itemData.content = '<img id=\"' + timelineItem.ID + '\" src=\"' + timelineItem.ThumbnailURI + '\" width=\"50\" height=\"50\">';
                        } else {
                            itemData.content = '<div id=\"' + timelineItem.ID + '\">' + timelineItem.Type + '</div>';
                        }
                        break;
                }
                // itemData.group = timelineItem.Type;
                // itemData.className = '.red { background-color: red; border-color: dark-red; }' // custom CSS
                itemData.editable = false;

                timelineData.push(itemData);
            }
        }

        // Start initialization of timeline data
        // Get min and max date objects for the outer boundaries of the timeline
        for (var i = 0; i < items.length; i++) {
            if (items[i].StartTime.getTime() < min) {
                min = items[i].StartTime.getTime();
            }
            if (items[i].StopTime.getTime() >= max) {
                max = items[i].StopTime.getTime();
            }
        }
        min = min + ( -dayOffset * (24 * 60 * 60 * 1000));
        max = max + ( dayOffset * (24 * 60 * 60 * 1000));

        min = new Date(min)
        max = new Date(max)

        // TODO: is there ANY way to decouple these $scope variables?
        $scope.timelineStartTime = min;
        $scope.timelineStopTime = max;

        // Populate the timeline with the data
        getTimelineData(items);

        // TODO: Make Height variable/adjustable?
        timelineOptions = {
            'width':  '100%',
            'height': '427px',
            'editable': false,
            'box.align': 'left',
            'start': min,
            'end': max,
            'min': min,
            'max': max
        };

        // Instantiate our timelineInstance object.
        
        // so... what seems to be happening is that dynamically changing the ID is a bad idea.
        // BUT the "$timline" cannot stay the same... there needs to be multiple timelines ids
        $element.find('#timeline').attr('id', $scope.timelineTerm);
        var timelineID = "#" + $scope.timelineTerm;
        timelineInstance = new links.Timeline($(timelineID)[0]);

        // Handles the mouse zoom and drag on the timeline
        function onRangeChanged(e) {
            // TODO: is there ANY way to decouple these $scope variables?
            $scope.timelineStartTime = e.start;
            $scope.timelineStopTime = e.end;
            $scope.$apply();
            timelineInstance.setVisibleChartRange(e.start, e.end);
            timelineInstance.redraw();
        }

        // Matches the timeline item selection with the rtER item to display
        function onSelected(e) {
            if (!timelineInstance.getSelection()[0]) return;
            var id = parseInt(timelineData[timelineInstance.getSelection()[0].row].content.match(/id="([0-9]*)"/)[1]);
            var item;
            for (var i = 0; i < items.length; i++) {
                if (id === items[i].ID) {
                    item = items[i];
                    break;
                }
            }
            var element = "#" + id;
            // Fires the modal window
            $(element).click(function() {
                // $scope.closeupItemDialog(item);
                // TODO: is there ANY way to decouple these $scope variables?
                $scope.viewonlyItemDialog(item);
                $scope.$apply();
            });
        }

        // attach event listeners using the links events handler
        links.events.addListener(timelineInstance, 'rangechanged', onRangeChanged);
        links.events.addListener(timelineInstance, 'select', onSelected);

        // Draw our timeline with the created data and options
        timelineInstance.draw(timelineData, timelineOptions);
        $scope.checked = true;
        return {
            minTime: min,
            maxTime: max,
            refresh: function (items) {
                // TODO: is there ANY way to decouple these $scope variables?
                timelineOptions.start = $scope.timelineStartTime;
                timelineOptions.end = $scope.timelineStopTime;
                timelineInstance.deleteAllItems();
                getTimelineData(items);
                timelineInstance.draw(timelineData, timelineOptions);
            }
        };
    };

    /* END Section*/


    /* BEGIN Section: Preliminary section for Bookmark feature */

    // Holds the search query criteria selected in the dropdown menu
    $scope.querySelected = [];
    
    // Placeholder for saved search queries
    $scope.queryModel = [
        {
            'id': 1,
            'name': 'query1',
            'startTime': new Date(2014, 2, 8),
            'stopTime': new Date(2014, 2, 9)
        }, {
            'id': 2,
            'name': 'query2',
            'startTime': new Date(2014, 1, 7),
            'stopTime': new Date(2014, 2, 9)
        }
    ];

    $scope.resetFilters = function () {
        // Derpy way of reseting... need to do something better
        $scope.timelineStartTime = $scope.timeline.minTime;
        $scope.timelineStopTime = $scope.timeline.maxTime;
        $scope.querySelected = [];
    }

    // Applies the search query criteria to the items data
    // Currently only applying start and stop times
    $scope.applyQuery = function () {
        if ($scope.querySelected !== null && $scope.querySelected.length !== 0) {
            $scope.timelineStartTime = $scope.querySelected.startTime;
            $scope.timelineStopTime = $scope.querySelected.stopTime;
        }
    };

    /* END Section */


    /* BEGIN Section: $watch functions */

    // 1. Get the items from termview (already filtered by )

    $scope.$watch('rankedItems', function() {
        // Initialize $scope.tags when we get items
        $scope.tags = $scope.tags || getTimelineTags($scope.rankedItems);
        $scope.filteredItems = $scope.rankedItems;
        // $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
    }, true);
    
    $scope.$watch('[filteredItems, timelineStartTime, timelineStopTime]', function () {
        if ($scope.timeline) {
            // Ensure that when the start/stop times are updated externally that they are clamped
            if ($scope.timelineStartTime < $scope.timeline.minTime) {
                $scope.timelineStartTime = $scope.timeline.minTime;
            }
            if ($scope.timelineStopTime > $scope.timeline.maxTime) {
                $scope.timelineStopTime = $scope.timeline.maxTime;
            }
        }
        // Ensure timelineStartTime and timelineStopTime are defined before getting/setting date values
        if ($scope.timelineStartTime && $scope.timelineStopTime) {
            $scope.sliderStartVal = $scope.timelineStartTime.getHours();
            $scope.sliderStartMinVal = $scope.timelineStartTime.getMinutes();
            $scope.sliderStopVal = $scope.timelineStopTime.getHours();
            $scope.sliderStopMinVal = $scope.timelineStopTime.getMinutes();
            $scope.startDateString = getDateString($scope.timelineStartTime);
            $scope.stopDateString = getDateString($scope.timelineStopTime);
        }
        $scope.filteredByTime = $filter('filterByTime')($scope.filteredItems, $scope.timelineStartTime, $scope.timelineStopTime);
        console.log($scope.filteredByTime);
    }, true);
    
    // Apply type filter when filteredByTime or any of item types are updated in the Advanced Filtering
    $scope.$watch('[filteredByTime, generic, youtube, twitter, raw]', function () {
        $scope.filteredByType = $filter('filterByType')($scope.filteredByTime, $scope.typesToDisplay());
    }, true);
    
    // Apply tag filter when filteredByType or tags is updated
    $scope.$watch('[filteredByType, tags]', function () {

        $scope.filteredByTag = $filter('filterByTag')($scope.filteredByType, $scope.tags);
        // $scope.orderedByID = $filter('orderBy')($scope.filteredByTag, 'ID', true);
        // $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);
    }, true);

    // Apply ranking filter when orderedByTime is updated
    // $scope.$watch('[ranking, orderedByTime]', function() {
    //     // $scope.rankedItems = $filter('orderByRanking')($scope.orderedByTime, $scope.ranking);
    // }, true);

    $scope.$watch('[filteredByTag, mapBounds, mapFilterEnable]', function() {
        if($scope.mapFilterEnable) {
            $scope.mapItems = $filter('filterbyBounds')($scope.filteredByTag, $scope.mapBounds);
        } else {
            $scope.mapItems = $scope.filteredByTag;
        }
    }, true);

    $scope.$watch('[mapFilteredItems, filterMode]', function() {
        if($scope.filterMode == 'remove') {
            $scope.finalFilteredItems = $scope.mapFilteredItems;
        }
    }, true);

    // Updates finalFilteredItems
    $scope.$watch('mapItems', function() {
        $scope.finalFilteredItems = $scope.mapItems;
        // Ensure finalFilteredItems and timeline are proper objects before performing refresh
        // This "solves" the issue with async delay. 
        if ($scope.finalFilteredItems && $scope.timeline) {
            $scope.timeline.refresh($scope.finalFilteredItems);    
        }
    }, true);

    // For each of the following, ensure timelineStartTime is a valid value before trying to set values to it
    // This "solves" the issue with async delay.

    // Watch slider for hour value in timelineStartTime
    $scope.$watch('[sliderStartVal]', function() {
        if ($scope.timelineStartTime) {
            $scope.timelineStartTime.setHours($scope.sliderStartVal);   
        }
    }, true);
    
    // Watch slider for minute value in timelineStartTime
    $scope.$watch('[sliderStartMinVal]', function() {
        if ($scope.timelineStartTime) {
            $scope.timelineStartTime.setMinutes($scope.sliderStartMinVal);  
        }
    }, true);

    // Watch slider for hour value in timelineStopTime
    $scope.$watch('[sliderStopVal]', function() {
        if ($scope.timelineStopTime) {
            $scope.timelineStopTime.setHours($scope.sliderStopVal); 
        }
    }, true);

    // Watch slider for minute value in timelineStopTime
    $scope.$watch('[sliderStopMinVal]', function() {
        if ($scope.timelineStopTime) {
            $scope.timelineStopTime.setMinutes($scope.sliderStopMinVal);    
        }
    }, true);

    // For updating the timeline ID (Still not working...)
    $scope.$watch('term.Term', function() {
        $scope.timelineTerm = $scope.term.Term === "" ? "timeline" : "timeline-" + $scope.term.Term;
    }, true);

    $scope.$watch('[viewmode]', function () {
        if ($scope.viewmode === 'timeline-view') {
            // when we add the OR logic, the timeline doesn't repopulate with ALL the items when in a term tab,
            // Unsure of other side-effects atm, but I'm pretty sure there are some.
            $scope.timeline = $scope.timeline || TimelineManager(3, $scope.rankedItems);
        }
    }, true);

    /* END Section*/
})

.directive('timeline', function () {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            term: '=',
            rankedItems: '=',
            isCollapsed: '=',
            viewmode: '='
        },
        templateUrl: '/template/timeline/timeline.html',
        controller: 'TimelineCtrl',
        link: function(scope, elem, attrs) {
            
        }
    };
});
