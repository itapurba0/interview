# HireOps: Architectural Appendix

This document supplements the primary **HireOps** architecture specification with detailed performance requirements, testing expectations, and critical system components.

---

## 1. Expected Software Response

### 🧪 Integration & Functional Testing
*   **Candidate Journey**: Onboarding must complete in < 3 steps (Email Verify → Profile → Resume Upload).
*   **Resume Parsing Accuracy**: Automated NLP extraction (pdfplumber + GPT-4o) should correctly identify 90% of technical skills and education history.
*   **Real-time Synchronization**: The HR dashboard (Kanban) must reflect candidate status changes (`Pending` → `InProgress` → `Evaluated`) within 1 second of WebSocket event emission.
*   **Voice Agent Responsiveness**: The AI agent should provide conceptual "thinking" indicators (WebSockets) before long-form audio synthesis to manage user expectations.

---

## 2. Performance Bounds

### ⏱️ Latency & Throughput
*   **API Response Time**: 95% of standard REST API requests must return in < 300ms.
*   **Voice Round-Trip (RTT)**: Total latency from User Speech Finish to AI Audio Start should not exceed **2.5 seconds** in standard network conditions.
*   **Concurrency**: A single deployment node (Standard Cloud instance) must support at least **50 concurrent high-bitrate WebRTC video/voice sessions**.
*   **Parsing Speed**: Resume parsing for PDFs under 5MB must be completed and metadata stored in < 15 seconds.

---

## 3. Identification of Critical Components

| Component | Risk Level | Reason for Criticality |
| :--- | :--- | :--- |
| **LiveKit Agent Dispatch** | 🔥 High | Manages the primary interactive value proposition. Failure results in a "mute" agent. |
| **Redis Message Broker** | 🔥 High | The central backbone for all real-time events (WebSockets, Celery, Notifications). |
| **OpenCV Proctoring Engine** | ⚖️ Med-High | CPU intensive. Incorrect scaling can degrade host performance for all other services. |
| **JWT/MFA Auth Service** | 🔒 High | Handles multi-tenant sensitive data. A vulnerability here compromises all enterprise clients. |

---

## 4. Review Comments on Architectural POC

The following feedback was gathered during the initial prototype review of the **HireOps** architecture:
*   **Pipeline Latency**: "The sequential 'Listen-Save-Transcribe' loop is too slow for natural conversation. Recommend a move to stream-based chunking or the LiveKit Agents framework."
*   **Database Contention**: "Direct SQLAlchemy commits inside high-frequency WebSocket loops could lead to PostgreSQL lock issues. Buffer writes where possible."
*   **VAD Improvements**: "The initial Voice Activity Detection (VAD) was overly sensitive to background noise, causing the agent to interrupt candidates. Fine-tuning required."

---

## 5. Justification of Changes to Existing Architecture

### 🔄 Transition to `agent_dispatch`
*   **Change**: Moved from custom WebSocket handling to the **LiveKit `agent_dispatch` API**.
*   **Justification**: This change abstracts complex room-joining logic and ensures that an AI worker is guaranteed to be available before a candidate enters the virtual room, significantly improving UX reliability.

### 📦 Async Status Updates
*   **Change**: Decoupled "Resume Processing" from the main request-response cycle.
*   **Justification**: Offloading heavy NLP tasks to Celery prevents API timeouts and allows the UI to show a "live progress" bar via WebSockets, keeping the user engaged during wait times.

---

> [!NOTE]
> This Appendix is a living document and will be updated as new performance benchmarks are established in production staging environments.
