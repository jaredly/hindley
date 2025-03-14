import React, { JSX, ReactElement, useEffect, useMemo, useState } from 'react';
import { js, lex } from '../lang/lexer';
import { childLocs, fromMap, Id, Node, Nodes, RecNodeT } from '../lang/nodes';
import { parser, ParseResult } from '../lang/algw-s2-return';
import {
    builtinEnv,
    composeSubst,
    Event,
    getGlobalState,
    inferExpr,
    inferStmt,
    resetState,
    schemeApply,
    StackText,
    Subst,
    Tenv,
    typeApply,
    typeFree,
    typeToString,
} from '../infer/algw/algw-s2-return';
import { Expr, Stmt, traverseStmt, Type } from '../infer/algw/Type';
import { Src } from '../lang/parse-dsl';
import { RenderEvent } from './RenderEvent';
import { colors, RenderScheme, RenderType } from './RenderType';
import { interleave } from './interleave';
import { ShowStacks } from './ShowText';
import { Numtip } from './Numtip';
import { LineManager, LineNumber, RenderNode } from './RenderNode';

const examples = {
    'Function & Pattern': `(one, (two, three)) => one + three`,
    One: `let f = (arg) => {
    let (one, two) = arg; one + 2}`,
    Two: '{\nlet names = [];names.push("Kai")}',
    Quicksort: `let quicksort = (input) => {
if (input.length <= 1) {
return input}
let pivot = input[input.length - 1]
let leftArr = []
let rightArr = []
for (let i = 0; i < input.length; i += 1) {
if (input[i] <= pivot) {
    leftArr.push(input[i])
} else {
    rightArr.push(input[i])
}
}
return [
...quicksort(leftArr), pivot, ...quicksort(rightArr)]
}`,
    Fibbonacci: `let fib = (n) => {
if (n <= 1) {return 1}
return fib(n - 1) + fib(n - 2)
}`,
    Example: `{
let example = (value, f) => {
    let things = []
    if (value > 10) {
        things.push(f(value))
    }
    things
}
    example
}`,
    Generic: `{
    let two = (a) => [a, a];
    (two(1), two(true))
}`,
};

// const text = `(x) => {let (a, _) = x; a(2)}`;

export const opener = { round: '(', square: '[', curly: '{', angle: '<' };
export const closer = { round: ')', square: ']', curly: '}', angle: '>' };
export const braceColor = 'rgb(100, 200, 200)';
export const braceColorHl = 'rgb(0, 150, 150)';

export type Ctx = {
    onClick(evt: NodeClick): void;
    highlightVars: string[];
    nodes: Nodes;
    highlight: string[];
    stackSrc: Record<string, { num: number; final: boolean }>;
    parsed: ParseResult<Stmt>;
    byLoc: Record<string, false | Type>;
    spans: Record<string, string[]>;
    multis: Record<string, true>;
};

