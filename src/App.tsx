import {useEffect, useMemo, useState} from 'react';
import { LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from "@lexical/react/LexicalPlainTextPlugin";
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import './App.css';
import {TreeView} from '@lexical/react/LexicalTreeView';
import { $insertNodes, EditorConfig, LexicalCommand, LexicalNode, NodeKey, SerializedTextNode, TextNode, createCommand } from 'lexical';
import {
    $applyNodeReplacement,
  } from 'lexical';
import { addClassNamesToElement } from '@lexical/utils';

export const INSERT_SPIN_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_SPIN_COMMAND');

export function $createSpinNode(text = ''): SpinNode {
    return $applyNodeReplacement(new SpinNode(text));
}

export const SPIN_REGEX = new RegExp('\{\{([^|{}]+)\|([^|{}]+)\}\}');

export function isSpin(text: string){
  return SPIN_REGEX.test(text);
}
  
export function $isSpinNode(
  node: LexicalNode | null | undefined,
): node is SpinNode {
  return node instanceof SpinNode;
}
  

export class SpinNode extends TextNode {

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }
  static getType() {
    return 'spin';
  }

  static clone(node : SpinNode): SpinNode {
    return new SpinNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {

    // const tooltip = document.createElement('div');
    const spinContainer = document.createElement('span');
    const spin = super.createDOM(config)
    // spin.onclick = () => {
    //   if(tooltip.classList.contains("visible")){
    //     tooltip.classList.remove("visible")
    //   } else {
    //     tooltip.classList.add("visible")
    //   }
      
    // };

    // tooltip.appendChild(spin);
    // addClassNamesToElement(tooltip, config.theme.tooltip)
    addClassNamesToElement(spinContainer, config.theme.spinContainer)
    addClassNamesToElement(spin, config.theme.spin);
    spinContainer.append(spin);

    return spinContainer;
  }

  static importJSON(serializedNode: SerializedTextNode): SpinNode {
    const node = $createSpinNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'spin',
    };
  }
}



const matchSpin = (text:string) : any | null => {
  const skippedText: string[] = [];

  for (const word of text.split(' ')) {
    if (!isSpin(word)) {
      skippedText.push(word);
      continue;
    }
    if (skippedText.length > 0) {
      // Compensate for space between skippedText and word
      skippedText.push('');
    }

    return {
      position: skippedText.join(' ').length,
      word,
      // unifiedID: emojiReplacementMap.get(word)!,
    };
  }
}

function SpinPlugin({ onChange }: { onChange: any }) {
  // Access the editor through the LexicalComposerContext
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node: TextNode )=> {
      const textContent = node.getTextContent();

      if(textContent.includes('|')){
      const matchSpins = matchSpin(textContent);
      if(matchSpins === undefined){
        return;
      }

      let targetNode;
      if (matchSpins.position === 0) {
        // First text chunk within string, splitting into 2 parts
        [targetNode] = node.splitText(
          matchSpins.position + matchSpins.word.length,
        );
      } else {
        // In the middle of a string
        [, targetNode] = node.splitText(
          matchSpins.position,
          matchSpins.position + matchSpins.word.length,
        );
      }
  
      targetNode.replace(new TextNode(''));
      $insertNodes([$createSpinNode(matchSpins.word), new TextNode(" ")])

      // if($isSpinNode(targetNode)){
      //   if(!isSpin(textContent)){
      //     targetNode.replace($createTextNode(textContent));
      //   }
      // }
    }

    });
  }, [editor])


  // Wrap our listener in useEffect to handle the teardown and avoid stale references.
  useEffect(() => {
    // most listeners return a teardown function that can be called to clean them up.
    return editor.registerUpdateListener(({editorState}) => {
      // call onChange here to pass the latest state up to the parent.
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

const theme = {
  spin: 'spin',
  spinContainer: 'spin_container'
};




function TreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeView
      viewClassName="tree-view-output"
      treeTypeButtonClassName="debug-treetype-button"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      editor={editor}
    />
  );
}


const App = () => {

    const [editorState, setEditorState] = useState();
    function onChange(editorState : any) {
      setEditorState(editorState);
    }

    const CustomContent = useMemo(() => {
        return (
            <ContentEditable style={{
                position: 'relative',
                borderColor: 'rgba(255,211,2,0.68)',
                border: '2px solid red',
                borderRadius: '5px',
                maxWidth: '100%',
                padding: '10px'
            }}/>
        )
    }, []);

    const CustomPlaceholder = useMemo(() => {
        return (
            <div className='container' style={{
                position: 'absolute', top: 30, left: 30,
            }}>
                Enter some text...
            </div>
        )
    }, []);

    const lexicalConfig = {
        namespace: 'My Text Editor',
        theme,
        onError: (e: any) => {
            console.log('ERROR:', e)
        },
        nodes: [SpinNode]
    }

    
    return (
        <div style={{padding: '20px'}}>
            <LexicalComposer initialConfig={lexicalConfig}>
                <PlainTextPlugin
                    contentEditable={CustomContent}
                    placeholder={CustomPlaceholder}
                    ErrorBoundary={LexicalErrorBoundary}
                />
              <SpinPlugin onChange={onChange}/>
              <TreeViewPlugin />
            </LexicalComposer>
        </div>
    );
}

export default App