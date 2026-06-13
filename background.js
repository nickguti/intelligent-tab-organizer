const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
const CHROME_GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

function getDomain(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

function getRandomColor() {
  return CHROME_GROUP_COLORS[Math.floor(Math.random() * CHROME_GROUP_COLORS.length)];
}

// Ensure the group exists and return its ID
async function ensureGroupExists(category, windowId, cache) {
  if (cache[category]) return cache[category].id;

  const groups = await chrome.tabGroups.query({ windowId: windowId });
  let existing = groups.find(g => g.title && g.title.toLowerCase() === category.toLowerCase());
  
  if (existing) {
    cache[category] = { id: existing.id, color: existing.color };
    return existing.id;
  }
  
  return null; // Will be created when first tab is added
}

async function organizeTabsInBulk(apiKey, tabsData, windowId) {
  if (tabsData.length === 0) return 0;

  const prompt = `Classifica queste schede del browser in categorie brevi e generiche IN ITALIANO (es. Sviluppo, Videogiochi, Social, Intrattenimento, Produttività, Notizie, Shopping, Finanza, Educazione, Strumenti). Usa lo stesso nome di categoria per schede simili o correlate.
Input Tabs:
${JSON.stringify(tabsData, null, 2)}

Return ONLY a valid JSON array containing objects with "id" and "category". No markdown, no backticks, just the raw JSON array.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || response.statusText);
  }

  const data = await response.json();
  let text = data.candidates[0].content.parts[0].text.trim();
  
  // Clean up potential markdown formatting from Gemini
  if (text.startsWith('```json')) text = text.substring(7);
  if (text.startsWith('```')) text = text.substring(3);
  if (text.endsWith('```')) text = text.substring(0, text.length - 3);
  text = text.trim();

  const results = JSON.parse(text);
  
  // Grouping logic
  let groupCache = {}; // { 'Development': { id: 123, color: 'blue' } }
  let categoriesToColors = {};

  for (const item of results) {
    const category = item.category;
    const tabId = item.id;
    
    // Assign a random color to a category if not seen
    if (!categoriesToColors[category]) {
      categoriesToColors[category] = getRandomColor();
    }

    let groupId = await ensureGroupExists(category, windowId, groupCache);

    if (groupId !== null) {
      await chrome.tabs.group({ tabIds: tabId, groupId: groupId });
    } else {
      // Create new group
      groupId = await chrome.tabs.group({ tabIds: tabId, createProperties: { windowId: windowId } });
      await chrome.tabGroups.update(groupId, { title: category, color: categoriesToColors[category] });
      groupCache[category] = { id: groupId, color: categoriesToColors[category] };
    }
  }

  return results.length;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeAll') {
    (async () => {
      try {
        const storage = await chrome.storage.local.get(['geminiApiKey']);
        if (!storage.geminiApiKey) {
          throw new Error('API key not found in settings.');
        }

        const currentWindow = await chrome.windows.getCurrent();
        const allTabs = await chrome.tabs.query({ windowId: currentWindow.id });
        
        // Filter tabs to organize
        const tabsToOrganize = allTabs.filter(t => 
          !t.pinned && 
          t.url && 
          !t.url.startsWith('chrome://') && 
          !t.url.startsWith('chrome-extension://') &&
          t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
        );

        if (tabsToOrganize.length === 0) {
          sendResponse({ status: 'success', processed: 0, message: 'No ungrouped tabs to organize.' });
          return;
        }

        const tabsData = tabsToOrganize.map(t => ({
          id: t.id,
          domain: getDomain(t.url),
          title: t.title
        }));

        const processedCount = await organizeTabsInBulk(storage.geminiApiKey, tabsData, currentWindow.id);
        
        sendResponse({ status: 'success', processed: processedCount });
      } catch (globalError) {
        sendResponse({ status: 'error', message: globalError.message });
      }
    })();
    return true; // Keep message channel open
  }
});
