import type { JSX, ReactNode } from "react";

// A deliberately small markdown subset for rendering transcript turns:
// fenced code, pipe and tab tables, headings, lists, quotes and paragraphs.
// Nothing here renders raw HTML, so transcript text can never inject markup.

function inline(source: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(source))) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const key = `${keyPrefix}-i${index++}`;
    if (match[1] != null) nodes.push(<code key={key}>{match[1]}</code>);
    else nodes.push(<b key={key}>{match[2]}</b>);
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

const BLOCK_START = /^(```|\s*\||#{1,3} |\s*[-*] |\s*\d+\. |> ?)/;
const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

function table(rows: string[][], key: string) {
  return (
    <table key={key}>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) =>
              r === 0 ? (
                <th key={c}>{inline(cell, `${key}-${r}-${c}`)}</th>
              ) : (
                <td key={c}>{inline(cell, `${key}-${r}-${c}`)}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: JSX.Element[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${out.length}`;
    if (/^```/.test(line)) {
      const buffer: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]))
        buffer.push(lines[i++]);
      i++;
      out.push(<pre key={key}>{buffer.join("\n")}</pre>);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      out.push(
        table(
          rows.filter((row) => !/^\s*\|[\s:|-]+\|\s*$/.test(row)).map(cells),
          key,
        ),
      );
      continue;
    }
    if (/\t/.test(line) && /\t/.test(lines[i + 1] || "")) {
      const rows: string[][] = [];
      while (i < lines.length && /\t/.test(lines[i]))
        rows.push(lines[i++].split("\t"));
      out.push(table(rows, key));
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      // Rendered as a styled paragraph: transcript headings must not enter the
      // page outline or collide with the surrounding UI heading levels.
      out.push(
        <p className="md-h" key={key}>
          {inline(line.replace(/^#+ /, ""), key)}
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i]))
        items.push(lines[i++].replace(/^\s*[-*] /, ""));
      out.push(
        <ul key={key}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, `${key}-${n}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i]))
        items.push(lines[i++].replace(/^\s*\d+\. /, ""));
      out.push(
        <ol key={key}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, `${key}-${n}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (/^> ?/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^> ?/.test(lines[i]))
        items.push(lines[i++].replace(/^> ?/, ""));
      out.push(
        <blockquote key={key}>{inline(items.join(" "), key)}</blockquote>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]))
      paragraph.push(lines[i++]);
    out.push(<p key={key}>{inline(paragraph.join(" "), key)}</p>);
  }
  return <>{out}</>;
}
