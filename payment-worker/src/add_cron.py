import re
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(script_dir, 'index.js')

with open(index_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the pattern: closing of fetch handler followed by function definitions
# Looking for: "  }\n};\n\n// =========="
pattern = r'(\s*\}\s*\}\s*\};)\s*\n\n(//\s*={3,})'

match = re.search(pattern, content)
if match:
    print(f"Found pattern at position {match.start()}-{match.end()}")
    
    # The scheduled handler to add
    cron_handler = '''

  // Cron Job: Daily Boss Report at 10:30 HK time
  async scheduled(event, env, ctx) {
    console.log("[Cron] Triggered at:", new Date().toISOString());
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const startTime = Math.floor(yesterday.getTime() / 1000);
      const endTime = startTime + 86400;
      
      const stats = await env.DB.prepare(`
        SELECT COUNT(*) as orderCount, SUM(amount) as totalAmount, 
               SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
        FROM transactions WHERE createdAt >= ? AND createdAt < ?
      `).bind(startTime, endTime).first();
      
      console.log("[Cron] Stats:", stats);
      
      const recipients = await env.DB.prepare("SELECT * FROM boss_recipients WHERE is_enabled = 1").all();
      console.log("[Cron] Recipients:", recipients.results?.length || 0);
      
    } catch (err) {
      console.error("[Cron] Error:", err);
    }
  }
'''
    
    # Insert the cron handler before the closing of export default
    replacement = match.group(1).rstrip(';') + ',' + cron_handler + '\n};\n\n' + match.group(2)
    new_content = content[:match.start()] + replacement + content[match.end():]
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully added scheduled handler")
else:
    print("Pattern not found")
    # Debug: show what's around line 110
    lines = content.split('\n')
    for i, line in enumerate(lines[105:115], start=106):
        print(f"{i}: {repr(line)}")
