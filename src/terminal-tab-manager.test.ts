import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalTabManager } from "./terminal-tab-manager";
import type { Terminal } from "@xterm/xterm";

// Mock dependencies
vi.mock("obsidian", () => ({
  Notice: vi.fn(),
  App: vi.fn(),
  FileSystemAdapter: vi.fn(),
  setIcon: vi.fn(),
}));

describe("TerminalTabManager - installKeyHandler", () => {
  let mockTerminal: any;
  let mockPty: any;
  let manager: any;
  let keyHandler: (e: KeyboardEvent) => boolean;

  beforeEach(() => {
    // Setup mock terminal and pty
    mockTerminal = {
      attachCustomKeyEventHandler: vi.fn((handler) => {
        keyHandler = handler;
      }),
      onData: vi.fn(),
      onWriteParsed: vi.fn(),
      onResize: vi.fn(),
      onSelectionChange: vi.fn(),
      buffer: { active: { getLine: vi.fn() } },
      options: {},
      loadAddon: vi.fn(),
      open: vi.fn(),
      registerLinkProvider: vi.fn(),
    };

    mockPty = {
      write: vi.fn(),
      spawn: vi.fn(),
      onData: vi.fn(),
      onExit: vi.fn(),
      kill: vi.fn(),
      resize: vi.fn(),
    };

    // Partial mock of TerminalTabManager to test installKeyHandler
    manager = new (TerminalTabManager as any)({
      app: {},
      tabBarEl: { empty: vi.fn(), createDiv: vi.fn(() => ({ createSpan: vi.fn(), addEventListener: vi.fn() })) },
      terminalHostEl: { createDiv: vi.fn(() => ({ createEl: vi.fn(), createSpan: vi.fn(), addEventListener: vi.fn(), appendChild: vi.fn(), setCssProps: vi.fn() })) },
      settings: {
        searchShortcut: "Ctrl+F",
        wikiLinkAutocomplete: false,
      },
      cwd: "/",
      pluginDir: "/plugin",
      binaryManager: { isReady: vi.fn(() => true) },
      themeRegistry: { get: vi.fn(() => ({})) },
    });

    // We need to inject a session so the handler can find it
    const sessionId = "terminal-1";
    manager.sessions = [{
      id: sessionId,
      pty: mockPty,
      autocomplete: null,
    }];

    // Trigger handler installation
    manager.installKeyHandler(mockTerminal, sessionId);
  });

  it("intercepts Escape key, prevents default, stops propagation, and writes to PTY", () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      type: "keydown",
      key: "Escape",
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent;

    const result = keyHandler(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(mockPty.write).toHaveBeenCalledWith("\x1b");
    expect(result).toBe(false); // Returning false tells xterm.js to swallow it
  });

  it("allows other keys to bubble up by default", () => {
    const preventDefault = vi.fn();
    const event = {
      type: "keydown",
      key: "a",
      preventDefault,
    } as unknown as KeyboardEvent;

    const result = keyHandler(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result).toBe(true); // Returning true tells xterm.js to allow bubbling
  });
});
