import React, { JSX, ReactElement, useMemo, useState } from 'react';
import { js, lex } from '../lang/lexer';
import { childLocs, fromMap, Node, Nodes } from '../lang/nodes';
import { parser, ParseResult } from '../lang/algw-s2-return';
import {
    builtinEnv,
    Expr,
    getGlobalState,
    inferExpr,
    inferStmt,
    resetState,
    Stmt,
    Subst,
    Tenv,
    Type,
    typeApply,
    typeFree,
    typeToString,
} from '../infer/algw/algw-s2-return';
import { Src } from '../lang/parse-dsl';

const env = builtinEnv();
const text = `{\nlet quicksort = (arr) => {
if (arr.length <= 1) {
return arr}
let pivot = arr[arr.length - 1]
let leftArr = []
let rightArr = []
for (let i = 0; i < arr.length; i += 1) {
if (arr[i] <= pivot) {
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

const glob = getGlobalState();

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

type Ctx = {
    nodes: Nodes;
    parsed: ParseResult<Stmt>;
    byLoc: Record<string, Type>;
    spans: Record<string, string[]>;
    multis: Record<string, true>;
};

const styles = {
    kwd: { color: 'green' },
    punct: { color: 'gray' },
    unparsed: { color: 'red' },
};

const traverse = (id: string, nodes: Nodes, f: (node: Node, path: string[]) => void, path: string[] = []) => {
    f(nodes[id], path);
    const next = path.concat([id]);
    childLocs(nodes[id]).forEach((child) => traverse(child, nodes, f, next));
};

// const byLoc: Record<string, Type> = {};
// glob.events.forEach((evt) => {
//     if (evt.type === 'infer' && !evt.src.right) {
//         byLoc[evt.src.left] = evt.value;
//     }
// });

const Wrap = ({ children, id, ctx, multiline }: { children: ReactElement; id: string; ctx: Ctx; multiline?: boolean }) => {
    const t = ctx.byLoc[id];
    const freeVbls = t ? typeFree(t) : [];
    return (
        <span
            data-id={id}
            style={{
                borderWidth: 1,
                borderColor: ctx.byLoc[id] ? (freeVbls.length ? 'red' : 'green') : 'transparent',
                borderRadius: 4,
                borderStyle: 'solid',
                // backgroundColor: 'rgba(255,0,0,0.01)',
                display: !multiline ? 'inline-block' : 'inline',
                // alignItems: 'flex-start',
            }}
        >
            {/* <span style={{ color: '#faa', backgroundColor: '#500', fontSize: '50%', borderRadius: 3 }}>{id}</span> */}
            <span
                style={
                    multiline
                        ? { verticalAlign: 'top' }
                        : {
                              display: 'flex',
                              alignItems: 'flex-start',
                          }
                }
            >
                {children}
            </span>
            {/* <span
                style={{
                    display: multiline ? 'inline' : 'block',
                    fontSize: '80%',
                    color: '#666',
                }}
            >
                {t ? typeToString(t) : ''}
            </span> */}
        </span>
    );
};

const RenderNode = ({ node, ctx }: { node: Node; ctx: Ctx }) => {
    // const ty = t ? typeApply(glob.subst, t) : null;
    return (
        <Wrap id={node.loc} ctx={ctx} multiline={node.type === 'list' && node.forceMultiline}>
            <RenderNode_ node={node} ctx={ctx} />
        </Wrap>
    );
};

const RenderNode_ = ({ node, ctx }: { node: Node; ctx: Ctx }) => {
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
                const parts = partition(ctx, node.children);
                return (
                    <span style={style}>
                        <RenderGrouped spaced={false} grouped={parts} ctx={ctx} />
                    </span>
                );
            }
            if (node.kind === 'spaced') {
                const parts = partition(ctx, node.children);
                return (
                    <span style={style}>
                        <RenderGrouped spaced grouped={parts} ctx={ctx} />
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
    const [at, setAt] = useState(glob.events.length / 2);

    const multis = useMemo(() => {
        const multis: Record<string, true> = {};
        cst.roots.forEach((root) =>
            traverse(root, cst.nodes, (node, path) => {
                if (node.type === 'list' && node.forceMultiline) {
                    console.log('found one', node, path);
                    path.forEach((id) => (multis[id] = true));
                    multis[node.loc] = true;
                }
            }),
        );
        return multis;
    }, [cst]);

    const { byLoc, subst, spans, types, scope, smap } = useMemo(() => {
        const spans: Record<string, string[]> = {};
        glob.events.forEach((evt) => {
            if (evt.type === 'infer' && evt.src.right) {
                if (!spans[evt.src.left]) spans[evt.src.left] = [];
                if (!spans[evt.src.left].includes(evt.src.right)) spans[evt.src.left].push(evt.src.right);
            }
        });
        const byLoc: Record<string, Type> = {};
        const subst: { name: string; type: Type }[] = [];
        const types: { src: Src; type: Type }[] = [];
        const smap: Record<string, Type> = {};
        let scope: Tenv['scope'] = {};
        for (let i = 0; i <= at; i++) {
            const evt = glob.events[i];
            if (evt.type === 'infer') {
                if (evt.src.right) {
                    // if (!spans[evt.src.left]) spans[evt.src.left] = [];
                    // if (!spans[evt.src.left].includes(evt.src.right)) spans[evt.src.left].push(evt.src.right);
                    byLoc[evt.src.left + ':' + evt.src.right] = evt.value;
                } else {
                    byLoc[evt.src.left] = evt.value;
                }
                types.push({ src: evt.src, type: evt.value });
            }
            if (evt.type === 'subst') {
                subst.push({ name: evt.name, type: evt.value });
                Object.keys(smap).forEach((k) => (smap[k] = typeApply({ [evt.name]: evt.value }, smap[k])));
                smap[evt.name] = evt.value;
            }
            if (evt.type === 'scope') {
                scope = evt.scope;
            }
        }
        subst.forEach((s) => {
            s.type = typeApply(smap, s.type);
        });
        Object.keys(byLoc).forEach((k) => {
            byLoc[k] = typeApply(smap, byLoc[k]);
        });
        return { byLoc, subst, spans, types, scope, smap };
    }, [at]);

    return (
        <div className="m-2">
            Hindley Milner visualization
            <div>
                <input type="range" min="0" max={glob.events.length - 1} value={at} onChange={(evt) => setAt(+evt.target.value)} />
            </div>
            <div>{res?.value ? typeToString(res.value) : 'NO TYPE'} </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                    {cst.roots.map((root) => (
                        <RenderNode key={root} node={cst.nodes[root]} ctx={{ multis, spans, nodes: cst.nodes, parsed, byLoc }} />
                    ))}
                </div>
                {/* <Substs subst={subst} /> */}
                <Sidebar smap={smap} subst={subst} scope={scope} types={byLoc} nodes={cst.nodes} />
            </div>
            <div style={{ whiteSpace: 'pre' }}>{JSON.stringify(glob.events[at])}</div>
            <ScopeDebug scope={scope} />
            {/* <div style={{ whiteSpace: 'pre' }}>{JSON.stringify(parsed.result, null, 2)}</div> */}
            {/* <div style={{ whiteSpace: 'pre' }}>{types.map((t) => `${JSON.stringify(t.src)} : ${typeToString(t.type)}`).join('\n')}</div> */}
        </div>
    );
};

const Sidebar = ({
    subst,
    smap,
    scope,
    types,
    nodes,
}: {
    subst: { name: string; type: Type }[];
    smap: Subst;
    scope: Tenv['scope'];
    types: Record<string, Type>;
    nodes: Nodes;
}) => {
    const variables = {};
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'min-content min-content', columnGap: 12 }}>
                {Object.keys(scope)
                    .filter((k) => !env.scope[k])
                    .map((k) => (
                        <div key={k} style={{ display: 'contents' }}>
                            <div>{k}</div>
                            <div>
                                {scope[k].vars.length ? `<${scope[k].vars.join(', ')}>` : ''}
                                {typeToString(typeApply(smap, scope[k].body))}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
    // First: variables in scope, minus builtins
    // Second: type annotations with type variables
};

const Substs = ({ subst }: { subst: { name: string; type: Type }[] }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', justifyContent: 'flex-start', gridAutoRows: 'min-content' }}>
            {subst.map((type, i) => (
                <React.Fragment key={i}>
                    <div>{type.name}</div>
                    <div>{typeToString(type.type)}</div>
                </React.Fragment>
            ))}
        </div>
    );
};

const ScopeDebug = ({ scope }: { scope: Tenv['scope'] }) => {
    return (
        <div style={{ whiteSpace: 'pre', display: 'grid', gridTemplateColumns: 'min-content min-content min-content', alignSelf: 'flex-start' }}>
            {Object.entries(scope).map(([key, scheme]) => (
                <div key={key} style={{ display: 'contents' }}>
                    <div>{key}</div>
                    <div>{scheme.vars.length ? '<' + scheme.vars.join(',') + '>' : ''}</div>
                    <div>{typeToString(scheme.body)}</div>
                </div>
            ))}
        </div>
    );
};

const ungroup = (group: Grouped): string[] => group.children.flatMap((child) => (typeof child === 'string' ? child : ungroup(child)));

const RenderGrouped = ({ grouped, ctx, spaced }: { grouped: Grouped; ctx: Ctx; spaced: boolean }): ReactElement => {
    let children: ReactElement[] = grouped.children.map((item, i) =>
        typeof item === 'string' ? (
            <RenderNode key={item} node={ctx.nodes[item]} ctx={ctx} />
        ) : (
            <RenderGrouped key={i} grouped={item} ctx={ctx} spaced={spaced} />
        ),
    );
    if (spaced) {
        children = interleave(children, (i) => <span key={'int-' + i}>&nbsp;</span>);
    }

    const multi = ungroup(grouped).some((id) => ctx.multis[id]);
    if (!grouped.end) {
        return (
            <span
                style={
                    multi
                        ? {}
                        : {
                              display: 'inline-flex',
                              alignItems: 'flex-start',
                          }
                }
            >
                {children}
            </span>
        );
    }
    return (
        <Wrap id={grouped.id!} ctx={ctx} multiline={multi}>
            {children as any}
        </Wrap>
    );
};

type Grouped = { id?: string; end?: string; children: (string | Grouped)[] };

const partition = (ctx: Ctx, children: string[]) => {
    // const groups: Grouped = {children: []}
    const stack: Grouped[] = [{ children: [] }];
    for (let i = 0; i < children.length; i++) {
        const current = stack[stack.length - 1];
        const child = children[i];
        if (!ctx.spans[child]) {
            current.children.push(child);
            while (stack[stack.length - 1].end === child) {
                stack.pop();
            }
            continue;
        }
        const spans = ctx.spans[child].map((id) => ({ id, idx: children.indexOf(id) })).sort((a, b) => b.idx - a.idx);

        spans.forEach(({ id, idx }) => {
            const inner: Grouped = { end: id, children: [], id: `${child}:${id}` };
            stack[stack.length - 1].children.push(inner);
            stack.push(inner);
        });
        stack[stack.length - 1].children.push(child);
    }
    if (stack.length !== 1) {
        console.log(stack);
        throw new Error('didnt clen up all stacks');
    }
    return stack[0];
};
