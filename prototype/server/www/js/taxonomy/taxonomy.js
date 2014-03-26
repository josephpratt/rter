angular.module('taxonomy', [
	'ngResource', //$resource for taxonomoy
	'sockjs' //sock for TaxonomyRankingCache
])

.factory('TaxonomyRankingResource', function ($resource) {
	var TaxonomyRankingResource = $resource(
		'/1.0/taxonomy/:Term/ranking',
		{ Term: '@Term' },
		{
			update: { method: 'PUT' }
		}
	);

	return TaxonomyRankingResource;
})

.factory('TaxonomyRankingCache', function($rootScope, SockJS, TaxonomyRankingResource) {
	function TaxonomyRankingCache(term) {
		if(term === "" || term === undefined) return;

		var self = this;

		this.term = term;
		this.ranking = [];
		this.stream = new SockJS('/1.0/streaming/taxonomy/' + term + '/ranking');

		function parseTermRanking(termRanking) {
			if(termRanking.Ranking === "" || termRanking.Ranking === undefined) {
			 	return;
			 }

			var newRanking;
			try {
				newRanking = JSON.parse(termRanking.Ranking);
			} catch(e) {
				console.log("Receive invalid JSON ranking form server", e);
				return;
			}

			replaceRanking(newRanking);
		}

		function replaceRanking(r) {
			self.ranking.length = 0;
			Array.prototype.push.apply(self.ranking, r);
		}

		this.stream.onopen = function() {

		};

		this.stream.onmessage = function(e) {
			var bundle = e.data;

			if(bundle.Action == "update") {
				//Often if the user created the item, it will already be in place so treat as an update
				parseTermRanking(bundle.Val);
			}

			$rootScope.$digest();
		};

		this.stream.onclose = function() {

		};

		this.init = function() {
			TaxonomyRankingResource.get(
				{Term: this.term},
				function(termRanking) {
					parseTermRanking(termRanking);
				},
				function(e) {
					console.log(e);
				}
			);
		};

		this.close = function() {
			this.stream.close();
		}

		this.init();

		this.update = function(newRanking, sucess, failure) {
			var oldRanking = this.ranking.slice(0);

			replaceRanking(newRanking);

			TaxonomyRankingResource.update(
				{
					Term: this.term,
					Ranking: JSON.stringify(newRanking)
				},
				function() {
					//Success do nothing!
					if(angular.isFunction(sucess)) sucess();
				},
				function(e) {
					if(e.status != 304) {
						Alerter.error("There was a problem updating the ranking. "+"Status:"+e.status+". Reply Body:"+e.data);
						console.log(e);

						replaceRanking(oldRanking);
					}
					if(angular.isFunction(failure)) failure(e);
				}
			);
		};
	}

	return TaxonomyRankingCache;
})

.factory('TaxonomyResource', function ($resource) {
	var TaxonomyResource = $resource(
		'/1.0/taxonomy/:Term',
		{ Term: '@Term' },
		{
			update: { method: 'PUT', params:{ Term: '@Term' } }
		}
	);

	return TaxonomyResource;
})

.factory('TaxonomyStream', function(SockJS) {
	return new SockJS('/1.0/streaming/taxonomy');
})

.factory('TaxonomyCache', function (CacheBuilder, TaxonomyResource, TaxonomyStream) {
	return new CacheBuilder(
		"Term",
		TaxonomyResource,
		TaxonomyStream,
		function(a, b) {
			if(a.Term === undefined || b.Term === undefined) return false;
			if(a.Term == b.Term) return true;
			return false;
		}
	);
})

.controller('TagSelectorCtrl', function($scope, TaxonomyResource) {
	$scope.thing = true;
	$scope.$watch('thing', function() {
		// console.log($scope.thing);
	}, true);

	if($scope.terms !== undefined) {
		var concat = "";
		for(var i = 0;i < $scope.terms.length;i++) {
			concat += $scope.terms[i].Term + ",";
		}
		$scope.terms = concat.substring(0, concat.length-1);
	}
	$scope.tagConfig = {
		data: TaxonomyResource.query(),
		multiple: true,
		id: function(item) {
			console.log('id');
			return item.Term;
		},
		formatResult: function(item) {
			console.log('formatResult');
			return item.Term;
		},
		formatSelection: function(item) {
			console.log('formatSelection');
			return item.Term;
		},
		createSearchChoice: function(term) {
			console.log('createSearchChoice');
			return {Term: term};
		},
		matcher: function(term, text, option) {
			console.log('matcher');
			return option.Term.toUpperCase().indexOf(term.toUpperCase())>=0;
		},
		initSelection: function (element, callback) {
			console.log('initSelection');
			var data = [];
			$(element.val().split(",")).each(function (v, a) {
				data.push({Term: a});
			});
			callback(data);
		},
	};
})

.directive('tagSelector', function() {
	return {
		restrict: 'E',
		scope: {
			terms: "="
		},
		templateUrl: '/template/taxonomy/tag-selector.html',
		controller: 'TagSelectorCtrl',
		link: function(scope, element, attrs) {

		}
	};
})

.controller('TimelineTagSelectorCtrl', function($scope, TaxonomyResource) {
	if($scope.terms !== undefined) {
		var concat = "";
		for(var i = 0;i < $scope.terms.length;i++) {
			concat += $scope.terms[i].Term + ",";
		}
		$scope.terms = concat.substring(0, concat.length-1);
	}
	console.log("You callin' me?");
	$scope.timelineTagConfig = {
		data: TaxonomyResource.query(),
		multiple: true,
		id: function(item) {
			console.log('id');
			return item.Term;
		},
		formatResult: function(item) {
			console.log('formatResult');
			return item.Term;
		},
		formatSelection: function(item) {
			console.log('formatSelection');
			return item.Term;
		},
		createSearchChoice: function(term) {
			console.log('createSearchChoice');
			return {Term: term};
		},
		matcher: function(term, text, option) {
			console.log('matcher');
			return option.Term.toUpperCase().indexOf(term.toUpperCase())>=0;
		},
		initSelection: function (element, callback) {
			console.log('initSelection');
			var data = [];
			$(element.val().split(",")).each(function (v, a) {
				data.push({Term: a});
			});
			callback(data);
		},
	};
})

.directive('timelineTagSelector', function() {
	return {
		restrict: 'E',
		scope: {
			terms: "="
		},
		templateUrl: '/template/taxonomy/timeline-tag-selector.html',
		controller: 'TimelineTagSelectorCtrl',
		link: function(scope, element, attrs) {

		}
	};
});