"""Rejoue le parcours de paiement contre un serveur LOCAL (voir lancer.sh).

Webhooks Whop signes comme les vrais, reclamation au retour du site,
creation du mot de passe, resiliation, fin d'abonnement, montee en gamme.
Chaque scenario finit par OK ou ECHEC. Ne touche jamais la production.
"""
import base64, hashlib, hmac, json, subprocess, sys, time, urllib.request, uuid

API = "http://localhost:8099"
SECRET = b"whsec_local"
echecs = []


def req(method, path, body=None, token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def webhook(typ, data):
    body = json.dumps({"type": typ, "data": data}).encode()
    wid, ts = "msg_" + uuid.uuid4().hex, str(int(time.time()))
    sig = base64.b64encode(hmac.new(SECRET, (wid + "." + ts + ".").encode() + body, hashlib.sha256).digest()).decode()
    r = urllib.request.Request(API + "/webhooks/whop", data=body, method="POST", headers={
        "Content-Type": "application/json", "webhook-id": wid,
        "webhook-timestamp": ts, "webhook-signature": "v1," + sig})
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def sql(q):
    return subprocess.run(["psql", "-h", "/tmp", "-p", "5433", "-U", "postgres", "-d", "grandimi", "-tAc", q],
                          capture_output=True, text=True).stdout.strip()


def compte(email):
    # Le questionnaire cree le compte a l'adresse saisie.
    req("POST", "/api/v1/checkout", {"email": email, "plan": "m1"})
    return sql(f"select id from users where email='{email}'")


def payer(whop_user, whop_email, mem, pay, plan="plan_M1", activation=True):
    fin = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 30 * 86400))
    s = webhook("payment.succeeded", {"id": pay, "user": {"id": whop_user, "email": whop_email},
                                      "plan": {"id": plan}, "status": "paid"})
    if activation:
        s = max(s, webhook("membership.activated", {"id": mem, "user": {"id": whop_user, "email": whop_email},
                                                    "plan": {"id": plan}, "renewal_period_end": fin, "metadata": {}}))
    return s


def activer(whop_user, whop_email, mem, plan="plan_M1"):
    fin = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 30 * 86400))
    return webhook("membership.activated", {"id": mem, "user": {"id": whop_user, "email": whop_email},
                                            "plan": {"id": plan}, "renewal_period_end": fin, "metadata": {}})


def reclamer(pay, user_id):
    return req("POST", "/api/v1/checkout/reclamer", {"payment_id": pay, "user_id": user_id})[1].get("status")


def mot_de_passe(email):
    return req("POST", "/api/v1/auth/signup", {"email": email, "password": "motdepasse123"})[1].get("token")


def premium(token):
    return req("GET", "/api/v1/check-premium", token=token)[1].get("is_premium")


def abonnement(token):
    return req("GET", "/api/v1/subscription", token=token)[1]


def verifier(nom, condition, detail=""):
    print(("OK     " if condition else "ECHEC  ") + nom + (f"  ({detail})" if detail and not condition else ""))
    if not condition:
        echecs.append(nom)


n = sys.argv[1] if len(sys.argv) > 1 else str(int(time.time()))

# 1. Premier achat, meme adresse partout, puis resiliation.
a = compte(f"a{n}@t.fr")
verifier("1. webhooks acceptes", payer(f"wa{n}", f"a{n}@t.fr", f"ma{n}", f"pa{n}") == 200)
reclamer(f"pa{n}", a)
t = mot_de_passe(f"a{n}@t.fr")
verifier("1. acces ouvert apres creation du compte", premium(t) is True)
webhook("membership.cancel_at_period_end_changed", {"id": f"ma{n}", "cancel_at_period_end": True})
verifier("1. resiliation : acces garde jusqu'a la fin de la periode payee", premium(t) is True)
verifier("1. resiliation : « Mon compte » l'affiche", abonnement(t).get("cancel_at_period_end") is True)

# 2. Adresse Whop differente de celle du questionnaire.
b = compte(f"b{n}@t.fr")
payer(f"wb{n}", f"wb{n}@whop.fr", f"mb{n}", f"pb{n}")
reclamer(f"pb{n}", b)
tb = mot_de_passe(f"b{n}@t.fr")
verifier("2. e-mail Whop different : acces ouvert", premium(tb) is True)
verifier("2. e-mail Whop different : abonnement visible", abonnement(tb).get("has_subscription") is True)

# 3. Second achat avec le MEME compte Whop (second enfant, rachat, testeur).
c = compte(f"c{n}@t.fr")
verifier("3. 2e achat meme compte Whop : webhook accepte", payer(f"wb{n}", f"wb{n}@whop.fr", f"mc{n}", f"pc{n}") == 200)
reclamer(f"pc{n}", c)
tc = mot_de_passe(f"c{n}@t.fr")
verifier("3. 2e achat : nouveau compte ouvert", premium(tc) is True)
verifier("3. 2e achat : son abonnement est le sien", sql(f"select user_id from subscriptions where whop_subscription_id='mc{n}'") == c)
verifier("3. 2e achat : le 1er compte garde son acces paye", premium(tb) is True)

# 4. Fin d'abonnement quand l'e-mail Whop est different.
webhook("membership.deactivated", {"id": f"mb{n}", "user": {"id": f"wb{n}", "email": f"wb{n}@whop.fr"}, "metadata": {}})
verifier("4. fin d'abonnement : acces retire au bon compte", premium(tb) is False)
verifier("4. fin d'abonnement : l'autre abonnement du meme payeur reste actif", premium(tc) is True)

# 5. Montee en gamme 1 mois -> 3 mois, e-mail Whop different.
d = compte(f"d{n}@t.fr")
payer(f"wd{n}", f"wd{n}@whop.fr", f"md1{n}", f"pd1{n}")
reclamer(f"pd1{n}", d)
td = mot_de_passe(f"d{n}@t.fr")
verifier("5. montee en gamme : webhook 3 mois accepte", payer(f"wd{n}", f"wd{n}@whop.fr", f"md3{n}", f"pd3{n}", "plan_M3") == 200)
reclamer(f"pd3{n}", d)
verifier("5. montee en gamme : 3 mois rattache au compte", sql(f"select user_id from subscriptions where whop_subscription_id='md3{n}'") == d)
webhook("membership.deactivated", {"id": f"md1{n}", "user": {"id": f"wd{n}", "email": f"wd{n}@whop.fr"}, "metadata": {}})
verifier("5. montee en gamme : arret du 1 mois sans couper l'acces", premium(td) is True)

# 6. Retour sur le site AVANT le webhook d'activation.
e = compte(f"e{n}@t.fr")
payer(f"we{n}", f"we{n}@whop.fr", f"me{n}", f"pe{n}", activation=False)
reclamer(f"pe{n}", e)
activer(f"we{n}", f"we{n}@whop.fr", f"me{n}")
te = mot_de_passe(f"e{n}@t.fr")
verifier("6. activation tardive : abonnement sur le bon compte", sql(f"select user_id from subscriptions where whop_subscription_id='me{n}'") == e)

# 7. Aucun compte fantome (adresse Whop) ne garde un acces gratuit.
fantomes = sql(f"select count(*) from users where email like 'w%{n}@whop.fr' and is_premium")
verifier("7. aucun compte fantome premium", fantomes == "0", fantomes)

print("\n" + ("TOUT EST OK" if not echecs else f"{len(echecs)} ECHEC(S)"))
sys.exit(1 if echecs else 0)
