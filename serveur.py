from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime 

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# 🔐 FIX DE PERSISTANCE : Calcule le chemin absolu du dossier pour bloquer la disparition des données
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FICHIER_DONNEES = os.path.join(BASE_DIR, 'donnees.json')

def parse_duration(duration_str):
    """Convertit '10m45s' en nombre de minutes (10.75 min)"""
    try:
        if isinstance(duration_str, (int, float)):
            return float(duration_str)
        
        duration_str = str(duration_str).strip()
        total_minutes = 0
        
        # Extrait les minutes
        if 'm' in duration_str:
            parts = duration_str.split('m')
            minutes = int(parts[0])
            total_minutes += minutes
            # Extrait les secondes du reste
            if len(parts) > 1 and 's' in parts[1]:
                secs = int(parts[1].replace('s', ''))
                total_minutes += secs / 60.0
        elif 's' in duration_str:
            secs = int(duration_str.replace('s', ''))
            total_minutes = secs / 60.0
        else:
            total_minutes = float(duration_str)
        
        return round(total_minutes, 2)
    except:
        return 0

@app.route('/update', methods=['GET', 'POST'])
def update_data():
    if request.method == 'POST':
        data = request.get_json() or {}
        user = data.get('user', 'Inconnu')
        liters = data.get('liters', 0)
        duration = data.get('duration', 0)
    else:
        user = request.args.get('user', 'Inconnu')
        liters = request.args.get('liters', 0)
        duration = request.args.get('duration', 0)
    
    user_clean = user.strip().capitalize()
    
    nouvelle_douche = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "utilisateur": user_clean, 
        "litres": float(liters), 
        "duree": parse_duration(duration)
    }
    
    historique = []
    if os.path.exists(FICHIER_DONNEES):
        with open(FICHIER_DONNEES, 'r', encoding='utf-8') as f:
            try:
                historique = json.load(f)
                if isinstance(historique, dict): 
                    historique = [historique]
            except json.JSONDecodeError:
                pass
                
    historique.append(nouvelle_douche)
    
    with open(FICHIER_DONNEES, 'w', encoding='utf-8') as f:
        json.dump(historique, f, indent=4, ensure_ascii=False)
        
    print(f"📡 [ESP32] Douche enregistrée : {user_clean} ({liters} L)")
    return jsonify({"status": "success", "message": "Donnees sauvegardees !"}), 200

@app.route('/api/data', methods=['GET'])
def get_data():
    if os.path.exists(FICHIER_DONNEES):
        with open(FICHIER_DONNEES, 'r', encoding='utf-8') as f:
            try:
                return jsonify(json.load(f))
            except:
                return jsonify([])
    return jsonify([])

# 🧹 NOUVELLE ROUTE : Permet de vider complètement la base de données JSON
@app.route('/api/reset', methods=['GET', 'POST'])
def reset_data():
    with open(FICHIER_DONNEES, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=4)
    print("🧹 [ADMIN] L'historique complet des douches a été réinitialisé à zéro.")
    return jsonify({"status": "success", "message": "Historique nettoyé avec succès !"}), 200

@app.route('/')
def accueil():
    return app.send_static_file('accueil.html')

@app.route('/index')
def dashboard():
    return app.send_static_file('index.html')

@app.route('/ranking')
def ranking_page():
    return app.send_static_file('ranking.html')

@app.route('/test')
def page_test():
    return app.send_static_file('test.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)