export type LauremDocumentType = 'job_description' | 'handbook';

type MetadataEntry = { label: string; value: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function parseMetadata(lines: string[]) {
  const metadata: MetadataEntry[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line === '---') break;

    const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) metadata.push({ label: match[1].trim(), value: match[2].trim() });
    index += 1;
  }

  while (index < lines.length && lines[index].trim() !== '---') index += 1;
  while (index < lines.length && lines[index].trim() === '---') index += 1;

  return { metadata, contentStart: index };
}

function documentKindLabel(documentType: LauremDocumentType) {
  return documentType === 'handbook' ? 'EMPLOYEE HANDBOOK' : 'ROLE DOCUMENT';
}

export function renderLauremDocumentBody(input: {
  documentType: LauremDocumentType;
  title: string;
  content: string;
  assetBaseUrl?: string;
  signature?: { name?: string | null; signedAt?: string | null } | null;
}): string {
  const lines = input.content.replace(/\r\n?/g, '\n').split('\n');
  const parsed = parseMetadata(lines);
  const metadata = parsed.metadata;
  const body: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  let sectionOpen = false;

  const closeList = () => {
    if (listType) {
      body.push('</' + listType + '>');
      listType = null;
    }
  };

  const closeParagraph = () => {
    if (paragraph.length) {
      body.push('<p>' + inlineMarkdown(paragraph.join(' ')) + '</p>');
      paragraph = [];
    }
  };

  for (let index = parsed.contentStart; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      closeParagraph();
      closeList();
      continue;
    }

    if (line === '---') {
      closeParagraph();
      closeList();
      body.push('<hr />');
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeParagraph();
      closeList();
      body.push('<h3>' + inlineMarkdown(h3[1]) + '</h3>');
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      closeParagraph();
      closeList();
      if (sectionOpen) body.push('</section>');

      const heading = h2[1].trim();
      const number = heading.match(/^(\d+\.)/)?.[1] || '';
      const cleanHeading = heading.replace(/^\d+\.\s*/, '');
      body.push(
        '<section class="laurem-doc-section">' +
        '<div class="laurem-doc-section-heading">' +
        '<span class="laurem-doc-section-number">' + escapeHtml(number) + '</span>' +
        '<h2>' + inlineMarkdown(cleanHeading) + '</h2>' +
        '</div>',
      );