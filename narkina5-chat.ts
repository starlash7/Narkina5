/**
 * Narkina5 Interactive Chat Interface
 *
 * Narkina5 - 블록체인과 AI를 결합한 혁신적인 에이전트
 * 블록체인, DeFi, NFT, AI 기술에 대한 전문적인 지식과 친근한 소통을 제공합니다.
 *
 * Usage:
 *   LOG_LEVEL=fatal OPENAI_API_KEY=your_key bun run narkina5-chat.ts
 */

// MUST be set before any imports to suppress ElizaOS logs
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'fatal';

import {
  AgentRuntime,
  ChannelType,
  EventType,
  createMessageMemory,
  stringToUuid,
  type Character,
  type Content,
  type Memory,
  type UUID,
} from '@elizaos/core';
import bootstrapPlugin from '@elizaos/plugin-bootstrap';
import openaiPlugin from '@elizaos/plugin-openai';
import sqlPlugin, { DatabaseMigrationService, createDatabaseAdapter } from '@elizaos/plugin-sql';
import * as clack from '@clack/prompts';
import 'node:crypto';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONSTANTS = {
  TEXT_WRAP_WIDTH: 80,
  LOG_LEVEL: 'fatal',
  DEFAULT_PGLITE_DATA_DIR: 'memory://',
  CHAT_IDENTIFIERS: {
    WORLD: 'narkina5-world',
    ROOM: 'narkina5-room',
    CHANNEL: 'narkina5-channel',
    SERVER: 'narkina5-server',
    SOURCE: 'cli',
  },
  EXIT_COMMANDS: ['quit', 'exit', '종료', '나가기'],
} as const;

interface AppConfiguration {
  openaiApiKey: string;
  postgresUrl: string;
  pgliteDataDir: string;
}

interface ChatSession {
  runtime: AgentRuntime;
  userId: UUID;
  roomId: UUID;
  worldId: UUID;
  character: Character;
}

