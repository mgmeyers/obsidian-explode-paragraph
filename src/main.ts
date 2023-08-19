import { App, Editor, ListItemCache, Plugin, TFile } from 'obsidian';

const listHeaderRE = /^[ \t]*[-*+] @ +/;
const listCalloutRE = /^[ \t]*[-*+](?: [@~&?!→%^|])? +/;
const endsWithTerminal = /(?:\p{Sentence_Terminal}\p{Punctuation}*|\]\]) *$/u;

const headingRE = /^#/;
const listableHeadingRE = /^##+ /;
const headingLengthRE = /^(#+)/;
const sentenceSplitterRE = /(?<!p|pp)(\p{Sentence_Terminal}\p{Punctuation}*)/gu;

const isExploded = /[-*+] [@~]/;

function implode(app: App, file: TFile, editor: Editor) {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache || !cache.listItems?.length) return;

  const text = editor.getValue();
  const stack: string[] = [];

  let headerLevel = 1;
  let compiled = '';
  let lastHeaderParent = -Infinity;
  let paraParent = -Infinity;
  let listEnd = 0;

  const flushStack = (item?: ListItemCache) => {
    if (stack.length) {
      compiled += stack.join(' ') + '\n\n';
      stack.length = 0;
    }

    let start: number | undefined;
    if (item) {
      start = item.position.start.offset - item.position.start.col;
    }

    compiled += text.substring(listEnd, start);
  };

  for (const item of cache.listItems) {
    let listText = text.substring(
      item.position.start.offset,
      item.position.end.offset
    );

    if (listHeaderRE.test(listText)) {
      flushStack(item);
      if (item.parent < 0) {
        headerLevel = 2;
      } else if (item.parent > lastHeaderParent) {
        headerLevel++;
      } else if (item.parent < lastHeaderParent) {
        headerLevel--;
      }
      lastHeaderParent = item.parent;
      paraParent = item.position.start.line;

      compiled +=
        '#'.repeat(headerLevel) +
        ' ' +
        listText.replace(listCalloutRE, '').trim() +
        '\n\n';
    } else {
      if (item.parent === paraParent) {
        flushStack(item);
      } else if (item.parent < 0) {
        flushStack(item);
        paraParent = item.parent;
      }
      listText = listText.replace(listCalloutRE, '').trim();
      if (!endsWithTerminal.test(listText)) listText += '.';
      stack.push(listText);
    }

    listEnd = item.position.end.offset;
  }

  flushStack();

  editor.setValue(compiled.replace(/\n+/g, '\n\n'));
}

function splitSentences(str: string) {
  const out: string[] = [];
  const split = str.split(sentenceSplitterRE);

  for (let i = 0; i < split.length; i++) {
    const sent = split[i];
    if (!sent) continue;
    if (i % 2 === 1) {
      const last = out.length - 1;
      out[last] = out[last] + sent;
    } else {
      out.push(sent.trim());
    }
  }

  return out;
}

function explode(app: App, file: TFile, editor: Editor) {
  const text = editor.getValue();
  const lines = text.split(/\n+/g);
  const output: string[] = [];

  let indent = 0;

  for (const line of lines) {
    if (listableHeadingRE.test(line)) {
      const heading = line.replace(listableHeadingRE, '').trim();
      const m = line.match(headingLengthRE);
      if (m) {
        indent = m[1].length - 2;
      }
      output.push('\t'.repeat(indent) + `- @ ${heading}`);
      indent++;
      continue;
    }

    if (headingRE.test(line)) {
      if (output.length) {
        output.push(`\n${line}\n`);
      } else {
        output.push(`${line}\n`);
      }
      continue;
    }

    const sentences = splitSentences(line);

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      if (i === 0) {
        output.push('\t'.repeat(indent) + `- ~ ${sent}`);
        indent++;
      } else {
        output.push('\t'.repeat(indent) + `- ${sent}`);
      }
    }

    indent--;
  }

  editor.setValue(output.join('\n'));
}

export default class MyPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'implode',
      name: 'Implode to paragraphs',
      editorCallback: (editor, ctx) => {
        if (ctx.file) {
          implode(this.app, ctx.file, editor);
        }
      },
    });

    this.addCommand({
      id: 'explode',
      name: 'Explode to list',
      editorCallback: (editor, ctx) => {
        if (ctx.file) {
          explode(this.app, ctx.file, editor);
        }
      },
    });

    this.addCommand({
      id: 'toggle',
      name: 'Toggle implode/explode',
      editorCallback: (editor, ctx) => {
        if (ctx.file) {
          if (isExploded.test(editor.getValue())) {
            implode(this.app, ctx.file, editor);
          } else {
            explode(this.app, ctx.file, editor);
          }
        }
      },
    });
  }
}
