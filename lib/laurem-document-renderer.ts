export type LauremDocumentType = 'job_description' | 'handbook';

type MetadataEntry = {
  label: string;
  value: string;
};

const MEDIA: Record<LauremDocumentType, {
  cover: string;
  sectionImages: Array<{ match: string[]; src: string; alt: string; caption: string }>;
}> = {
  handbook: {
    cover: '/document-media/laurem-care-team.svg',
    sectionImages: [
      {
        match: ['Welcome to Laurem Caregroup'],
        src: '/document-media/laurem-care-team.svg',
        alt: 'Laurem Care staff welcoming a new colleague',
        caption: 'People at the heart of Laurem Care',
      },
      {
        match: ['Safeguarding'],
        src: '/document-media/laurem-compassionate-care.svg',
        alt: 'Laurem Care worker supporting a service user',
        caption: 'Safe, respectful and person-centred care',
      },
      {
        match: ['Health, safety and infection prevention', 'Professional appearance'],
        src: '/document-media/laurem-professional-practice.svg',
        alt: 'Laurem Care worker preparing for professional care',
        caption: 'Professional practice starts with safe preparation',
      },
      {
        match: ['Wellbeing and support', 'Professional development'],
        src: '/document-media/laurem-wellbeing.svg',
        alt: 'Laurem Care worker using a tablet during a team check-in',
        caption: 'Supporting the people who support others',
      },
    ],
  },
  job_description: {
    cover: '/document-media/laurem-professional-practice.svg',
    sectionImages: [
      {
        match: ['Job purpose'],
        src: '/document-media/laurem-professional-practice.svg',
        alt: 'Laurem Care professional holding a care plan',
        caption: 'Clear responsibilities. Confident practice.',
      },
      {
        match: ['Key responsibilities'],
        src: '/document-media/laurem-compassionate-care.svg',
        alt: 'Laurem Care worker providing person-centred support',
        caption: 'Every responsibility connects back to safe, person-centred care',
      },
      {
        match: ['Person specification', 'Performance and development'],
        src: '/document-media/laurem-wellbeing.svg',
        alt: 'Laurem Care professional reviewing development notes',
        caption: 'Skills, development and professional standards',
      },
    ],
  },
};

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

function parseMetadata(lines: string[]): { metadata: MetadataEntry[]; contentStart: number } {
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
    if (match) {
      metadata.push({ label: match[1].trim(), value: match[2].trim() });
    }
    index += 1;
  }

  while (index < lines.length && lines[index].trim() !== '---') index += 1;
  while (index < lines.length && lines[index].trim() === '---') index += 1;

  return { metadata, contentStart: index };
}

function sectionImageFor(documentType: LauremDocumentType, heading: string) {
  return MEDIA[documentType].sectionImages.find((item) =>
    item.match.some((term) => heading.toLowerCase().includes(term.toLowerCase())),
  );
}

function documentKindLabel(documentType: LauremDocumentType): string {
  return documentType === 'handbook' ? 'EMPLOYEE HANDBOOK' : 'ROLE DOCUMENT';
}

