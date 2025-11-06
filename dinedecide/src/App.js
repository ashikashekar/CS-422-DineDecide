import React, { useState, useEffect } from 'react';
import { Search, Heart, Clock, Users, ArrowLeft, Sliders, Home as HomeIcon, Star } from 'lucide-react';

const DineDecideApp = () => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterValue, setFilterValue] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [excludeIngredients, setExcludeIngredients] = useState('');
  const [randomRecipe, setRandomRecipe] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Load saved data
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    const savedDisliked = localStorage.getItem('disliked');
    const savedRecent = localStorage.getItem('recent');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedDisliked) setDisliked(JSON.parse(savedDisliked));
    if (savedRecent) setRecentRecipes(JSON.parse(savedRecent));
    
    setTimeout(() => setCurrentScreen('home'), 2000);
  }, []);

  // Fetch random recipe for home page
  useEffect(() => {
    if (currentScreen === 'home' && !randomRecipe) {
      fetchRandomRecipe();
    }
  }, [currentScreen]);

  const fetchRandomRecipe = async () => {
    try {
      const response = await fetch(
        `${SPOONACULAR_BASE}/random?apiKey=${SPOONACULAR_API_KEY}&number=1`
      );
      const data = await response.json();
      if (data.recipes && data.recipes.length > 0) {
        setRandomRecipe(data.recipes[0]);
      }
    } catch (error) {
      console.error('Error fetching random recipe:', error);
    }
  };

  // API Configuration
  const SPOONACULAR_API_KEY = '7b35824109da47ea815aef153b566dad';
  const SPOONACULAR_BASE = 'https://api.spoonacular.com/recipes';

  const dietOptions = ['Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Ketogenic', 'Paleo'];
  const cuisineOptions = ['Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'French', 'Greek'];
  const mealTypeOptions = ['Breakfast', 'Lunch', 'Dinner'];

  // Fetch recipes
  const fetchRecipes = async (specificMealType = null) => {
    try {
      let url = `${SPOONACULAR_BASE}/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=12&addRecipeInformation=true&fillIngredients=true`;

      // Add meal type if specified or from state
      const mealType = specificMealType || (selectedFilter === 'mealType' ? filterValue : null);
      if (mealType) {
        url += `&type=${mealType.toLowerCase()}`;
      }

      if (dietaryRestrictions.length > 0) {
        url += `&diet=${dietaryRestrictions[0].toLowerCase().replace(' ', '')}`;
      }

      if (selectedFilter === 'cuisine' && filterValue) {
        url += `&cuisine=${filterValue}`;
      } else if (selectedFilter === 'ingredients' && searchQuery) {
        url += `&includeIngredients=${searchQuery}`;
      } else if (selectedFilter === 'surprise') {
        url += `&sort=random`;
      }

      if (excludeIngredients) {
        url += `&excludeIngredients=${excludeIngredients}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      const filteredRecipes = data.results.filter(
        recipe => !disliked.includes(recipe.id)
      );
      
      setRecipes(filteredRecipes);
      setCurrentScreen('searchResults');
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  // Search by query
  const searchByQuery = async (query) => {
    if (!query.trim()) return;
    
    try {
      let url = `${SPOONACULAR_BASE}/complexSearch?apiKey=${SPOONACULAR_API_KEY}&number=12&addRecipeInformation=true&fillIngredients=true&query=${query}`;

      const response = await fetch(url);
      const data = await response.json();
      
      const filteredRecipes = data.results.filter(
        recipe => !disliked.includes(recipe.id)
      );
      
      setRecipes(filteredRecipes);
      setCurrentScreen('searchResults');
    } catch (error) {
      console.error('Error searching recipes:', error);
    }
  };

  // Fetch recipe details
  const fetchRecipeDetails = async (recipeId) => {
    try {
      const response = await fetch(
        `${SPOONACULAR_BASE}/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}`
      );
      const data = await response.json();
      setSelectedRecipe(data);
      
      // Add to recent
      const updatedRecent = [data, ...recentRecipes.filter(r => r.id !== data.id)].slice(0, 12);
      setRecentRecipes(updatedRecent);
      localStorage.setItem('recent', JSON.stringify(updatedRecent));
      
      setCurrentScreen('detail');
    } catch (error) {
      console.error('Error fetching recipe details:', error);
    }
  };

  // Toggle favorite
  const toggleFavorite = (recipe) => {
    let updatedFavorites;
    if (favorites.find(fav => fav.id === recipe.id)) {
      updatedFavorites = favorites.filter(fav => fav.id !== recipe.id);
    } else {
      updatedFavorites = [...favorites, recipe];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  // Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-sky-50 border-t border-gray-300 flex justify-around py-3">
      <button
        onClick={() => setCurrentScreen('recent')}
        className="flex flex-col items-center"
        style={{ color: currentScreen === 'recent' ? '#00a7b0ff' : '#000000ff' }}
      >
        <Clock className="w-6 h-6 mb-1" />
        <span className="text-xs">Recent</span>
      </button>
      <button
        onClick={() => setCurrentScreen('home')}
        className="flex flex-col items-center"
        style={{ color: currentScreen === 'home' || currentScreen === 'searchResults' ? '#00a7b0ff' : '#000000ff' }}
      >
        <HomeIcon className="w-6 h-6 mb-1" />
        <span className="text-xs">Home</span>
      </button>
      <button
        onClick={() => setCurrentScreen('favorites')}
        className="flex flex-col items-center"
        style={{ color: currentScreen === 'favorites' ? '#00a7b0ff' : '#000000ff' }}
      >
        <Heart className="w-6 h-6 mb-1" />
        <span className="text-xs">Favorites</span>
      </button>
    </div>
  );

  // Loading Screen
  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      <div className="text-center">
        <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse" style={{ backgroundColor: '#00A7B0' }}>
          <span className="text-white text-4xl font-bold">DD</span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>DineDecide</h1>
      </div>
    </div>
  );

  // Filter Modal Overlay
  const FilterModal = ({ type, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-gray-200 rounded-t-3xl w-full p-6 max-h-[70vh] overflow-y-auto" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#171F3A' }}>
          {type === 'dietary' && 'Filter By Dietary Restriction'}
          {type === 'cuisine' && 'Filter By Cuisine'}
          {type === 'ingredients' && 'Filter By Ingredients'}
          {type === 'all' && 'All Filters'}
        </h2>

        {(type === 'all' || type === 'dietary') && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3" style={{ color: '#171F3A' }}>Dietary Restrictions</h3>
            <div className="grid grid-cols-2 gap-3">
              {dietOptions.map(option => (
                <label key={option} className="flex items-center bg-white p-3 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dietaryRestrictions.includes(option)}
                    onChange={() => {
                      if (dietaryRestrictions.includes(option)) {
                        setDietaryRestrictions(dietaryRestrictions.filter(d => d !== option));
                      } else {
                        setDietaryRestrictions([...dietaryRestrictions, option]);
                      }
                    }}
                    className="w-5 h-5 mr-3"
                    style={{ accentColor: '#00A7B0' }}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(type === 'all' || type === 'cuisine') && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3" style={{ color: '#171F3A' }}>Cuisine</h3>
            <div className="grid grid-cols-2 gap-3">
              {cuisineOptions.map(cuisine => (
                <label key={cuisine} className="flex items-center bg-white p-3 rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="cuisine-filter"
                    checked={selectedFilter === 'cuisine' && filterValue === cuisine}
                    onChange={() => {
                      setSelectedFilter('cuisine');
                      setFilterValue(cuisine);
                    }}
                    className="w-5 h-5 mr-3"
                    style={{ accentColor: '#00A7B0' }}
                  />
                  <span className="text-sm">{cuisine}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(type === 'all' || type === 'ingredients') && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3" style={{ color: '#171F3A' }}>Ingredients</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-semibold mb-2">Ingredients You want:</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedFilter('ingredients');
                  }}
                  className="w-full p-3 rounded-lg bg-white border-0"
                />
              </div>
              <div>
                <label className="block text-base font-semibold mb-2">Ingredients You Don't Want:</label>
                <input
                  type="text"
                  value={excludeIngredients}
                  onChange={(e) => setExcludeIngredients(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white border-0"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            onClose();
            fetchRecipes();
          }}
          className="w-full text-white py-4 rounded-full text-lg font-bold hover:opacity-90"
          style={{ backgroundColor: '#00A7B0' }}
        >
          Search
        </button>
      </div>
    </div>
  );

  // Surprise Me / Home Page
  const SurpriseMePage = () => (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      {/* Search Bar */}
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="What Would you Like to Eat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchByQuery(searchQuery);
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
        </div>
      </div>

      {/* Title and Filter Icon */}
      <div className="px-6 pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>Surprise Me!</h1>
        <button onClick={() => setShowFilterModal('all')}>
          <Sliders className="w-6 h-6" style={{ color: '#171F3A' }} />
        </button>
      </div>

      {/* Recipe Cards Grid */}
      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-cyan-200 rounded-lg overflow-hidden">
              <div className="h-32 bg-cyan-300 flex items-center justify-center">
                <p className="text-center text-sm">Image of<br />food</p>
              </div>
              <div className="p-3 bg-cyan-300">
                <p className="font-bold text-sm mb-1">Recipe title</p>
                <p className="text-xs">Prep time</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal type={showFilterModal} onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  // Recent Page
  const RecentPage = () => (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="What Would you Like to Eat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchByQuery(searchQuery);
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
        </div>
      </div>

      <div className="px-6 pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>Recent</h1>
        <button onClick={() => setShowFilterModal('all')}>
          <Sliders className="w-6 h-6" style={{ color: '#171F3A' }} />
        </button>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {recentRecipes.length > 0 ? recentRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-gray-200 rounded-lg overflow-hidden cursor-pointer" onClick={() => fetchRecipeDetails(recipe.id)}>
              <img src={recipe.image} alt={recipe.title} className="h-32 w-full object-cover" />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </div>
          )) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg overflow-hidden">
                <div className="h-32 bg-gray-300 flex items-center justify-center">
                  <p className="text-center text-sm">Image of<br />food</p>
                </div>
                <div className="p-3 bg-gray-300">
                  <p className="font-bold text-sm mb-1">Recipe title</p>
                  <p className="text-xs">Prep time</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal type={showFilterModal} onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  // Favorites Page
  const FavoritesPage = () => (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="What Would you Like to Eat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchByQuery(searchQuery);
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
        </div>
      </div>

      <div className="px-6 pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>Favorites</h1>
        <button onClick={() => setShowFilterModal('all')}>
          <Sliders className="w-6 h-6" style={{ color: '#171F3A' }} />
        </button>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {favorites.length > 0 ? favorites.map((recipe) => (
            <div key={recipe.id} className="bg-gray-300 rounded-lg overflow-hidden cursor-pointer" onClick={() => fetchRecipeDetails(recipe.id)}>
              <img src={recipe.image} alt={recipe.title} className="h-32 w-full object-cover" />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </div>
          )) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg overflow-hidden">
                <div className="h-32 bg-gray-300 flex items-center justify-center">
                  <p className="text-center text-sm">Image of<br />food</p>
                </div>
                <div className="p-3 bg-gray-300">
                  <p className="font-bold text-sm mb-1">Recipe title</p>
                  <p className="text-xs">Prep time</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal type={showFilterModal} onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  // Home Page with Filters
  const HomePage = () => (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="What Would you Like to Eat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchByQuery(searchQuery);
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setCurrentScreen('recent')}
            className="text-white py-3 rounded-lg font-semibold hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Recent
          </button>
          <button
            onClick={() => setCurrentScreen('favorites')}
            className="text-white py-3 rounded-lg font-semibold hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Favorites
          </button>
        </div>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={() => {
            setSelectedFilter('surprise');
            fetchRecipes();
          }}
          className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90"
          style={{ backgroundColor: '#00A7B0' }}
        >
          Surprise Me!
        </button>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
          {randomRecipe ? (
            <div 
              className="w-full h-full cursor-pointer relative"
              onClick={() => fetchRecipeDetails(randomRecipe.id)}
            >
              <img
                src={randomRecipe.image}
                alt={randomRecipe.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-white font-semibold">{randomRecipe.title}</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <p className="text-center">Photo of<br />recommended<br />recipe</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#171F3A' }}>Filters:</h2>
        
        <div className="grid grid-cols-3 gap-3 mb-3">
          {mealTypeOptions.map(meal => (
            <button
              key={meal}
              onClick={() => {
                setSelectedFilter('mealType');
                setFilterValue(meal);
                fetchRecipes(meal);
              }}
              className="py-3 rounded-lg font-semibold text-sm text-white hover:opacity-90"
              style={{ backgroundColor: '#00A7B0' }}
            >
              {meal}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowFilterModal('dietary')}
            className="py-3 rounded-lg font-semibold text-xs leading-tight text-white hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Filter by Dietary Restrictions
          </button>
          <button
            onClick={() => setShowFilterModal('cuisine')}
            className="py-3 rounded-lg font-semibold text-xs text-white hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Filter by Cuisine
          </button>
          <button
            onClick={() => setShowFilterModal('ingredients')}
            className="py-3 rounded-lg font-semibold text-xs text-white hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Filter by Ingredient
          </button>
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal type={showFilterModal} onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  // Search Results Page
  const SearchResultsPage = () => (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="What Would you Like to Eat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchByQuery(searchQuery);
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
        </div>
      </div>

      <div className="px-6 pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>Search Result</h1>
        <button onClick={() => setShowFilterModal('all')}>
          <Sliders className="w-6 h-6" style={{ color: '#171F3A' }} />
        </button>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-gray-300 rounded-lg overflow-hidden cursor-pointer" onClick={() => fetchRecipeDetails(recipe.id)}>
              <img src={recipe.image} alt={recipe.title} className="h-32 w-full object-cover" />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal type={showFilterModal} onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  // Recipe Detail Page
  const DetailPage = () => {
    if (!selectedRecipe) return null;

    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}>
        <div className="bg-sky-50 p-4 flex justify-between items-center">
          <button onClick={() => setCurrentScreen('searchResults')}>
            <ArrowLeft className="w-6 h-6" style={{ color: '#171F3A' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#171F3A' }}>Details</h1>
          <button onClick={() => toggleFavorite(selectedRecipe)}>
            <Heart 
              className={`w-6 h-6 ${favorites.find(fav => fav.id === selectedRecipe.id) ? 'fill-current' : ''}`}
              style={{ color: '#171F3A' }}
            />
          </button>
        </div>

        <div className="p-6">
          <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-64 object-cover rounded-lg mb-4 bg-gray-300" />
          
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#171F3A' }}>{selectedRecipe.title}</h2>
          
          <div className="flex gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Prep time: {selectedRecipe.readyInMinutes} min</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5" />
              <span>Calories: {selectedRecipe.nutrition?.nutrients?.[0]?.amount || 'N/A'}</span>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🥕</span>
              <h3 className="font-bold text-lg" style={{ color: '#171F3A' }}>Ingredients</h3>
            </div>
            <ul className="space-y-2 bg-white rounded-lg p-4">
              {selectedRecipe.extendedIngredients?.map((ingredient, index) => (
                <li key={index} className="flex items-start text-sm">
                  <span className="mr-2" style={{ color: '#00A7B0' }}>•</span>
                  <span>{ingredient.original}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm mb-6">{selectedRecipe.summary?.replace(/<[^>]*>/g, '').split('.')[0]}.</p>

          <h3 className="text-xl font-bold mb-3" style={{ color: '#171F3A' }}>Instructions:</h3>
          
          {selectedRecipe.analyzedInstructions?.[0]?.steps ? (
            <ol className="space-y-3 mb-6">
              {selectedRecipe.analyzedInstructions[0].steps.map((step, i) => (
                <li key={i} className="flex">
                  <span className="font-bold mr-3" style={{ color: '#00A7B0' }}>{i + 1}.</span>
                  <span className="text-sm">{step.step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions }} className="mb-6 text-sm" />
          )}

          <p className="text-center text-lg font-bold mb-4">And.... Your Done, Enjoy!</p>

          <div className="text-center mb-4">
            <p className="text-lg font-bold mb-3">Rate Your Meal</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    className="w-8 h-8" 
                    style={{ 
                      color: (hoveredStar >= star || rating >= star) ? '#FFD700' : '#D3D3D3',
                      fill: (hoveredStar >= star || rating >= star) ? '#FFD700' : 'transparent'
                    }} 
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm mt-2" style={{ color: '#00A7B0' }}>
                You rated this recipe {rating} star{rating !== 1 ? 's' : ''}!
              </p>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    );
  };

  return (
    <div>
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'surpriseMe' && <SurpriseMePage />}
      {currentScreen === 'recent' && <RecentPage />}
      {currentScreen === 'favorites' && <FavoritesPage />}
      {currentScreen === 'home' && <HomePage />}
      {currentScreen === 'searchResults' && <SearchResultsPage />}
      {currentScreen === 'detail' && <DetailPage />}
    </div>
  );
};

export default DineDecideApp;