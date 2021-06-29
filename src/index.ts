import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { InputDialog } from '@jupyterlab/apputils';
import * as Widgets from '@lumino/widgets';
import { INotebookTracker } from '@jupyterlab/notebook';
import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { InputArea } from '@jupyterlab/cells';
import { addComment, getComments } from './comments';
import { UUID } from '@lumino/coreutils';
import { IComment } from './commentformat';
import { CommentWidget } from './widget';
import { Cell } from '@jupyterlab/cells';
import { YNotebook } from '@jupyterlab/shared-models';
import { Awareness } from 'y-protocols/awareness';
import { getIdentity } from './utils';
import { CommentPanel } from './panel';

namespace CommandIDs {
  export const addComment = 'jl-chat:add-comment';
  export const renderComment = 'jl-chat:render-comment';
}

/**
 * Initialization data for the jupyterlab-chat extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-chat:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, nbTracker: INotebookTracker) => {
    const getAwareness = (): Awareness | undefined => {
      return (nbTracker.currentWidget?.model?.sharedModel as YNotebook)
        .awareness;
    };

    const panel = new CommentPanel();
    app.shell.add(panel, 'right', { rank: 500 });

    let insertion = new CodeEditorWrapper({
      factory: InputArea.defaultContentFactory.editorFactory,
      model: new CodeEditor.Model()
    });
    insertion.addClass('subclass-editor');
    panel.addWidget(insertion);
    insertion.node.addEventListener('keydown', e => {
      if (e.key == 'Enter') {
        commentInput(panel, nbTracker, insertion);
      }
    });

    nbTracker.activeCellChanged.connect((_, cells) => {
      panelRender(panel, nbTracker);
    });

    app.commands.addCommand(CommandIDs.addComment, {
      label: 'Add Comment',
      execute: async () => {
        const cell = nbTracker.currentWidget?.content.activeCell;
        if (cell == null) {
          return;
        }

        void InputDialog.getText({
          title: 'Enter Comment'
        }).then(value => {
          if (value.value != null) {
            const comment: IComment = {
              id: UUID.uuid4(),
              type: 'cell',
              identity: getIdentity(getAwareness()!),
              replies: [],
              text: value.value
            };

            addComment(cell.model.metadata, comment);

            console.log('set metadata of cell', cell.model.id);
            panelRender(panel, nbTracker);
          }
        });
      }
    });

    app.commands.addCommand(CommandIDs.renderComment, {
      label: 'Render Comment',
      execute: () => {
        const cell = nbTracker.currentWidget?.content.activeCell;
        if (cell == null) {
          return;
        }

        console.log(getComments(cell.model.metadata));
      }
    });

    Text;
    app.contextMenu.addItem({
      command: CommandIDs.addComment,
      selector: '.jp-Notebook .jp-Cell',
      rank: 13
    });

    app.contextMenu.addItem({
      command: CommandIDs.renderComment,
      selector: '.jp-Notebook .jp-Cell',
      rank: 14
    });
  }
};

function panelRender(panels: Widgets.Panel, tracker: INotebookTracker) {
  const length = panels.widgets.length;
  for (let i = 1; i < length; i++) {
    panels.widgets[1].dispose();
  }

  const cell = tracker.activeCell;
  if (cell == null) {
    console.log('no active cell; aborting panel render');
    return;
  }

  const comments = getComments(cell.model.metadata);
  if (comments == null) {
    console.log('no comments; aborting panel render');
    return;
  }

  console.log('comments', comments);

  const awareness = (tracker.currentWidget?.model?.sharedModel as YNotebook)
    .awareness;
  if (awareness == null) {
    console.warn(
      'no Awareness found while rendering comment panel; aborting panel render'
    );
    return;
  }

  for (let comment of comments) {
    const widget = new CommentWidget<Cell>({
      awareness,
      id: comment.id,
      target: cell,
      metadata: cell.model.metadata
    });
    panels.addWidget(widget);
  }
}

function commentInput(
  panels: Widgets.Panel,
  tracker: INotebookTracker,
  wrapper: CodeEditorWrapper
) {
  const cell = tracker.activeCell;
  if (cell == null) {
    return;
  }

  const metadata = cell.model.metadata;
  const comment = getComments(metadata);
  if (comment == null) {
    return;
  }

  const awareness = (tracker.currentWidget?.model?.sharedModel as YNotebook)
    .awareness;
  if (awareness == null) {
    console.warn('no Awareness found while adding cell comment');
    return;
  }

  const newCommentText: string = wrapper.model.value.text;
  addComment(metadata, {
    id: UUID.uuid4(),
    type: 'cell',
    identity: getIdentity(awareness),
    replies: [],
    text: newCommentText
  });

  panelRender(panels, tracker);
  wrapper.model.value.text = '';
}

export default plugin;
