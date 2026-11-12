from app.agents.rules import (
    conversation,
    corrections,
    formatting,
    identity,
    language,
    safety,
)

SECTIONS = [identity, conversation, corrections, language, formatting, safety]


def render_rules(name: str) -> str:
    blocks = []
    for section in SECTIONS:
        rules = "\n".join(f"- {rule.format(name=name)}" for rule in section.RULES)
        blocks.append(f"## {section.TITLE}\n{rules}")
    return "\n\n".join(blocks)
