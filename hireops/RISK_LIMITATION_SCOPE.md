# HireOps: Risk, Limitations, and Future Scope

This document provides a critical analysis of the current **HireOps** architecture, identifying potential risks, inherent limitations, and the strategic roadmap for future enhancements.

---

## 1. Risks

### ⚠️ AI & Real-time Connectivity
*   **Latency in Voice Interaction**: The "Human-in-the-loop" feel of the AI Recruiter is highly dependent on the "Time to First Byte" (TTFB) from external LLM (OpenRouter/OpenAI) and TTS providers. High latency can cause awkward silences, breaking the immersion of the interview.
*   **Transcription Hallucinations**: Reliance on models like Whisper can lead to misinterpretation of technical jargon, strong accents, or background noise, potentially resulting in unfair candidate evaluations.
*   **LiveKit/WebRTC Stability**: Real-time media streaming is sensitive to network jitter and packet loss. While LiveKit is robust, suboptimal client network conditions can lead to dropped connections or audio artifacts.

### 🔒 Security & Privacy
*   **PII Exposure**: Resumes and interview recordings contain highly sensitive Personally Identifiable Information (PII). Any breach of the PostgreSQL database or the Redis cache (temporary buffers) could lead to significant legal liabilities (GDPR/CCPA).
*   **Third-party Data Handling**: Sending candidate audio and text to external APIs (OpenAI, OpenRouter) requires strict data processing agreements to ensure candidate data is not used for model retraining.

### ⚖️ Algorithmic Bias
*   **Evaluation Fairness**: AI grading of multi-modal data (voice tone, facial expressions, text) may carry inherent biases from training data. This represents a significant reputation and legal risk if not regularly audited for fairness across diverse demographics.

---

## 2. Limitations

### 🛠️ Hardware & Scalability
*   **Compute Intensive CV**: OpenCV-based proctoring and real-time audio processing are CPU/GPU-bound. The current single-node Docker setup will face bottlenecks when scaling to hundreds of concurrent interviews.
*   **Socket-based Latency**: The sequential nature of the current WebSocket pipeline (Listen -> Transcribe -> LLM -> TTS -> Speak) introduces cumulative lag compared to more advanced duplex-streaming voice models.

### 🧩 Functional Constraints
*   **Single-Language Support**: The current implementation is primarily optimized for English. Multi-lingual support for both the AI agent and the resume parser is currently a bottleneck for global expansion.
*   **Static Interview Flows**: While agentic, the recruiter follows a relatively linear path. It lacks the ability to dynamically "pivot" to a different set of technical questions if a candidate proves to be over/under-qualified mid-stream.
*   **Limited Technical Environment**: There is no integrated "Code Sandbox" or IDE within the interview room, limiting the platform to verbal technical assessments rather than practical coding tests.

---

## 3. Future Scope

### 🚀 Technical Roadmap
*   **Edge-deployed AI Agents**: Moving TTS and STT closer to the user via edge computing (e.g., LiveKit Agents framework on decentralized nodes) to minimize round-trip latency.
*   **Multi-tenant Scaling**: Implementing a partitioned multi-tenant database architecture to support large enterprise clients with isolated data residency requirements.
*   **Vector Search & RAG**: Implementing a Vector Database (e.g., Pinecone or pgvector) to allow HR managers to search through thousands of candidate transcripts using natural language queries ("Find me candidates who showed strong leadership in React projects").

### ✨ Feature Roadmap
*   **Interactive Coding Sandbox**: Integration of a real-time collaborative IDE (Monaco Editor) where the AI agent can see and comment on the candidate's code in real-time.
*   **Emotional Intelligence (EQ) Analytics**: Advanced sentiment analysis and facial landmark tracking to provide "Soft Skill" metrics, such as confidence levels and communication clarity.
*   **Deep ATS Integrations**: One-click integrations with major Applicant Tracking Systems like Greenhouse, Lever, and Workday for seamless candidate data synchronization.
*   **Automated Interview Scheduling**: An AI-driven calendar assistant to coordinate final-round human interviews based on the initial AI screening results.

---

> [!IMPORTANT]
> This document should be reviewed quarterly to align with evolving AI capabilities and changing data privacy regulations.
