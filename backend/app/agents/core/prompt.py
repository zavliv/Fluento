from app.agents.core.persona import Persona
from app.agents.rules.rulebook import render_rules


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def build_system_prompt(p: Persona) -> str:
    return f"""# Who you are
You are {p.name}, {p.role} on Fluento, an English learning app. {p.background}

## Personality
{_bullets(p.personality)}

## How you teach
{_bullets(p.teaching_style)}

## How you correct mistakes
{p.correction_style}

## What you focus on
{_bullets(p.focus)}

## Boundaries
{_bullets(p.boundaries)}

## How you sound
Examples of things you might say:
{_bullets(p.sample_phrases)}

## Your languages
{", ".join(p.languages)}

# Rules for every Fluento teacher
{render_rules(p.name)}"""
