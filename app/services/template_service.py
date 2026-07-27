"""
template_service.py
===================
Handles:
 1. Generation of the Kaizen Question Template (.docx)
 2. Structured parsing of uploaded template files (PDF or DOCX)
    → Regex-based, deterministic, LLM-free for template-format files.
    → Falls back gracefully to LLM path for non-template uploads.
"""
import re
import io
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("app.template_service")

# ─────────────────────────────────────────────
# TEMPLATE TEXT CONTENT
# ─────────────────────────────────────────────
TEMPLATE_HEADER = """KAIZEN LMS — EXAM QUESTION TEMPLATE
====================================
Instructions:
  • Do NOT change the tags in [BRACKETS].
  • Fill in ONLY the content after each colon (:).
  • Keep one question block per question.
  • Separate blocks with a line of exactly ten dashes: ----------
  • [QUESTION TYPE] must be MCQ (single answer) or MSQ (multiple answers).
  • [CORRECT ANSWER] for MCQ: one letter (e.g. A).
  • [CORRECT ANSWER] for MSQ: comma-separated letters (e.g. A, C).
  • Options A–D are standard; add [OPTION E] or [OPTION F] if needed.

----------

[QUESTION TYPE]: MCQ
[QUESTION]: What is the capital of France?
[OPTION A]: Paris
[OPTION B]: London
[OPTION C]: Berlin
[OPTION D]: Madrid
[CORRECT ANSWER]: A

----------

[QUESTION TYPE]: MSQ
[QUESTION]: Which of the following are programming languages?
[OPTION A]: Python
[OPTION B]: HTML
[OPTION C]: Java
[OPTION D]: CSS
[CORRECT ANSWER]: A, C

----------

[QUESTION TYPE]: MCQ
[QUESTION]: Replace this with your question text here.
[OPTION A]: First option
[OPTION B]: Second option
[OPTION C]: Third option
[OPTION D]: Fourth option
[CORRECT ANSWER]: A

----------

"""


# ─────────────────────────────────────────────
# PLAIN TEXT TEMPLATE GENERATOR  (no external deps)
# ─────────────────────────────────────────────
def generate_template_txt() -> bytes:
    """
    Returns the Kaizen question template as a plain UTF-8 .txt file.
    No python-docx needed — opens in Notepad, Word, VS Code, or any editor.
    The Kaizen parser reads this format directly — no conversion required.
    """
    content = (
        "KAIZEN LMS — EXAM QUESTION TEMPLATE\n"
        "=====================================\n"
        "HOW TO USE:\n"
        "  1. Fill in your questions using the exact [BRACKET] tags below.\n"
        "  2. Do NOT rename any tag (e.g. [QUESTION TYPE], [OPTION A], etc.).\n"
        "  3. Separate each question block with exactly: ----------\n"
        "  4. Save the file, then upload it in Kaizen LMS → Exam Creator → Upload.\n"
        "  5. All your questions will be imported instantly — no limit on count.\n"
        "\n"
        "RULES:\n"
        "  [QUESTION TYPE]  → MCQ  (one correct answer)  or  MSQ  (multiple correct)\n"
        "  [CORRECT ANSWER] → MCQ: one letter, e.g. A\n"
        "                   → MSQ: comma-separated, e.g. A, C\n"
        "  Options A-D are required. You may add [OPTION E] and [OPTION F] if needed.\n"
        "\n"
        "=======================================================================\n"
        "EXAMPLES  (delete these before uploading if you prefer a clean file)\n"
        "=======================================================================\n"
        "\n"
        "----------\n"
        "\n"
        "[QUESTION TYPE]: MCQ\n"
        "[QUESTION]: What is the capital of France?\n"
        "[OPTION A]: Paris\n"
        "[OPTION B]: London\n"
        "[OPTION C]: Berlin\n"
        "[OPTION D]: Madrid\n"
        "[CORRECT ANSWER]: A\n"
        "\n"
        "----------\n"
        "\n"
        "[QUESTION TYPE]: MSQ\n"
        "[QUESTION]: Which of the following are programming languages?\n"
        "[OPTION A]: Python\n"
        "[OPTION B]: HTML\n"
        "[OPTION C]: Java\n"
        "[OPTION D]: CSS\n"
        "[CORRECT ANSWER]: A, C\n"
        "\n"
        "=======================================================================\n"
        "YOUR QUESTIONS — copy the block below once for every question you add\n"
        "=======================================================================\n"
        "\n"
        "----------\n"
        "\n"
        "[QUESTION TYPE]: MCQ\n"
        "[QUESTION]: Type your question here\n"
        "[OPTION A]: First option\n"
        "[OPTION B]: Second option\n"
        "[OPTION C]: Third option\n"
        "[OPTION D]: Fourth option\n"
        "[CORRECT ANSWER]: A\n"
        "\n"
        "----------\n"
        "\n"
        "[QUESTION TYPE]: MCQ\n"
        "[QUESTION]: Type your question here\n"
        "[OPTION A]: First option\n"
        "[OPTION B]: Second option\n"
        "[OPTION C]: Third option\n"
        "[OPTION D]: Fourth option\n"
        "[CORRECT ANSWER]: A\n"
        "\n"
        "----------\n"
        "\n"
    )
    return content.encode("utf-8")


