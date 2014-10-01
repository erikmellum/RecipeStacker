var TheControllers = angular.module('TheControllers', []);
TheControllers.controller('SearchController', ['$scope', '$http', function($scope, $http) {
 $scope.query_result = [
  { 
    name: "eggs"
  },
  {
    name: "buttermilk"
  },
  {
    name: "flour"
  },
  {
    name:"vegetable oil"
  },
  {
    name:"garlic"
  },
  {
    name:"cognac"
  },
  {
    name:"cumin seed"
  },
  {
    name:"pizza"
  },
  { 
    name: "steak"
  }
]

$scope.chosen_ingredients=[]
$scope.recipes=[]
$scope.dataArray=[]

$scope.switchAndDisplay = function(name, container, index){
    container.splice(index,1);
     $scope.chosen_ingredients.push(name);
     $scope.recipes.length = 0; //removing all recipe results 
     $scope.displayRecipes();
}
$scope.remove = function(container, index){
    container.splice(index,1);
    //remove all recipes because we have no ingredients chosen || we have removen an 'ingredient' and we need to empty the recipe array to render a new recipe array later
   if($scope.chosen_ingredients.length == 0 || container != $scope.recipes) 
     $scope.recipes.length = 0; //removing all recipe results 

   //if we arent removing a recipe, display the new recipe list
   if (container != $scope.recipes) { 
     $scope.displayRecipes();
   }
}
  $scope.details = function(name, index){
    console.log("ASdasd");
    console.log(name);
    console.log(index);
    console.log($scope.dataArray[index]);
  }
$scope.displayRecipes = function() {

  if ($scope.chosen_ingredients.length) {
    var url = '/api/composition/withIngredients/'
    var ingredientsArray = new Array();
    $scope.chosen_ingredients.forEach(function(ingredient){
        ingredientsArray.push(ingredient.name);
    });
    var postObject = {"ingredients" : ingredientsArray};
      $http.post(url, postObject).success(function(data) {
        $scope.dataArray = data;
          data.forEach(function(recipe){
            $scope.recipes.push({name:recipe.recipeName});
        });
      });
    }
}
}]);

TheControllers.controller('DetailsController', ['$scope', function($scope) {
  $scope.details = function(name, index){
    console.log("ASdaasdasdasdasdsdsasd");
    console.log($scope.dataArray[index]);
    // window.href=baseurl+"/#/details?name=" + "name"+ "&index=+index"
    // window.href = google.com;
  }
}]);

TheControllers.controller('AboutController', ['$scope', function($scope, $http) {
  $scope.names=["Name 1, Name 2, Name3"];
}]);

TheControllers.controller('InputController', ['$scope', function($scope, $http) {

$scope.inputRecipe = function(comp) {
      var url = '/api/composition/new/'
      $http.post(url, postObject).success(function(comp) {
      });
}

}]);

TheControllers.controller('ApiScrapeController', ['$scope', function($scope, $http) {
  $http.get('/api/tmpIngredients').success(function(data) {
       $scope.tmpIngredients=data;
    });
  
  $scope.abstractIngredients=[];
  $scope.primitiveIngredients=[];
  $scope.tmpIds=[];

}]);