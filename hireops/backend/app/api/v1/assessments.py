"""
Assessments API — HireOps Platform
Handles assessment questions (GET) and submission with proctoring telemetry (POST).
"""

import random
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()

# ---------------------------------------------------------------------------
# Assessment to Application Mapping
# ---------------------------------------------------------------------------
ASSESSMENT_TO_APPLICATION_MAP: dict[str, int] = {
    "1": 101,  # Assessment 1 -> Application 101
    "2": 102,  # Assessment 2 -> Application 102
}

# ---------------------------------------------------------------------------
# Seed MCQ bank per assessment
# ---------------------------------------------------------------------------

ASSESSMENT_BANK: dict[str, dict] = {
    "1": {
        "job_title": "Senior AI/ML Engineer",
        "company": "Meta",
        "time_limit_minutes": 30,
        "questions": [
            {
                "id": "q1",
                "type": "mcq",
                "text": "Which optimizer is best suited for sparse gradients in large-scale NLP models?",
                "options": ["SGD", "Adam", "Adagrad", "RMSProp"],
                "correct": 2,
            },
            {
                "id": "q2",
                "type": "mcq",
                "text": "In a distributed training setup, what does 'gradient accumulation' achieve?",
                "options": [
                    "Reduces memory per GPU by simulating larger batches",
                    "Increases the learning rate automatically",
                    "Eliminates the need for a parameter server",
                    "Compresses model weights for inference",
                ],
                "correct": 0,
            },
            {
                "id": "q3",
                "type": "mcq",
                "text": "What is the primary advantage of BFloat16 over Float16 for training?",
                "options": [
                    "Faster matrix multiplication on all hardware",
                    "Same exponent range as Float32, reducing overflow",
                    "Halves memory compared to Float16",
                    "Native support in Python without libraries",
                ],
                "correct": 1,
            },
            {
                "id": "q4",
                "type": "mcq",
                "text": "Which technique helps prevent catastrophic forgetting in continual learning?",
                "options": [
                    "Dropout regularization",
                    "Elastic Weight Consolidation (EWC)",
                    "Batch normalization",
                    "Xavier initialization",
                ],
                "correct": 1,
            },
            {
                "id": "q5",
                "type": "coding",
                "text": "Implement a Python function `top_k_frequent(nums: List[int], k: int) -> List[int]` that returns the k most frequent elements. Use a heap-based approach for O(n log k) complexity.",
                "starter_code": "from typing import List\nfrom collections import Counter\nimport heapq\n\ndef top_k_frequent(nums: List[int], k: int) -> List[int]:\n    # Your implementation here\n    pass",
            },
        ],
    },
    "2": {
        "job_title": "Frontend Architect",
        "company": "Vercel",
        "time_limit_minutes": 25,
        "questions": [
            {
                "id": "q1",
                "type": "mcq",
                "text": "In React 19, what is the primary purpose of the 'use' hook?",
                "options": [
                    "Replace useEffect for data fetching",
                    "Unwrap promises and React Context in render",
                    "Manage complex local state machines",
                    "Create server-side event streams",
                ],
                "correct": 1,
            },
            {
                "id": "q2",
                "type": "mcq",
                "text": "What problem does Incremental Static Regeneration (ISR) solve in Next.js?",
                "options": [
                    "Client-side routing performance",
                    "Stale content on static pages without full rebuilds",
                    "Server component hydration mismatch",
                    "CSS-in-JS bundle size",
                ],
                "correct": 1,
            },
            {
                "id": "q3",
                "type": "mcq",
                "text": "Which rendering strategy does 'use server' enable in Next.js App Router?",
                "options": [
                    "Client-side rendering with server fallback",
                    "Server Actions — mutations that run on the server",
                    "Static site generation at build time",
                    "Edge runtime streaming",
                ],
                "correct": 1,
            },
            {
                "id": "q4",
                "type": "coding",
                "text": "Write a custom React hook `useDebounce<T>(value: T, delay: number): T` that debounces a value. It should return the debounced value that only updates after the specified delay.",
                "starter_code": "import { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  // Your implementation here\n}",
            },
        ],
    },
}

