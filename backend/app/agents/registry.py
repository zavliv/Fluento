from app.agents.core.agent import TeacherAgent
from app.agents.teachers.arjun import arjun
from app.agents.teachers.emma import emma
from app.agents.teachers.james import james
from app.agents.teachers.leo import leo
from app.agents.teachers.maya import maya
from app.agents.teachers.riya import riya
from app.agents.teachers.sophia import sophia

TEACHERS: dict[str, TeacherAgent] = {
    persona.id: TeacherAgent(persona)
    for persona in (maya, arjun, emma, leo, sophia, riya, james)
}


def get_teacher(teacher_id: str) -> TeacherAgent | None:
    return TEACHERS.get(teacher_id)
