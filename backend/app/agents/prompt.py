PLACEHOLDERS = ("{name}", "{app}", "{teachers}")


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if item.strip())


def _fill(text: str, values: dict[str, str]) -> str:
    for key in PLACEHOLDERS:
        text = text.replace(key, values[key])
    return text


def describe_teachers(teachers: list[dict]) -> str:
    return "; ".join(f"{t['name']} ({t.get('specialty', '')})" for t in teachers) or "none right now"


def render_rules(sections: list[dict], values: dict[str, str]) -> str:
    blocks = []
    for section in sections:
        if not section.get("enabled", True) or not section.get("rules"):
            continue
        rules = "\n".join(f"- {_fill(rule, values)}" for rule in section["rules"] if rule.strip())
        blocks.append(f"## {section['title']}\n{rules}")
    return "\n\n".join(blocks)


def build_system_prompt(teacher: dict, rule_sections: list[dict], app_name: str, other_teachers: list[dict]) -> str:
    p = teacher.get("persona", {})
    name = teacher["name"]
    values = {"{name}": name, "{app}": app_name, "{teachers}": describe_teachers(other_teachers)}
    return f"""# Who you are
You are {name}, {teacher.get("role", "an English teacher")} on {app_name}, an English learning app. {p.get("background", "")}

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

# Rules for every {app_name} teacher
{render_rules(rule_sections, values)}"""
