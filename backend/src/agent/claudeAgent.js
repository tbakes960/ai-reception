const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('./systemPrompt');
const { sanitizeTranscript } = require('./sanitize');

const crmTools = require('./tools/crmTools');
const bookingTools = require('./tools/bookingTools');
const calendarTools = require('./tools/calendarTools');
const communicationTools = require('./tools/communicationTools');
const workflowTools = require('./tools/workflowTools');

const client = new Anthropic.default();

const ALL_TOOL_DEFS = [
  ...crmTools.TOOL_DEFINITIONS,
  ...bookingTools.TOOL_DEFINITIONS,
  ...calendarTools.TOOL_DEFINITIONS,
  ...communicationTools.TOOL_DEFINITIONS,
  ...workflowTools.TOOL_DEFINITIONS,
];

function makeToolHandlers(tenantId) {
  return {
    getClient: (i) => crmTools.getClient(i.phone, tenantId),
    createClient: (i) => crmTools.createClient({ ...i, tenantId }),
    updateClientNotes: (i) => crmTools.updateClientNotes(i),
    checkAvailability: (i) => bookingTools.checkAvailability({ ...i, tenantId }),
    createBooking: (i) => bookingTools.createBooking({ ...i, tenantId }),
    updateBooking: (i) => bookingTools.updateBooking(i),
    deleteBooking: (i) => bookingTools.deleteBooking(i),
    getBookings: (i) => bookingTools.getBookings(i),
    syncToCalendar: (i) => calendarTools.syncToCalendar(i),
    sendSMS: (i) => communicationTools.sendSMS(i),
    sendWhatsApp: (i) => communicationTools.sendWhatsApp(i),
    sendEmail: (i) => communicationTools.sendEmailMessage(i),
    createTicket: (i) => workflowTools.createTicket(i),
    applyCRMTag: (i) => workflowTools.applyCRMTag(i),
    triggerFollowUpSequence: (i) => workflowTools.triggerFollowUpSequence(i),
    addToEmailList: (i) => workflowTools.addToEmailList(i),
    sendInvoice: (i) => workflowTools.sendInvoice(i),
  };
}

/**
 * Run one conversational turn of the hotel AI agent.
 * Streams tokens to onTextChunk() for real-time TTS.
 * Handles tool calls automatically (re-enters until no more tools).
 *
 * @param {Object} options
 * @param {import('../voice/callSession').CallSession} options.session
 * @param {Function} options.onTextChunk  - called with each streamed text chunk
 * @param {Function} options.onDone       - called with full assistant text when turn ends
 */
async function runAgentTurn({ session, onTextChunk, onDone }) {
  const rawQuery = session.conversationHistory.at(-1)?.content || '';
  const userQuery = sanitizeTranscript(rawQuery);
  const systemPrompt = await buildSystemPrompt({
    clientData: session.clientData,
    userQuery,
    tenantId: session.tenantId,
  });

  // Sanitize all user turns before sending to the model
  const messages = session.conversationHistory.map((m) => ({
    role: m.role,
    content: m.role === 'user' ? sanitizeTranscript(m.content) : m.content,
  }));

  let assistantText = '';
  let toolLoopCount = 0;
  const MAX_TOOL_LOOPS = 5;

  while (toolLoopCount < MAX_TOOL_LOOPS) {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: ALL_TOOL_DEFS,
      messages,
    });

    let toolUseBlocks = [];
    let currentToolUse = null;
    let inputJson = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = { id: event.content_block.id, name: event.content_block.name };
          inputJson = '';
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          assistantText += chunk;
          onTextChunk(chunk);
        } else if (event.delta.type === 'input_json_delta') {
          inputJson += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop' && currentToolUse) {
        try {
          currentToolUse.input = JSON.parse(inputJson || '{}');
        } catch {
          currentToolUse.input = {};
        }
        toolUseBlocks.push(currentToolUse);
        currentToolUse = null;
        inputJson = '';
      } else if (event.type === 'message_stop') {
        break;
      }
    }

    const finalMsg = await stream.finalMessage();

    if (finalMsg.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
      break;
    }

    // Execute tool calls
    messages.push({ role: 'assistant', content: finalMsg.content });

    const toolHandlers = makeToolHandlers(session.tenantId);
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (tool) => {
        const handler = toolHandlers[tool.name];
        let result;
        try {
          result = handler ? await handler(tool.input) : { error: `Unknown tool: ${tool.name}` };
        } catch (err) {
          result = { error: err.message };
          session.logger?.warn({ tool: tool.name, err: err.message }, 'Tool execution error');
        }
        return {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        };
      })
    );

    messages.push({ role: 'user', content: toolResults });
    toolUseBlocks = [];
    toolLoopCount++;
  }

  onDone(assistantText);
}

module.exports = { runAgentTurn };
