import React, { JSX, ReactElement, useMemo, useState } from 'react';
import { js, lex } from '../lang/lexer';
import { childLocs, fromMap, Node, Nodes, RecNodeT } from '../lang/nodes';
import { parser, ParseResult } from '../lang/algw-s2-return';
import {
    builtinEnv,
    composeSubst,
    Event,
    Expr,
    getGlobalState,
    inferExpr,
    inferStmt,
    resetState,
    StackText,
    Stmt,
    Subst,
    Tenv,
    Type,
    typeApply,
    typeFree,
    typeToString,
} from '../infer/algw/algw-s2-return';
import { Src } from '../lang/parse-dsl';
import { RenderEvent } from './RenderEvent';
import { RenderType } from './RenderType';
import { interleave } from './interleave';
import { ShowStacks } from './ShowText';

const env = builtinEnv();

// const text = `{\nlet quicksort = (arr) => {
// if (arr.length <= 1) {
// return arr}
// let pivot = arr[arr.length - 1]
// let leftArr = []
// let rightArr = []
// for (let i = 0; i < arr.length; i += 1) {
// if (arr[i] <= pivot) {
//     leftArr.push(arr[i])
// } else {
//     rightArr.push(arr[i])
// }
// }
// return [...quicksort(leftArr), pivot, ...quicksort(rightArr)]
// };quicksort}`;

// const text = `{
// let fib = (n) => {
// if (n <= 1) {return 1}
// return fib(n - 1) + fib(n - 2)
// }
// fib
// }`;

const text = `{
let example = (value, f) => {
    let things = []
    if (value > 10) {
        things.push(f(value))
    }
    things
}
    example
}`;

// const text = `(x) => {let (a, _) = x; a(2)}`;
const cst = lex(js, text);
// console.log(JSON.stringify(cst, null, 2));
const node = fromMap(cst.roots[0], cst.nodes, (idx) => idx);
// console.log(JSON.stringify(node, null, 2));
const parsed = parser.parse(node);
if (!parsed.result) throw new Error(`not parsed ${text}`);
// console.log(parsed.result);
resetState();

const glob = getGlobalState();

let res;
try {
    res = inferStmt(env, parsed.result);
    glob.events.push({ type: 'stack-break' });
} catch (err) {
    console.log('bad inference', err);
    res = null;
}

export const opener = { round: '(', square: '[', curly: '{', angle: '<' };
export const closer = { round: ')', square: ']', curly: '}', angle: '>' };
export const braceColor = 'rgb(100, 200, 200)';
export const braceColorHl = 'rgb(0, 150, 150)';

