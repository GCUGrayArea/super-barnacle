/**
 * Conversation Management Tests
 *
 * Unit tests for conversation history management
 */

import { Conversation, createConversation } from '../../src/agent/conversation.js';
import { SYSTEM_PROMPT } from '../../src/agent/prompts.js';
import { estimateMessageTokens } from '../../src/lib/token-counter.js';

jest.mock('../../src/lib/logger.js');
jest.mock('../../src/lib/token-counter.js', () => ({
  estimateMessageTokens: jest.fn(),
}));

// Setup the mock implementation
beforeAll(() => {
  (estimateMessageTokens as jest.Mock).mockImplementation((messages) => {
    // Simple mock: estimate ~100 tokens per message
    return messages.length * 100;
  });
});

describe('Conversation', () => {
  let conversation: Conversation;

  beforeEach(() => {
    conversation = new Conversation();
  });

  describe('initialization', () => {
    it('should initialize with system prompt', () => {
      const messages = conversation.getMessages();

      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe(SYSTEM_PROMPT);
    });

    it('should generate unique conversation ID', () => {
      const conv1 = new Conversation();
      const conv2 = new Conversation();

      const id1 = conv1.getMetadata().id;
      const id2 = conv2.getMetadata().id;

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^conv_/);
      expect(id2).toMatch(/^conv_/);
    });

    it('should accept custom system prompt', () => {
      const customPrompt = 'Custom system prompt';
      const customConv = new Conversation({
        systemPrompt: customPrompt,
      });

      const messages = customConv.getMessages();
      expect(messages[0].content).toBe(customPrompt);
    });

    it('should accept max messages configuration', () => {
      const conv = new Conversation({ maxMessages: 10 });
      expect(conv).toBeDefined();
    });
  });

  describe('addUserMessage', () => {
    it('should add user message to conversation', () => {
      conversation.addUserMessage('Hello, agent!');

      const messages = conversation.getMessages();
      expect(messages.length).toBe(2); // system + user
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('Hello, agent!');
    });

    it('should increment message count', () => {
      const beforeCount = conversation.getMetadata().messageCount;
      conversation.addUserMessage('Test message');
      const afterCount = conversation.getMetadata().messageCount;

      expect(afterCount).toBe(beforeCount + 1);
    });

    it('should update last interaction timestamp', (done) => {
      const before = conversation.getMetadata().lastInteractionAt;

      setTimeout(() => {
        conversation.addUserMessage('Test');
        const after = conversation.getMetadata().lastInteractionAt;

        expect(after.getTime()).toBeGreaterThan(before.getTime());
        done();
      }, 10);
    });
  });

  describe('addAssistantMessage', () => {
    it('should add assistant message with content', () => {
      conversation.addAssistantMessage('Hello, user!');

      const messages = conversation.getMessages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toBe('Hello, user!');
    });

    it('should add assistant message with tool calls', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'search_archives',
            arguments: JSON.stringify({ aoi: 'POINT(-122 37)' }),
          },
        },
      ];

      conversation.addAssistantMessage(null, toolCalls);

      const messages = conversation.getMessages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toBeNull();
      expect(lastMessage.tool_calls).toEqual(toolCalls);
    });

    it('should add assistant message with both content and tool calls', () => {
      const toolCalls = [
        {
          id: 'call_456',
          type: 'function' as const,
          function: {
            name: 'list_orders',
            arguments: '{}',
          },
        },
      ];

      conversation.addAssistantMessage('Let me check your orders...', toolCalls);

      const messages = conversation.getMessages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toBe('Let me check your orders...');
      expect(lastMessage.tool_calls).toEqual(toolCalls);
    });
  });

  describe('addToolMessage', () => {
    it('should add tool response message', () => {
      const toolCallId = 'call_789';
      const toolName = 'search_archives';
      const content = JSON.stringify({ results: [] });

      conversation.addToolMessage(toolCallId, toolName, content);

      const messages = conversation.getMessages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.role).toBe('tool');
      expect(lastMessage.tool_call_id).toBe(toolCallId);
      expect(lastMessage.content).toBe(content);
    });
  });

  describe('getMessages', () => {
    it('should return copy of messages array', () => {
      const messages1 = conversation.getMessages();
      const messages2 = conversation.getMessages();

      expect(messages1).not.toBe(messages2); // Different arrays
      expect(messages1).toEqual(messages2); // Same content
    });
  });

  describe('getLastUserMessage', () => {
    it('should return last user message', () => {
      conversation.addUserMessage('First message');
      conversation.addAssistantMessage('Response');
      conversation.addUserMessage('Second message');

      const lastUserMsg = conversation.getLastUserMessage();

      expect(lastUserMsg).not.toBeNull();
      expect(lastUserMsg?.role).toBe('user');
      expect(lastUserMsg?.content).toBe('Second message');
    });

    it('should return null if no user messages', () => {
      const lastUserMsg = conversation.getLastUserMessage();
      expect(lastUserMsg).toBeNull();
    });
  });

  describe('getLastAssistantMessage', () => {
    it('should return last assistant message', () => {
      conversation.addUserMessage('User message');
      conversation.addAssistantMessage('First response');
      conversation.addUserMessage('Another question');
      conversation.addAssistantMessage('Second response');

      const lastAssistantMsg = conversation.getLastAssistantMessage();

      expect(lastAssistantMsg).not.toBeNull();
      expect(lastAssistantMsg?.role).toBe('assistant');
      expect(lastAssistantMsg?.content).toBe('Second response');
    });

    it('should return null if no assistant messages', () => {
      conversation.addUserMessage('User message');
      const lastAssistantMsg = conversation.getLastAssistantMessage();
      expect(lastAssistantMsg).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all messages except system prompt', () => {
      conversation.addUserMessage('Message 1');
      conversation.addAssistantMessage('Response 1');
      conversation.addUserMessage('Message 2');
      conversation.addAssistantMessage('Response 2');

      expect(conversation.getMessages().length).toBeGreaterThan(1);

      conversation.clear();

      const messages = conversation.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
    });

    it('should reset message count', () => {
      conversation.addUserMessage('Test');
      expect(conversation.getMetadata().messageCount).toBeGreaterThan(0);

      conversation.clear();
      expect(conversation.getMetadata().messageCount).toBe(0);
    });
  });

  describe('pruning', () => {
    it('should prune old messages when exceeding max messages', () => {
      const conv = new Conversation({ maxMessages: 5 });

      // Add more messages than the limit
      for (let i = 0; i < 10; i++) {
        conv.addUserMessage(`Message ${i}`);
        conv.addAssistantMessage(`Response ${i}`);
      }

      const messages = conv.getMessages();
      expect(messages.length).toBeLessThanOrEqual(5);
      expect(messages[0].role).toBe('system'); // System prompt should remain
    });

    it('should keep system prompt when pruning', () => {
      const conv = new Conversation({ maxMessages: 3 });

      conv.addUserMessage('Message 1');
      conv.addAssistantMessage('Response 1');
      conv.addUserMessage('Message 2');
      conv.addAssistantMessage('Response 2');

      const messages = conv.getMessages();
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe(SYSTEM_PROMPT);
    });
  });

  describe('getTokenCount', () => {
    it('should call estimateMessageTokens', () => {
      conversation.addUserMessage('Hello');
      conversation.addAssistantMessage('Hi there!');

      // Just verify the method can be called without throwing
      // The actual token counting logic is tested in token-counter.test.ts
      expect(() => conversation.getTokenCount()).not.toThrow();
    });
  });

  describe('toJSON', () => {
    it('should export conversation to JSON', () => {
      conversation.addUserMessage('Test message');
      conversation.addAssistantMessage('Test response');

      const json = conversation.toJSON();

      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('messages');
      expect(json.metadata).toHaveProperty('id');
      expect(json.metadata).toHaveProperty('startedAt');
      expect(json.metadata).toHaveProperty('messageCount');
      expect(Array.isArray(json.messages)).toBe(true);
    });
  });

  describe('createConversation', () => {
    it('should create conversation instance', () => {
      const conv = createConversation();
      expect(conv).toBeInstanceOf(Conversation);
    });

    it('should accept configuration', () => {
      const conv = createConversation({
        maxMessages: 20,
        systemPrompt: 'Custom prompt',
      });

      expect(conv).toBeInstanceOf(Conversation);
      const messages = conv.getMessages();
      expect(messages[0].content).toBe('Custom prompt');
    });
  });
});
