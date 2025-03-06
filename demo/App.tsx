import React from 'react';
import { js, lex } from '../lang/lexer';
import { fromMap, Node, Nodes } from '../lang/nodes';
import { parser } from '../lang/algw-s2';
import { builtinEnv, inferExpr, resetState, typeToString } from '../infer/algw/algw-s2';

const env = builtinEnv();
const text = `let quicksort = (arr) => {\nif (length(arr) <= 1) {\nreturn arr}}`;
// const text = `(x) => {let (a, _) = x; a(2)}`;
const cst = lex(js, text);
// console.log(JSON.stringify(cst, null, 2));
const node = fromMap(cst.roots[0], cst.nodes, (idx) => ({ id: '', idx }));
// console.log(JSON.stringify(node, null, 2));
const parsed = parser.parse(node);
if (!parsed.result) throw new Error(`not parsed ${text}`);
// console.log(parsed.result);
resetState();
const res = inferExpr(env, parsed.result);

console.log(parsed);
console.log(node);
console.log('res', res);

export const opener = { round: '(', square: '[', curly: '{', angle: '<' };
export const closer = { round: ')', square: ']', curly: '}', angle: '>' };
export const braceColor = 'rgb(100, 200, 200)';
export const braceColorHl = 'rgb(0, 150, 150)';

export const interleave = <T,>(items: T[], sep: (i: number) => T) => {
    const res: T[] = [];
    items.forEach((item, i) => {
        if (i > 0) {
            res.push(sep(i - 1));
        }
        res.push(item);
    });
    return res;
};

const RenderNode = ({ node, nodes }: { node: Node; nodes: Nodes }) => {
    switch (node.type) {
        case 'id':
            return node.text;
        case 'text':
            return (
                <span>
                    "
                    {node.spans.map((span, i) =>
                        span.type === 'text' ? (
                            <span key={i}>{span.text}</span>
                        ) : (
                            <span key={span.item}>
                                {'${'}
                                <RenderNode node={nodes[span.item]} nodes={nodes} />
                                {'}'}
                            </span>
                        ),
                    )}
                    "
                </span>
            );
        case 'list':
            if (node.kind === 'smooshed') {
                return (
                    <span>
                        {node.children.map((i) => (
                            <RenderNode key={i} node={nodes[i]} nodes={nodes} />
                        ))}
                    </span>
                );
            }
            if (node.kind === 'spaced') {
                return (
                    <span>
                        {interleave(
                            node.children.map((i) => <RenderNode key={i} node={nodes[i]} nodes={nodes} />),
                            (i) => (
                                <span key={'mid-' + i}>&nbsp;</span>
                            ),
                        )}
                    </span>
                );
            }
            return (
                <span>
                    {opener[node.kind]}
                    {/* {node.forceMultiline ? <br /> : null} */}
                    {interleave(
                        node.children.map((id) => (
                            <span key={id} style={node.forceMultiline ? { marginLeft: 16, display: 'block' } : undefined}>
                                <RenderNode key={id} node={nodes[id]} nodes={nodes} />
                            </span>
                        )),
                        (i) => (
                            <span key={'mid-' + i}>
                                {node.kind === 'curly' ? ';' : ','}
                                {node.forceMultiline ? <br /> : null}
                            </span>
                        ),
                    )}
                    {/* {node.forceMultiline ? <br /> : null} */}
                    {closer[node.kind]}
                </span>
            );
        case 'table':
            return <span>TABLE</span>;
    }
};

export const App = () => {
    return (
        <div>
            Hello
            <div>{res ? typeToString(res) : 'NO TYPE'} </div>
            <div>
                {cst.roots.map((root) => (
                    <RenderNode key={root} node={cst.nodes[root]} nodes={cst.nodes} />
                ))}
            </div>
        </div>
    );
};
