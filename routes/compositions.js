var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var http = require('http');


//require our models
require('../models/Ingredient');
require('../models/Composition');
require('../models/AbstractIngredient');
require('../models/PrimitiveIngredient');
require('../models/TmpRecipe');
require('../models/TmpIngredient');
require('../models/User');
require('../models/Review');
require('../models/Unit');

// define our objects
var Ingredient = mongoose.model('Ingredient');
var Composition = mongoose.model('Composition');
var AbstractIngredient = mongoose.model('AbstractIngredient');
var PrimitiveIngredient = mongoose.model('PrimitiveIngredient');
var TmpRecipe = mongoose.model('TmpRecipe');
var TmpIngredient = mongoose.model('TmpIngredient');
var User = mongoose.model('User');
var Review = mongoose.model('Review');
var Unit = mongoose.model('Unit');


/**
 * Fetch recipe from the remote API and tunnel through this route
 * @param  {post}   recipeId  Yummly Recipe ID
 * @return {res.json} yummly object API (at the moment)
 */
router.post('/', function(req, res, next){
  console.log(req.body);
  // TODO: distinguish between yummly fetch and mongodb fetch
  // test array of ingredients for now
  var recipeId = req.body.recipeId;
  
  TmpRecipe.findOne({id: recipeId }, function (err, recipe) {
    if(recipe === null){
      Composition.findOne({id: recipeId}), function(err, comp){
        if(!comp){
          console.log("calling yummly");
          callYummly();
        }
        else
        {
          res.json(comp);
        }
      }

    }
    else{
      console.log("found!");
      // console.log(recipe);
      res.json(recipe);
    }
  });
  function callYummly(){
    // the yummly API key embedded URL
    // suffixed with start of ingredients syntax
    var url = 'http://api.yummly.com/v1/api/recipe/'+recipeId+'?_app_id=af791dca&_app_key=f28b1240c0ab4435b41d6505f0278cfd';

    // uhh, yeah. gotta get rid of those special characters
    url = encodeURI(url);

    // for testing
    //console.log(url);

    // gets remote data
    http.get(url, function(remoteRes) {
      // testing
      // console.log("Got response: " + remoteRes.statusCode);
      var body = ""
      remoteRes.on('data', function(data) {
        // collect the data stream
        body += data;
      });
      remoteRes.on('end', function() {
        var recipe = JSON.parse(body);
        var tmpRecipe = new TmpRecipe();

        for(var key in recipe) {
          if(recipe.hasOwnProperty(key)) {
            // console.log(key);
            tmpRecipe[key] = recipe[key];
          }
        }
        // console.log(recipe);
        tmpRecipe.save();
        // send our response
        res.json(recipe);
      });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
  }
});


/**
 * Fetch Ingredients from the remote API and tunnel through this route
 * @param  {post}   ingredients  list of ingredients to search for
 * @return {res.json} yummly object API (at the moment)
 */
router.post('/withIngredients/', function(req, res, next){
  // console.log(req.body)
  // test array of ingredients for now
  var ingredients = req.body.ingredients;
  var excluded = req.body.excluded;
  var query = {name: {$in: ingredients}};
  var combined = [];
  AbstractIngredient.find(query, function(err, abstr){
    combined = combined.concat(abstr);
    PrimitiveIngredient.find(query, function(err, prim){
      combined = combined.concat(prim);
      Composition.find(query, function(err, comp){
        combined = combined.concat(comp);
        var ingredientIds = [];
        //foreach is blocking
        combined.forEach(function(ingredient){ 
          ingredientIds.push(ingredient.id)
          // uncomment for testing
          console.log("Found this with name:" + ingredient.name);
          console.log(ingredient);
        });
        searchCompositions(ingredientIds);
      });
    });
  });


  function searchCompositions(ingredientIds){
    console.log(ingredientIds);
    // if one of the ingredients wasn't found in our db, don't even bother searching for compositions
    if(ingredients.length > ingredientIds.length)
    {
      searchYummly([]);
      return;
    }

    // now let's make a collection of recipes that contain those IDs
    var compositionStream = Composition.find({'recipe.ingredient': {$all: ingredientIds}}).stream();
    // keep those recipes in this array
    var recipes = [];
    compositionStream.on('data', function(composition){
      // uncomment for testing
      console.log("Pushing this recipe: ");
      console.log(composition);

      // push this composition to our array
      recipes.push(composition);
    });
    // done searching
    compositionStream.on('close', function(){
      searchYummly(recipes);
    });
  }

  function searchYummly(recipes){

      // the yummly API key embedded URL
    // suffixed with start of ingredients syntax
    var url = 'http://api.yummly.com/v1/api/recipes?_app_id=af791dca&_app_key=f28b1240c0ab4435b41d6505f0278cfd&allowedIngredients[]='

    // combine url and ingredients
    url += ingredients.join('&allowedIngredients[]=');
      // uhh, yeah. gotta get rid of those special characters
      if (excluded.length){
        url += "&excludedIngredients[]="
        url += excluded.join('&excludedIngrediens[]=');
      }

    url = encodeURI(url);

    // for testing
    console.log(url);

    // gets remote data
    http.get(url, function(remoteRes) {
      // testing
       console.log("Got response: " + remoteRes.statusCode);
      var recipesResponse;
      var body = ""
      remoteRes.on('data', function(data) {
        // collect the data stream
        body += data;
      });
      remoteRes.on('end', function() {
        // TODO: maybe this can be made recursive?
        recipesResponse = JSON.parse(body).matches;
        // loop through recipes and extract and create ingredients
        recipesResponse.forEach(function(recipe){
          recipe.ingredients.forEach(function(ingredient){
              // console.log(ingredient)
              var tmpIngredient = new TmpIngredient();
              tmpIngredient.name = ingredient;
              tmpIngredient.save();
          });
        })

        var combined = recipes.concat(recipesResponse);
        // send our response
        res.json(combined);
      });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
  }
});

/**
 * Adds a recipe to CompositionSchema -- tunnel through this route
 * @param  {recipeObject}
 * @return {res.json} yummly object API (at the moment)
 *
 * Should recieve a json recipe object formulated on the front end using a form
 */ //Currently two /composition/new/ ??
router.post('/new/', function(req, res, next){
    console.log(req.body);

    var newComposition = new Composition();
 
    var recipeArray = [];
    req.body.ingredients.forEach(function(ingredient){
      recipeArray.push({'quantity':ingredient.quantity, 'units':ingredient.units, 'ingredient':ingredient._id});
   });

    newComposition.name = req.body.name;
    newComposition.recipe = recipeArray;
    newComposition.instruction = req.body.instruction;
    console.log(newComposition);
    newComposition.save(function(err, savedComposition){
      if(err){
        console.log(err);
      }
      else
      {
        console.log("successfully saved");
        res.send(savedComposition);
      }
    });
});
// https://www.digitalocean.com/community/tutorials/how-to-use-node-js-request-and-cheerio-to-set-up-simple-web-scraping

// This route searches for recipes with specific ingredients
// Will return a list of recipes
// route example: http://localhost:3000/api/composition/ingredients/Cheese/Pizza Sauce/Pizza Dough
router.get(/^\/ingredients\/(.*)/, function(req, res, next) {
  // our params regex will capture something like "/Cheese/Pizza Sauce/Pizza Dough", so split it
  var needle = req.params[0].split('/');
  // uncomment for testing purposes
  console.log("requested params:");
  console.log(needle);
  // let's make a collection of the IDs we'll need to search for
  // so search our ingredient schema for our list of ingredients

});

router.delete('/:composition_id', function(req, res){
  console.log(req);
  if(req.params.composition_id > 0)
  {
    Composition.remove({
      _id : req.params.composition_id
    }, function(err, composition){
      if(err)
        res.send(err);

      Composition.find(function(err,compositions){
        if(err)
          res.send(err)
        console.log(compositions);
        res.json(compositions);
      });
    });
  }
});

router.get('/', function(req,res) {
  Composition.find(function(err, compositions) {
    if (err)
      res.send(err);

    res.json(compositions);
  });
});

module.exports = router;