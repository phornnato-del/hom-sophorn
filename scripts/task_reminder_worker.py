"""Poll the app's authenticated reminder endpoint from an always-on Python host."""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


LOGGER = logging.getLogger("task_reminder_worker")
LOCAL_ENV_KEYS = ("TASK_REMINDER_API_URL", "CRON_SECRET")


def load_local_environment() -> None:
    local_env = Path(__file__).resolve().parents[1] / ".env.local"
    if not local_env.is_file():
        return

    for line in local_env.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if not separator or key not in LOCAL_ENV_KEYS or os.environ.get(key):
            continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ[key] = value


def configuration() -> tuple[str, str, int]:
    load_local_environment()
    endpoint = os.environ.get("TASK_REMINDER_API_URL", "").strip()
    secret = os.environ.get("CRON_SECRET", "").strip()
    if not endpoint or not secret:
        raise RuntimeError("Set TASK_REMINDER_API_URL and CRON_SECRET.")

    parsed_endpoint = urlparse(endpoint)
    if parsed_endpoint.scheme not in {"http", "https"} or not parsed_endpoint.netloc:
        raise RuntimeError("TASK_REMINDER_API_URL must be an absolute HTTP or HTTPS URL.")

    try:
        interval = int(os.environ.get("TASK_REMINDER_POLL_SECONDS", "60"))
    except ValueError as error:
        raise RuntimeError("TASK_REMINDER_POLL_SECONDS must be a whole number.") from error
    if interval < 10:
        raise RuntimeError("TASK_REMINDER_POLL_SECONDS must be at least 10.")

    return endpoint, secret, interval


def check_reminders(endpoint: str, secret: str) -> None:
    request = Request(
        endpoint,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {secret}",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"Reminder API returned HTTP {error.code}.") from error
    except (OSError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not read a valid reminder API response: {error}") from error

    if not isinstance(result, dict):
        raise RuntimeError("Reminder API returned an unexpected response.")
    if not all(isinstance(result.get(key), int) for key in ("checked", "due", "sent")):
        raise RuntimeError("Reminder API response is missing checked, due, or sent counts.")

    if result["sent"]:
        LOGGER.info(
            "Reminder check completed: checked=%d due=%d sent=%d",
            result["checked"],
            result["due"],
            result["sent"],
        )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    endpoint, secret, interval = configuration()
    LOGGER.info("Task reminder worker started; polling every %d seconds.", interval)

    while True:
        started_at = time.monotonic()
        try:
            check_reminders(endpoint, secret)
        except RuntimeError:
            LOGGER.exception("Task reminder check failed.")

        time.sleep(max(0, interval - (time.monotonic() - started_at)))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        LOGGER.info("Task reminder worker stopped.")
    except RuntimeError as error:
        LOGGER.error("%s", error)
        raise SystemExit(1) from error