# Alias — existing callers use generate_template_docx, keep it working
def generate_template_docx() -> bytes:
    return generate_template_txt()


# ─────────────────────────────────────────────
# TEXT EXTRACTION FROM DOCX
# ─────────────────────────────────────────────
def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extract plain text from a .docx file."""
    try:
        from docx import Document
    except ImportError:
        raise ValueError(
            "python-docx is not installed. Run: pip install python-docx\n"
            "Alternatively, save your file as .txt and upload that instead."
        )
    try:
        doc = Document(io.BytesIO(docx_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception as e:
        logger.error(f"DOCX text extraction failed: {e}")
        raise ValueError(f"Could not read DOCX file: {e}")


# ─────────────────────────────────────────────
# STRUCTURED TEMPLATE PARSER
# ─────────────────────────────────────────────
# Regex patterns for each tag
_RE_TYPE    = re.compile(r"\[QUESTION TYPE\]\s*:\s*(.+)", re.IGNORECASE)
_RE_Q       = re.compile(r"\[QUESTION\]\s*:\s*(.+)", re.IGNORECASE)
_RE_OPT     = re.compile(r"\[OPTION\s+([A-F])\]\s*:\s*(.+)", re.IGNORECASE)
_RE_ANSWER  = re.compile(r"\[CORRECT ANSWER\]\s*:\s*(.+)", re.IGNORECASE)


def _parse_single_block(block_text: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Parse one question block from template text.
    Returns (question_dict, validation_errors).
    question_dict is None-safe: returns {} on total failure.
    """
    errors: List[str] = []
    result: Dict[str, Any] = {}

    lines = [l.strip() for l in block_text.strip().splitlines() if l.strip()]

    q_type_match = None
    q_text_match = None
    options: Dict[str, str] = {}  # letter -> text
    answer_match = None

    for line in lines:
        if not q_type_match:
            q_type_match = _RE_TYPE.match(line)
        if not q_text_match:
            q_text_match = _RE_Q.match(line)
        opt_m = _RE_OPT.match(line)
        if opt_m:
            options[opt_m.group(1).upper()] = opt_m.group(2).strip()
        if not answer_match:
            answer_match = _RE_ANSWER.match(line)

    # Validate required fields
    if not q_type_match:
        errors.append("Missing [QUESTION TYPE] tag.")
    if not q_text_match:
        errors.append("Missing [QUESTION] tag.")
    if not options:
        errors.append("No [OPTION x] tags found.")
    if not answer_match:
        errors.append("Missing [CORRECT ANSWER] tag.")

    if errors:
        return {}, errors

    raw_type = q_type_match.group(1).strip().upper()
    if raw_type not in ("MCQ", "MSQ"):
        errors.append(f"[QUESTION TYPE] must be MCQ or MSQ, got: {raw_type}")
        return {}, errors

    q_text = q_text_match.group(1).strip()
    if q_text in ("...", ""):
        errors.append("[QUESTION] text is a placeholder — fill it in.")
        return {}, errors

    # Parse correct answer
    raw_answer = answer_match.group(1).strip()
    answer_letters = [x.strip().upper() for x in raw_answer.split(",") if x.strip()]

    # Validate answer letters exist as options
    for letter in answer_letters:
        if letter not in options:
            errors.append(f"[CORRECT ANSWER] references [{letter}] but no [OPTION {letter}] exists.")

    if raw_type == "MCQ" and len(answer_letters) != 1:
        errors.append(f"MCQ must have exactly 1 correct answer, got: {raw_answer}")

    if raw_type == "MSQ" and len(answer_letters) < 2:
        errors.append(f"MSQ must have 2+ correct answers, got: {raw_answer}")

    if errors:
        return {}, errors

    # Build ordered options list (A, B, C, D, E, F)
    sorted_letters = sorted(options.keys())
    options_list = [options[l] for l in sorted_letters]

    # Convert letter answers to index strings (for compatibility with existing system)
    letter_to_idx = {l: str(i) for i, l in enumerate(sorted_letters)}
    if raw_type == "MCQ":
        correct_answer = letter_to_idx[answer_letters[0]]
    else:
        correct_answer = [letter_to_idx[l] for l in answer_letters if l in letter_to_idx]

    result = {
        "question_text": q_text,
        "question_type": raw_type.lower(),
        "options": options_list,
        "correct_answer": correct_answer,
        "difficulty_level": "intermediate",
        "source": "template",  # flag for frontend display
    }
    return result, []


