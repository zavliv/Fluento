import asyncio
from collections.abc import Coroutine

_tasks: set[asyncio.Task] = set()


def run_in_background(coro: Coroutine) -> None:
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
