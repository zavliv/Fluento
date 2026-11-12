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


def render_learner(name: str | None, memory: dict | None, tested_level: str | None = None) -> str:
    if not name and not memory and not tested_level:
        return ""
    lines = [f"- Name: {name}"] if name else []
    if tested_level:
        lines.append(
            f"- Level from their placement test: {tested_level} (CEFR). Pitch your English at this level "
            "and adjust if they clearly find it too easy or too hard."
        )
    if memory:
        if memory.get("summary"):
            lines.append(f"- Summary: {memory['summary']}")
        if memory.get("level") and not tested_level:
            lines.append(f"- Estimated level: {memory['level']} (CEFR)")
        for key, label in (
            ("goals", "Goals"),
            ("interests", "Interests"),
            ("facts", "About them"),
            ("strengths", "Strengths"),
        ):
            if memory.get(key):
                lines.append(f"- {label}: {'; '.join(memory[key])}")
        mistakes = memory.get("mistakes") or []
        if mistakes:
            lines.append("- Recurring mistakes to watch for:")
            for m in mistakes[:6]:
                example = f' (they wrote "{m["example"]}", correct: "{m["correction"]}")' if m.get("example") else ""
                lines.append(f"  - {m['pattern']}{example}, seen {m.get('count', 1)}x")
    has_memory = bool(memory) and len(lines) > (1 if name else 0) + (1 if tested_level else 0)
    guidance = (
        "This is what you remember from earlier conversations, including ones with other teachers. "
        "Use it naturally, like a teacher who knows their student: bring up their goals and interests, "
        "and gently check recurring mistakes when they come up. Never list these notes, say you have a profile, "
        "or claim to remember things that aren't here."
        if has_memory
        else "This is a new learner. Get to know their goals and interests naturally as you talk."
    )
    return f"# Your learner\n{guidance}\n" + "\n".join(lines) + "\n\n"


def build_system_prompt(
    teacher: dict,
    rule_sections: list[dict],
    app_name: str,
    other_teachers: list[dict],
    learner: str = "",
) -> str:
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

{learner}# Rules for every {app_name} teacher
{render_rules(rule_sections, values)}"""