def parse_template_text(raw_text: str) -> Dict[str, Any]:
    """
    Attempt structured parsing of the full document text.

    Returns:
    {
      "success": bool,           # True = all blocks parsed structurally
      "partial": bool,           # True = some blocks parsed, some failed
      "questions": [...],        # Successfully parsed questions
      "failed_blocks": [...],    # Raw text of blocks that failed parsing
      "errors": [...],           # Per-block error lists
      "unparsed_text": str       # Joined text of all failed blocks (for LLM fallback)
    }
    """
def parse_standard_mcq_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parse standard numbered MCQ formats commonly found in PDFs and documents, e.g.:
      1. What is CPU?
      [X] A. Central Processing Unit
      [ ] B. Computer Personal Unit
      ...
      Correct Answer: A. Central Processing Unit
    Returns list of question dicts.
    """
    lines = [line.rstrip() for line in raw_text.splitlines()]
    questions = []

    # Regular expressions
    q_start_re = re.compile(r"^\s*(\d+)[\.\)]\s+(.+)$")
    opt_re = re.compile(r"^\s*(?:\[([ Xx])\]\s*)?([A-Fa-f])[\.\)]\s+(.+)$")
    ans_re = re.compile(r"^\s*(?:Correct\s+)?Answer\s*:\s*([A-F0-9,\s]+)", re.IGNORECASE)

    current_q = None
    current_opts = {}
    current_ans = None

    def finalize_q():
        nonlocal current_q, current_opts, current_ans
        if current_q and current_opts:
            sorted_letters = sorted(current_opts.keys())
            options_list = [current_opts[l] for l in sorted_letters]
            letter_to_idx = {l: str(i) for i, l in enumerate(sorted_letters)}

            # Determine correct answer index
            final_ans = "0"
            if current_ans and current_ans in letter_to_idx:
                final_ans = letter_to_idx[current_ans]

            questions.append({
                "question_text": current_q,
                "question_type": "mcq",
                "options": options_list,
                "correct_answer": final_ans,
                "difficulty_level": "intermediate",
                "source": "template",
            })
        current_q = None
        current_opts = {}
        current_ans = None

    for line in lines:
        if not line.strip():
            continue

        q_match = q_start_re.match(line)
        if q_match:
            finalize_q()
            current_q = q_match.group(2).strip()
            continue

        opt_match = opt_re.match(line)
        if opt_match and current_q:
            is_checked = (opt_match.group(1) or "").strip().upper() == "X"
            letter = opt_match.group(2).upper()
            text = opt_match.group(3).strip()
            current_opts[letter] = text
            if is_checked:
                current_ans = letter
            continue

        ans_match = ans_re.match(line)
        if ans_match and current_q:
            raw_a = ans_match.group(1).strip().upper()
            if raw_a and raw_a[0] in "ABCDEF":
                current_ans = raw_a[0]
            continue

    finalize_q()
    return questions


def parse_template_text(raw_text: str) -> Dict[str, Any]:
    """
    Attempt structured parsing of the full document text.

    Returns:
    {
      "success": bool,           # True = all blocks parsed structurally
      "partial": bool,           # True = some blocks parsed, some failed
      "questions": [...],        # Successfully parsed questions
      "failed_blocks": [...],    # Raw text of blocks that failed parsing
      "errors": [...],           # Per-block error lists
      "unparsed_text": str       # Joined text of all failed blocks (for LLM fallback)
    }
    """
    # Split on separator (10 dashes, possibly with surrounding whitespace)
    blocks = re.split(r"\n\s*-{10}\s*\n", raw_text)

    # Filter out header/instruction blocks (no [QUESTION TYPE] tag present)
    question_blocks = [b for b in blocks if _RE_TYPE.search(b)]

    if not question_blocks:
        # Fallback: check if document matches standard numbered MCQ format (e.g. 1. Question \n A. Opt)
        std_questions = parse_standard_mcq_text(raw_text)
        if std_questions:
            return {
                "success": True,
                "partial": False,
                "questions": std_questions,
                "failed_blocks": [],
                "errors": [],
                "unparsed_text": "",
                "total_blocks": len(std_questions),
                "parsed_count": len(std_questions),
                "failed_count": 0,
            }

        return {
            "success": False,
            "partial": False,
            "questions": [],
            "failed_blocks": [],
            "errors": [],
            "unparsed_text": raw_text,
            "total_blocks": 0,
            "parsed_count": 0,
            "failed_count": 0,
        }

    parsed_questions = []
    failed_blocks = []
    all_errors = []

    for block in question_blocks:
        q, errs = _parse_single_block(block)
        if q and not errs:
            parsed_questions.append(q)
        else:
            failed_blocks.append(block)
            all_errors.append(errs)

    total = len(question_blocks)
    ok = len(parsed_questions)
    failed = len(failed_blocks)

    return {
        "success": failed == 0 and ok > 0,
        "partial": 0 < ok < total,
        "questions": parsed_questions,
        "failed_blocks": failed_blocks,
        "errors": all_errors,
        "unparsed_text": "\n\n".join(failed_blocks),
        "total_blocks": total,
        "parsed_count": ok,
        "failed_count": failed,
    }



# ─────────────────────────────────────────────
# EXPORT: Questions → Filled DOCX Template
# ─────────────────────────────────────────────
LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

def export_questions_to_docx(questions: List[Dict[str, Any]]) -> bytes:
    """
    Convert a list of question dicts back into a filled Kaizen template .docx.
    Each question dict should have:
      question_text, question_type ('mcq'/'msq'), options (list), correct_answer (str index or list of str indices)
    Returns raw bytes of the .docx file.
    """
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        doc = Document()

        # Title
        title = doc.add_heading("KAIZEN LMS — EXPORTED QUESTIONS", level=1)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in title.runs:
            run.font.color.rgb = RGBColor(0x10, 0xB9, 0x81)

        meta = doc.add_paragraph()
        meta.add_run(f"Total Questions: {len(questions)}  |  Generated by Kaizen LMS").italic = True
        doc.add_paragraph()
        doc.add_paragraph("----------")
        doc.add_paragraph()

        for q in questions:
            q_type_raw = (q.get("question_type") or "mcq").upper()
            q_type = "MSQ" if q_type_raw in ("MSQ", "MULTI_SELECT") else "MCQ"
            q_text = q.get("question_text", "")
            options: list = q.get("options") or []
            correct_answer = q.get("correct_answer", "0")

            # Convert numeric index answers → letters
            if q_type == "MCQ":
                try:
                    correct_letter = LETTERS[int(str(correct_answer))]
                except (ValueError, IndexError):
                    # Already a letter?
                    correct_letter = str(correct_answer).upper() if str(correct_answer).upper() in LETTERS else "A"
            else:
                # MSQ — list of indices
                if isinstance(correct_answer, list):
                    correct_letters = []
                    for idx in correct_answer:
                        try:
                            correct_letters.append(LETTERS[int(str(idx))])
                        except (ValueError, IndexError):
                            if str(idx).upper() in LETTERS:
                                correct_letters.append(str(idx).upper())
                    correct_letter = ", ".join(correct_letters) if correct_letters else "A"
                else:
                    correct_letter = str(correct_answer).upper()

            # Write block
            lines = [
                ("[QUESTION TYPE]:", q_type),
                ("[QUESTION]:", q_text),
            ]
            for i, opt_text in enumerate(options):
                if i < len(LETTERS):
                    lines.append((f"[OPTION {LETTERS[i]}]:", opt_text))
            lines.append(("[CORRECT ANSWER]:", correct_letter))

            for tag, val in lines:
                p = doc.add_paragraph()
                run_tag = p.add_run(tag + " ")
                run_tag.bold = True
                run_tag.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
                p.add_run(val)

            doc.add_paragraph()
            doc.add_paragraph("----------")
            doc.add_paragraph()

        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()

    except ImportError:
        # Fallback: plain text
        lines = []
        for q in questions:
            q_type = (q.get("question_type") or "mcq").upper()
            lines.append(f"[QUESTION TYPE]: {q_type}")
            lines.append(f"[QUESTION]: {q.get('question_text', '')}")
            for i, opt in enumerate(q.get("options") or []):
                if i < len(LETTERS):
                    lines.append(f"[OPTION {LETTERS[i]}]: {opt}")
            lines.append(f"[CORRECT ANSWER]: {q.get('correct_answer', 'A')}")
            lines.append("----------")
            lines.append("")
        return "\n".join(lines).encode("utf-8")

