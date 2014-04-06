angular.module('rawItem', [])

.controller('FormRawItemCtrl', function($scope) {

})

.directive('formRawItem', function() {
	return {
		restrict: 'E',
		scope: {
			item: "=",
			form: "="
		},
		templateUrl: '/template/items/raw/form-raw-item.html',
		controller: 'FormRawItemCtrl',
		link: function(scope, element, attr) {

		}
	};
})

.controller('CloseupRawItemCtrl', function($scope) {
	
})

.directive('closeupRawItem', function() {
	return {
		restrict: 'E',
		transclude: true,
		scope: {
			item: "="
		},
		templateUrl: '/template/items/raw/closeup-raw-item.html',
		controller: 'CloseupRawItemCtrl',
		link: function(scope, element, attr) {
			
		}
	};
});