# Fallback for unknown IDs
DEFAULT_ASSESSMENT = {
    "job_title": "General Technical Assessment",
    "company": "HireOps Demo",
    "time_limit_minutes": 20,
    "questions": [
        {
            "id": "q1",
            "type": "mcq",
            "text": "What is the time complexity of searching in a balanced BST?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct": 1,
        },
        {
            "id": "q2",
            "type": "mcq",
            "text": "Which HTTP method is idempotent?",
            "options": ["POST", "PATCH", "PUT", "CONNECT"],
            "correct": 2,
        },
        {
            "id": "q3",
            "type": "coding",
            "text": "Write a function `reverse_linked_list(head)` that reverses a singly linked list in-place and returns the new head.",
            "starter_code": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_linked_list(head: ListNode) -> ListNode:\n    # Your implementation here\n    pass",
        },
    ],
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AssessmentSubmission(BaseModel):
    assessment_id: str
    candidate_id: Optional[int] = 1
    answers: dict[str, int | str]   # q_id -> selected option index (mcq) or code string
    warning_count: int = 0
    time_taken_seconds: Optional[int] = None


class AssessmentResult(BaseModel):
    assessment_id: str
    application_id: int | None = None
    candidate_id: int
    mcq_score: int
    mcq_total: int
    coding_submitted: bool
    proctoring_flags: int
    overall_status: str   # PASSED | FLAGGED | FAILED


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str):
    """
    Returns the assessment questions for a given ID.
    Strips correct answers from MCQs before sending to the client.
    """
    source = ASSESSMENT_BANK.get(assessment_id, DEFAULT_ASSESSMENT)

    # Deep-copy and strip answers
    safe_questions = []
    for q in source["questions"]:
        safe_q = {k: v for k, v in q.items() if k != "correct"}
        safe_questions.append(safe_q)

    return {
        "assessment_id": assessment_id,
        "job_title": source["job_title"],
        "company": source["company"],
        "time_limit_minutes": source["time_limit_minutes"],
        "questions": safe_questions,
    }


@router.post("/assessments", response_model=AssessmentResult)
async def submit_assessment(payload: AssessmentSubmission):
    """
    Grades the assessment, factors in proctoring warning telemetry,
    and returns a verdict with the associated application ID for routing.
    """
    source = ASSESSMENT_BANK.get(payload.assessment_id, DEFAULT_ASSESSMENT)
    application_id = ASSESSMENT_TO_APPLICATION_MAP.get(payload.assessment_id)

    # Grade MCQs
    mcq_correct = 0
    mcq_total = 0
    coding_submitted = False

    for q in source["questions"]:
        qid = q["id"]
        if q["type"] == "mcq":
            mcq_total += 1
            submitted = payload.answers.get(qid)
            if submitted is not None and int(submitted) == q["correct"]:
                mcq_correct += 1
        elif q["type"] == "coding":
            code_answer = payload.answers.get(qid, "")
            if isinstance(code_answer, str) and len(code_answer.strip()) > 10:
                coding_submitted = True

    # Determine verdict
    mcq_pct = (mcq_correct / mcq_total * 100) if mcq_total > 0 else 0

    if payload.warning_count >= 5:
        overall = "FAILED"
    elif payload.warning_count >= 2 or mcq_pct < 50:
        overall = "FLAGGED"
    else:
        overall = "PASSED"

    return AssessmentResult(
        assessment_id=payload.assessment_id,
        application_id=application_id,
        candidate_id=payload.candidate_id or 1,
        mcq_score=mcq_correct,
        mcq_total=mcq_total,
        coding_submitted=coding_submitted,
        proctoring_flags=payload.warning_count,
        overall_status=overall,
    )
