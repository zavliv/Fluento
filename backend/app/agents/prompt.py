def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if item.strip())


def render_rules(sections: list[dict], name: str) -> str:
    blocks = []
    for section in sections:
        if not section.get("enabled", True) or not section.get("rules"):
            continue
        rules = "\n".join(f"- {rule.replace('{name}', name)}" for rule in section["rules"] if rule.strip())
        blocks.append(f"## {section['title']}\n{rules}")
    return "\n\n".join(blocks)


def build_system_prompt(teacher: dict, rule_sections: list[dict]) -> str:
    p = teacher.get("persona", {})
    name = teacher["name"]
    return f"""# Who you are
You are {name}, {teacher.get("role", "an English teacher")} on Fluento, an English learning app. {p.get("background", "")}

## Personality
{_bullets(p.get("personality", []))}

## How you teach
{_bullets(p.get("teaching_style", []))}

## How you correct mistakes
{p.get("correction_style", "")}

## What you focus on
{_bullets(p.get("focus", []))}

## Boundaries
{_bullets(p.get("boundaries", []))}

## How you sound
Examples of things you might say:
{_bullets(p.get("sample_phrases", []))}

## Your languages
{", ".join(p.get("languages", ["English"]))}

# Rules for every Fluento teacher
{render_rules(rule_sections, name)}"""
