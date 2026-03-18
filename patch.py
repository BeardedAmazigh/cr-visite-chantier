import io

file_path = r'c:\Users\afa\OneDrive - SECC SOC EXPERTISE CONSEIL COUVERT\Bureau\cr-visite-chantier\index.html'

with io.open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '<div class="banner-left">' in line and 'view-actors-btn' in lines[i+1]:
        # We found the block starting at line 84
        new_lines.append('            <div class="banner-left" style="display:flex; gap:0.75rem; flex-wrap:wrap;">\n')
        new_lines.append('              <button id="view-actors-btn" class="elegant-btn">\n')
        new_lines.append('                <span class="icon">👥</span> Gérer les Acteurs du Projet\n')
        new_lines.append('              </button>\n')
        new_lines.append('              <button id="view-lots-btn" class="elegant-btn">\n')
        new_lines.append('                <span class="icon">📦</span> Gérer les Lots\n')
        new_lines.append('              </button>\n')
        new_lines.append('            </div>\n')
        skip = i + 4 # skip up to the </div>
    elif skip and i <= skip:
        continue
    else:
        new_lines.append(line)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Patch applied to index.html successfully.")
