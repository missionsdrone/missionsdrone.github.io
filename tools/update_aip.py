#!/usr/bin/env python3
"""Mise à jour automatique des données AIP (contacts des terrains + contours CTR/ATZ).

- Calcule le cycle AIRAC en vigueur (tous les 28 jours).
- Si data/ est déjà à jour : ne fait rien (peut donc tourner tous les jours).
- Sinon : télécharge les fiches eAIP AD 2 / AD 3 du SIA (une requête à la fois, avec pause),
  reconstruit les fichiers dans un dossier temporaire, contrôle leur cohérence,
  puis remplace data/ seulement si tout est correct (jamais de fichiers cassés en ligne).

Usage : python3 tools/update_aip.py [--force] [--quiet]
Code retour : 0 = à jour ou mis à jour, 1 = erreur (les anciennes données sont conservées).
"""
import datetime as dt, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
REF = dt.date(2026, 10, 29)            # un cycle AIRAC connu
UA = 'MissionsDrone-AIP-updater/1.0'
MIN_AERODROMES, MIN_CTR = 100, 70      # garde-fous de cohérence
QUIET = '--quiet' in sys.argv

def log(*a):
    if not QUIET: print(*a, flush=True)

def airac(today=None):
    today = today or dt.date.today()
    return REF + dt.timedelta(days=28 * ((today - REF).days // 28))

def folder(d):
    return f"eAIP_{d.day:02d}_{['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.month - 1]}_{d.year}"

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))

def current_data_cycle():
    try: return json.load(open(os.path.join(DATA, 'aip-aerodromes.json'), encoding='utf-8')).get('airac')
    except Exception: return None

def main():
    cyc = airac()
    have = current_data_cycle()
    if have == cyc.isoformat() and '--force' not in sys.argv:
        log(f'Données AIP déjà à jour (cycle du {cyc}).'); return 0
    base = f'https://www.sia.aviation-civile.gouv.fr/media/dvd/{folder(cyc)}/FRANCE/AIRAC-{cyc.isoformat()}/html/eAIP'
    log(f'Nouveau cycle AIRAC du {cyc} (données actuelles : {have}). Téléchargement…')
    try:
        menu = get(f'{base}/FR-menu-fr-FR.html').decode('utf-8', 'ignore')
    except Exception as e:
        log(f'eAIP du {cyc} pas encore publiée ({e}). Nouvel essai au prochain passage.'); return 0
    pages = sorted(set(re.findall(r'FR-AD-[23]\.[A-Z0-9]{4}-fr-FR\.html', menu)))
    if len(pages) < MIN_AERODROMES:
        log(f'Liste des terrains anormale ({len(pages)}), abandon.'); return 1
    tmp = tempfile.mkdtemp(prefix='aip-')
    try:
        pages_dir = os.path.join(tmp, 'pages'); os.makedirs(pages_dir)
        for i, p in enumerate(pages, 1):
            open(os.path.join(pages_dir, p), 'wb').write(get(f'{base}/{p}'))
            if i % 25 == 0: log(f'  {i}/{len(pages)} fiches')
            time.sleep(0.4)  # politesse envers le serveur du SIA
        # Construction dans un dossier de travail isolé
        work = os.path.join(tmp, 'work'); os.makedirs(os.path.join(work, 'data'))
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_aip_directory.py'), pages_dir, cyc.isoformat()], cwd=work, capture_output=True, text=True)
        log(r.stdout.strip())
        if r.returncode != 0: log(r.stderr); return 1
        ad = json.load(open(os.path.join(work, 'data', 'aip-aerodromes.json'), encoding='utf-8'))
        ctr = json.load(open(os.path.join(work, 'data', 'aip-ctr.geojson'), encoding='utf-8'))
        n_ad, n_ctr = len(ad['aerodromes']), sum(1 for f in ctr['features'] if f['properties']['type'] == 'CTR')
        if n_ad < MIN_AERODROMES or n_ctr < MIN_CTR:
            log(f'Résultat incohérent ({n_ad} terrains, {n_ctr} CTR) : anciennes données conservées.'); return 1
        os.makedirs(DATA, exist_ok=True)
        for f in ('aip-aerodromes.json', 'aip-ctr.geojson'):
            shutil.copyfile(os.path.join(work, 'data', f), os.path.join(DATA, f + '.new'))
            os.replace(os.path.join(DATA, f + '.new'), os.path.join(DATA, f))  # remplacement atomique
        log(f'✔ Données AIP mises à jour : cycle du {cyc}, {n_ad} terrains, {n_ctr} CTR.')
        return 0
    except Exception as e:
        log(f'Erreur : {e}. Anciennes données conservées.'); return 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    sys.exit(main())