type Ctx = {
    nodes: Nodes;
    highlight: string[];
    stackSrc: Record<string, number>;
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
    const color = ctx.byLoc[id] ? (freeVbls.length ? '#afa' : 'green') : null;
    const num = ctx.stackSrc[id];
    return (
        <span
            data-id={id}
            style={{
                borderBottomWidth: multiline ? 0 : 3,
                marginBottom: 1,
                borderColor: color ?? 'transparent',
                // borderRadius: 4,
                borderStyle: 'solid',
                // backgroundColor: 'rgba(255,0,0,0.01)',
                display: !multiline ? 'inline-block' : 'inline',
                // alignItems: 'flex-start',
            }}
        >
            {multiline ? (
                <span
                    style={{
                        display: 'inline-block',
                        color: color ?? 'transparent',
                        fontWeight: 'bold',
                    }}
                >
                    {'('}
                </span>
            ) : null}
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
                {/* <span style={{ color: '#faa', backgroundColor: '#500', fontSize: '50%', borderRadius: 3 }}>{id}</span> */}
                {num ? <Num n={num} /> : null}
                {children}
            </span>
            {multiline ? (
                <span
                    style={{
                        display: 'inline-block',
                        color: color ?? 'transparent',
                        fontWeight: 'bold',
                    }}
                >
                    {')'}
                </span>
            ) : null}
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
    let style: React.CSSProperties = styles[meta?.kind as 'kwd'];
    if (ctx.highlight.includes(node.loc)) {
        if (!style) style = {};
        style.backgroundColor = '#700';
    }
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

export type OneStack =
    | { text: StackText[]; src: Src; type: 'line' }
    | { type: 'unify'; one: Type; subst: Subst; two: Type; src: Src; oneName: string; twoName: string; message?: string };

export const App = () => {
    const [at, setAt] = useState(20);

    // const stack = useMemo(() => {
    // }, [at]);

    const breaks = useMemo(() => {
        let num = 0;
        glob.events.forEach((e) => {
            if (e.type === 'stack-break') {
                num++;
            }
            if (e.type === 'unify' && Object.keys(e.subst).length) {
                num += 2;
            }
        });
        return num;
    }, []);

    const { byLoc, subst, types, scope, smap, stack } = useMemo(() => {
        const byLoc: Record<string, Type> = {};
        const subst: Subst[] = [];
        const types: { src: Src; type: Type }[] = [];
        let smap: Subst = {};
        let scope: Tenv['scope'] = {};

        const stacks: OneStack[][] = [];
        const stack: OneStack[] = [];
        top: for (let i = 0; i <= glob.events.length && at >= stacks.length; i++) {
            const evt = glob.events[i];
            switch (evt.type) {
                case 'stack-push':
                    stack.push({ text: evt.value, src: evt.src, type: 'line' });
                    break;
                case 'stack-pop':
                    stack.pop();
                    break;
                case 'stack-break':
                    stacks.push(stack.slice());
                    break;
                case 'unify':
                    const has = Object.keys(evt.subst).length;
                    if (has) {
                        stack.push(evt);
                        stacks.push(stack.slice());
                        stack.pop();
                        if (stacks.length > at) break top;
                        stack.push(evt);
                        stacks.push(stack.slice());
                        stack.pop();
                    }
                    break;
            }
            if (evt.type === 'infer') {
                if (evt.src.right) {
                    byLoc[evt.src.left + ':' + evt.src.right] = evt.value;
                } else {
                    byLoc[evt.src.left] = evt.value;
                }
                types.push({ src: evt.src, type: evt.value });
            }
            if (evt.type === 'unify') {
                subst.push(evt.subst);
                smap = composeSubst(evt.subst, smap);
            }
            if (evt.type === 'scope') {
                scope = evt.scope;
            }
        }

        Object.keys(byLoc).forEach((k) => {
            byLoc[k] = typeApply(smap, byLoc[k]);
        });
        return { byLoc, subst, types, scope, smap, stack: stacks[at] };
    }, [at]);

    // const stack = stacks.length ? stacks[at] : undefined;
    const stackSrc: Record<string, number> = {};
    stack?.forEach((item, i) => {
        stackSrc[srcKey(item.src)] = i + 1;
    });

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

    const { spans } = useMemo(() => {
        const spans: Record<string, string[]> = {};

        glob.events.forEach((evt) => {
            if (evt.type === 'infer' && evt.src.right) {
                if (!spans[evt.src.left]) spans[evt.src.left] = [];
                if (!spans[evt.src.left].includes(evt.src.right)) spans[evt.src.left].push(evt.src.right);
            }
            if (evt.type === 'stack-push' && evt.src.right) {
                if (!spans[evt.src.left]) spans[evt.src.left] = [];
                if (!spans[evt.src.left].includes(evt.src.right)) spans[evt.src.left].push(evt.src.right);
            }
        });

        return { spans };
    }, []);

    // const esrc = eventSrc(glob.events[at]);
    // const allLocs = esrc ? (esrc.right ? coveredLocs(cst.nodes, esrc.left, esrc.right) : [esrc.left]) : [];
    const allLocs: string[] = [];

    return (
        <div className="m-2">
            Hindley Milner visualization
            <div>
                <input type="range" min="0" max={breaks - 1} value={at} onChange={(evt) => setAt(+evt.target.value)} />
                {at}
            </div>
            <div>{res?.value ? typeToString(res.value) : 'NO TYPE'} </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div style={{ flex: 1 }}>
                    {cst.roots.map((root) => (
                        <RenderNode
                            key={root}
                            node={cst.nodes[root]}
                            ctx={{ stackSrc, highlight: allLocs, multis, spans, nodes: cst.nodes, parsed, byLoc }}
                        />
                    ))}
                </div>
                {/* <Substs subst={subst} /> */}
                <Sidebar stack={stack} latest={glob.events[at]} smap={smap} subst={subst} scope={scope} types={byLoc} nodes={cst.nodes} />
            </div>
            {/* <ScopeDebug scope={scope} /> */}
            {/* <div style={{ whiteSpace: 'pre' }}>{JSON.stringify(parsed.result, null, 2)}</div> */}
            {/* <div style={{ whiteSpace: 'pre' }}>{types.map((t) => `${JSON.stringify(t.src)} : ${typeToString(t.type)}`).join('\n')}</div> */}
        </div>
    );
};

const srcKey = (src: Src) => (src.right ? `${src.left}:${src.right}` : src.left);

export const Num = ({ n }: { n: number }) => (
    <span
        style={{
            padding: '0px 6px',
            backgroundColor: '#faa',
            color: 'black',
            fontSize: 12,
            borderRadius: '50%',
            marginRight: 8,
            // display: 'inline-block',
        }}
    >
        {n}
    </span>
);

const Sidebar = ({
    subst,
    smap,
    scope,
    types,
    nodes,
    latest,
    stack,
}: {
    subst: Subst[];
    stack?: OneStack[];
    smap: Subst;
    scope: Tenv['scope'];
    types: Record<string, Type>;
    nodes: Nodes;
    latest: Event;
}) => {
    const variables: Record<string, number> = {};
    Object.values(types).forEach((t) => {
        const free = typeFree(t);
        free.forEach((name) => {
            variables[name] = (variables[name] || 0) + 1;
        });
    });
    return (
        <div style={{ flex: 1 }}>
            <ShowStacks subst={smap} stack={stack} />
            <div style={{ display: 'grid', marginTop: 24, marginBottom: 16, gridTemplateColumns: 'max-content max-content', columnGap: 12 }}>
                {Object.keys(scope)
                    .filter((k) => !env.scope[k])
                    .map((k) => (
                        <div key={k} style={{ display: 'contents' }}>
                            <div>{k}</div>
                            <div>
                                {scope[k].vars.length ? `<${scope[k].vars.join(', ')}>` : ''}
                                <RenderType t={typeApply(smap, scope[k].body)} />
                            </div>
                        </div>
                    ))}
            </div>
            {/* {latest ? <RenderEvent event={latest} /> : 'NOEV'} */}
            <pre>{JSON.stringify(variables, null, 2)}</pre>
        </div>
    );
    // First: variables in scope, minus builtins
    // Second: type annotations with type variables
};

const Substs = ({ subst }: { subst: { name: string; type: Type }[] }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', justifyContent: 'flex-start', gridAutoRows: 'max-content' }}>
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
        <div style={{ whiteSpace: 'pre', display: 'grid', gridTemplateColumns: 'max-content max-content max-content', alignSelf: 'flex-start' }}>
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

export const coveredLocs = (nodes: Nodes, left: string, right: string) => {
    for (const node of Object.values(nodes)) {
        const children = childLocs(node);
        const li = children.indexOf(left);
        if (li === -1) continue;
        const ri = children.indexOf(right);
        if (ri === -1) continue;
        return children.slice(li, ri + 1);
    }
    return [left, right];
};

const eventSrc = (evt: Event) => {
    switch (evt.type) {
        case 'unify':
            // return evt.
            return;
        case 'scope':
            return;
        case 'infer':
            return evt.src;
        case 'new-var':
            return;
    }
};
