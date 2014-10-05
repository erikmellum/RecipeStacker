describe('Unit: SearchController', function(){

  beforeEach(module('myApp'));

  var SearchCtrl, scope, mockHttp, url;
 
  beforeEach(inject(function($httpBackend, $controller, $rootScope) {
    mockHttp = $httpBackend;
    scope = $rootScope.$new();
    SearchCtrl = $controller('SearchController', {
      $scope: scope
    });
  }));

  it('should add an ingredient to the chosen_ingredients array', 
    function() {
      expect(scope.chosen_ingredients.length).toBe(0);
      scope.switchAndDisplay('Test',scope.query_result,0);
      expect(scope.chosen_ingredients.length).toBe(1);
  });

  it ('should post successfully', 
    function(){
      var postObject = {"ingredients" : ['free range egg']};
      url = '/api/composition/withIngredients/';
      mockHttp.whenPOST(url, postObject).respond(201, 'success');
      mockHttp.expectPOST(url).respond(201, 'success');
  });

  it ('should query an ingredient correctly', 
    function(){
      var ingredientRequestHandler = mockHttp.when('POST', '/api/ingredients/')
      .respond({data: ['free range eggs', 'large eggs']});

      var postObject = {"ingredient" : 'egg'};
      url = '/api/ingredients/';
      mockHttp.expectPOST(url).respond(200, {
          data: ['free range eggs', 'large eggs']
      });
  });
});