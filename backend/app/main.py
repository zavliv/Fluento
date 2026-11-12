import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import client
from app.routers import admin, admin_auth, admin_team, auth, chat, level_test, me, mistakes, public
from app.seed.setup import setup_database
from app.services.pending import answer_all_pending
from app.services.tasks import run_in_background

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await setup_database()
    run_in_background(answer_all_pending())
    yield
    await client.close()


app = FastAPI(title="Fluento API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    public.router,
    auth.router,
    mistakes.router,
    level_test.router,
    me.router,
    chat.router,
    admin_auth.router,
    admin_team.router,
    admin.router,
):
    app.include_router(router)
