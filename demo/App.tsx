import React from 'react';
import { js, lex } from '../lang/lexer';
import { fromMap, Node, Nodes } from '../lang/nodes';
import { parser, ParseResult } from '../lang/algw-s2-return';
import { builtinEnv, Expr, inferExpr, inferStmt, resetState, Stmt, typeToString } from '../infer/algw/algw-s2-return';

const env = builtinEnv();
const text = `{\nlet quicksort = (arr) => {
if (arr.length <= 1) {
return arr}
let pivot = arr[arr.length - 1]
let leftArr = []
let rightArr = []
for (let i = 0; i < arr.length; i += 1) {
if (arr[i] < pivot) {
    leftArr.push(arr[i])
} else {
    rightArr.push(arr[i])
}
}
return [...quicksort(leftArr), pivot, ...quicksort(rightArr)]
};quicksort}`;
// const text = `(x) => {let (a, _) = x; a(2)}`;
const cst = lex(js, text);
// console.log(JSON.stringify(cst, null, 2));
const node = fromMap(cst.roots[0], cst.nodes, (idx) => idx);
// console.log(JSON.stringify(node, null, 2));
const parsed = parser.parse(node);
if (!parsed.result) throw new Error(`not parsed ${text}`);
// console.log(parsed.result);
resetState();

console.log(parsed);
console.log(node);

let res;
try {
    res = inferStmt(env, parsed.result);
} catch (err) {
    console.log('bad inference', err);
    res = null;
}

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

type Ctx = { nodes: Nodes; parsed: ParseResult<Stmt> };

const styles = {
    kwd: { color: 'green' },
    punct: { color: 'gray' },
    unparsed: { color: 'red' },
};

const RenderNode = ({ node, ctx }: { node: Node; ctx: Ctx }) => {
    const meta = ctx.parsed.ctx.meta[node.loc];
    const style = styles[meta?.kind as 'kwd'];
    switch (node.type) {
        case 'id':
            return <span style={style}>{node.text}</span>;
        case 'text':
            return (
                <span style={style}>
                    "
                    {node.spans.map((span, i) =>
                        span.type === 'text' ? (
                            <span key={i}>{span.text}</span>
                        ) : (
                            <span key={span.item}>
                                {'${'}
                                <RenderNode node={ctx.nodes[span.item]} ctx={ctx} />
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
                    <span style={style}>
                        {node.children.map((i) => (
                            <RenderNode key={i} node={ctx.nodes[i]} ctx={ctx} />
                        ))}
                    </span>
                );
            }
            if (node.kind === 'spaced') {
                return (
                    <span style={style}>
                        {interleave(
                            node.children.map((i) => <RenderNode key={i} node={ctx.nodes[i]} ctx={ctx} />),
                            (i) => (
                                <span key={'mid-' + i}>&nbsp;</span>
                            ),
                        )}
                    </span>
                );
            }
            return (
                <span style={style}>
                    {opener[node.kind]}
                    {/* {node.forceMultiline ? <br /> : null} */}
                    {interleave(
                        node.children.map((id) => (
                            <span key={id} style={node.forceMultiline ? { marginLeft: 16, display: 'block' } : undefined}>
                                <RenderNode key={id} node={ctx.nodes[id]} ctx={ctx} />
                                {node.forceMultiline ? (node.kind === 'curly' ? null : ',') : null}
                            </span>
                        )),
                        (i) => (node.forceMultiline ? null : <span key={'mid-' + i}>{node.kind === 'curly' ? '; ' : ', '}</span>),
                    )}
                    {/* {node.forceMultiline ? <br /> : null} */}
                    {closer[node.kind]}
                </span>
            );
        case 'table':
            return <span style={style}>TABLE</span>;
    }
};

export const App = () => {
    return (
        <div className="m-2">
            Hello
            <div>{res?.value ? typeToString(res.value) : 'NO TYPE'} </div>
            <div>
                {cst.roots.map((root) => (
                    <RenderNode key={root} node={cst.nodes[root]} ctx={{ nodes: cst.nodes, parsed }} />
                ))}
            </div>
        </div>
    );
};
