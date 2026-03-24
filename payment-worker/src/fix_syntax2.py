import os

script_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(script_dir, 'index.js')

with open(index_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Line 138 (index 137) has an extra '}' that should be removed
if lines[137].strip() == '}':
    lines.pop(137)  # Remove the extra line
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Removed extra brace at line 138!")
else:
    print(f"Line 138 is: {lines[137].strip()}")
