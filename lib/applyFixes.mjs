export function applyFixes(files, fixes = []) {
  return files.map(file => {
    const fileFixes = fixes.filter(f => f.file === file.path);
    if (!fileFixes.length) return file;

    let content = file.content;
    for (const fix of fileFixes) {
      switch (fix.action) {
        case 'add_import':
          // Ajoute l'import en haut du fichier s'il n'existe pas déjà
          if (!content.includes(fix.content)) {
            content = fix.content + '\n' + content;
          }
          break;

        case 'replace_pattern':
          content = content.replaceAll(fix.from, fix.to);
          break;

        case 'replace_block':
          // Remplace un bloc entier (ex: une fonction)
          if (fix.from && fix.to) {
            content = content.replace(fix.from, fix.to);
          }
          break;

        case 'append':
          content = content + '\n' + fix.content;
          break;

        case 'delete_line':
          content = content
            .split('\n')
            .filter(line => !line.includes(fix.pattern))
            .join('\n');
          break;
      }
    }

    return { ...file, content };
  });
}
