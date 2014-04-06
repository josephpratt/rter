// filtering by name is weird
// it doesn't seem to remove them from the map, which isn't right
// and blur remove is somewhat wierd as well

angular.module('timeline', [
    'ng',
    'ui',
    'map',
    'items',
    'ui.slider',
    'ui.bootstrap.accordion',
    'ui.bootstrap.transition'
])

.controller('TimelineCtrl', function($scope, $filter, $timeout, $element, ItemCache, ViewonlyItemDialog) {
    // $scope.items = ItemCache.contents;
    $scope.mapFilterEnable = false;

    // modal window when clicking on timeline items
    $scope.viewonlyItemDialog = function(item) {
        ViewonlyItemDialog.open(item);
    };

    // Attempt to make the timeline ID in the template a dynamic value
    $scope.timelineTerm = $scope.term.Term === "" ? "timeline" : "timeline_" + $scope.term.Term.replace(/\:/, '_');

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

        $element.find('#timeline').attr('id', $scope.timelineTerm);
        var timelineID = "#" + $scope.timelineTerm;

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
                        itemData.content = '<img id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\" src=\"http://img.youtube.com/vi/' + youtubeID + '/0.jpg\" width=\"50\" height=\"50\">';
                        break;
                    case "generic":
                        if (timelineItem.ThumbnailURI !== undefined) {
                            itemData.content = '<img id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\" src=\"' + timelineItem.ThumbnailURI + '\" width=\"50\" height=\"50\">';
                        } else {
                            itemData.content = '<div id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\">' + timelineItem.Type + '</div>';
                        }
                        break;
                    case "twitter":
                        itemData.content = '<img id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\" src=\"/asset/twitter-search-logo.png\" width=\"50\" height=\"50\">';
                        break;
                    case "raw":
                        if (timelineItem.ThumbnailURI !== undefined) {
                            itemData.content = '<img id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\" src=\"' + timelineItem.ThumbnailURI + '\" width=\"50\" height=\"50\">';
                        } else {
                            itemData.content = '<div id=\"' + timelineItem.ID + '_' + $scope.timelineTerm + '\">' + timelineItem.Type + '</div>';
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
            'start': min,
            'end': max,
            'min': min,
            'max': max
        };

        // Instantiate our timelineInstance object.
        
        // so... what seems to be happening is that dynamically changing the ID is a bad idea.
        // BUT the "$timline" cannot stay the same... there needs to be multiple timelines ids
        
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
            var divID = timelineData[timelineInstance.getSelection()[0].row].content.match(/id="([\w]*)"/)[1];
            var id = parseInt(divID.match(/\d*/));
            var item;
            for (var i = 0; i < items.length; i++) {
                if (id === items[i].ID) {
                    item = items[i];
                    break;
                }
            }
            var element = "#" + divID;
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
            timelineData: timelineData,
            timelineOptions: timelineOptions,
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

    $scope.$watch('viewmode', function () {
        if ($scope.viewmode === 'timeline-view') {
            $scope.tags = $scope.tags || getTimelineTags($scope.filteredItems);
            $scope.timeline = $scope.timeline || TimelineManager(3, $scope.filteredItems);
            // When an item is selected/updated in another view (for example clicking an item for the close up on
            // grid-view) the timeline tries to draw itself, but since the element is hidden by ng-show it doesn't
            // draw itself properly, so to solve this, I check for a valid timeline object and finalFilteredItems
            // object, and refresh the timeline when switching to 'timeline-view'.
            if ($scope.timeline && $scope.finalFilteredItems) {
                $scope.timeline.refresh($scope.finalFilteredItems);
            }
        }
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
    }, true);
    
    // Apply type filter when filteredByTime or any of item types are updated in the Advanced Filtering
    $scope.$watch('[filteredByTime, generic, youtube, twitter, raw]', function () {
        $scope.filteredByType = $filter('filterByType')($scope.filteredByTime, $scope.typesToDisplay());
    }, true);

    // Apply tag filter when filteredByType or tags is updated
    $scope.$watch('[filteredByType, tags]', function () {
        $scope.filteredByTag = $filter('filterByTag')($scope.filteredByType, $scope.tags);
    }, true);

    $scope.$watch('[filteredByTag, mapBounds, mapFilterEnable]', function() {
        if($scope.mapFilterEnable) {
            $scope.mapItems = $filter('filterbyBounds')($scope.filteredByTag, $scope.mapBounds);
        } else {
            $scope.mapItems = $scope.filteredByTag;
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

    // For updating the timeline ID
    $scope.$watch('term.Term', function() {
        $scope.timelineTerm = $scope.term.Term === "" ? "timeline" : "timeline_" + $scope.term.Term.replace(/\:/, '_');
    }, true);

    /* END Section*/
})

.directive('timeline', function () {
    return {
        restrict: 'E',
        // transclude: true,
        scope: {
            term: '=',
            filteredItems: '=',
            isCollapsed: '=',
            viewmode: '='
        },
        templateUrl: '/template/timeline/timeline.html',
        controller: 'TimelineCtrl',
        link: function(scope, elem, attrs) {
            
        }
    };
});
