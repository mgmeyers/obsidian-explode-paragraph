import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { editorLivePreviewField, livePreviewState, moment } from 'obsidian';

const dateFormatting = Decoration.mark({
  class: `cm-date cm-formatting`,
})

const dateLabel = Decoration.mark({
  class: `cm-date cm-date-label`,
})

const dateDate = Decoration.mark({
  class: `cm-date cm-date-date`,
})

class DateWidget extends WidgetType {
  label: string;
  date: moment.Moment;

  constructor(label: string, date: Date) {
    super();
    this.label = label;
    this.date = moment(date);
  }

  eq(widget: this): boolean {
    return this.label === widget.label && this.date.isSame(widget.date);
  }

  toDOM() {
    return createSpan(
      {
        cls: 'cm-date-rendered',
      },
      (span) => {
        // setIcon(span.createSpan('cm-date-rendered-icon'), 'lucide-calendar');
        // span.createSpan({ cls: 'cm-date-rendered-label', text: this.label })
        span.createSpan({ cls: 'cm-date-rendered-date', text: this.date.format('YYYY-MM-DD') })
        span.createSpan({ cls: 'cm-date-rendered-time', text: this.date.format('h:mma') })
      }
    );
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const livePreviewDeco = (label: string, date: Date) => Decoration.replace({
  widget: new DateWidget(label, date),
});

const decorator = new MatchDecorator({
  regexp: /(\+{)(\s*)(?:(\D[^:]*?)(\s*:\s*))?([^}]+?)(\s*)(})/g,
  decorate(add, from, to, match, view) {
    const isLivePreview = view.state.field(editorLivePreviewField);
    if (isLivePreview && view.state.selection.ranges.every((r) => {
      return (
        !(from >= r.from && to <= r.to) &&
        !((r.from >= from && r.from <= to) || (r.to >= from && r.to <= to))
      );
    })) {
      add(from, to, livePreviewDeco(match[3], new Date(match[5])))
      return;
    }

    let pos = from;
    for (let i = 1, len = match.length; i < len; i++) {
      const m = match[i];
      if (!m) continue;
      const len = m.length;
      const next = pos + len;
      switch (i) {
        case 1:
        case 4:
        case 7:
          add(pos, next, dateFormatting);
          break;
        case 3:
          add(pos, next, dateLabel);
          break;
        case 5:
          add(pos, next, dateDate);
          break;
      }
      pos = next;
    }
  },
})

export const dateDecoPlugin = ViewPlugin.fromClass(class {
  decos: DecorationSet
  constructor(view: EditorView) {
    this.decos = decorator.createDeco(view)
  }
  update(update: ViewUpdate) {
    if (
      update.viewportChanged ||
      update.docChanged ||
      (update.view.state.field(editorLivePreviewField) &&
        update.selectionSet &&
        !update.view.plugin(livePreviewState)?.mousedown)
    ) {
      this.decos = decorator.createDeco(update.view)
    }
  }
}, {
  decorations: v => v.decos,
})