interface MessageProcessingResult {
  response: string;
  thinkingTimeMs: number;
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

class Configuration {
  private static validateEnvironment(): void {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey?.trim()) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  static load(): AppConfiguration {
    this.validateEnvironment();

    return {
      openaiApiKey: process.env.OPENAI_API_KEY!,
      postgresUrl: process.env.POSTGRES_URL || '',
      pgliteDataDir: process.env.PGLITE_DATA_DIR || CONSTANTS.DEFAULT_PGLITE_DATA_DIR,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

class TextUtils {
  static wrapText(text: string, maxWidth: number = CONSTANTS.TEXT_WRAP_WIDTH): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += ` ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }
}

class TimeUtils {
  static formatThinkingTime(milliseconds: number): string {
    const seconds = (milliseconds / 1000).toFixed(1);
    return `${seconds}초`;
  }
}

// ============================================================================
// AGENT INITIALIZATION
// ============================================================================

class AgentInitializer {
  private static createCharacter(): Character {
    return {
      name: 'Narkina5',
      username: 'narkina5',
      bio: '블록체인과 AI 기술의 융합을 통해 혁신적인 솔루션을 제공하는 에이전트입니다.',
      adjectives: ['전문적', '친근함', '혁신적', '기술적'],
      system: '당신은 Narkina5입니다. 블록체인과 AI 기술의 융합을 통해 혁신적인 솔루션을 제공하는 에이전트입니다. 기술적 정확성과 창의적 사고를 결합하여 사용자에게 가치 있는 정보와 인사이트를 제공합니다. 블록체인, DeFi, NFT, AI, 그리고 미래 기술에 대한 깊은 이해를 바탕으로 대화하며, 복잡한 기술 개념을 쉽게 설명하고 실용적인 조언을 제공합니다. 항상 한국어로 응답하며, 기술적 정확성과 친근함의 균형을 유지합니다.',
      topics: [
        '블록체인 기술과 암호화폐',
        'DeFi (탈중앙화 금융)',
        'NFT와 디지털 자산',
        '스마트 컨트랙트 개발',
        'AI와 머신러닝',
        '웹3.0과 메타버스',
        '기술 트렌드와 혁신',
        '프로그래밍과 개발',
        '데이터 분석과 시각화',
        '디지털 전환과 혁신',
      ],
    };
  }

  private static async setupDatabase(config: AppConfiguration, agentId: UUID): Promise<void> {
    if (!config.postgresUrl && config.pgliteDataDir !== CONSTANTS.DEFAULT_PGLITE_DATA_DIR) {
      fs.mkdirSync(config.pgliteDataDir, { recursive: true });
    }

    const adapter = createDatabaseAdapter(
      {
        dataDir: config.pgliteDataDir,
        postgresUrl: config.postgresUrl || undefined,
      },
      agentId
    );

    await adapter.init();

    const migrator = new DatabaseMigrationService();
    // @ts-ignore getDatabase is available on the adapter base class
    await migrator.initializeWithDatabase(adapter.getDatabase());
    migrator.discoverAndRegisterPluginSchemas([sqlPlugin]);
    await migrator.runAllPluginMigrations();

    return adapter;
  }

  private static createRuntime(character: Character, config: AppConfiguration): AgentRuntime {
    return new AgentRuntime({
      character,
      plugins: [sqlPlugin, bootstrapPlugin, openaiPlugin],
      settings: {
        OPENAI_API_KEY: config.openaiApiKey,
        POSTGRES_URL: config.postgresUrl || undefined,
        PGLITE_DATA_DIR: config.pgliteDataDir,
      },
    });
  }

  private static async setupConversationContext(runtime: AgentRuntime): Promise<{
    userId: UUID;
    roomId: UUID;
    worldId: UUID;
  }> {
    const userId = uuidv4() as UUID;
    const worldId = stringToUuid(CONSTANTS.CHAT_IDENTIFIERS.WORLD);
    const roomId = stringToUuid(CONSTANTS.CHAT_IDENTIFIERS.ROOM);

    await runtime.ensureConnection({
      entityId: userId,
      roomId,
      worldId,
      name: 'User',
      source: CONSTANTS.CHAT_IDENTIFIERS.SOURCE,
      channelId: CONSTANTS.CHAT_IDENTIFIERS.CHANNEL,
      serverId: CONSTANTS.CHAT_IDENTIFIERS.SERVER,
      type: ChannelType.DM,
    });

    return { userId, roomId, worldId };
  }

  static async initialize(): Promise<ChatSession> {
    const task = clack.spinner();

    try {
      task.start('Narkina5를 초기화하는 중...');

      const config = Configuration.load();
      const character = this.createCharacter();

      task.message('데이터베이스 설정 중...');
      const agentId = stringToUuid(character.name);
      const adapter = await this.setupDatabase(config, agentId);

      task.message('에이전트 런타임 생성 중...');
      const runtime = this.createRuntime(character, config);
      runtime.registerDatabaseAdapter(adapter);
      await runtime.initialize();

      task.message('대화 컨텍스트 설정 중...');
      const { userId, roomId, worldId } = await this.setupConversationContext(runtime);

      task.stop('✅ Narkina5가 성공적으로 초기화되었습니다!');

      return {
        runtime,
        userId,
        roomId,
        worldId,
        character,
      };
    } catch (error) {
      task.stop(`❌ 초기화 실패: ${error}`);
      throw error;
    }
  }
}

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

class MessageProcessor {
  constructor(private session: ChatSession) {}

  private createMessageMemory(userInput: string): Memory {
    return createMessageMemory({
      id: uuidv4() as UUID,
      entityId: this.session.userId,
      roomId: this.session.roomId,
      content: {
        text: userInput,
        source: CONSTANTS.CHAT_IDENTIFIERS.SOURCE,
        channelType: ChannelType.DM,
      },
    });
  }

  async processMessage(userInput: string): Promise<MessageProcessingResult> {
    const message = this.createMessageMemory(userInput);
    const startTime = Date.now();

    let response = '';

    await this.session.runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
      runtime: this.session.runtime,
      message,
      callback: async (content: Content) => {
        if (content?.text) {
          response += content.text;
        }
      },
    });

    const thinkingTimeMs = Date.now() - startTime;

    return {
      response,
      thinkingTimeMs,
    };
  }
}

// ============================================================================
// USER INTERFACE
// ============================================================================

class ChatInterface {
  constructor(
    private messageProcessor: MessageProcessor,
    private character: Character
  ) {}

  private displayWelcome(): void {
    clack.intro('🚀 Narkina5 Interactive Chat');
    clack.note(
      `안녕하세요! ${this.character.name}입니다!`,
      '블록체인과 AI 기술에 대해 무엇이든 물어보세요. "quit", "exit", "종료", "나가기"를 입력하면 채팅을 종료할 수 있습니다.'
    );
    clack.note(
      '💡 전문 분야: 블록체인, DeFi, NFT, AI, 웹3.0, 스마트 컨트랙트',
      '🔧 기술 지원'
    );
  }

  private async getUserInput(): Promise<string | symbol> {
    return clack.text({
      message: '당신:',
      placeholder: '메시지를 입력하세요...',
    });
  }

  private isExitCommand(input: string | symbol): boolean {
    if (clack.isCancel(input)) return true;
    if (typeof input === 'string') {
      return CONSTANTS.EXIT_COMMANDS.includes(input.toLowerCase());
    }
    return false;
  }

  private async displayThinkingAndProcess(userInput: string): Promise<MessageProcessingResult> {
    const spinner = clack.spinner();
    spinner.start(`${this.character.name}이(가) 생각하는 중...`);

    try {
      const result = await this.messageProcessor.processMessage(userInput);
      const thinkingTime = TimeUtils.formatThinkingTime(result.thinkingTimeMs);
      spinner.stop(`${thinkingTime} 동안 생각했습니다`);
      return result;
    } catch (error) {
      spinner.stop('❌ 메시지 처리 중 오류 발생');
      throw error;
    }
  }

  private displayResponse(response: string): void {
    if (!response.trim()) return;

    const wrappedResponse = TextUtils.wrapText(response);
    clack.note(wrappedResponse, `${this.character.name}:`);
  }

  async startChatLoop(): Promise<void> {
    this.displayWelcome();

    while (true) {
      try {
        const userInput = await this.getUserInput();

        if (this.isExitCommand(userInput)) {
          clack.outro('Narkina5와의 대화를 마칩니다! 👋');
          break;
        }

        if (typeof userInput === 'string' && userInput.trim()) {
          const result = await this.displayThinkingAndProcess(userInput);
          this.displayResponse(result.response);
        }
      } catch (error) {
        console.error('채팅 루프에서 오류 발생:', error);
        clack.note('오류가 발생했습니다. 다시 시도해주세요.', '❌ 오류');
      }
    }
  }
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

class Narkina5ChatApp {
  static async run(): Promise<void> {
    try {
      const session = await AgentInitializer.initialize();
      const messageProcessor = new MessageProcessor(session);
      const chatInterface = new ChatInterface(messageProcessor, session.character);

      await chatInterface.startChatLoop();
      await session.runtime.stop();
    } catch (error) {
      console.error('치명적 오류:', error);
      process.exit(1);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.main) {
  Narkina5ChatApp.run().catch((error) => {
    console.error('처리되지 않은 오류:', error);
    process.exit(1);
  });
}
