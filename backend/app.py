from flask import Flask, jsonify, request, session
from flask_cors import CORS
import json
import os
import math
import hashlib

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = "arise_shadow_monarch_2024"

DATA_FILE = "players_data.json"

def default_player(username):
    return {
        "username": username,
        "level": 1,
        "hp": 100,
        "max_hp": 100,
        "mp": 50,
        "max_mp": 50,
        "xp": 0,
        "xp_to_next": 100,
        "rank": "E",
        "title": "Shadow Monarch",
        "stat_points": 5,
        "stats": {
            "STR": 10, "AGI": 10, "INT": 10,
            "VIT": 10, "PER": 10, "LUK": 10
        },
        "quests": [
            {"id": 1, "name": "Daily Training",   "desc": "Complete 100 push-ups",    "xp": 30,  "done": False},
            {"id": 2, "name": "Shadow Hunt",       "desc": "Defeat 10 enemies",         "xp": 50,  "done": False},
            {"id": 3, "name": "Gate Clearance",    "desc": "Clear a dungeon gate",      "xp": 80,  "done": False},
            {"id": 4, "name": "Mana Meditation",   "desc": "Meditate for 30 minutes",   "xp": 40,  "done": False},
            {"id": 5, "name": "Shadow Extraction", "desc": "Extract 5 shadow soldiers", "xp": 100, "done": False},
        ],
        "skills": [
            {"id": 1, "name": "Ruler's Authority",     "icon": "👁️", "desc": "Control objects with your gaze",       "req": 1,  "type": "Passive",  "unlocked": True},
            {"id": 2, "name": "Shadow Extraction",     "icon": "🌑", "desc": "Extract shadows of fallen enemies",     "req": 5,  "type": "Active",   "unlocked": False},
            {"id": 3, "name": "Shadow Exchange",       "icon": "🔀", "desc": "Swap positions with a shadow soldier",  "req": 10, "type": "Active",   "unlocked": False},
            {"id": 4, "name": "Dominator's Touch",     "icon": "✋", "desc": "Grant power to allies",                 "req": 20, "type": "Passive",  "unlocked": False},
            {"id": 5, "name": "Shadow Monarch's Aura", "icon": "💀", "desc": "Intimidate all enemies nearby",         "req": 40, "type": "Aura",     "unlocked": False},
            {"id": 6, "name": "Arise",                 "icon": "⬆️", "desc": "Command the dead to rise as shadows",  "req": 60, "type": "Ultimate", "unlocked": False},
        ]
    }

def load_all():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"users": {}}

def save_all(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def xp_for_level(lvl):
    return math.floor(100 * (1.4 ** (lvl - 1)))

def rank_for_level(lvl):
    if lvl < 10:  return "E"
    if lvl < 20:  return "D"
    if lvl < 35:  return "C"
    if lvl < 50:  return "B"
    if lvl < 70:  return "A"
    if lvl < 90:  return "S"
    if lvl < 99:  return "National Level"
    return "Shadow Monarch"

def apply_xp(player, amount):
    player["xp"] += amount
    leveled = False
    while player["xp"] >= player["xp_to_next"]:
        player["xp"]         -= player["xp_to_next"]
        player["level"]      += 1
        player["xp_to_next"]  = xp_for_level(player["level"])
        player["stat_points"] += 5
        player["max_hp"]      = 100 + player["level"] * 12
        player["max_mp"]      = 50  + player["level"] * 8
        player["hp"]          = player["max_hp"]
        player["mp"]          = player["max_mp"]
        leveled = True
    player["rank"] = rank_for_level(player["level"])
    for skill in player["skills"]:
        if player["level"] >= skill["req"]:
            skill["unlocked"] = True
    return player, leveled

def get_current_player():
    username = session.get("username")
    if not username:
        return None, None, None
    all_data = load_all()
    user = all_data["users"].get(username)
    if not user:
        return None, None, None
    return username, all_data, user["player"]

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    all_data = load_all()
    if username in all_data["users"]:
        return jsonify({"error": "Username already taken!"}), 400
    all_data["users"][username] = {
        "password": hash_password(password),
        "player":   default_player(username)
    }
    save_all(all_data)
    session["username"] = username
    return jsonify({"message": f"Welcome to the System, {username}!", "player": all_data["users"][username]["player"]})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    all_data = load_all()
    user = all_data["users"].get(username)
    if not user or user["password"] != hash_password(password):
        return jsonify({"error": "Wrong username or password!"}), 401
    session["username"] = username
    return jsonify({"message": f"Welcome back, {username}!", "player": user["player"]})

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("username", None)
    return jsonify({"message": "Logged out successfully"})

@app.route("/player", methods=["GET"])
def get_player():
    username, all_data, player = get_current_player()
    if not player:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify(player)

@app.route("/gain-xp", methods=["POST"])
def gain_xp():
    username, all_data, player = get_current_player()
    if not player:
        return jsonify({"error": "Not logged in"}), 401
    amount = int(request.get_json().get("amount", 0))
    old_level = player["level"]
    player, leveled = apply_xp(player, amount)
    all_data["users"][username]["player"] = player
    save_all(all_data)
    return jsonify({"message": f"Gained {amount} XP", "leveled_up": leveled, "old_level": old_level, "new_level": player["level"], "player": player})

@app.route("/complete-quest/<int:quest_id>", methods=["POST"])
def complete_quest(quest_id):
    username, all_data, player = get_current_player()
    if not player:
        return jsonify({"error": "Not logged in"}), 401
    quest = next((q for q in player["quests"] if q["id"] == quest_id), None)
    if not quest:
        return jsonify({"error": "Quest not found"}), 404
    if quest["done"]:
        return jsonify({"error": "Quest already completed"}), 400
    quest["done"] = True
    player, leveled = apply_xp(player, quest["xp"])
    all_data["users"][username]["player"] = player
    save_all(all_data)
    return jsonify({"message": f'Quest "{quest["name"]}" complete! +{quest["xp"]} XP', "leveled_up": leveled, "xp_gained": quest["xp"], "player": player})

@app.route("/reset-quests", methods=["POST"])
def reset_quests():
    username, all_data, player = get_current_player()
    if not player:
        return jsonify({"error": "Not logged in"}), 401
    for quest in player["quests"]:
        quest["done"] = False
    all_data["users"][username]["player"] = player
    save_all(all_data)
    return jsonify({"message": "Daily quests reset!", "player": player})

@app.route("/allocate-stat", methods=["POST"])
def allocate_stat():
    username, all_data, player = get_current_player()
    if not player:
        return jsonify({"error": "Not logged in"}), 401
    stat = request.get_json().get("stat", "").upper()
    if stat not in ["STR", "AGI", "INT", "VIT", "PER", "LUK"]:
        return jsonify({"error": "Invalid stat"}), 400
    if player["stat_points"] <= 0:
        return jsonify({"error": "No stat points available"}), 400
    player["stat_points"] -= 1
    player["stats"][stat] += 1
    if stat == "VIT":
        player["max_hp"] += 5
        player["hp"] += 5
    if stat == "INT":
        player["max_mp"] += 3
        player["mp"] += 3
    all_data["users"][username]["player"] = player
    save_all(all_data)
    return jsonify({"message": f"{stat} increased to {player['stats'][stat]}!", "stat": stat, "new_value": player["stats"][stat], "player": player})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    print("🌑 Solo Leveling System — Backend Running")
    app.run(debug=False, host="0.0.0.0", port=port)