import json
import logging

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, RunContext, function_tool

from livekit.plugins import openai, elevenlabs, deepgram

load_dotenv()

logger = logging.getLogger("exam-agent")
logger.setLevel(logging.INFO)

HARDCODED_QUESTIONS = [
    {
        "id": 1,
        "question": "Що таке фотосинтез і чому він важливий для життя на Землі?",
        "reference_answer": "Фотосинтез — процес перетворення світлової енергії на хімічну в рослинах. Важливий, бо виробляє кисень і є основою харчових ланцюгів.",
        "max_score": 5,
    },
    {
        "id": 2,
        "question": "Назви три планети Сонячної системи та коротко опиши одну з них.",
        "reference_answer": "Меркурій, Венера, Земля, Марс, Юпітер, Сатурн, Уран, Нептун. Наприклад, Юпітер — найбільша планета, газовий гігант з Великою червоною плямою.",
        "max_score": 5,
    },
    {
        "id": 3,
        "question": "Що таке столиця України і чим вона відома?",
        "reference_answer": "Київ — столиця України. Відомий Софійським собором, Києво-Печерською лаврою, Хрещатиком, історією як «мати міст руських».",
        "max_score": 5,
    },
]


def build_system_prompt(questions: list[dict]) -> str:
    questions_text = json.dumps(questions, ensure_ascii=False, indent=2)
    return f"""Ти — усний екзаменатор. Веди бесіду українською мовою.
Будь доброзичливим, але вимогливим. Став відкриті запитання.

ПИТАННЯ ТА ЕТАЛОННІ ВІДПОВІДІ:
{questions_text}

ПРАВИЛА ПРОВЕДЕННЯ:
- Починай розмову з привітання: «Вітаю! Я ваш екзаменатор. Готові почати?»
- Став питання по одному, у порядку списку
- Якщо студент дав поверхневу відповідь — питай «чому?» або «як саме це працює?»
- Якщо студент мовчить більше 10 секунд — переформулюй питання простіше
- Якщо студент зовсім не знає — дай одну легку підказку, але зафіксуй що підказка була дана
- Максимум 1 підказка на питання

ПРАВИЛА ОЦІНЮВАННЯ (шкала 0–5):
- 5 = повне розуміння без підказок
- 4 = розуміє, але потребував 1 підказку
- 3 = знає основи, але не може пояснити «чому»
- 2 = часткові знання
- 1 = мінімальні знання
- 0 = не знає нічого

ВАЖЛИВО:
- Після того як студент дав фінальну відповідь на питання (і ти вже не плануєш перепитувати) — ОБОВ'ЯЗКОВО виклич функцію record_score
- Після всіх питань — виклич функцію finish_exam з підсумком
- Не показуй еталонні відповіді студенту
"""


class ExamAgent(Agent):
    def __init__(self, questions: list[dict]):
        super().__init__(instructions=build_system_prompt(questions))
        self._questions = questions

    @function_tool
    async def record_score(
        self,
        context: RunContext,
        question_id: int,
        score: int,
        hints_given: int,
        comment: str,
    ) -> str:
        """Record the score for a question after the student has answered.

        Args:
            question_id: The ID of the question being scored
            score: Score from 0 to 5
            hints_given: Number of hints given (0 or 1)
            comment: Brief comment about the quality of the answer
        """
        scores = context.userdata.setdefault("scores", [])
        scores.append(
            {
                "question_id": question_id,
                "score": score,
                "hints_given": hints_given,
                "comment": comment,
            }
        )
        logger.info(f"Score recorded: Q{question_id} = {score}/5, hints={hints_given}")
        return f"Оцінку за питання {question_id} записано: {score}/5"

    @function_tool
    async def finish_exam(
        self,
        context: RunContext,
        summary: str,
        total_score: int,
        max_total_score: int,
    ) -> str:
        """Call this after all questions have been asked and scored to finish the exam.

        Args:
            summary: Overall summary of the student's performance (strengths and weaknesses)
            total_score: Sum of all individual question scores
            max_total_score: Maximum possible total score
        """
        context.userdata["summary"] = summary
        context.userdata["total_score"] = total_score
        context.userdata["max_total_score"] = max_total_score
        context.userdata["finished"] = True

        scores = context.userdata.get("scores", [])
        logger.info(
            f"Exam finished: {total_score}/{max_total_score}\n"
            f"Summary: {summary}\n"
            f"Scores: {json.dumps(scores, ensure_ascii=False)}"
        )
        return "Іспит завершено. Результати записано. Попрощайся зі студентом."


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    # Step 3+: read questions from room metadata
    # For now, use hardcoded questions
    questions = HARDCODED_QUESTIONS
    metadata = ctx.room.metadata
    if metadata:
        try:
            meta = json.loads(metadata)
            if "questions" in meta:
                questions = meta["questions"]
                logger.info(f"Loaded {len(questions)} questions from room metadata")
        except json.JSONDecodeError:
            logger.warning("Failed to parse room metadata, using hardcoded questions")

    session = AgentSession(
        stt=deepgram.STT(language="uk"),
        llm=openai.LLM(model="gpt-4o"),
        tts=elevenlabs.TTS(
            model="eleven_multilingual_v2",
            voice=elevenlabs.Voice(
                id="EXAVITQu4vr4xnSDxMaL",
                name="Bella",
                category="premade",
            ),
        ),
    )

    await session.start(
        agent=ExamAgent(questions=questions),
        room=ctx.room,
        room_input_options=RoomInputOptions(),
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
