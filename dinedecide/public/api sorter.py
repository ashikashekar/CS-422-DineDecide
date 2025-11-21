import requests
import json

api_key = "7b35824109da47ea815aef153b566dad"
api_url = "https://api.spoonacular.com/recipes/complexSearch"
api_info = "https://api.spoonacular.com/recipes/{id}/information"
dataList = []

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"  # Or "X-API-Key": api_key, etc.
}

def getRecipe(userInput):
    number = input("Please enter number of recipes: ")
    offset = input("Please enter offset: ")
    if (userInput == "1"):
        userInput = input("Enter name ")
        url = f"{api_url}?apiKey={api_key}&query={userInput}&number={number}&offset={offset}"
    elif (userInput == "2"):
        userInput = input("Enter cuisine ")
        url = f"{api_url}?apiKey={api_key}&cuisine={userInput}&number={number}&offset={offset}"
    elif (userInput == "3"):
        userInput = input("Enter diet ")
        url = f"{api_url}?apiKey={api_key}&diet={userInput}&number={number}&offset={offset}"
    elif (userInput == "4"):
        userInput = input("Enter intolerance ")
        url = f"{api_url}?apiKey={api_key}&intolerances={userInput}&number={number}&offset={offset}"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("API call successful:", data)
        print(data['results'][0]['id'])
        for x in range(len(data['results'])):
            getRecipeInfo(data['results'][x]['id'])
    else:
        print(f"API call failed with status code: {response.status_code}")
        print("Error details:", response.text)

def getRecipeInfo(ID):
    url = f"https://api.spoonacular.com/recipes/{ID}/information?apiKey={api_key}"
    response = requests.get(url, headers=headers)
    data = response.json()
    # print("second API call successful:", data)
    dataList.append(data)

userInput = input(
    "choose search type:\n"
    "1 name\n"
    "2 cuisine (Indian, Mexican, etc.)\n"
    "3 diet (vegetarian, etc.)\n"
    "4 intolerances (gluten for gluten free, etc.)\n"
)
getRecipe(userInput)

file_path = "output.json"

# 1) Load existing recipes (if file exists)
try:
    with open(file_path, "r") as f:
        existing_data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    existing_data = []

# 2) Merge and dedupe by recipe ID
recipes_by_id = {}

for r in existing_data:
    if isinstance(r, dict) and "id" in r:
        recipes_by_id[r["id"]] = r  # keep old

for r in dataList:
    if isinstance(r, dict) and "id" in r:
        recipes_by_id[r["id"]] = r  # overwrite / add new

combined_list = list(recipes_by_id.values())

# 3) Save back to output.json
with open(file_path, "w") as json_file:
    json.dump(combined_list, json_file, indent=4)

print(f"Saved {len(combined_list)} total recipes into {file_path}")