export const styles = {
    decl: { color: '#c879df' },
    ref: { color: 'rgb(103 234 255)' }, //'rgb(255 90 68)' },
    number: { color: '#e6ff00' },
    kwd: { color: '#2852c7' },
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

type NodeClick = { type: 'var'; name: string } | { type: 'ref'; loc: string } | { type: 'decl'; loc: string };

export const Wrap = ({ children, id, ctx, multiline }: { children: ReactElement; id: string; ctx: Ctx; multiline?: boolean }) => {
    const t = ctx.byLoc[id];
    // const freeVbls = t ? typeFree(t) : [];
    // const color = ctx.byLoc[id] ? (freeVbls.length ? '#afa' : 'green') : null;
    const hlstyle = ctx.highlight.includes(id) ? { background: colors.accentLightRgba, outline: `1px solid ${colors.accent}` } : undefined;
    const num = ctx.stackSrc[id];
    return (
        <span
            data-id={id}
            style={{
                // marginBottom: 1,
                // borderBottomWidth: multiline ? 0 : 3,
                // borderColor: color ?? 'transparent',
                // borderStyle: 'solid',
                //
                display: !multiline ? 'inline-block' : 'inline',
                // borderRadius: 4,
                // backgroundColor: 'rgba(255,0,0,0.01)',
                // backgroundColor: bgc,
                // alignItems: 'flex-start',
            }}
        >
            {/* {multiline ? (
                <span
                    style={{
                        display: 'inline-block',
                        color: color ?? 'transparent',
                        fontWeight: 'bold',
                    }}
                >
                    {'('}
                </span>
            ) : null} */}
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
                <span style={{ ...hlstyle, borderRadius: 4 }}>
                    <span style={{ position: 'relative' }}>{num ? <Numtip inline n={num.num} final={num.final} /> : null}</span>
                    {children}
                </span>
                {t != null ? (
                    <span
                        style={{
                            // fontSize: '80%',
                            color: '#666',
                        }}
                    >
                        : {t ? <RenderType t={t} highlightVars={ctx.highlightVars} onClick={(name) => ctx.onClick({ type: 'var', name })} /> : '_'}
                    </span>
                ) : null}
            </span>
            {/* {multiline ? (
                <span
                    style={{
                        display: 'inline-block',
                        color: color ?? 'transparent',
                        fontWeight: 'bold',
                    }}
                >
                    {')'}
                </span>
            ) : null} */}
        </span>
    );
};

export type Frame = { stack: OneStack[]; title: string };

export type OneStack =
    | { text: StackText[]; src: Src; type: 'line' }
    | { type: 'unify'; one: Type; subst: Subst; two: Type; src: Src; oneName: string; twoName: string; message?: string; first?: boolean };

export const App = () => {
    const [selected, setSelected] = useState('One' as keyof typeof examples);

    return (
        <div>
            <div style={{ margin: 8 }}>
                {Object.keys(examples).map((key) => (
                    <button
                        style={{
                            padding: '2px 8px',
                            background: selected === key ? '#aaa' : 'transparent',
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: selected === key ? 'black' : undefined,
                        }}
                        key={key}
                        disabled={selected === key}
                        onClick={() => setSelected(key as keyof typeof examples)}
                    >
                        {key}
                    </button>
                ))}
            </div>
            <Example key={selected} text={examples[selected]} />
        </div>
    );
};

const nextIndex = <T,>(arr: T[], f: (t: T) => any, start = 0) => {
    console.log('starting from', start);
    for (; start < arr.length; start++) {
        if (f(arr[start])) return start;
    }
    return null;
};

export const Example = ({ text }: { text: string }) => {
    const { glob, res, cst, node, parsed } = useMemo(() => {
        const cst = lex(js, text);
        // console.log(JSON.stringify(cst, null, 2));
        const node = fromMap(cst.roots[0], cst.nodes, (idx) => idx);
        // console.log(JSON.stringify(node, null, 2));
        const parsed = parser.parse(node);
        if (!parsed.result) throw new Error(`not parsed ${text}`);
        // console.log(parsed.result);
        resetState();

        const env = builtinEnv();
        const glob = getGlobalState();

        let res;
        try {
            res = inferStmt(env, parsed.result);
        } catch (err) {
            console.log('bad inference', err);
            res = null;
        }

        return { glob, res, cst, node, parsed };
    }, [text]);

    const [at, setAt] = useState(0);

    const breaks = useMemo(() => stackForEvt(glob.events.length, glob.events), [glob.events]);

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (window.document.activeElement != document.body) return;
            if (evt.key === ' ' || evt.key === 'ArrowRight') {
                setAt((at) => Math.min(at + 1, breaks - 1));
            }
            if (evt.key === 'ArrowLeft') {
                setAt((at) => Math.max(0, at - 1));
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [breaks]);

    const relevantBuiltins = useMemo(() => {
        // const refs = Object.entries(parsed.ctx.meta)
        //     .filter(([kwd, v]) => v.kind === 'ref' || v.kind === 'bop' || v.kind === 'attribute')
        //     .map((k) => cst.nodes[k[0]])
        //     .filter((n): n is Id<string> => n.type === 'id')
        //     .map((id) => id.text);
        const refs: string[] = [];
        traverseStmt(parsed.result!, {
            visitExpr(expr) {
                if (expr.type === 'var') {
                    refs.push(expr.name);
                }
            },
        });
        const builtins: Tenv['scope'] = {};
        const tenv = builtinEnv();
        refs.forEach((ref) => {
            if (tenv.scope[ref]) {
                builtins[ref] = tenv.scope[ref];
            }
        });

        return builtins;
    }, [parsed]);

    const { byLoc, subst, types, scope, smap, stack, highlightVars, activeVbls } = useMemo(() => {
        const activeVbls: string[] = [];
        const byLoc: Record<string, Type | false> = {};
        const subst: Subst[] = [];
        const types: { src: Src; type: Type }[] = [];
        let highlightVars: string[] = [];
        let smap: Subst = {};
        let scope: Tenv['scope'] = {};

        const stacks: Frame[] = [];
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
                    stacks.push({ stack: stack.slice(), title: evt.title });
                    break;
                case 'new-var':
                    activeVbls.push(evt.name);
                    break;
                case 'unify':
                    const has = Object.keys(evt.subst).length;
                    if (has) {
                        stack.push({ ...evt, first: true });
                        stacks.push({ stack: stack.slice(), title: 'Unification result' });
                        stack.pop();
                        if (stacks.length > at) {
                            highlightVars = Object.keys(evt.subst);
                            break top;
                        }
                        stack.push(evt);
                        stacks.push({ stack: stack.slice(), title: 'Unification result' });
                        stack.pop();
                    }
                    break;
            }
            if (evt.type === 'infer') {
                if (evt.src.right) {
                    // byLoc[evt.src.left + ':' + evt.src.right] = evt.value;
                } else {
                    if (!evt.src.right && (parsed.ctx.meta[evt.src.left]?.kind === 'decl' || parsed.ctx.meta[evt.src.left]?.kind === 'fn-args')) {
                        byLoc[evt.src.left] = evt.value;
                    }
                }
                if (!evt.src.right && parsed.ctx.meta[evt.src.left]?.kind === 'decl') {
                    types.push({ src: evt.src, type: evt.value });
                }
            }
            if (evt.type === 'unify') {
                subst.push(evt.subst);
                smap = composeSubst(evt.subst, smap);
            }
            if (evt.type === 'scope') {
                scope = evt.scope;
            }
        }
        Object.entries(parsed.ctx.meta).forEach(([loc, meta]) => {
            if (meta.kind === 'decl' || meta.kind === 'fn-args') {
                if (!byLoc[loc]) byLoc[loc] = false;
            }
        });

        Object.keys(byLoc).forEach((k) => {
            if (byLoc[k]) byLoc[k] = typeApply(smap, byLoc[k]);
        });
        return { byLoc, subst, types, scope, smap, stack: stacks[at], highlightVars, activeVbls };
    }, [at]);

    const scopeToShow = useMemo(() => {
        const res: Tenv['scope'] = {};
        const env = builtinEnv();
        Object.keys(scope)
            .filter((k) => !env.scope[k])
            .forEach((k) => (res[k] = scope[k]));
        return res;
    }, [scope]);

    // const stack = stacks.length ? stacks[at] : undefined;
    const stackSrc: Record<string, { num: number; final: boolean }> = {};
    if (stack?.stack.length) {
        let last = stack.stack.length - 1;
        if (stack.stack[last].type === 'unify') last--;
        stack?.stack.forEach((item, i) => {
            // if (!stackSrc[srcKey(item.src)]) {
            stackSrc[item.src.left] = { num: i + 1, final: i === last };
            // }
        });
    }

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

    // const srcLocs = (src: Src) => (src.right ? coveredLocs(cst.nodes, src.left, src.right).concat([`${src.left}:${src.right}`]) : [src.left]);
    const srcLocs = (src: Src) => (src.right ? [`${src.left}:${src.right}`] : [src.left]);

    // const last = stack.stack[stack.stack.length - 1];
    // if (last.type === 'unify') {
    //     allLocs.push(...srcLocs(last.one.src), ...srcLocs(last.two.src));
    // }

    const ctx: Ctx = {
        stackSrc,
        highlight: allLocs,
        multis,
        spans,
        nodes: cst.nodes,
        parsed,
        byLoc,
        highlightVars,
        onClick(evt) {
            if (evt.type === 'ref' || evt.type === 'decl') {
                setAt((at) => {
                    const nat = nextIndex(
                        glob.events,
                        (gevt) => gevt.type === 'infer' && gevt.src.left === evt.loc && !gevt.src.right,
                        evtForStack(at, glob.events) + 2,
                    );
                    if (!nat) return at;
                    console.log('found it', nat);
                    const sat = stackForEvt(nat, glob.events);
                    if (sat !== 0) return sat;
                    return at;
                });
            } else {
                const nat = nextIndex(glob.events, (gevt) => gevt.type === 'unify' && gevt.subst[evt.name], evtForStack(at, glob.events) + 2);
                if (!nat) return;
                const sat = stackForEvt(nat, glob.events);
                if (sat !== 0) setAt(sat);
            }
            console.log('evt', evt);
        },
    };

    const locsInOrder = useMemo(() => {
        const inOrder: string[] = [];
        const handle = (id: string) => {
            inOrder.push(id);
            childLocs(cst.nodes[id]).forEach((child) => handle(child));
            inOrder.push(id + ':after');
        };
        cst.roots.forEach(handle);
        return inOrder;
    }, [cst]);

    return (
        <div style={{ margin: 32 }}>
            Hindley Milner visualization
            <div style={{ marginBottom: 32, marginTop: 8 }}>
                <button style={{ padding: 4, cursor: 'pointer' }} onClick={() => setAt(Math.max(0, at - 1))}>
                    ⬅️
                </button>
                <button style={{ padding: 4, cursor: 'pointer' }} onClick={() => setAt(Math.min(at + 1, breaks - 1))}>
                    ➡️
                </button>
                <input
                    type="range"
                    min="0"
                    style={{ marginLeft: 8, marginRight: 16 }}
                    max={breaks - 1}
                    value={at}
                    onChange={(evt) => setAt(+evt.target.value)}
                />
                <span style={{ display: 'inline-block', width: '5em' }}>
                    {at}/{breaks - 1}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 530, minWidth: 530, marginRight: 16, marginLeft: 24, fontFamily: 'Jet Brains' }}>
                    <LineManager inOrder={locsInOrder}>
                        {cst.roots.map((root) => (
                            <div>
                                <LineNumber loc={root} />
                                <RenderNode key={root} node={cst.nodes[root]} ctx={ctx} />
                            </div>
                        ))}
                    </LineManager>
                </div>
                <Sidebar
                    stack={stack}
                    latest={glob.events[at]}
                    smap={smap}
                    subst={subst}
                    scope={scope}
                    types={byLoc}
                    nodes={cst.nodes}
                    highlightVars={highlightVars}
                    onClick={ctx.onClick}
                />
                <div>
                    <ShowScope smap={smap} scope={{ ...relevantBuiltins, ...scopeToShow }} highlightVars={highlightVars} ctx={ctx} />
                </div>
            </div>
        </div>
    );
};

