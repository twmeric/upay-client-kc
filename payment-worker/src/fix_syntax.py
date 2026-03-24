import os

script_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(script_dir, 'index.js')

with open(index_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Check line 137 (index 136) - should close scheduled function
if lines[136].strip() == '}':
    lines[136] = '  }\n}\n'
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed line 137!")
else:
    print(f"Line 137 is: {lines[136].strip()}")
