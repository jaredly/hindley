// Quick, dirty.
//

import React, { useMemo, useState } from 'react';
import { tfns, typeApply } from '../infer/algw/algw-s2-return';
import { Type } from '../infer/algw/Type';
import { Src } from '../lang/parse-dsl';
import { interleave } from './interleave';
import { currentTheme } from './themes';

type Evt =
    | { type: 'error'; one: Type; two: Type; message: string }
    | { type: 'compare'; one: Type; two: Type; message: string }
    | { type: 'subst'; name: string; value: Type };

const varBind = (name: string, type: Type, events: Evt[]): void => {
    if (type.type === 'var' && type.name === name) {
        return;
    }
    log(events, { type: 'subst', name, value: type });
};

const log = (events: Evt[], evt: Evt) => events.push(evt);

const unify = (one: Type, two: Type, events: Evt[]): void => {
    if (one.type === 'var') {
        log(events, { type: 'compare', one, two, message: 'found a substitution for ' + one.name });
        return varBind(one.name, two, events);
    }
    if (two.type === 'var') {
        log(events, { type: 'compare', one, two, message: 'found a substitution for ' + two.name });
        return varBind(two.name, one, events);
    }
    if (one.type === 'con' && two.type === 'con') {
        if (one.name === two.name) {
            log(events, { type: 'compare', one, two, message: 'the types names are the same' });
            return;
        }
        log(events, { type: 'error', one, two, message: 'the types names are different' });
        throw new Error(`Incompatible concrete types: ${one.name} vs ${two.name}`);
    }
    if (one.type === 'fn' && two.type === 'fn') {
        if (one.args.length !== two.args.length) {
            throw new Error(`number of args is different: ${one.args.length} vs ${two.args.length}`);
        }
        log(events, {
            type: 'compare',
            one,
            two,
            message: `both are functions with ${one.args.length} ${one.args.length === 1 ? 'arg' : 'args'}`,
        });
        for (let i = 0; i < one.args.length; i++) {
            unify(one.args[i], two.args[i], events);
        }
        unify(one.result, two.result, events);
        return;
    }
    if (one.type === 'app' && two.type === 'app') {
        if (one.args.length !== two.args.length) {
            throw new Error(`number of args is different`);
        }
        log(events, {
            type: 'compare',
            one,
            two,
            message: `both are generic types with ${one.args.length} ${one.args.length === 1 ? 'arg' : 'args'}`,
        });
        unify(one.target, two.target, events);
        for (let i = 0; i < one.args.length; i++) {
            unify(one.args[i], two.args[i], events);
        }
        return;
    }
    throw new Error(`incompatible types \n${JSON.stringify(one)}\n${JSON.stringify(two)}`);
};

const runUnify = (one: Type, two: Type): Evt[] => {
    const events: Evt[] = [];
    try {
        unify(one, two, events);
    } catch (err) {
        // events.push({ type: 'error', message: (err as Error).message });
    }
    return events;
};

let i = 0;
const msrc = (): Src => ({ left: (i++).toString().padStart(2, '0') });

const typeOne: Type = tfns(
    [
        { type: 'var', name: 'a', src: msrc() },
        // { type: 'con', name: 'int', src: msrc() },
        { type: 'con', name: 'int', src: msrc() },
    ],
    { type: 'app', target: { type: 'con', name: 'Array', src: msrc() }, src: msrc(), args: [{ type: 'var', name: 'b', src: msrc() }] },
    msrc(),
);

const typeTwo: Type = tfns(
    [
        { type: 'con', name: 'bool', src: msrc() },
        { type: 'var', name: 'x', src: msrc() },
    ],
    { type: 'app', target: { type: 'con', name: 'Array', src: msrc() }, src: msrc(), args: [{ type: 'con', name: 'string', src: msrc() }] },
    msrc(),
);

const events = runUnify(typeOne, typeTwo);

