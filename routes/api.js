
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var http = require('http');


//require our models
require('../models/Composition');
require('../models/AbstractIngredient');
require('../models/PrimitiveIngredient');
require('../models/TmpRecipe');
require('../models/TmpIngredient');
require('../models/User');
require('../models/Review');
require('../models/Unit');

// define our objects
var Composition = mongoose.model('Composition');
var AbstractIngredient = mongoose.model('AbstractIngredient');
var PrimitiveIngredient = mongoose.model('PrimitiveIngredient');
var TmpRecipe = mongoose.model('TmpRecipe');
var TmpIngredient = mongoose.model('TmpIngredient');
var User = mongoose.model('User');
var Review = mongoose.model('Review');
var Unit = mongoose.model('Unit');

router.use(function(req, res, next) {
  console.log('API Request is happening.');
  next(); // make sure we go to the next routes and don't stop here
});
/**
 * Fetch ingredients that start with query
 * @param {post} [ingredient] The ingredient to search for, searches match beginning of name
 * @return {matches} All ingredients that matched our query
 */
router.post('/ingredients/', function(req, res, next){
  console.log(req.body.ingredient);
  var needle = req.body.ingredient;
  TmpIngredient.find({ name: { $regex: '(^| |\-|\/)'+needle+'.*', $options: 'i' }}).limit(10).exec(function(err, matches){
    res.json(matches);
  });
});
/**
 * Fetch recipe from the remote API and tunnel through this route
 * @param  {post}   recipeId  Yummly Recipe ID
 * @return {res.json} yummly object API (at the moment)
 */
router.post('/composition/', function(req, res, next){
  console.log(req.body);
  // TODO: distinguish between yummly fetch and mongodb fetch
  // test array of ingredients for now
  var recipeId = req.body.recipeId;

  // the yummly API key embedded URL
  // suffixed with start of ingredients syntax
  var url = 'http://api.yummly.com/v1/api/recipe/'+recipeId+'?_app_id=af791dca&_app_key=f28b1240c0ab4435b41d6505f0278cfd';

  // uhh, yeah. gotta get rid of those special characters
  url = encodeURI(url);

  // for testing
  console.log(url);

  // gets remote data
  http.get(url, function(remoteRes) {
    // testing
    console.log("Got response: " + remoteRes.statusCode);
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
          console.log(key);
          tmpRecipe[key] = recipe[key];
        }
      }
      console.log(tmpRecipe);
      tmpRecipe.save();

      // send our response
      res.json(tmpRecipe);
    });
  }).on('error', function(e) {
      console.log("Got error: " + e.message);
  });
});


/**
 * Fetch Ingredients from the remote API and tunnel through this route
 * @param  {post}   ingredients  list of ingredients to search for
 * @return {res.json} yummly object API (at the moment)
 */
router.post('/composition/withIngredients/', function(req, res, next){
  console.log(req.body)
  // test array of ingredients for now
  var ingredients = req.body.ingredients;

  // the yummly API key embedded URL
  // suffixed with start of ingredients syntax
  var url = 'http://api.yummly.com/v1/api/recipes?_app_id=af791dca&_app_key=f28b1240c0ab4435b41d6505f0278cfd&allowedIngredient[]='

  // combine url and ingredients
  url += ingredients.join('&allowedIngredient[]=');
    // uhh, yeah. gotta get rid of those special characters
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
            console.log(ingredient)
            var tmpIngredient = new TmpIngredient();
            tmpIngredient.name = ingredient;
            tmpIngredient.save();
        });
      })

      // send our response
      res.json(recipesResponse);
    });
  }).on('error', function(e) {
      console.log("Got error: " + e.message);
  });
});

/**
 * Adds a recipe to CompositionSchema -- tunnel through this route
 * @param  {recipeObject}
 * @return {res.json} yummly object API (at the moment)
 *
 * Should recieve a json recipe object formulated on the front end using a form
 */ //Currently two /composition/new/ ??
router.post('/composition/new/', function(req, res, next){
    console.log(req.body);
/*
    var newComposition = new Composition();
    var ingredientArray = [];
    req.body.ingredient.forEach(function(ingredient){
        console.log(ingredient);
    }
    composition.name = req.body.name;


    composition.recipe = req.body.ingredient;
    composition.user_id = req.body.user_id;

    /* MISSING CODE - NEEDS LOOPS TO POPULATE Children Arrays */
    //Search DB for ChildID, push onto ChildID array; via sub query//
    // *** //
    //Search DB for ParentID, push onto ParentID array; via sub query//
    // *** //
    //Save Composition//
    /*
    composition.save(function(err, composition){
      if (err)
        res.send(err);
      res.json(composition); //Return Json Object
    });
    */

});

// This route searches for recipes with specific abstract ingredients (can be expanded to composition and primitive)
// Will return a list of recipes
// route example: http://localhost:3000/api/composition/ingredients/Cheese/Pizza Sauce/Pizza Dough
router.get(/^\/composition\/ingredients\/(.*)/, function(req, res, next) {
  // our params regex will capture something like "/Cheese/Pizza Sauce/Pizza Dough", so split it
  var needle = req.params[0].split('/');
  // uncomment for testing purposes
  // console.log("requested params:");
  // console.log(needle);

  // let's make a collection of the IDs we'll need to search for
  // so search our ingredient schema for our list of ingredients
  var ingredientStream = AbstractIngredient.find({name: {$in: needle}}).stream();
  // keep our found ingredient IDs in this array
  var ingredientIds = [];
  ingredientStream.on('data', function (ingredient) {
    ingredientIds.push(ingredient.id)
    // uncomment for testing
    // console.log("Found this with name:" + ingredient.name);
    // console.log(ingredient);
  });

  // when the ingredient search is done, the close event is called
  ingredientStream.on('close', function () {
    // if one of our ingredients wasn't found, return a message
    // this causes a headers already sent error for some reason
    if(needle.length > ingredientIds.length)
    {
      res.json("Not all ingredients found in database!");
      return next();
    }

    // now let's make a collection of recipes that contain those IDs
    var compositionStream = Composition.find({'recipe.AbstractIngredient': {$all: ingredientIds}}).stream();
    // keep those recipes in this array
    var recipes = [];
    compositionStream.on('data', function(composition){
      // uncomment for testing
      // console.log("Pushing this recipe: ");
      // console.log(composition);

      // push this composition to our array
      recipes.push(composition);
    });
    // done searching
    compositionStream.on('close', function(){
      // output the recipes json
      res.json(recipes);
    });
  });
});

router.get('/compositions', function(req,res) {
  Composition.find(function(err, compositions) {
    if (err)
      res.send(err);

    res.json(compositions);
  });

});

router.get('/tmpIngredients', function(req,res) {
  TmpIngredient.find(function(err, tmpIngredients) {
    if (err)
      res.send(err);

    res.json(tmpIngredients);
  });

});

router.delete('/compositions/:composition_id', function(req, res){
  Composition.remove({
    _id : req.params.composition_id
  }, function(err, composition){
    if(err)
      res.send(err);

    Composition.find(function(err,compositions){
      if(err)
        res.send(err)
      res.json(compositions);
    });
  });
});


module.exports = router;
