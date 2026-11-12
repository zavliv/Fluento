import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import client
from app.routers import admin, auth, chat, me, public
from app.seed.setup import setup_database

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await setup_database()
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

for router in (public.router, auth.router, me.router, chat.router, admin.router):
    app.include_router(router)