export function renderLauremDocumentBody(input: {
  documentType: LauremDocumentType;
  title: string;
  content: string;
  assetBaseUrl?: string;
  signature?: { name?: string | null; signedAt?: string | null } | null;
}): string {
  const assetBaseUrl = (input.assetBaseUrl || '').replace(/\/$/, '');
  const lines = input.content.replace(/\r\n?/g, '\n').split('\n');
  const { metadata, contentStart } = parseMetadata(lines);
  const media = MEDIA[input.documentType];

  const body: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      body.push(\`</\${listType}>\`);
      listType = null;
    }
  };

  const closeParagraph = () => {
    if (paragraph.length) {
      body.push(\`<p>\${inlineMarkdown(paragraph.join(' '))}</p>\`);
      paragraph = [];
    }
  };

  for (let index = contentStart; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();

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
      body.push(\`<h3>\${inlineMarkdown(h3[1])}</h3>\`);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      closeParagraph();
      closeList();
      const heading = h2[1].trim();
      body.push(\`<section class="laurem-doc-section"><div class="laurem-doc-section-heading"><span class="laurem-doc-section-number">\${escapeHtml(heading.match(/^(\\d+\\.)/)?.[1] || '')}</span><h2>\${inlineMarkdown(heading.replace(/^\\d+\\.\\s*/, ''))}</h2></div>\`);

      const sectionImage = sectionImageFor(input.documentType, heading);
      if (sectionImage) {
        const src = assetBaseUrl + sectionImage.src;
        body.push(
          \`<figure class="laurem-doc-figure"><img src="\${escapeHtml(src)}" alt="\${escapeHtml(sectionImage.alt)}" loading="lazy" /><figcaption>\${escapeHtml(sectionImage.caption)}</figcaption></figure>\`,
        );
      }
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      closeParagraph();
      if (listType !== 'ul') {
        closeList();
        body.push('<ul>');
        listType = 'ul';
      }
      body.push(\`<li>\${inlineMarkdown(unordered[1])}</li>\`);
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      closeParagraph();
      if (listType !== 'ol') {
        closeList();
        body.push('<ol>');
        listType = 'ol';
      }
      body.push(\`<li>\${inlineMarkdown(ordered[2])}</li>\`);
      continue;
    }

    paragraph.push(line);
  }

  closeParagraph();
  closeList();
  body.push('</section>');

  const metaHtml = metadata.length
    ? \`<div class="laurem-doc-meta-grid">\${metadata
        .map(
          (item) =>
            \`<div class="laurem-doc-meta"><span>\${inlineMarkdown(item.label)}</span><strong>\${inlineMarkdown(item.value)}</strong></div>\`,
        )
        .join('')}</div>\`
    : '';

  const signatureHtml = input.signature
    ? \`<section class="laurem-doc-signature"><div><span class="laurem-doc-kicker">SIGNATURE RECORD</span><h2>Electronic signature</h2><p>This copy records the electronic signature attached to the document.</p></div><div class="laurem-doc-signature-grid"><div><span>Signed by</span><strong>\${escapeHtml(input.signature.name || 'Not recorded')}</strong></div><div><span>Signed at</span><strong>\${escapeHtml(input.signature.signedAt || 'Not recorded')}</strong></div><div><span>Status</span><strong>Signed</strong></div></div></section>\`
    : '';

  return \`<article class="laurem-document" data-document-type="\${escapeHtml(input.documentType)}">
    <header class="laurem-doc-cover">
      <div class="laurem-doc-cover-copy">
        <span class="laurem-doc-kicker">\${documentKindLabel(input.documentType)}</span>
        <div class="laurem-doc-brand">LAUREM <span>CARE</span></div>
        <h1>\${escapeHtml(input.title)}</h1>
        <p>Laurem Caregroup Ltd</p>
      </div>
      <div class="laurem-doc-cover-art"><img src="\${escapeHtml(assetBaseUrl + media.cover)}" alt="LAUREM Care staff" /></div>
    </header>
    \${metaHtml}
    <div class="laurem-doc-rule"></div>
    <div class="laurem-doc-content">\${body.join('')}</div>
    \${signatureHtml}
    <footer class="laurem-doc-footer"><span>LAUREM CAREGROUP LTD</span><span>\${documentKindLabel(input.documentType)}</span></footer>
  </article>\`;
}

export function renderLauremPrintableHtml(input: {
  documentType: LauremDocumentType;
  title: string;
  content: string;
  assetBaseUrl: string;
  signature?: { name?: string | null; signedAt?: string | null } | null;
}): string {
  const body = renderLauremDocumentBody(input);
  return \`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>\${escapeHtml(input.title)} | LAUREM Caregroup</title>
<style>
\${PRINT_CSS}
</style>
</head>
<body>\${body}</body>
</html>\`;
}

export const PRINT_CSS = String.raw\`@page{size:A4;margin:14mm 13mm 16mm}
:root{--ink:#18372f;--muted:#63746d;--line:#dbe8e2;--soft:#f3f8f5;--accent:#2c6d5c;--mint:#8dcdb9;--pale:#e1f2eb}
*{box-sizing:border-box}
body{margin:0;background:#eef4f1;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.62}
.laurem-document{width:190mm;margin:12mm auto;background:#fff;box-shadow:0 18px 45px rgba(24,55,47,.10);overflow:hidden}
.laurem-doc-cover{min-height:92mm;display:grid;grid-template-columns:1.05fr .95fr;background:linear-gradient(135deg,#173a31 0%,#235d4f 65%,#5f9d8b 100%);color:#fff}
.laurem-doc-cover-copy{padding:18mm 11mm 13mm 16mm;display:flex;flex-direction:column;justify-content:center}
.laurem-doc-cover-art{display:flex;align-items:stretch;justify-content:flex-end;overflow:hidden;background:rgba(255,255,255,.07)}
.laurem-doc-cover-art img{width:100%;height:100%;object-fit:cover}
.laurem-doc-kicker{font-size:7.5pt;font-weight:800;letter-spacing:.16em}
.laurem-doc-brand{margin-top:6mm;font-size:12pt;font-weight:800;letter-spacing:.18em}
.laurem-doc-brand span{font-weight:500}
.laurem-doc-cover h1{font-size:29pt;line-height:1.07;margin:5mm 0 3mm;max-width:120mm}
.laurem-doc-cover p{margin:0;font-size:11pt;opacity:.86}
.laurem-doc-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}
.laurem-doc-meta{background:#fff;padding:5mm 6mm;min-height:19mm}
.laurem-doc-meta span{display:block;color:var(--muted);font-size:7.5pt;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.5mm}
.laurem-doc-meta strong{display:block;font-size:9.5pt}
.laurem-doc-rule{height:2mm;background:linear-gradient(90deg,var(--accent),var(--mint),transparent)}
.laurem-doc-content{padding:11mm 13mm 8mm}
.laurem-doc-section{margin:0 0 8mm;page-break-inside:auto}
.laurem-doc-section-heading{display:flex;gap:3.5mm;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:2.5mm;margin-bottom:4mm}
.laurem-doc-section-number{display:inline-flex;align-items:center;justify-content:center;min-width:9mm;height:9mm;border-radius:999px;background:var(--pale);color:var(--accent);font-weight:800;font-size:8pt}
.laurem-doc-section h2{margin:0;font-size:16pt;line-height:1.15}
.laurem-doc-content h3{margin:5mm 0 2mm;font-size:11pt;color:var(--accent)}
.laurem-doc-content p{margin:0 0 3.2mm;color:#253a34}
.laurem-doc-content ul,.laurem-doc-content ol{margin:1mm 0 4mm 5mm;padding-left:5mm}
.laurem-doc-content li{margin-bottom:1.6mm;padding-left:1mm}
.laurem-doc-content li::marker{color:var(--accent);font-weight:700}
.laurem-doc-content strong{color:var(--ink)}
.laurem-doc-content hr{border:0;border-top:1px solid var(--line);margin:7mm 0}
.laurem-doc-figure{margin:5mm 0 6mm;border:1px solid var(--line);border-radius:5mm;overflow:hidden;background:var(--soft);break-inside:avoid}
.laurem-doc-figure img{display:block;width:100%;max-height:76mm;object-fit:cover}
.laurem-doc-figure figcaption{padding:2.5mm 4mm;font-size:8pt;color:var(--muted);font-weight:700}
.laurem-doc-signature{margin:7mm 13mm 10mm;padding:6mm;border:1px solid #bfdacf;border-radius:5mm;background:var(--soft);break-inside:avoid}
.laurem-doc-signature h2{margin:1mm 0;font-size:14pt}
.laurem-doc-signature p{margin:0;color:var(--muted)}
.laurem-doc-signature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:5mm}
.laurem-doc-signature-grid div{background:#fff;border:1px solid var(--line);border-radius:3mm;padding:3mm}
.laurem-doc-signature-grid span{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.laurem-doc-signature-grid strong{display:block;margin-top:1mm;font-size:8.5pt}
.laurem-doc-footer{display:flex;justify-content:space-between;gap:4mm;padding:4mm 13mm;color:#71817b;font-size:7pt;letter-spacing:.08em;border-top:1px solid var(--line)}
@media screen{.laurem-document{width:min(190mm,calc(100vw - 32px));margin:0 auto 30px}.laurem-doc-cover{border-radius:0}.laurem-doc-cover-art img{min-height:100%}}
@media print{body{background:#fff}.laurem-document{width:100%;margin:0;box-shadow:none}.laurem-doc-cover{page-break-after:always}.laurem-doc-content{padding-bottom:5mm}}
\`;
