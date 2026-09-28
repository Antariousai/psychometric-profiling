#!/usr/bin/env python3
"""Build prottoy-pack JSON from the PROTTOY Word volumes.

Reads the confidential item-bank volume and the restricted scoring key.
Option ids are HMAC-SHA256(salt, itemId:index). The original author salt is
not in the Word files, so the salt lives only in the gitignored keys file.
Re-runs reuse that salt so ids stay stable.

Does not emit golden vectors — those were produced by an unpublished generator.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

BANK_DOCX = Path("/home/kamrul-hasan/Downloads/PROTTOY_Item_Bank_v3_Volume_S1_CONFIDENTIAL.docx")
KEY_DOCX = Path("/home/kamrul-hasan/Downloads/PROTTOY_Scoring_Key_RESTRICTED.docx")
PACK = Path("/home/kamrul-hasan/Projects/Antarious/psymp/antarious-psychometric-profiling/prottoy-pack")

LETTERS = "কখগঘঙ"
FORMATS = {
    "Graded scale": "GR",
    "Situational judgement": "SJ",
    "Projective estimate": "PJ",
    "Now-or-later choice": "CH",
    "Forced-choice tetrad": "FC",
    "True/false": "TF",
}
ROLES = {
    "Attention check": "ATT",
    "Virtue claim": "VIR",
    "Candid admission": "ADM",
    "Forced-choice tetrad": "FC",
}
PAIR_TYPE = {
    "P1": "PP", "P2": "SO", "P3": "SE", "P4": "AB", "P5": "MR",
    "P6": "PP", "P7": "MR", "P8": "AB", "P9": "AB", "P10": "PP",
    "P11": "MR", "P12": "AB", "P13": "AB", "P14": "TD", "P15": "PP",
}
LATENCY = {"GR": 5.0, "SJ": 6.0, "PJ": 5.5, "CH": 6.0, "FC": 7.0, "TF": 3.5}
# q, kind, pair, side, construct, format, pairType — slot is Qnn
BLUEPRINT_SPEC = [
    (1, "pair", "P1", "a", "C1", "GR", "PP"),
    (2, "pair", "P4", "a", "C2", "GR", "AB"),
    (3, "pair", "P6", "a", "C5", "GR", "PP"),
    (4, "pair", "P8", "a", "C6", "GR", "AB"),
    (5, "pair", "P12", "a", "C4", "GR", "AB"),
    (6, "pair", "P14", "a", "C8", "CH", "TD"),
    (7, "pair", "P2", "a", "C1", "SJ", "SO"),
    (8, "pair", "P13", "a", "C3", "GR", "AB"),
    (9, "pair", "P9", "a", "C7", "GR", "AB"),
    (10, "validity", None, None, None, "TF", None),
    (11, "pair", "P3", "a", "C1", "SJ", "SE"),
    (12, "pair", "P10", "a", "C9", "SJ", "PP"),
    (13, "pair", "P15", "a", "C10", "SJ", "PP"),
    (14, "pair", "P11", "a", "C11", "SJ", "MR"),
    (15, "validity", None, None, None, "TF", None),
    (16, "fc", None, None, None, "FC", None),
    (17, "pair", "P5", "a", "C2", "SJ", "MR"),
    (18, "validity", None, None, None, "TF", None),
    (19, "pair", "P4", "b", "C2", "SJ", "AB"),
    (20, "pair", "P7", "a", "C5", "GR", "PP"),
    (21, "pair", "P1", "b", "C1", "SJ", "PP"),
    (22, "pair", "P2", "b", "C1", "PJ", "SO"),
    (23, "fc", None, None, None, "FC", None),
    (24, "pair", "P6", "b", "C5", "SJ", "PP"),
    (25, "validity", None, None, None, "TF", None),
    (26, "pair", "P8", "b", "C6", "SJ", "AB"),
    (27, "pair", "P9", "b", "C7", "GR", "AB"),
    (28, "pair", "P12", "b", "C4", "SJ", "AB"),
    (29, "fc", None, None, None, "FC", None),
    (30, "pair", "P14", "b", "C8", "CH", "TD"),
    (31, "pair", "P5", "b", "C2", "GR", "MR"),
    (32, "pair", "P13", "b", "C3", "SJ", "AB"),
    (33, "validity", None, None, None, "TF", None),
    (34, "pair", "P3", "b", "C1", "SJ", "SE"),
    (35, "pair", "P10", "b", "C9", "GR", "PP"),
    (36, "pair", "P15", "b", "C10", "GR", "PP"),
    (37, "pair", "P11", "b", "C11", "GR", "MR"),
    (38, "pair", "P7", "b", "C5", "GR", "MR"),
    (39, "validity", None, None, None, "TF", None),
    (40, "fc", None, None, None, "FC", None),
]
CONSTRUCTS = [
    ("C1", "সততা", "Integrity", "WI", "Honesty about money and other people when it would be easy to take advantage."),
    ("C2", "দায়বোধ", "Obligation & promise-keeping", "WI", "Keeping a promise to repay, including to family."),
    ("C3", "নিয়ন্ত্রণবোধ", "Locus of control", "WI+SRI", "Whether outcomes are treated as one's own responsibility."),
    ("C4", "সামাজিক দায়বদ্ধতা", "Social accountability", "WI", "Weight given to reputation in the group."),
    ("C5", "ফাঁকির যুক্তি (বিপরীত)", "Default rationalisation (reverse)", "WI", "Scored so higher means less excuse-making for stopping instalments."),
    ("C6", "আত্মসংযম", "Self-control", "SRI", "Not spending when it is not needed."),
    ("C7", "টাকা নিয়ে মনোভাব", "Money attitudes", "SRI", "How money is thought about day to day."),
    ("C8", "ধৈর্য", "Patience", "SRI", "Willingness to wait for a larger amount."),
    ("C9", "লোভ ও ঝুঁকির টান (বিপরীত)", "Lure & risk susceptibility (reverse)", "SRI", "Scored so higher means less pull toward a risky gain."),
    ("C10", "সহনশীলতা", "Resilience & coping", "SRI", "How a setback is handled."),
    ("C11", "ঋণ-মনোভাব", "Debt attitude", "WI+SRI", "Attitude toward borrowing and repayment."),
]
CATEGORIES = [
    ("JAG", "জাগরণ", "Jagoron", "Household income activities, group-based, mostly women."),
    ("AGR", "অগ্রসর", "Agrosor", "Microenterprise, individual."),
    ("SUF", "সুফলন", "Sufolon", "Agriculture and livestock, seasonal."),
    ("BUN", "বুনিয়াদ", "Buniad", "Ultra-poor, flexible."),
]
GLOBAL_PARAMS = {
    "vi": {"S1": 0.3, "S2": 0.2, "S3": 0.2, "S4": 0.2, "S5": 0.1, "S6": 0.15},
    "doubt": 0.35,
    "thr": {"s1": 0.2, "s1w": 0.3, "s3": 0.25, "s4": 0.15, "s5": 0.6, "s6": 0.10, "pd": 0.4},
    "lat": {"zmin": -1.2, "kappa": 0.35, "rhoMin": 0.55},
    "cap": 0.45,
}
CAT_HEADER = re.compile(
    r"\(([A-Z]{3})\): pi = ([0-9.]+); phi_o = ([0-9.]+); phi_f = ([0-9.]+); "
    r"pair-type weights PP ([0-9.]+), SO ([0-9.]+), SE ([0-9.]+), AB ([0-9.]+), MR ([0-9.]+), TD ([0-9.]+)"
)


def docx_paras(path: Path) -> list[str]:
    root = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    out = []
    for p in root.iter(f"{W_NS}p"):
        line = "".join((t.text or "") for t in p.iter(f"{W_NS}t")).strip()
        if line:
            out.append(line)
    return out


def is_meta(line: str) -> bool:
    if line in FORMATS or line in ROLES:
        return True
    if re.match(r"^C\d+\b", line):
        return True
    if re.match(r"^P\d+[ab] · ", line):
        return True
    return False


def is_option(line: str) -> bool:
    return bool(re.match(r"^[কখগঘঙ]\)", line))


def parse_option(line: str) -> tuple[str, str, str]:
    m = re.match(r"^([কখগঘঙ])\)\s*(.*)$", line)
    if not m:
        raise ValueError(f"bad option: {line[:80]}")
    letter, rest = m.group(1), m.group(2).strip()
    idx = rest.rfind("(")
    if idx == -1 or not rest.endswith(")"):
        raise ValueError(f"option missing English gloss: {line[:80]}")
    return letter, rest[:idx].strip(), rest[idx + 1 : -1].strip()


def words_bn(*parts: str) -> int:
    n = 0
    for text in parts:
        s = text
        for ch in "।?,.'‘’:;":
            s = s.replace(ch, " ")
        n += len([t for t in s.split() if t])
    return n


def item_seconds(fmt: str, word_n: int, n_opt: int) -> float:
    return round(1.5 + word_n / 1.9 + 0.8 * n_opt + LATENCY[fmt], 1)


def parse_bank(lines: list[str]) -> dict[str, dict]:
    items: dict[str, dict] = {}
    errors: list[str] = []
    ctx = None
    i = 0
    while i < len(lines):
        line = lines[i]
        mset = re.match(r"^Set (JAG|AGR|SUF|BUN)-(\d{2})$", line)
        mfu = re.match(r"^(JAG|AGR|SUF|BUN) follow-up bank \(52 items\)$", line)
        if mset:
            ctx = {"cat": mset.group(1), "set": int(mset.group(2)), "fu": False}
            i += 1
            continue
        if mfu:
            ctx = {"cat": mfu.group(1), "set": None, "fu": True}
            i += 1
            continue
        mid = re.match(r"^(Q\d\d|X\d\d)$", line)
        if not mid or ctx is None:
            i += 1
            continue
        slot = mid.group(1)
        j = i + 1
        meta = []
        while j < len(lines) and is_meta(lines[j]):
            meta.append(lines[j])
            j += 1
        if j + 1 >= len(lines):
            errors.append(f"{ctx['cat']} {slot}: truncated")
            break
        stem_bn, stem_en = lines[j], lines[j + 1]
        j += 2
        options = []
        while j < len(lines) and is_option(lines[j]):
            options.append(parse_option(lines[j]))
            j += 1
        try:
            item = build_item(ctx, slot, meta, stem_bn, stem_en, options)
        except ValueError as e:
            errors.append(str(e))
            i = j
            continue
        if item["id"] in items:
            errors.append(f"duplicate {item['id']}")
        items[item["id"]] = item
        i = j
    if errors:
        raise SystemExit("bank parse errors:\n" + "\n".join(errors[:30]))
    return items


def build_item(ctx, slot, meta, stem_bn, stem_en, options) -> dict:
    cat = ctx["cat"]
    construct = None
    role = "SCORED"
    fmt = None
    pair = None
    side = None
    for line in meta:
        cm = re.match(r"^(C\d+)\b", line)
        pm = re.match(r"^(P\d+)([ab]) · (.+)$", line)
        if cm:
            construct = cm.group(1)
        elif line in ROLES:
            role = ROLES[line]
        if pm:
            pair, side = pm.group(1), pm.group(2)
            fmt = FORMATS[pm.group(3).strip()]
        elif line in FORMATS:
            fmt = FORMATS[line]
    if role == "FC":
        construct = None
        fmt = "FC"
    if role in ("ATT", "VIR", "ADM"):
        construct = None
        fmt = "TF"
    if fmt is None:
        raise ValueError(f"{cat} {slot}: no format in {meta}")
    if ctx["fu"]:
        n = int(slot[1:])
        item_id = f"{cat}-X{n:02d}"
        q = None
        set_no = None
        extra = True
    else:
        q = int(slot[1:])
        item_id = f"{cat}-{ctx['set']:02d}-{slot}"
        set_no = ctx["set"]
        extra = False
        spec = BLUEPRINT_SPEC[q - 1]
        if spec[5] != fmt:
            raise ValueError(f"{item_id}: format {fmt} != blueprint {spec[5]}")
        if spec[2] and (pair != spec[2] or side != spec[3] or construct != spec[4]):
            raise ValueError(f"{item_id}: pair {pair}{side} {construct} != blueprint")
    if not options:
        raise ValueError(f"{item_id}: no options")
    letters = "".join(o[0] for o in options)
    expect = LETTERS[: len(options)]
    if letters != expect:
        raise ValueError(f"{item_id}: option letters {letters}")
    bn_bits = [stem_bn] + [o[1] for o in options]
    word_n = words_bn(*bn_bits)
    shuffle = fmt in ("SJ", "FC")
    return {
        "id": item_id,
        "category": cat,
        "set": set_no,
        "slot": slot if not extra else None,
        "q": q,
        "extra": extra,
        "construct": construct,
        "role": role,
        "format": fmt,
        "pair": pair,
        "side": side,
        "pairType": PAIR_TYPE.get(pair) if pair else None,
        "naturalOrder": not shuffle,
        "shuffle": shuffle,
        "stem": {"bn": stem_bn, "en": stem_en},
        "estSeconds": item_seconds(fmt, word_n, len(options)),
        "words": word_n,
        "options_raw": options,
        "followKind": role if extra and role != "SCORED" else ("twin" if extra else None),
    }


def parse_category_params(lines: list[str]) -> dict:
    params = {}
    for i, line in enumerate(lines):
        m = CAT_HEADER.search(line)
        if not m:
            continue
        cat = m.group(1)
        pi, phi_o, phi_f = map(float, m.group(2, 3, 4))
        omegas = dict(zip(("PP", "SO", "SE", "AB", "MR", "TD"), map(float, m.group(5, 6, 7, 8, 9, 10))))
        cons, lam_w, lam_s = {}, {}, {}
        j = i + 1
        while j < len(lines) and not lines[j].startswith("3.") and not lines[j].startswith("4."):
            cm = re.match(r"^(C\d+)\b", lines[j])
            if cm and j + 5 < len(lines):
                code = cm.group(1)
                alpha, beta, mu, lw, ls = lines[j + 1 : j + 6]
                cons[code] = {"alpha": float(alpha), "beta": float(beta), "mu": float(mu)}
                if lw != "-":
                    lam_w[code] = float(lw)
                if ls != "-":
                    lam_s[code] = float(ls)
                j += 6
            else:
                j += 1
        params[cat] = {
            "cons": cons,
            "lamW": lam_w,
            "lamS": lam_s,
            "pi": pi,
            "omega": omegas,
            "fc": {"other": phi_o, "filler": phi_f},
            **GLOBAL_PARAMS,
        }
    return params


def parse_keys(lines: list[str]) -> dict[str, dict]:
    keys = {}
    i = 0
    while i < len(lines):
        if not re.match(r"^(JAG|AGR|SUF|BUN)-", lines[i]):
            i += 1
            continue
        item_id, _label, kind, rule, weight = lines[i : i + 5]
        payload: dict = {"w": float(weight)}
        if kind in ("fwd", "rev", "opt"):
            marks = re.findall(r"([কখগঘঙ])\s+([0-9]+(?:\.[0-9]+)?)", rule)
            if not marks:
                raise SystemExit(f"{item_id}: no marks in key row")
            payload["dir"] = -1 if kind == "rev" else 1
            payload["marks_by_letter"] = {a: float(b) for a, b in marks}
        elif kind == "tetrad":
            found = re.findall(r"([কখগঘঙ])\s+(C\d+|filler)", rule)
            if len(found) < 4:
                raise SystemExit(f"{item_id}: bad tetrad key")
            keyed = [c for _a, c in found if c != "filler"]
            payload["fc_by_letter"] = {a: ("F" if c == "filler" else c) for a, c in found}
            payload["fcKeyedA"] = keyed[0]
            payload["fcKeyedB"] = keyed[1]
        elif kind == "validity":
            if "pass = affirm" in rule:
                payload["pass"] = "affirm"
            elif "pass = deny" in rule:
                payload["pass"] = "deny"
            elif "affirm = virtue" in rule:
                payload["flagIf"] = "affirm"
            elif "deny = impression" in rule:
                payload["flagIf"] = "deny"
            else:
                raise SystemExit(f"{item_id}: unknown validity rule")
        else:
            raise SystemExit(f"{item_id}: unknown key kind {kind}")
        keys[item_id] = payload
        i += 5
    return keys


def option_id(salt: bytes, item_id: str, index: int, role: str) -> str:
    if role in ("ATT", "VIR", "ADM"):
        return "affirm" if index == 0 else "deny"
    msg = f"{item_id}:{index}".encode()
    return "o_" + hmac.new(salt, msg, hashlib.sha256).hexdigest()[:10]


def load_salt(path: Path) -> bytes:
    if path.exists():
        prev = json.loads(path.read_text())
        hex_salt = prev.get("optionIdSaltHex")
        if hex_salt:
            return bytes.fromhex(hex_salt)
    return secrets.token_bytes(32)


def main() -> None:
    bank_items = parse_bank(docx_paras(BANK_DOCX))
    key_rows = parse_keys(docx_paras(KEY_DOCX))
    cat_params = parse_category_params(docx_paras(KEY_DOCX))
    if set(bank_items) != set(key_rows):
        missing_key = sorted(set(bank_items) - set(key_rows))[:8]
        missing_bank = sorted(set(key_rows) - set(bank_items))[:8]
        raise SystemExit(f"id mismatch key-missing {missing_key} bank-missing {missing_bank}")
    if len(bank_items) != 2608:
        raise SystemExit(f"expected 2608 items, got {len(bank_items)}")

    keys_path = PACK / "restricted" / "seed_keys_v0.3.json"
    keys_path.parent.mkdir(parents=True, exist_ok=True)
    salt = load_salt(keys_path)

    banks = {code: {"sets": [], "followUps": []} for code, *_ in CATEGORIES}
    key_items = {code: {} for code, *_ in CATEGORIES}
    seen_ids: set[str] = set()

    for item in bank_items.values():
        opts = []
        key = key_rows[item["id"]]
        marks = {}
        fc = {}
        for index, (letter, bn, en) in enumerate(item["options_raw"]):
            oid = option_id(salt, item["id"], index, item["role"])
            if oid in seen_ids and item["role"] not in ("ATT", "VIR", "ADM"):
                raise SystemExit(f"option id collision {oid}")
            seen_ids.add(oid)
            opts.append({"id": oid, "bn": bn, "en": en})
            if "marks_by_letter" in key:
                if letter not in key["marks_by_letter"]:
                    raise SystemExit(f"{item['id']}: key missing {letter}")
                marks[oid] = key["marks_by_letter"][letter]
            if "fc_by_letter" in key:
                fc[oid] = key["fc_by_letter"][letter]
        if "marks_by_letter" in key and set(key["marks_by_letter"]) != {o[0] for o in item["options_raw"]}:
            raise SystemExit(f"{item['id']}: mark letters != options")
        public = {k: v for k, v in item.items() if k not in ("options_raw", "followKind")}
        public["options"] = opts
        if item["extra"]:
            public["twinOf"] = None
            banks[item["category"]]["followUps"].append(public)
        else:
            banks[item["category"]].setdefault("_by_set", {}).setdefault(item["set"], []).append(public)

        payload = {"w": key["w"]}
        if marks:
            payload["marks"] = marks
            payload["dir"] = key["dir"]
            if public["naturalOrder"]:
                payload["firstOptionId"] = opts[0]["id"]
        if fc:
            payload["fc"] = fc
            payload["fcKeyedA"] = key["fcKeyedA"]
            payload["fcKeyedB"] = key["fcKeyedB"]
        if "pass" in key:
            payload["pass"] = key["pass"]
        if "flagIf" in key:
            payload["flagIf"] = key["flagIf"]
        key_items[item["category"]][item["id"]] = payload

    for code, _bn, _en, _d in CATEGORIES:
        sets = []
        for n in range(1, 16):
            rows = banks[code]["_by_set"][n]
            rows.sort(key=lambda r: r["q"])
            if [r["q"] for r in rows] != list(range(1, 41)):
                raise SystemExit(f"{code}-{n:02d} slots {[r['q'] for r in rows]}")
            sets.append({"setId": f"{code}-{n:02d}", "items": rows})
        fus = banks[code]["followUps"]
        fus.sort(key=lambda r: r["id"])
        if len(fus) != 52:
            raise SystemExit(f"{code} follow-ups {len(fus)}")
        banks[code] = {"sets": sets, "followUps": fus}
        lam_w = sum(cat_params[code]["lamW"].values())
        lam_s = sum(cat_params[code]["lamS"].values())
        if abs(lam_w - 1) > 0.02 or abs(lam_s - 1) > 0.02:
            raise SystemExit(f"{code} lambda sums WI {lam_w:.4f} SRI {lam_s:.4f}")
        seconds = [sum(it["estSeconds"] for it in s["items"]) for s in sets]
        print(f"{code}: sets {len(sets)} core-seconds {min(seconds):.0f}-{max(seconds):.0f} mean {sum(seconds)/len(seconds):.0f} followUps {len(fus)}")

    stems = []
    for block in banks.values():
        for s in block["sets"]:
            stems.extend(it["stem"]["bn"] for it in s["items"])
        stems.extend(it["stem"]["bn"] for it in block["followUps"])
    if len(stems) != len(set(stems)):
        print(f"warning: duplicate Bangla stems {len(stems) - len(set(stems))}", file=sys.stderr)

    bank_doc = {
        "version": "3.0.0",
        "provenance": "Parsed from PROTTOY Item Bank v3 Volume S1. Option ids are local HMACs, not the unpublished author salt.",
        "constructs": [{"c": c, "bn": bn, "en": en, "idx": idx, "def": d} for c, bn, en, idx, d in CONSTRUCTS],
        "categories": [{"code": c, "bn": bn, "en": en, "desc": d} for c, bn, en, d in CATEGORIES],
        "pairTypes": {
            "PP": "Principle-practice", "SO": "Self-other (projective)", "SE": "Stake escalation",
            "AB": "Attitude-behaviour", "MR": "Mirror (reverse-worded)", "TD": "Temporal (near vs far)",
        },
        "formats": {
            "GR": "Graded scale", "SJ": "Situational judgement", "PJ": "Projective estimate",
            "CH": "Now-or-later choice", "FC": "Forced-choice tetrad", "TF": "True/false",
        },
        "blueprint": [
            {
                "q": q, "slot": f"Q{q:02d}", "kind": kind,
                "pair": pair, "side": side, "construct": construct,
                "format": fmt, "pairType": pair_type,
            }
            for q, kind, pair, side, construct, fmt, pair_type in BLUEPRINT_SPEC
        ],
        "timingModel": {
            "leadSeconds": 1.5,
            "wordsPerSecond": 1.9,
            "pauseSecondsPerOption": 0.8,
            "latencySeconds": LATENCY,
            "fixed": {"consent": 45, "practice": 20, "transitions": 15},
        },
        "tfLabels": {
            "fact": [["ঠিক", "Right", "ভুল", "Wrong"], ["সত্যি", "True", "মিথ্যা", "False"]],
            "self": [
                ["হ্যাঁ", "Yes", "না", "No"],
                ["মেলে", "Fits me", "মেলে না", "Doesn't fit me"],
                ["এটা আমি", "That's me", "এটা আমি না", "That's not me"],
                ["আমার বেলায় ঠিক", "True of me", "আমার বেলায় ঠিক না", "Not true of me"],
            ],
        },
        "banks": banks,
    }
    data_path = PACK / "data" / "item_bank_v3.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(bank_doc, ensure_ascii=False, indent=2) + "\n")

    seed = {
        "keyVersion": "v0.3-seed",
        "provenance": "Parsed from PROTTOY Scoring Key seed v0.3. Option ids match item_bank_v3.json.",
        "optionIdScheme": "o_ + first 10 hex of HMAC-SHA256(salt, itemId:canonicalIndex)",
        "optionIdSaltHex": salt.hex(),
        "categories": {
            code: {"params": cat_params[code], "items": key_items[code]}
            for code, *_ in CATEGORIES
        },
    }
    keys_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {data_path} ({data_path.stat().st_size} bytes)")
    print(f"wrote {keys_path} ({keys_path.stat().st_size} bytes)")
    print(f"items {len(bank_items)} option-ids {len(seen_ids)}")


if __name__ == "__main__":
    main()
