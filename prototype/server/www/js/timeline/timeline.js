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
    'ui.slider'
])

.controller('TimelineCtrl', function($scope, $filter, $resource, $timeout, $element, Alerter, ItemCache, CloseupItemDialog, ViewonlyItemDialog, TaxonomyRankingCache) {
    /* -- items and rankings  -- */
    $scope.viewmode = "timeline-view";

    // Set items to the current contents of the ItemCache
    $scope.items = ItemCache.contents;

    // Get rankings from items cache
    $scope.rankingCache = new TaxonomyRankingCache($scope.term.Term);

    $scope.$on("$destroy", function() {
        if($scope.rankingCache.close !== undefined) $scope.rankingCache.close();
    });

    if($scope.term.Term === "" || $scope.term.Term === undefined) {
        $scope.ranking = [];
    } else {
        $scope.ranking = $scope.rankingCache.ranking;
    }

    $scope.orderedByID;
    $scope.orderedByTime;
    $scope.rankedItems;
    $scope.finalFilteredItems;

    $scope.closeupItemDialog = function(item) {
        CloseupItemDialog.open(item);
    };

    $scope.viewonlyItemDialog = function(item) {
        ViewonlyItemDialog.open(item);
    };

    /* BEGIN TIMELINE.JS */

    /* TODOS:
    *   PRIORITY:
    *   -- TimelineTags not populating at startup
    *   -- Map problems
    *   -- Put map in timeline view
    *   -- "Advanced Settings" button unresponsive after "Close"
    *   -- Selecting a term from the tag cloud doesn't trigger the filter in the timeline
    *   SECONDARY:
    *   -- Is there a better way to handle the select2 tag box?
    *   -- Make timelineTags read-only in viewonly screen
    *   -- Modal window for items
    *   -- Adjust CSS of timeline item box (use point or range?)
    *   -- Add some statistics on query
    *   //-- How to filter on timelineTags when tag box is updated?
    *   //-- Fix blur/remove (give it a switch statement on the view?)
    *   //-- Fix minMax (singleton function a watch function to initialize timeline)
    *   //-- Integrate Time sliders
    *   //-- Fix tag assignment in the tag box
    *   //-- Readjust Start/Stop Date to match timeline mins/maxs
    *   //-- Maintain start/stop Date in timeline (do not allow auto-adjust)
    *   //-- Allow click to bring up item details
    *   //-- Clamp timeline dates to something reasonable
    *   //-- Check if timelineTags are removed after corresponding item is removed (if not, will need to populate timelineTags differently)
    *   //-- Deal with Timezones?
    *   //-- Do timelineTags go away when all the items using them are removed?
    */

    // Holds all tags (terms) of the current items displayed on the screen
    $scope.tags;

    /*
    *   Iterates through an items array, finds all unique tags then alphabetizes them
    */
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

    // slider values for manipulating hours and minutes
    $scope.sliderStartVal;
    $scope.sliderStartMinVal;
    $scope.sliderStopVal;
    $scope.sliderStopMinVal;

    // Display strings to show users the timestamp, which the datepicker does NOT do =(
    $scope.startDateString;
    $scope.stopDateString;

    /*
    *   Forms the string to display the date and time stamp
    */
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
    $scope.isAdvancedCollapsed = true; // replaced by $scope.isCollapsed in termview.js
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

    // Main timeline object
    $scope.timeline;
    // Start and stop times
    // Can be updated by the timeline, items, date/time picker
    $scope.timelineStartTime;
    $scope.timelineStopTime;

    /*
    *   Obtains initialization values for the timeline and initializes it.
    *   Also provides a public refresh method to maintain latest values in the timeline
    */
    var TimelineManager = function (dayOffset, items, onSelectedFn) {
        if (items === undefined || items.length === 0) return;

        var dayOffset = dayOffset || 0;
        var timelineInstance = {};
        var timelineOptions = {};
        var timelineData = [];
        var min = Date.now();
        var max = new Date(0);

        function getTimelineData(items) { // possibly allow changes to editable, style, content, group in parameters
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
            'height': '300px',
            'editable': false,
            'box.align': 'left',
            'start': min,
            'end': max,
            'min': min,
            'max': max
        };

        // Instantiate our timelineInstance object.
        timelineInstance = new links.Timeline($('#timeline')[0]);

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
                // onSelectedFn(items);
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

    /*
    *   Holds the search query criteria selected in the dropdown menu
    */
    $scope.querySelected = [];

    /*
    *   Placeholder for saved search queries
    */
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

    /*
    *   Applies the search query criteria to the items data
    */
    $scope.applyQuery = function () {
        // $scope.tags = [{
        //     'Term': 'all'
        // }];
        if ($scope.querySelected !== null && $scope.querySelected.length !== 0) {
            $scope.timelineStartTime = $scope.querySelected.startTime;
            $scope.timelineStopTime = $scope.querySelected.stopTime;
        }
    };

    /* END TIMELINE.JS */

    $scope.$watch('items', function() {
        // TOTAL HACK for initializing data. I'm unclear how to handle the async issues with items and tags
        // Using the ItemCache and TaxonomyResource.query() are both unreliable at startup
        if ($scope.items !== undefined) {
            $scope.timeline = $scope.timeline || TimelineManager(3, $scope.items);
            $scope.tags = $scope.tags || getTimelineTags($scope.items);
        }

        if ($scope.timeline !== undefined && $scope.tags !== undefined) {
            $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
            $scope.filteredByTime = $filter('filterByTime')($scope.filteredItems, $scope.timelineStartTime, $scope.timelineStopTime);
            $scope.filteredByType = $filter('filterByType')($scope.filteredByTime, $scope.typesToDisplay());
            $scope.filteredByTag = $filter('filterByTag')($scope.filteredByType, $scope.tags);
            $scope.orderedByID = $filter('orderBy')($scope.filteredByTag, 'ID', true);
            $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);
        }
    }, true);

    $scope.$watch('[ranking, orderedByTime]', function() {
        $scope.rankedItems = $filter('orderByRanking')($scope.orderedByTime, $scope.ranking);
    }, true);

    $scope.$watch('[rankedItems, filterMode]', function() {
        $scope.finalFilteredItems = $scope.rankedItems;
        if ($scope.finalFilteredItems !== undefined && $scope.timeline !== undefined) {
            $scope.timeline.refresh($scope.finalFilteredItems);    
        }
    }, true);

    // Make sure timeline doesn't reach beyond the scope of the data
    $scope.$watch('[timelineStartTime, timelineStopTime]', function () {
        if ($scope.timeline !== undefined) {
            // ensure that when the start/stop times are updated externally that they are clamped
            if ($scope.timelineStartTime < $scope.timeline.minTime) {
                $scope.timelineStartTime = $scope.timeline.minTime;
            }
            if ($scope.timelineStopTime > $scope.timeline.maxTime) {
                $scope.timelineStopTime = $scope.timeline.maxTime;
            }
        }

        if ($scope.timelineStartTime && $scope.timelineStopTime) {
            $scope.sliderStartVal = $scope.timelineStartTime.getHours();
            $scope.sliderStartMinVal = $scope.timelineStartTime.getMinutes();
            $scope.sliderStopVal = $scope.timelineStopTime.getHours();
            $scope.sliderStopMinVal = $scope.timelineStopTime.getMinutes();
            $scope.startDateString = getDateString($scope.timelineStartTime);
            $scope.stopDateString = getDateString($scope.timelineStopTime);
        }

        
    }, true);

    $scope.$watch('tags', function () {
        $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
        $scope.filteredByTime = $filter('filterByTime')($scope.filteredItems, $scope.timelineStartTime, $scope.timelineStopTime);
        $scope.filteredByType = $filter('filterByType')($scope.filteredByTime, $scope.typesToDisplay());
        $scope.filteredByTag = $filter('filterByTag')($scope.filteredByType, $scope.tags);
        $scope.orderedByID = $filter('orderBy')($scope.filteredByTag, 'ID', true);
        $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);
    }, true);

    $scope.$watch('[timelineStartTime, timelineStopTime, generic, youtube, twitter, raw]', function () {
        if ($scope.timelineStartTime && $scope.timelineStopTime) {
            $scope.sliderStartVal = $scope.timelineStartTime.getHours();
            $scope.sliderStartMinVal = $scope.timelineStartTime.getMinutes();
            $scope.sliderStopVal = $scope.timelineStopTime.getHours();
            $scope.sliderStopMinVal = $scope.timelineStopTime.getMinutes();

            $scope.startDateString = getDateString($scope.timelineStartTime);
            $scope.stopDateString = getDateString($scope.timelineStopTime);
        }

        $scope.filteredItems = $filter('filterByTerm')($scope.items, $scope.term.Term);
        $scope.filteredByTime = $filter('filterByTime')($scope.filteredItems, $scope.timelineStartTime, $scope.timelineStopTime);
        $scope.filteredByType = $filter('filterByType')($scope.filteredByTime, $scope.typesToDisplay());
        $scope.filteredByTag = $filter('filterByTag')($scope.filteredByType, $scope.tags);
        $scope.orderedByID = $filter('orderBy')($scope.filteredByTag, 'ID', true);
        $scope.orderedByTime = $filter('orderBy')($scope.orderedByID, 'StartTime', true);
    }, true);

    //Slider for Hour control for Start Time
    $scope.$watch('[sliderStartVal]', function() {
        if ($scope.timelineStartTime) {
            $scope.timelineStartTime.setHours($scope.sliderStartVal);   
        }
    }, true);
    
    //Slider for Minute Control for Start Time
    $scope.$watch('[sliderStartMinVal]', function() {
        if ($scope.timelineStartTime) {
            $scope.timelineStartTime.setMinutes($scope.sliderStartMinVal);  
        }
    }, true);

    //for stop slider
    $scope.$watch('[sliderStopVal]', function() {
        if ($scope.timelineStopTime) {
            $scope.timelineStopTime.setHours($scope.sliderStopVal); 
        }
    }, true);

    //Slider for Minute Control for Stop Time
    $scope.$watch('[sliderStopMinVal]', function() {
        // Why are we checking this?
        if ($scope.timelineStopTime) {
            $scope.timelineStopTime.setMinutes($scope.sliderStopMinVal);    
        }
    }, true);

    // $scope.$watch('querySelected', function() {
    //     console.log('query');
    //     // $scope.timelineStartTime = $scope.querySelected.startTime;
    //     // $scope.timelineStopTime = $scope.querySelected.stopTime;
    // }, true);
})

