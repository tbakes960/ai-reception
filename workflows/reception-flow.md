# Reception Flow — AI Request Pipeline

## Trigger
A guest sends a message via the chat UI, API endpoint, or webhook.

---

## Pipeline

```yaml
steps:

  - id: normalize_input
    layer: input
    action: Parse raw message into RequestObject
    output:
      type: "text | voice | webhook"
      content: "<guest message>"
      metadata:
        channel: "chat | api | webhook"
        timestamp: "<ISO 8601>"
      sessionId: "<uuid>"

  - id: check_faq_cache
    layer: processing
    condition: feature_flags.faqCache == true
    action: Match content against FAQ store in src/data/
    on_hit:
      goto: format_output
      confidence: 1.0
    on_miss:
      goto: ai_generate

  - id: ai_generate
    layer: processing
    action: Call Claude API (claude-sonnet-4-6) with system prompt + conversation history
    config:
      max_tokens: 1024
      cache_system_prompt: true
    output:
      text: "<AI response>"
      confidence: 0.0–1.0
      actions: []
    on_low_confidence:
      threshold: 0.7
      set: escalate = true
      goto: format_output

  - id: log_exchange
    layer: data
    action: Write full RequestObject + ResponseObject to logs/runs/
    always: true

  - id: check_escalation
    layer: processing
    condition: ResponseObject.escalate == true AND feature_flags.escalationRouting == true
    action: Notify staff via configured channel (SMS / email / handoff UI)

  - id: format_output
    layer: output
    action: Format ResponseObject for delivery channel
    channels:
      chat_ui:
        format: "{ message: text, escalated: bool }"
      api:
        format: "{ response: text, actions: [], escalated: bool, confidence: float }"
      webhook:
        format: "POST to registered callback URL with ResponseObject"
```

---

## Error Paths

| Error                     | Action                                           |
|---------------------------|--------------------------------------------------|
| Claude API failure        | Log error, set escalate=true, return fallback    |
| FAQ store unavailable     | Skip cache, go directly to ai_generate           |
| Log write failure         | Log to stderr, do not block response             |
| Unknown input type        | Return canned "I didn't understand" response     |

---

## Data Contracts

**RequestObject**
```json
{
  "type": "text",
  "content": "What time is check-in?",
  "metadata": { "channel": "chat", "timestamp": "2026-05-08T10:00:00Z" },
  "sessionId": "abc-123"
}
```

**ResponseObject**
```json
{
  "text": "Check-in is from 2:00 PM. Early check-in is subject to availability.",
  "actions": [],
  "escalate": false,
  "confidence": 0.95
}
```
