/**
 * Content Script Entry Point — orchestrates all components.
 */
(async function main() {
  'use strict';

  // Detect platform
  const platform = PlatformDetector.detect();
  if (!platform) {
    console.log('[汇聊] Not on a supported platform, exiting.');
    return;
  }

  console.log(`[汇聊] Detected platform: ${platform.name} (${platform.id})`);

  // Create adapter
  let adapter;
  switch (platform.id) {
    case 'deepseek': adapter = new DeepSeekAdapter(); break;
    case 'kimi':     adapter = new KimiAdapter(); break;
    case 'doubao':   adapter = new DoubaoAdapter(); break;
    default:
      console.warn('[汇聊] No adapter for platform:', platform.id);
      return;
  }

  // Load settings
  let settings;
  try {
    settings = await MessageBus.send(MessageBus.Actions.GET_SETTINGS);
  } catch (e) {
    console.warn('[汇聊] Failed to load settings, using defaults:', e);
    settings = {
      theme: 'auto',
      enabledPlatforms: ['doubao', 'kimi', 'deepseek'],
      autoScanInterval: 5000
    };
  }

  // Check if platform is enabled
  if (settings.enabledPlatforms && !settings.enabledPlatforms.includes(platform.id)) {
    console.log(`[汇聊] Platform ${platform.id} is disabled in settings.`);
    return;
  }

  // Inject sidebar panel into the platform's own sidebar
  let shadowRoot = await Injector.inject(adapter, settings);
  if (!shadowRoot) {
    console.error('[汇聊] Failed to inject sidebar.');
    return;
  }

  // Initialize sidebar panel
  await SidebarPanel.init(shadowRoot, platform.id, settings);

  // Start theme detection
  ThemeDetector.start(adapter, (theme) => {
    if (settings.theme === 'auto') {
      Injector.setTheme(theme);
    }
  });

  // Start conversation watcher
  ConversationWatcher.start(adapter, async (conversations) => {
    if (conversations.length === 0) return;

    console.log(`[汇聊] Scanned ${conversations.length} conversations on ${platform.name}`);

    try {
      await MessageBus.send(MessageBus.Actions.SCAN_CONVERSATIONS, {
        platform: platform.id,
        conversations: conversations.map(c => ({
          platformId: c.platformId,
          title: c.title,
          url: c.url
        }))
      });
    } catch (e) {
      console.warn('[汇聊] Failed to send scan results:', e);
    }
  });

  // Listen for SPA navigation and re-inject if panel was removed
  adapter.onNavigate(async (newUrl) => {
    console.log('[汇聊] Navigation detected:', newUrl);

    // Check if our panel is still alive after SPA re-render
    setTimeout(async () => {
      if (!Injector.ensureAlive(settings)) {
        console.log('[汇聊] Panel was removed by SPA, re-injecting...');
        shadowRoot = await Injector.inject(adapter, settings);
        if (shadowRoot) {
          await SidebarPanel.init(shadowRoot, platform.id, settings);
          if (settings.theme === 'auto') {
            Injector.setTheme(adapter.getThemeMode());
          }
        }
      }
      // Re-scan conversations after navigation
      ConversationWatcher.rescan();
    }, 1500);
  });

  // Periodic check: ensure panel survives platform DOM updates
  const scanInterval = settings.autoScanInterval || 5000;
  setInterval(async () => {
    // Re-scan conversations
    ConversationWatcher.rescan();

    // Check panel survival
    if (!Injector.ensureAlive(settings)) {
      console.log('[汇聊] Panel lost, re-injecting...');
      shadowRoot = await Injector.inject(adapter, settings);
      if (shadowRoot) {
        await SidebarPanel.init(shadowRoot, platform.id, settings);
        if (settings.theme === 'auto') {
          Injector.setTheme(adapter.getThemeMode());
        }
      }
    }
  }, scanInterval);

  // Listen for settings changes from popup
  browserAPI.runtime.onMessage.addListener((message) => {
    if (message.action === MessageBus.Actions.SETTINGS_CHANGED) {
      settings = message.payload;

      // Update theme
      if (settings.theme === 'auto') {
        Injector.setTheme(adapter.getThemeMode());
      } else {
        Injector.setTheme(settings.theme);
      }
    }
  });

  console.log('[汇聊] Extension initialized successfully.');
})();