export const Quick = () => {
    const [at, setAt] = useState(-1);

    const { one, two, selected, substs } = useMemo(() => {
        let one = typeOne;
        let two = typeTwo;
        let selected: string[] = [];
        const substs: { name: string; value: Type }[] = [];
        for (let i = 0; i <= at && i < events.length; i++) {
            const evt = events[i];
            switch (evt.type) {
                case 'error':
                case 'compare':
                    selected = [evt.one.src.left, evt.two.src.left];
                    break;
                case 'subst':
                    one = typeApply({ [evt.name]: evt.value }, one);
                    two = typeApply({ [evt.name]: evt.value }, two);
                    substs.push({ name: evt.name, value: evt.value });
                    break;
            }
        }
        if (at === events.length) selected = [];
        return { one, two, selected, substs };
    }, [at, events]);
    const nevt = events[at + 1];
    const evt = events[at];

    return (
        <div style={{ backgroundColor: '#efefef', padding: 32, color: 'black', fontFamily: 'Lexend' }}>
            <label>
                Event: <input type="range" min="-1" value={at} max={events.length} onChange={(evt) => setAt(+evt.target.value)} />
                <span style={{}}> {at + 1} </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: 'Jet Brains', padding: 16, height: 224 }}>
                <RenderType t={one} selected={selected} />
                <div style={{ flexBasis: 8, flexShrink: 0 }} />
                <RenderType t={two} selected={selected} />
                <div style={{ flexBasis: 8, flexShrink: 0 }} />
                <div style={{ fontFamily: 'Lexend' }}>
                    {evt?.type === 'compare' ? (
                        evt.message
                    ) : evt?.type === 'subst' ? (
                        `replace variable ${evt.name}`
                    ) : evt?.type === 'error' ? (
                        <span style={{ color: 'red', fontStyle: 'italic' }}>{evt.message}</span>
                    ) : at === events.length ? (
                        'types are now equal'
                    ) : (
                        <>&nbsp;</>
                    )}
                </div>
                <div style={{ flexBasis: 8, flexShrink: 0 }} />
                <div style={{ opacity: substs.length || nevt?.type === 'subst' ? 1 : 0, fontFamily: 'Lexend', textDecoration: 'underline' }}>
                    Substitutions
                </div>
                {substs.map(({ name, value }) => (
                    <div key={name}>
                        <RenderType t={{ type: 'var', name: name, src: { left: '' } }} selected={[]} /> -&gt; <RenderType t={value} selected={[]} />
                    </div>
                ))}
                {nevt?.type === 'subst' ? (
                    <div>
                        <RenderType t={{ type: 'var', name: nevt.name, src: { left: '' } }} selected={[]} /> -&gt;{' '}
                        <RenderType t={nevt.value} selected={[]} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const colors = currentTheme.typeColors;
//     {
//     accent: '#e57360',
//     punct: '#666',
//     vbl: 'rgb(0 111 185)',
//     con: 'rgb(89 24 212)', // '#a204c8', //'#000', //'#aaf',
//     // con: '#b7b7b7', //'#aaf',
//     // hl: '#aaf', //'rgb(237 255 0)',
//     // hl2: '#ffa', //'rgb(237 255 0)',
// };

const hlstyle = {
    background: '#ffa',
    // color: colors.vbl,
    // textDecoration: 'underline',
    // padding: '0 4px',

    borderRadius: 4,
    // display: 'inline-block',
    // border: '1px solid ' + colors.vbl,
};

const Light = ({ children, t, selected }: { selected: string[]; t: Type; children: React.ReactNode }) => {
    if (selected.includes(t.src.left)) {
        return <span style={hlstyle}>{children}</span>;
    }
    return (
        <span
            style={
                {
                    // border: '1px solid transparent',
                }
            }
        >
            {children}
        </span>
    );
};

const RenderType = ({ t, selected }: { t: Type; selected: string[] }) => {
    switch (t.type) {
        case 'var':
            return (
                <Light t={t} selected={selected}>
                    <span
                        style={{
                            fontStyle: 'italic',
                            // borderRadius: 6,
                            display: 'inline-block',
                            padding: '0 2px 0 0',
                            // border: '1px solid transparent',
                            color: colors.vbl,
                            // cursor: 'pointer',
                        }}
                    >
                        {t.name}
                    </span>
                </Light>
            );
        case 'fn':
            return (
                <span style={{ color: colors.punct }}>
                    <Light t={t} selected={selected}>
                        {'('}
                        {interleave(
                            t.args.map((arg, i) => <RenderType t={arg} key={i} selected={selected} />),
                            (i) => (
                                <span key={`sep-${i}`}>,&nbsp;</span>
                            ),
                        )}
                        {') => '}
                        <RenderType t={t.result} selected={selected} />
                    </Light>
                </span>
            );
        case 'app':
            const args: Type[] = t.args;
            let target = t.target;
            // while (target.type === 'app') {
            //     args.unshift(target.arg);
            //     target = target.target;
            // }
            if (target.type === 'con' && target.name === ',') {
                return (
                    <span style={{ color: colors.punct }}>
                        <Light t={t} selected={selected}>
                            (
                            {interleave(
                                args.map((a, i) => <RenderType key={i} t={a} selected={selected} />),
                                (i) => (
                                    <span key={'c-' + i}>, </span>
                                ),
                            )}
                            )
                        </Light>
                    </span>
                );
            }
            return (
                <span style={{ color: colors.punct }}>
                    <Light t={t} selected={selected}>
                        <RenderType t={target} selected={selected} />
                        &lt;
                        {interleave(
                            args.map((a, i) => <RenderType key={i} t={a} selected={selected} />),
                            (i) => (
                                <span key={'c-' + i}>, </span>
                            ),
                        )}
                        &gt;
                    </Light>
                </span>
            );
        case 'con':
            return (
                <span style={{ color: colors.con }}>
                    <Light t={t} selected={selected}>
                        {t.name}
                    </Light>
                </span>
            );
    }
};
