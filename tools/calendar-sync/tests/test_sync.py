import json
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import sync  # noqa: E402

FIXTURE = (Path(__file__).parent / "fixture.ics").read_bytes()
NOW = datetime(2026, 11, 8, 19, 30, tzinfo=sync.TZ)


class SyncTest(unittest.TestCase):
    def setUp(self):
        self.doc = sync.build_document(FIXTURE, NOW)
        self.events = self.doc["events"]

    def by_title(self, title):
        return [e for e in self.events if e["title"] == title]

    def test_header(self):
        self.assertEqual(self.doc["generatedAt"], "2026-11-08T19:30:00-03:00")
        self.assertEqual(self.doc["timezone"], "America/Sao_Paulo")
        self.assertEqual(self.doc["windowStart"], "2026-11-01")
        self.assertEqual(self.doc["windowEnd"], "2027-03-08")

    def test_haircut_offset_and_text(self):
        (e,) = self.by_title("Corte de cabelo do Nicolas")
        self.assertEqual(e["start"], "2026-12-19T14:30:00-03:00")
        self.assertEqual(e["end"], "2026-12-19T15:30:00-03:00")
        self.assertEqual(e["location"], "Torriton Kids")
        self.assertFalse(e["allDay"])
        self.assertEqual(e["description"], "Levar & buscar\nChegar cedo")

    def test_weekly_with_exdate_and_modified_instance(self):
        starts = [e["start"][:10] for e in self.by_title("Natação")]
        # 8 semanas a partir de 02/11, menos 16/11 (EXDATE) e 23/11 (remarcada)
        self.assertEqual(starts, ["2026-11-02", "2026-11-09", "2026-11-30",
                                  "2026-12-07", "2026-12-14", "2026-12-21"])
        (m,) = self.by_title("Natação (remarcada)")
        self.assertEqual(m["start"], "2026-11-23T11:30:00-03:00")

    def test_all_day(self):
        (e,) = self.by_title("Aniversário da vovó")
        self.assertTrue(e["allDay"])
        self.assertEqual((e["start"], e["end"]), ("2026-11-25", "2026-11-26"))

    def test_utc_converted(self):
        (e,) = self.by_title("Reunião (UTC)")
        self.assertEqual(e["start"], "2026-11-10T18:30:00-03:00")

    def test_cancelled_and_out_of_window_excluded(self):
        self.assertEqual(self.by_title("Evento cancelado"), [])
        self.assertEqual(self.by_title("Fora da janela"), [])

    def test_sorted_and_unique_ids(self):
        keys = [e["start"][:10] + (e["start"][10:] if not e["allDay"] else "T00:00:00-03:00")
                for e in self.events]
        self.assertEqual(keys, sorted(keys))
        ids = [e["id"] for e in self.events]
        self.assertEqual(len(ids), len(set(ids)))

    def test_atomic_write_permissions(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "data", "calendar.json")
            sync.write_atomic(out, self.doc)
            self.assertEqual(json.loads(Path(out).read_text(encoding="utf-8"))["timezone"], "America/Sao_Paulo")
            self.assertEqual(os.listdir(os.path.dirname(out)), ["calendar.json"])
            if os.name == "posix":
                self.assertEqual(stat.S_IMODE(os.stat(out).st_mode), 0o644)
                self.assertEqual(stat.S_IMODE(os.stat(os.path.dirname(out)).st_mode), 0o755)

    def test_failure_keeps_previous_and_hides_url(self):
        secret = "http://127.0.0.1:1/SEGREDO-ABC/basic.ics"  # porta fechada
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "calendar.json")
            sync.write_atomic(out, self.doc)
            before = Path(out).read_bytes()
            with self.assertLogs("calendar-sync", level="ERROR") as logs:
                self.assertFalse(sync.sync_once(secret, out))
            self.assertEqual(Path(out).read_bytes(), before)
            self.assertNotIn("SEGREDO", "\n".join(logs.output))

    def test_empty_feed_does_not_overwrite(self):
        empty = b"BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n"
        orig = sync.fetch
        sync.fetch = lambda url: empty
        try:
            with tempfile.TemporaryDirectory() as d:
                out = os.path.join(d, "calendar.json")
                sync.write_atomic(out, self.doc)
                before = Path(out).read_bytes()
                with self.assertLogs("calendar-sync", level="ERROR"):
                    self.assertFalse(sync.sync_once("http://x/y", out))
                self.assertEqual(Path(out).read_bytes(), before)
        finally:
            sync.fetch = orig


if __name__ == "__main__":
    unittest.main()
