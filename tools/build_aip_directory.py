"""Construit data/aip-aerodromes.json à partir des fiches eAIP AD 2 / AD 3 du SIA (licence ouverte, source : SIA).
Usage : python3 tools/build_aip_directory.py <dossier_des_pages_html> <date_AIRAC>
À relancer à chaque cycle AIRAC (tous les 28 jours) après avoir retéléchargé les pages."""
import re, html, json, sys, os, glob

def text(fn):
    t = open(fn, encoding='utf-8', errors='ignore').read()
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
    t = re.sub(r'<(br|/tr|/p|/div|/td|/th)[^>]*>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    t = re.sub(r'[ \t\xa0]+', ' ', t)
    return re.sub(r'\n\s*\n+', '\n', t)

def section(t, icao, num):
    m = re.search(rf'{icao}\.AD [23]\.{num} ', t)
    if not m: return ''
    n = re.search(rf'{icao}\.AD [23]\.{num + 1} ', t[m.end():])
    return t[m.end(): m.end() + (n.start() if n else 6000)]

EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')
PHONE = re.compile(r'(?:\+33\s?|0)[1-9](?:[\s.]?\d{2}){4}')
def clean_phone(p): return re.sub(r'[\s.]', ' ', p).strip()

out = {}
for fn in sorted(glob.glob(os.path.join(sys.argv[1], 'FR-AD-[23].*-fr-FR.html'))):
    icao = re.search(r'FR-AD-[23]\.([A-Z0-9]{4})', fn).group(1)
    t = text(fn)
    s1 = section(t, icao, 1)
    name = ''
    m = re.search(rf'{icao}\s*[-–]\s*([^\n]+)', s1 or t)
    if m: name = m.group(1).strip()
    s2 = section(t, icao, 2)
    admin = ''
    m = re.search(r'AD administration\s*\n\s*([^\n]+)', s2)
    if m: admin = m.group(1).strip()
    emails = sorted(set(e.rstrip('.') for e in EMAIL.findall(s2)))
    phones = [clean_phone(p) for p in PHONE.findall(s2)][:3]
    web = (re.search(r'(https?://[^\s]+)', s2) or [None, ''])[1] if re.search(r'https?://', s2) else ''
    s17 = section(t, icao, 17)
    spaces = []
    for m in re.finditer(r'\n\s*(CTR|ATZ|CTA|TMA|RMZ|TMZ|SIV)\s*\n\s*([^\n]+)', '\n' + s17):
        spaces.append(f'{m.group(1)} {m.group(2).strip()}')
    cls = re.findall(r'\n\s*([A-G])\s*\n\s*[\dSF][^\n]*(?:AMSL|ASFC|SFC|FL)', s17)
    service = 'TWR' if re.search(r'\bTWR\b', s17 + section(t, icao, 18)) else ('AFIS' if 'AFIS' in (s17 + section(t, icao, 18)) else '')
    s18 = section(t, icao, 18)
    ats_phones = [clean_phone(p) for p in PHONE.findall(s17 + s18)][:3]
    military = bool(re.search(r'\bMIL\b|militaire|Base aérienne|BA \d|intradef', s2 + s1, re.I))
    # Mentions drones dans la fiche (règles locales)
    drone = []
    for m in re.finditer(r'(drone|aéronefs? (?:télépiloté|sans équipage|circulant sans)|télépilote|UAS\b)', t, re.I):
        sn = t[max(0, m.start() - 160): m.start() + 340].replace('\n', ' ')
        drone.append(re.sub(r'\s+', ' ', sn).strip())
        if len(drone) >= 2: break
    all_emails = sorted(set(e.rstrip('.') for e in EMAIL.findall(t)))
    # Destinataire le plus pertinent pour une demande drone
    BAD = re.compile(r'douane|finances|swissport|onet|aviapartner|alyzia|groundops|ground|assistance|marqueur|recovery|meteo|fuel|carbur|handling|fbo-|catering|pompier|airfrance|easyjet|transavia|volotea|ryanair|hop\.|dhl|fedex|ups\.|tourisme|amacaerospace|elyxan|dca-gops|lof\.eu|dsac', re.I)
    GOOD = re.compile(r'drone|uas|ctl|twr|\btour[.@]|sna-|cnoa|cmc|\.dv\.|bops|ops|operation|afis|piste|capitainerie', re.I)
    OFFTOPIC = re.compile(r'environnement|derogation|rnp|bruit|noise|temps-reel|qdse|encadrement|cep@|coordinat|marqueur|gaa-', re.I)
    drone_mail = [e for sn in drone for e in EMAIL.findall(sn)]
    # Terrain avec tour de contrôle : ne pas proposer l'adresse commerciale du gestionnaire (FBO, accueil)
    has_twr = bool(re.search(r'\bTWR\b', section(t, icao, 17) + section(t, icao, 18)))
    COMMERCIAL = re.compile(r'fbo|accueil|info@|contact@|commercial|reservation|business', re.I)
    ranked = [e for e in all_emails if re.search(r'drone|uas', e, re.I)] + drone_mail + sorted([e for e in all_emails if GOOD.search(e) and not BAD.search(e) and not COMMERCIAL.search(e) and not OFFTOPIC.search(e)], key=lambda e: 0 if 'aviation-civile' in e else 1 if 'intradef' in e else 2 if 'aeroport' in e else 3) + ([] if has_twr else [e for e in emails if not BAD.search(e)])
    best = next(iter(dict.fromkeys(ranked)), '')
    out[icao] = {k: v for k, v in dict(name=name, admin=admin, emails=emails, bestEmail=best, otherEmails=[e for e in all_emails if e not in emails and not BAD.search(e)][:4], phones=phones,
        web=web, airspaces=list(dict.fromkeys(spaces))[:3], airspaceClass=cls[0] if cls else '', service=service, atsPhones=ats_phones, military=military,
        heliport=os.path.basename(fn).startswith('FR-AD-3'), drone=drone).items() if v not in ('', [], None)}

json.dump({'airac': sys.argv[2], 'source': 'SIA – eAIP France (licence ouverte)', 'aerodromes': out}, open('data/aip-aerodromes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
n = len(out); e = sum(1 for v in out.values() if v.get('emails') or v.get('otherEmails')); c = sum(1 for v in out.values() if v.get('airspaces'))
print(f'{n} terrains, {e} avec e-mail, {c} avec espace ATS, {sum(1 for v in out.values() if v.get("drone"))} avec mention drone')

# ---------------------------------------------------------------------------
# Contours des espaces ATS (CTR, ATZ, RMZ, TMZ) depuis AD 2.17 → data/aip-ctr.geojson
import math
COORD = r"(\d{2})°(\d{2})'(\d{2}(?:\.\d+)?)\"\s*([NS])\s*,?\s*(\d{3})°(\d{2})'(\d{2}(?:\.\d+)?)\"\s*([EW])"
def dms(c):
    la = int(c[0]) + int(c[1]) / 60 + float(c[2]) / 3600; lo = int(c[4]) + int(c[5]) / 60 + float(c[6]) / 3600
    return (-lo if c[7] == 'W' else lo, -la if c[3] == 'S' else la)
def dest(center, r_nm, brg):
    lo, la = center; r = r_nm * 1852 / 6371000
    return (lo + math.degrees(r * math.sin(brg) / math.cos(math.radians(la))), la + math.degrees(r * math.cos(brg)))
def bearing(c, p):
    return math.atan2((p[0] - c[0]) * math.cos(math.radians(c[1])), p[1] - c[1])
def arc(c, r, p, q, cw):
    a1, a2 = bearing(c, p), bearing(c, q)
    if cw:
        while a2 <= a1: a2 += 2 * math.pi
    else:
        while a2 >= a1: a2 -= 2 * math.pi
    n = max(4, int(abs(a2 - a1) / math.radians(4)))
    return [dest(c, r, a1 + (a2 - a1) * i / n) for i in range(1, n)]
TOKEN = re.compile(rf"(?P<pt>{COORD})|(?P<arc>arc (?P<anti>anti-)?horaire de (?P<r>[\d.]+) NM de rayon centré sur\s*(?P<c>{COORD}))|(?P<circle>cercle de (?P<cr>[\d.]+) NM de rayon centré sur\s*(?P<cc>{COORD}))")
def geom(desc):
    pts, pending = [], None
    for m in TOKEN.finditer(desc):
        if m.group('circle'):
            c = dms(re.match(COORD, m.group('cc')).groups()); r = float(m.group('cr'))
            return [dest(c, r, math.radians(a)) for a in range(0, 360, 5)]
        if m.group('arc'):
            pending = (dms(re.match(COORD, m.group('c')).groups()), float(m.group('r')), not m.group('anti')); continue
        p = dms(re.match(COORD, m.group('pt')).groups())
        if pending and pts: pts += arc(pending[0], pending[1], pts[-1], p, pending[2])
        pending = None; pts.append(p)
    return pts if len(pts) >= 3 else None

features = []
for fn in sorted(glob.glob(os.path.join(sys.argv[1], 'FR-AD-2.*-fr-FR.html'))):
    icao = re.search(r'FR-AD-2\.([A-Z0-9]{4})', fn).group(1)
    t = text(fn); s17 = re.sub(r'\s*\n\s*', ' ', section(t, icao, 17))
    heads = list(re.finditer(r'\b(CTR|ATZ|RMZ|TMZ)\s+([A-Z][A-Z0-9 \'\-]+?(?:\s+partie\s+[\d.]+)?)\s+(?=\d{2}°|cercle)', s17))
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(s17)
        body = s17[h.end():end]
        lim = re.search(r'\s([A-G])\s+(\S+(?:\s?(?:ft|FT))?\s*(?:AMSL|ASFC|SFC)?|FL\s?\d+)\s*-{3,}\s*(\S+(?:\s?(?:ft|FT))?\s*(?:AMSL|ASFC)?|SFC)', body)
        g = geom(body[: lim.start()] if lim else body)
        if not g: continue
        ring = [[round(x, 5), round(y, 5)] for x, y in g]; ring.append(ring[0])
        features.append({'type': 'Feature', 'properties': {'icao': icao, 'type': h.group(1), 'name': f'{h.group(1)} {h.group(2).strip()}',
            'cls': lim.group(1) if lim else '', 'upper': lim.group(2).strip() if lim else '', 'lower': lim.group(3).strip() if lim else '',
            'military': icao in out and out[icao].get('military', False)}, 'geometry': {'type': 'Polygon', 'coordinates': [ring]}})
json.dump({'type': 'FeatureCollection', 'airac': sys.argv[2], 'source': 'SIA – eAIP France AD 2.17 (licence ouverte)', 'features': features},
          open('data/aip-ctr.geojson', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(features)} espaces ATS ({sum(1 for f in features if f["properties"]["type"] == "CTR")} CTR) → data/aip-ctr.geojson')