const srcKey = (src: Src) => (src.right ? `${src.left}:${src.right}` : src.left);

const Sidebar = ({
    subst,
    smap,
    scope,
    types,
    nodes,
    latest,
    stack,
    highlightVars,
    onClick,
}: {
    subst: Subst[];
    highlightVars: string[];
    stack?: Frame;
    smap: Subst;
    scope: Tenv['scope'];
    types: Record<string, Type | false>;
    nodes: Nodes;
    latest: Event;
    onClick(evt: NodeClick): void;
}) => {
    const variables: Record<string, number> = {};
    Object.values(types).forEach((t) => {
        if (!t) return;
        const free = typeFree(t);
        free.forEach((name) => {
            variables[name] = (variables[name] || 0) + 1;
        });
    });
    return (
        <div style={{ width: 500, marginRight: 8 }}>
            <ShowStacks subst={smap} stack={stack} hv={highlightVars} onClick={(name) => onClick({ type: 'var', name })} />
            {/* {latest ? <RenderEvent event={latest} /> : 'NOEV'} */}
            {/* <pre>{JSON.stringify(variables, null, 2)}</pre> */}
        </div>
    );
    // First: variables in scope, minus builtins
    // Second: type annotations with type variables
};

const ShowScope = ({ smap, scope, highlightVars, ctx }: { ctx: Ctx; smap: Subst; scope: Tenv['scope']; highlightVars: string[] }) => {
    return (
        <div
            style={{
                border: `1px solid ${colors.accent}`,
                textAlign: 'center',
                width: 400,
            }}
        >
            <div
                style={{ backgroundColor: colors.accent, color: 'black', gridColumn: '1/3', marginBottom: 8, fontFamily: 'Lora', fontWeight: 'bold' }}
            >
                Scope
            </div>
            {!Object.keys(scope).length ? (
                <div
                    style={{
                        marginTop: 24,
                        marginBottom: 16,
                    }}
                >
                    No variables defined
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        marginTop: 24,
                        marginBottom: 16,
                        gridTemplateColumns: 'max-content 1fr',
                        gridTemplateRows: 'max-content',
                        fontFamily: 'Jet Brains',
                        columnGap: 12,
                        minWidth: 200,
                    }}
                >
                    {Object.keys(scope)
                        // .filter((k) => !env.scope[k])
                        .map((k) => (
                            <div key={k} style={{ display: 'contents' }}>
                                <div style={{ textAlign: 'right', marginLeft: 16 }}>{k}</div>
                                <div style={{ textAlign: 'left' }}>
                                    <RenderScheme
                                        s={schemeApply(smap, scope[k])}
                                        highlightVars={highlightVars}
                                        onClick={(name) => ctx.onClick({ type: 'var', name })}
                                    />
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
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

export const RenderGrouped = ({ grouped, ctx, spaced }: { grouped: Grouped; ctx: Ctx; spaced: boolean }): ReactElement => {
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

export const partition = (ctx: Ctx, children: string[]) => {
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
        console.error('didnt clen up all stacks');
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

const evtForStack = (at: number, events: Event[]) => {
    let num = 0;
    let i = 0;
    for (; i < events.length && num < at; i++) {
        const e = events[i];
        if (e.type === 'stack-break') {
            num++;
        }
        if (e.type === 'unify' && Object.keys(e.subst).length) {
            num += 2;
        }
    }
    return i;
};

const stackForEvt = (at: number, events: Event[]) => {
    let num = 0;
    for (let i = 0; i < at; i++) {
        const e = events[i];
        if (e.type === 'stack-break') {
            num++;
        }
        if (e.type === 'unify' && Object.keys(e.subst).length) {
            num += 2;
        }
    }
    return num;
};
