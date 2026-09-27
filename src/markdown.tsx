import type { ReactNode } from "react";

// Enough markdown for the assistant turns in the corpus: fenced code, pipe and
// tab tables, headings, lists, quotes, inline code and bold.
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-i${index++}`;
    nodes.push(
      match[1] ? (
        <code key={key}>{match[1]}</code>
      ) : (
        <b key={key}>{match[2]}</b>
      ),
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function table(rows: string[][], key: string) {
  const [head, ...body] = rows;
  return (
    <table key={key}>
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th key={index}>{inline(cell, `${key}-h${index}`)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, index) => (
              <td key={index}>{inline(cell, `${key}-${rowIndex}-${index}`)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function markdown(source: string): ReactNode[] {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const next = () => `md-${key++}`;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buffer: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]))
        buffer.push(lines[i++]);
      i++;
      out.push(<pre key={next()}>{buffer.join("\n")}</pre>);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
      const body = rows.filter((row) => !/^\s*\|[\s:|-]+\|\s*$/.test(row));
      out.push(table(body.map(cells), next()));
      continue;
    }
    if (/\t/.test(line) && /\t/.test(lines[i + 1] || "")) {
      const rows: string[][] = [];
      while (i < lines.length && /\t/.test(lines[i]))
        rows.push(lines[i++].split("\t"));
      out.push(table(rows, next()));
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      const id = next();
      // A heading inside a clipped screenshot should not enter the page
      // outline, so it stays a paragraph that only looks like a heading.
      out.push(
        <p className="md-h" key={id}>
          {inline(line.replace(/^#+ /, ""), id)}
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i]))
        items.push(lines[i++].replace(/^\s*[-*] /, ""));
      const id = next();
      out.push(
        <ul key={id}>
          {items.map((item, index) => (
            <li key={index}>{inline(item, `${id}-${index}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i]))
        items.push(lines[i++].replace(/^\s*\d+\. /, ""));
      const id = next();
      out.push(
        <ol key={id}>
          {items.map((item, index) => (
            <li key={index}>{inline(item, `${id}-${index}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (/^> ?/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^> ?/.test(lines[i]))
        items.push(lines[i++].replace(/^> ?/, ""));
      const id = next();
      out.push(<blockquote key={id}>{inline(items.join(" "), id)}</blockquote>);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(```|\s*\||#{1,3} |\s*[-*] |\s*\d+\. |> ?)/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    const id = next();
    out.push(<p key={id}>{inline(paragraph.join(" "), id)}</p>);
  }
  return out;
}
