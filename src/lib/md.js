// Minimaler Markdown-Konverter für die CMS-Textfelder.
// Erlaubt **fett**, *kursiv* und [Text](Link) – alles andere wird als Text escaped.
export function md(input = '') {
  const esc = String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
