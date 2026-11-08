#!/usr/bin/env python3
"""Sincroniza o Google Agenda "Family" (endereço secreto iCal) para um calendar.json estático.

A URL secreta vem SÓ da variável de ambiente CALENDAR_ICAL_URL e nunca é logada.
"""
import html
import json
import logging
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

TZ_NAME = "America/Sao_Paulo"
TZ = ZoneInfo(TZ_NAME)
WINDOW_PAST_DAYS = 7
WINDOW_FUTURE_DAYS = 120
DESC_MAX = 500

log = logging.getLogger("calendar-sync")


def clean_text(value, limit=None):
    """Texto simples: tira HTML, decodifica entidades, normaliza espaços."""
    text = str(value or "")
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).strip()
    if limit and len(text) > limit:
        text = text[:limit].rstrip()
    return text


def to_local(dt):
    if dt.tzinfo is None:  # horário "flutuante": assume o fuso do portal
        return dt.replace(tzinfo=TZ)
    return dt.astimezone(TZ)


def build_events(ics_bytes, today):
    cal = icalendar.Calendar.from_ical(ics_bytes)
    start = today - timedelta(days=WINDOW_PAST_DAYS)
    end = today + timedelta(days=WINDOW_FUTURE_DAYS)
    occurrences = recurring_ical_events.of(cal).between(start, end)

    events = []
    for ev in occurrences:
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        dtstart = ev.get("DTSTART").dt
        dtend = ev.get("DTEND").dt if ev.get("DTEND") is not None else None
        all_day = not isinstance(dtstart, datetime)
        if all_day:
            if dtend is None:
                dtend = dtstart + timedelta(days=1)
            s, e = dtstart.isoformat(), dtend.isoformat()
            sort_key = datetime(dtstart.year, dtstart.month, dtstart.day, tzinfo=TZ)
        else:
            ls = to_local(dtstart)
            le = to_local(dtend) if dtend is not None else ls
            s, e = ls.isoformat(), le.isoformat()
            sort_key = ls
        uid = str(ev.get("UID", ""))
        events.append((sort_key, {
            "id": f"{uid}@{s}",
            "title": clean_text(ev.get("SUMMARY")) or "(sem título)",
            "start": s,
            "end": e,
            "allDay": all_day,
            "location": clean_text(ev.get("LOCATION")),
            "description": clean_text(ev.get("DESCRIPTION"), DESC_MAX),
        }))
    events.sort(key=lambda x: (x[0], x[1]["title"]))
    return [e for _, e in events], start, end


def build_document(ics_bytes, now=None):
    now = (now or datetime.now(TZ)).astimezone(TZ)
    events, start, end = build_events(ics_bytes, now.date())
    return {
        "generatedAt": now.replace(microsecond=0).isoformat(),
        "timezone": TZ_NAME,
        "windowStart": start.isoformat(),
        "windowEnd": end.isoformat(),
        "events": events,
    }


def write_atomic(path, doc):
    """Grava via arquivo temporário + rename. Arquivo 644, pasta 755 (Web Server do QNAP lê)."""
    directory = os.path.dirname(os.path.abspath(path))
    os.makedirs(directory, mode=0o755, exist_ok=True)
    try:
        os.chmod(directory, 0o755)
    except OSError:
        log.warning("Não consegui ajustar a pasta de saída para 755.")
    fd, tmp = tempfile.mkstemp(prefix=".calendar-", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def previous_event_count(path):
    try:
        with open(path, encoding="utf-8") as f:
            return len(json.load(f).get("events", []))
    except (OSError, ValueError):
        return 0


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "grassiportal-calendar-sync"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def sync_once(url, output):
    """Um ciclo. Em qualquer falha mantém o JSON anterior e loga o erro SEM a URL."""
    try:
        data = fetch(url)
    except urllib.error.HTTPError as exc:  # str(exc) não traz a URL, mas só o código é logado
        log.error("Falha ao baixar o calendário: HTTP %s", exc.code)
        return False
    except Exception as exc:  # mensagens de rede podem conter a URL: loga só o tipo
        log.error("Falha ao baixar o calendário (%s).", type(exc).__name__)
        return False
    try:
        if b"BEGIN:VCALENDAR" not in data:
            raise ValueError("resposta não é um iCal")
        doc = build_document(data)
        if not doc["events"] and previous_event_count(output) > 0:
            raise ValueError("feed sem eventos; mantendo dados anteriores")
        write_atomic(output, doc)
    except Exception as exc:
        log.error("Falha ao processar/gravar o calendário (%s: %s).", type(exc).__name__, exc)
        return False
    log.info("calendar.json atualizado: %d eventos.", len(doc["events"]))
    return True


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    url = os.environ.get("CALENDAR_ICAL_URL", "").strip()
    if not url or "PASTE_SECRET" in url:
        log.error("CALENDAR_ICAL_URL não definida. Veja o README (calendar-sync.env).")
        return 1
    output = os.environ.get("OUTPUT_PATH", "/share/Web/data/calendar.json")
    interval = max(1, int(os.environ.get("INTERVAL_MINUTES", "15")))
    once = os.environ.get("RUN_ONCE") == "1"
    while True:
        ok = sync_once(url, output)
        if once:
            return 0 if ok else 1
        time.sleep(interval * 60)


if __name__ == "__main__":
    sys.exit(main())