.directive('timeline', function () {
    return {
        restrict: 'E',
        scope: {
            term: '=',
            isCollapsed: '='
        },
        templateUrl: '/template/timeline/timeline.html',
        controller: 'TimelineCtrl',
        link: function(scope, element, attrs) {
            
        }
    };
})

// .controller('TagsSelectorCtrl', function($scope, TaxonomyResource) {
//     if($scope.terms !== undefined) {
//         var concat = "";
//         for(var i = 0;i < $scope.terms.length;i++) {
//             concat += $scope.terms[i].Term + ",";
//         }
//         $scope.terms = concat.substring(0, concat.length-1);
//     }

//     $scope.tagsConfig = {
//         data: TaxonomyResource.query(),
//         multiple: true,
//         id: function(item) {
//             console.log('hi');
//             return item.Term;
//         },
//         formatResult: function(item) {
//             console.log('hi');
//             return item.Term;
//         },
//         formatSelection: function(item) {
//             console.log('hi');
//             return item.Term;
//         },
//         createSearchChoice: function(term) {
//             console.log('hi');
//             return {Term: term};
//         },
//         matcher: function(term, text, option) {
//             console.log('hi');
//             return option.Term.toUpperCase().indexOf(term.toUpperCase())>=0;
//         },
//         initSelection: function (element, callback) {
//             var data = [];
//             $(element.val().split(",")).each(function (v, a) {
//                 data.push({Term: a});
//             });
//             console.log(data);
//             callback(data);
//         },
//     };
// })

// .directive('tagSelector', function() {
//     return {
//         restrict: 'E',
//         scope: {
//             terms: "="
//         },
//         templateUrl: '/template/taxonomy/tag-selector.html',
//         controller: 'TagSelectorCtrl',
//         link: function(scope, element, attrs) {

//         }
//     };
// });