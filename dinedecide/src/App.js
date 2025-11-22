// App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Heart,
  Clock,
  Users,
  ArrowLeft,
  Sliders,
  Home as HomeIcon,
  Star,
} from 'lucide-react';

const dietOptions = ['Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Ketogenic', 'Paleo'];
const cuisineOptions = ['Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'French', 'Greek'];
const mealTypeOptions = ['Breakfast', 'Lunch', 'Dinner'];

const DineDecideApp = () => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [previousScreen, setPreviousScreen] = useState('home'); // remember where we came from

  // Filters / data
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]); // array of label strings
  const [selectedFilter, setSelectedFilter] = useState(null); // 'cuisine' | 'ingredients' | 'surprise' | null
  const [filterValue, setFilterValue] = useState(''); // cuisine name
  const [mealTypes, setMealTypes] = useState([]); // e.g. ['Breakfast', 'Dinner']

  const [homeSearchQuery, setHomeSearchQuery] = useState(''); // include ingredients
  const [excludeIngredients, setExcludeIngredients] = useState(''); // exclude ingredients

  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [randomRecipe, setRandomRecipe] = useState(null);

  const [ratings, setRatings] = useState({});
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Dataset loaded from output.json
  const [dataset, setDataset] = useState([]);
  const [datasetById, setDatasetById] = useState({});
  const [allIngredients, setAllIngredients] = useState([]); // master ingredient list for autocomplete

  // --------- Helper functions for filters ---------- //

  const normalizeIngredientsList = (csv) =>
    (csv || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const strIncludes = (hay = '', needle = '') =>
    hay.toLowerCase().includes(needle.toLowerCase());

  const recipeIngredientsText = (recipe) =>
    (recipe.extendedIngredients || [])
      .map((ing) => (ing.original || ing.name || '').toLowerCase())
      .join(' ');

  // Improved meal type matching (Breakfast/Lunch/Dinner)
  const matchesMealType = (recipe, mealTypesArr) => {
    if (!mealTypesArr || mealTypesArr.length === 0) return true;
    const want = mealTypesArr[0]; // only one selected in UI
    const types = (recipe.dishTypes || []).map((d) => d.toLowerCase());

    if (want === 'Breakfast') {
      const breakfastTypes = ['breakfast', 'brunch', 'morning meal'];
      return types.some((t) => breakfastTypes.includes(t));
    }
    if (want === 'Lunch') {
      const lunchTypes = ['lunch', 'main course', 'main dish'];
      return types.some((t) => lunchTypes.includes(t));
    }
    if (want === 'Dinner') {
      const dinnerTypes = ['dinner', 'main course', 'main dish'];
      return types.some((t) => dinnerTypes.includes(t));
    }
    return true;
  };

  const matchesCuisine = (recipe, cuisineLabel) => {
    if (!cuisineLabel) return true;
    const list = (recipe.cuisines || []).map((c) => c.toLowerCase());
    return list.includes(cuisineLabel.toLowerCase());
  };

  const matchesDiet = (recipe, dietLabel) => {
    if (!dietLabel) return true;
    // recipe.diets is array of diet strings
    return (recipe.diets || [])
      .map((d) => d.toLowerCase())
      .includes(dietLabel.toLowerCase());
  };

  const matchesAllIncluded = (recipe, includeCsv) => {
    const terms = normalizeIngredientsList(includeCsv);
    if (!terms.length) return true;
    const text = recipeIngredientsText(recipe);
    return terms.every((t) => text.includes(t));
  };

  const matchesNoneExcluded = (recipe, excludeCsv) => {
    const terms = normalizeIngredientsList(excludeCsv);
    if (!terms.length) return true;
    const text = recipeIngredientsText(recipe);
    return !terms.some((t) => text.includes(t));
  };

  const baseFilter = (recipe, opts) => {
    const {
      dislikedIds,
      mealTypesArr,
      cuisineLabel,
      dietLabel,
      includeCsv,
      excludeCsv,
    } = opts;

    if (dislikedIds.has(recipe.id)) return false;
    if (!matchesMealType(recipe, mealTypesArr)) return false;
    if (!matchesCuisine(recipe, cuisineLabel)) return false;
    if (!matchesDiet(recipe, dietLabel)) return false;
    if (!matchesAllIncluded(recipe, includeCsv)) return false;
    if (!matchesNoneExcluded(recipe, excludeCsv)) return false;
    return true;
  };

  // --------- Load localStorage + dataset ---------- //

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    const savedDisliked = localStorage.getItem('disliked');
    const savedRecent = localStorage.getItem('recent');
    const savedRatings = localStorage.getItem('ratings');

    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedDisliked) setDisliked(JSON.parse(savedDisliked));
    if (savedRecent) setRecentRecipes(JSON.parse(savedRecent));
    if (savedRatings) setRatings(JSON.parse(savedRatings));

    // Fake loading screen 2 sec then go home
    setTimeout(() => setCurrentScreen('home'), 2000);
  }, []);

  // load dataset from /output.json once
  useEffect(() => {
    const loadDataset = async () => {
      try {
        const res = await fetch('/output.json');
        const data = await res.json(); // array of full recipe objects
        setDataset(data);

        const byId = {};
        const ingSet = new Set();

        data.forEach((r) => {
          byId[String(r.id)] = r;

          (r.extendedIngredients || []).forEach((ing) => {
            const name = (ing.name || ing.original || '')
              .toLowerCase()
              .trim();
            if (name) ingSet.add(name);
          });
        });

        setDatasetById(byId);
        setAllIngredients(Array.from(ingSet).sort());
      } catch (e) {
        console.error('Failed to load dataset:', e);
      }
    };
    loadDataset();
  }, []);

  // When we land on Home: reset filters + pick random recipe
  useEffect(() => {
    if (currentScreen === 'home' && dataset.length > 0) {
      resetFilters();
      if (!randomRecipe) {
        fetchRandomRecipe();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, dataset]);

  // --------- Core actions (JSON-only) ---------- //

  const resetFilters = () => {
    setDietaryRestrictions([]);
    setSelectedFilter(null);
    setFilterValue('');
    setMealTypes([]);
    setHomeSearchQuery('');
    setExcludeIngredients('');
  };

  const fetchRecipes = async (options = {}) => {
    if (!dataset.length) return;

    const {
      includeIngredientsOverride,
      excludeIngredientsOverride,
      mealTypesOverride,   // NEW
      cuisineOverride,     // NEW
      dietOverride,        // NEW
    } = options;

    const includeValue =
      includeIngredientsOverride !== undefined
        ? includeIngredientsOverride
        : homeSearchQuery;

    const excludeValue =
      excludeIngredientsOverride !== undefined
        ? excludeIngredientsOverride
        : excludeIngredients;

    const dislikedIds = new Set(disliked);

    // Use overrides if provided, otherwise fall back to state
    const mealTypesArr =
      mealTypesOverride !== undefined ? mealTypesOverride : mealTypes;

    const dietLabel =
      dietOverride !== undefined
        ? dietOverride
        : (dietaryRestrictions.length > 0 ? dietaryRestrictions[0] : '');

    const cuisineLabel =
      cuisineOverride !== undefined
        ? cuisineOverride
        : (selectedFilter === 'cuisine' ? filterValue : '');

    let list = dataset.filter((r) =>
      baseFilter(r, {
        dislikedIds,
        mealTypesArr,
        cuisineLabel,
        dietLabel,
        includeCsv: includeValue,
        excludeCsv: excludeValue,
      })
    );

    // Surprise mode: ignore filters, just randomize (still exclude disliked)
    if (selectedFilter === 'surprise') {
      list = [...dataset].filter((r) => !dislikedIds.has(r.id));
      list.sort(() => Math.random() - 0.5);
    }

    setRecipes(list.slice(0, 12));
    setCurrentScreen('searchResults');
  };

  const searchByQuery = (query) => {
    if (!dataset.length) return;
    const trimmed = (query || '').trim();
    if (!trimmed) return;

    const dislikedIds = new Set(disliked);
    const dietLabel =
      dietaryRestrictions.length > 0 ? dietaryRestrictions[0] : '';
    const cuisineLabel =
      selectedFilter === 'cuisine' ? filterValue : '';

    // search by title or ingredients text
    let list = dataset.filter((r) => {
      const titleHit = strIncludes(r.title || '', trimmed);
      const ingHit = strIncludes(recipeIngredientsText(r), trimmed);
      if (!titleHit && !ingHit) return false;

      return baseFilter(r, {
        dislikedIds,
        mealTypesArr: mealTypes,
        cuisineLabel,
        dietLabel,
        includeCsv: homeSearchQuery,   // extra include filters from modal
        excludeCsv: excludeIngredients,
      });
    });

    setRecipes(list.slice(0, 12));
    setCurrentScreen('searchResults');
  };

  const fetchRecipeDetails = async (recipeId) => {
    const idStr = String(recipeId);
    const data = datasetById[idStr] || dataset.find((r) => String(r.id) === idStr);
    if (!data) {
      console.warn('Recipe not found in dataset:', recipeId);
      return;
    }

    // remember where we came from for Back button
    setPreviousScreen(currentScreen);

    setSelectedRecipe(data);

    // Add to recent (max 12)
    const updatedRecent = [data, ...recentRecipes.filter((r) => r.id !== data.id)].slice(
      0,
      12
    );
    setRecentRecipes(updatedRecent);
    localStorage.setItem('recent', JSON.stringify(updatedRecent));

    setCurrentScreen('detail');
  };

  const fetchRandomRecipe = () => {
    if (!dataset.length) return;
    const dislikedIds = new Set(disliked);
    const pool = dataset.filter((r) => !dislikedIds.has(r.id));
    if (!pool.length) return;
    const r = pool[Math.floor(Math.random() * pool.length)];
    setRandomRecipe(r);
  };

  // --------- Favorites / rating ---------- //

  const toggleFavorite = (recipe) => {
    const exists = favorites.some((fav) => fav.id === recipe.id);
    let updatedFavorites;
    if (exists) {
      updatedFavorites = favorites.filter((fav) => fav.id !== recipe.id);
    } else {
      updatedFavorites = [recipe, ...favorites.filter((fav) => fav.id !== recipe.id)];
    }
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
  };

  const rateRecipe = (recipeId, rating) => {
    const key = String(recipeId); // ensure per-recipe key
    const updatedRatings = {
      ...ratings,
      [key]: rating,
    };
    setRatings(updatedRatings);
    localStorage.setItem('ratings', JSON.stringify(updatedRatings));
  };

  // --------- Small presentational components ---------- //

  // Main search bar with autocomplete
  const SearchBar = ({ placeholder = 'What Would you Like to Eat', onSearch, onOpenFilters }) => {
    const [searchText, setSearchText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const inputRef = useRef(null);

    const updateSuggestions = (value) => {
      const v = value.trim().toLowerCase();
      if (!v) {
        setSuggestions([]);
        return;
      }

      const titleMatches = dataset
        .filter((r) => r.title && r.title.toLowerCase().includes(v))
        .map((r) => r.title);

      const ingredientMatches = allIngredients.filter((ing) => ing.includes(v));

      const combined = Array.from(new Set([...titleMatches, ...ingredientMatches])).slice(
        0,
        8
      );

      setSuggestions(combined);
    };

    const handleChange = (e) => {
      const value = e.target.value;
      setSearchText(value);
      updateSuggestions(value);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!searchText.trim()) return;
        onSearch?.(searchText.trim());
        setSuggestions([]);
      }
    };

    const handleSuggestionClick = (suggestion) => {
      setSearchText(suggestion);
      setSuggestions([]);
      onSearch?.(suggestion);
    };

    return (
      <div className="p-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            ref={inputRef}
            value={searchText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-16 py-3 rounded-lg bg-gray-200 text-black border-0"
          />
          <button
            type="button"
            onClick={onOpenFilters}
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
          >
            <Sliders className="w-5 h-5" style={{ color: '#171F3A' }} />
          </button>

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2">
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
        style={{
          color:
            currentScreen === 'home' || currentScreen === 'searchResults'
              ? '#00a7b0ff'
              : '#000000ff',
        }}
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

  // Filter modal with ingredient autocomplete
  const FilterModal = ({ onClose }) => {
    const excludeRef = useRef(null);

    const [localCuisine, setLocalCuisine] = useState(filterValue);
    const [localMealTypes, setLocalMealTypes] = useState(mealTypes);
    const [localDiets, setLocalDiets] = useState(dietaryRestrictions);

    const [localInclude, setLocalInclude] = useState(homeSearchQuery);
    const [localSuggestions, setLocalSuggestions] = useState([]);

    const toggleLocalMealType = (opt) => {
      setLocalMealTypes((prev) =>
        prev.includes(opt) ? prev.filter((x) => x !== opt) : [opt]
      );
    };

    const toggleLocalDiet = (opt) => {
      setLocalDiets((prev) =>
        prev.includes(opt) ? prev.filter((x) => x !== opt) : [opt]
      );
    };

    const handleIncludeChange = (e) => {
      const value = e.target.value;
      setLocalInclude(value);

      if (!value.trim()) {
        setLocalSuggestions([]);
        return;
      }

      const parts = value.split(',');
      const lastPart = parts[parts.length - 1].trim().toLowerCase();

      if (!lastPart) {
        setLocalSuggestions([]);
        return;
      }

      const matches = allIngredients
        .filter((ing) => ing.startsWith(lastPart))
        .slice(0, 8);

      setLocalSuggestions(matches);
    };

    const handleSuggestionClick = (suggestion) => {
      const parts = localInclude.split(',');
      parts[parts.length - 1] = ` ${suggestion}`;
      const newVal = parts.join(',').replace(/^ /, '');
      setLocalInclude(newVal);
      setLocalSuggestions([]);
    };

    const handleApply = () => {
      const includeVal = localInclude;
      const excludeVal = excludeRef.current ? excludeRef.current.value : '';

      setHomeSearchQuery(includeVal);
      setExcludeIngredients(excludeVal);
      setFilterValue(localCuisine);
      setMealTypes(localMealTypes);
      setDietaryRestrictions(localDiets);

      // decide filter mode
      if (includeVal.trim()) {
        setSelectedFilter('ingredients');
      } else if (localCuisine) {
        setSelectedFilter('cuisine');
      } else {
        setSelectedFilter('surprise');
      }

      fetchRecipes({
        includeIngredientsOverride: includeVal,
        excludeIngredientsOverride: excludeVal,
        mealTypesOverride: localMealTypes,
        cuisineOverride: localCuisine,
        dietOverride: localDiets[0] || '',
      });

      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-11/12 max-w-md max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#171F3A' }}>
            Filters
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Cuisine</label>
            <select
              value={localCuisine}
              onChange={(e) => setLocalCuisine(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
            >
              <option value="">Any</option>
              {cuisineOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Meal type</label>
            <div className="flex gap-2 flex-wrap">
              {mealTypeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLocalMealType(opt)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    localMealTypes.includes(opt)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Dietary restrictions</label>
            <div className="flex gap-2 flex-wrap">
              {dietOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLocalDiet(opt)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    localDiets.includes(opt)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Ingredients you want (comma separated)
            </label>
            <div className="relative">
              <textarea
                value={localInclude}
                onChange={handleIncludeChange}
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-sm"
                rows={2}
                placeholder="e.g. chicken, tomato, onion"
              />

              {localSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                  {localSuggestions.map((ing) => (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => handleSuggestionClick(ing)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      {ing}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1">
              Ingredients you don&apos;t want (comma separated)
            </label>
            <textarea
              ref={excludeRef}
              defaultValue={excludeIngredients}
              className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-sm"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --------- Screens ---------- //

  // Logo loading screen
  const LoadingScreen = () => (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
    >
      <div className="text-center">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
          style={{ backgroundColor: '#00A7B0' }}
        >
          <span className="text-white text-4xl font-bold">DD</span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>
          DineDecide
        </h1>
      </div>
    </div>
  );

  const HomePage = () => (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
    >
      <SearchBar
        placeholder="What Would you Like to Eat"
        onSearch={searchByQuery}
        onOpenFilters={() => setShowFilterModal(true)}
      />

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

        <div className="mt-4">
          <button
            onClick={() => {
              setSelectedFilter('surprise');
              fetchRecipes({});
            }}
            className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90"
            style={{ backgroundColor: '#00A7B0' }}
          >
            Surprise Me
          </button>
        </div>
      </div>

      {/* Recommended / Surprise card */}
      <div className="px-6">
        <h2 className="text-xl font-bold mb-3" style={{ color: '#171F3A' }}>
          Recommended for you
        </h2>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {randomRecipe ? (
            <>
              <img
                src={randomRecipe.image}
                alt={randomRecipe.title}
                className="h-40 w-full object-cover bg-gray-300"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#171F3A' }}>
                  {randomRecipe.title}
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  Ready in {randomRecipe.readyInMinutes} minutes • Serves{' '}
                  {randomRecipe.servings}
                </p>
                <button
                  onClick={() => fetchRecipeDetails(randomRecipe.id)}
                  className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                  style={{ backgroundColor: '#00A7B0' }}
                >
                  View Recipe
                </button>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center bg-gray-200">
              <p className="text-center text-sm">
                Photo of
                <br />
                recommended
                <br />
                recipe
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  const SearchResultsPage = () => (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
    >
      <SearchBar
        placeholder="What Would you Like to Eat"
        onSearch={searchByQuery}
        onOpenFilters={() => setShowFilterModal(true)}
      />

      <div className="px-6 pb-4">
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>
          Search Result
        </h1>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => fetchRecipeDetails(recipe.id)}
              className="bg-cyan-200 rounded-lg overflow-hidden text-left"
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                className="h-32 w-full object-cover"
              />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </button>
          ))}
          {recipes.length === 0 && (
            <p className="text-sm text-gray-600 col-span-2">
              No recipes yet – try searching or adjusting your filters.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  const FavoritesPage = () => (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
    >
      <SearchBar
        placeholder="Search favorites"
        onSearch={searchByQuery}
        onOpenFilters={() => setShowFilterModal(true)}
      />

      <div className="px-6 pb-4 flex items-center gap-2">
        <button onClick={() => setCurrentScreen('home')}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>
          Favorites
        </h1>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {favorites.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => fetchRecipeDetails(recipe.id)}
              className="bg-cyan-200 rounded-lg overflow-hidden text-left"
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                className="h-32 w-full object-cover"
              />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </button>
          ))}
          {favorites.length === 0 && (
            <p className="text-sm text-gray-600 col-span-2">
              You haven&apos;t added any favorites yet.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  const RecentPage = () => (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
    >
      <SearchBar
        placeholder="Search recent"
        onSearch={searchByQuery}
        onOpenFilters={() => setShowFilterModal(true)}
      />

      <div className="px-6 pb-4 flex items-center gap-2">
        <button onClick={() => setCurrentScreen('home')}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold" style={{ color: '#171F3A' }}>
          Recent
        </h1>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-2 gap-4">
          {recentRecipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => fetchRecipeDetails(recipe.id)}
              className="bg-cyan-200 rounded-lg overflow-hidden text-left"
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                className="h-32 w-full object-cover"
              />
              <div className="p-3 bg-cyan-500">
                <p className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</p>
                <p className="text-xs">{recipe.readyInMinutes} min</p>
              </div>
            </button>
          ))}
          {recentRecipes.length === 0 && (
            <p className="text-sm text-gray-600 col-span-2">
              You haven&apos;t viewed any recipes yet.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
      {showFilterModal && <FilterModal onClose={() => setShowFilterModal(false)} />}
    </div>
  );

  const DetailPage = () => {
    const [hoveredStar, setHoveredStar] = useState(0); // must be before any return

    if (!selectedRecipe) return null;

    const ratingKey = String(selectedRecipe.id);
    const currentRating = ratings[ratingKey] || 0;

    const plainSummary = selectedRecipe.summary
      ? selectedRecipe.summary.replace(/<[^>]*>/g, '')
      : '';
    const summaryFirstSentence = plainSummary ? `${plainSummary.split('.')[0]}.` : '';

    const isFavorite = favorites.some((fav) => fav.id === selectedRecipe.id);

    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: '#F5FBFF', fontFamily: 'Josefin Sans, sans-serif' }}
      >
        <div className="flex items-center px-6 pt-4 pb-2 gap-3">
          {/* Back now returns to the screen we came from */}
          <button onClick={() => setCurrentScreen(previousScreen || 'home')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: '#171F3A' }}>
            Recipe
          </h1>
        </div>

        <div className="px-6 pb-10">
          <img
            src={selectedRecipe.image}
            alt={selectedRecipe.title}
            className="w-full h-64 object-cover rounded-lg mb-4 bg-gray-300"
          />

          <h2 className="text-2xl font-bold mb-4" style={{ color: '#171F3A' }}>
            {selectedRecipe.title}
          </h2>

          {/* Info */}
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Ready in {selectedRecipe.readyInMinutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Servings: {selectedRecipe.servings}</span>
            </div>
          </div>

          {/* Summary */}
          {summaryFirstSentence && (
            <p className="mb-4 text-sm text-gray-700">{summaryFirstSentence}</p>
          )}

          {/* Ingredients */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2" style={{ color: '#171F3A' }}>
              Ingredients
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {(selectedRecipe.extendedIngredients || []).map((ing, idx) => (
                <li key={idx}>{ing.original}</li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-2" style={{ color: '#171F3A' }}>
              Instructions
            </h3>
            {selectedRecipe.instructions ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedRecipe.instructions.replace(/<[^>]*>/g, '')}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No instructions provided.</p>
            )}
          </div>

          {/* Favorite + Rating at bottom and centered */}
          <div className="flex flex-col items-center gap-4">
            {/* Rating */}
            <div className="text-center">
              <p className="text-sm font-semibold mb-2">Rate this recipe:</p>
              <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => rateRecipe(selectedRecipe.id, star)}
                  >
                    <Star
                      className="w-6 h-6"
                      style={{
                        color:
                          star <= (hoveredStar || currentRating)
                            ? '#FFD600'
                            : '#D1D5DB',
                        fill:
                          star <= (hoveredStar || currentRating)
                            ? '#FFD600'
                            : 'none',
                      }}
                    />
                  </button>
                ))}
              </div>
              {currentRating > 0 && (
                <p className="text-xs mt-1 text-gray-600">
                  You rated this {currentRating} star
                  {currentRating !== 1 ? 's' : ''}.
                </p>
              )}
            </div>

            {/* Favorite button */}
            <button
              onClick={() => toggleFavorite(selectedRecipe)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold hover:opacity-90"
              style={{ backgroundColor: '#00A7B0', color: '#ffffff' }}
            >
              <Heart
                className="w-5 h-5"
                style={{
                  color: '#ffffff',
                  fill: isFavorite ? '#ffffff' : 'none',
                }}
              />
              <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  };

  // --------- Root render ---------- //

  return (
    <div>
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'home' && <HomePage />}
      {currentScreen === 'searchResults' && <SearchResultsPage />}
      {currentScreen === 'favorites' && <FavoritesPage />}
      {currentScreen === 'recent' && <RecentPage />}
      {currentScreen === 'detail' && <DetailPage />}
    </div>
  );
};

export default DineDecideApp;
