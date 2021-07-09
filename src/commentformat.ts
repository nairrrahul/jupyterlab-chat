//import { ICellModel } from "@jupyterlab/cells";
import { CodeEditor } from "@jupyterlab/codeeditor";

/**
 * A type for the 'target' of a comment.
 */
export type CommentType = 'null' | 'cell' | 'text';

/**
 * A type for the identity of a commentor.
 */
export interface IIdentity {
  id: number;
  name: string;
  color: string;
}

/**
 * A type for the properties of a text selection
 */
export interface ISelection {
  start: CodeEditor.IPosition;
  end: CodeEditor.IPosition;
  //source: ICellModel;
  content: String;
}

/**
 * A type for the metadata representation of a comment.
 */
export type IComment = {
  id: string;
  type: CommentType;
  identity: IIdentity;
  replies: IComment[];
  text: string;
  time: string;
  selection?: ISelection;
};
