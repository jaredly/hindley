// Quick, dirty.
//

import React, { useMemo, useState } from 'react';
import { tfns, typeApply } from '../infer/algw/algw-s2-return';
import { Type } from '../infer/algw/Type';
import { Src } from '../lang/parse-dsl';
import { interleave } from './interleave';

type Evt = { type: 'compare'; one: Type; two: Type } | { type: 'subst'; name: string; value: Type };

const varBind = (name: string, type: Type, events: Evt[]): void => {
    if (type.type === 'var' && type.name === name) {
        return;
    }
    log(events, { type: 'subst', name, value: type });
};

const log = (events: Evt[], evt: Evt) => events.push(evt);

const unify = (one: Type, two: Type, events: Evt[]): void => {
    log(events, { type: 'compare', one, two });

    if (one.type === 'var') {
        return varBind(one.name, two, events);
    }
    if (two.type === 'var') {
        return varBind(two.name, one, events);
    }
    if (one.type === 'con' && two.type === 'con') {
        if (one.name === two.name) return;
        throw new Error(`Incompatible concrete types: ${one.name} vs ${two.name}`);
    }
    if (one.type === 'fn' && two.type === 'fn') {
        if (one.args.length !== two.args.length) {
            throw new Error(`number of args is different: ${one.args.length} vs ${two.args.length}`);
        }
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
    unify(one, two, events);
    return events;
};

let i = 0;
const msrc = (): Src => ({ left: (i++).toString().padStart(2, '0') });

const typeOne: Type = tfns(
    [
        { type: 'var', name: 'a', src: msrc() },
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

    return (
        <div style={{ backgroundColor: '#efefef', padding: 32, color: 'black', fontFamily: 'Lexend' }}>
            <label>
                Event: <input type="range" min="-1" value={at} max={events.length} onChange={(evt) => setAt(+evt.target.value)} />
                <span style={{}}> {at + 1} </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: 'Jet Brains', padding: 16 }}>
                <RenderType t={one} onClick={() => {}} selected={selected} />
                <div style={{ flexBasis: 8 }} />
                <RenderType t={two} onClick={() => {}} selected={selected} />
                <div style={{ flexBasis: 8 }} />
                <div style={{ fontFamily: 'Lexend', textDecoration: 'underline' }}>Substitutions</div>
                {substs.map(({ name, value }) => (
                    <div key={name}>
                        <RenderType t={{ type: 'var', name: name, src: { left: '' } }} onClick={() => {}} selected={[]} /> -&gt;{' '}
                        <RenderType t={value} selected={[]} onClick={() => {}} />
                    </div>
                ))}
                {nevt?.type === 'subst' ? (
                    <div>
                        <RenderType t={{ type: 'var', name: nevt.name, src: { left: '' } }} onClick={() => {}} selected={[]} /> -&gt;{' '}
                        <RenderType t={nevt.value} selected={[]} onClick={() => {}} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const colors = {
    accent: '#e57360',
    // accent: '#aaf',
    // accentLight: '#aaf',
    // accentLightRgba: 'rgba(170, 170, 255, 0.3)',
    punct: '#666',
    // punct: '#555',
    vbl: 'rgb(0 111 185)', //'#d32600', //#afa',
    con: 'rgb(89 24 212)', // '#a204c8', //'#000', //'#aaf',
    // con: '#b7b7b7', //'#aaf',
    // hl: '#aaf', //'rgb(237 255 0)',
    // hl2: '#ffa', //'rgb(237 255 0)',
};

const hlstyle = {
    background: '#ffa',
    // color: colors.vbl,
    // textDecoration: 'underline',
    // padding: '0 4px',
    // lineHeight: '18px',

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

const RenderType = ({ t, selected, onClick }: { t: Type; selected: string[]; onClick(vname: string): void }) => {
    switch (t.type) {
        case 'var':
            return (
                <span
                    style={{
                        fontStyle: 'italic',
                        borderRadius: 6,
                        lineHeight: '18px',
                        display: 'inline-block',
                        border: '1px solid transparent',
                        color: colors.vbl,
                        cursor: 'pointer',
                    }}
                    onClick={() => onClick(t.name)}
                >
                    <Light t={t} selected={selected}>
                        {t.name}
                    </Light>
                </span>
            );
        case 'fn':
            return (
                <span style={{ color: colors.punct }}>
                    <Light t={t} selected={selected}>
                        {'('}
                        {interleave(
                            t.args.map((arg, i) => <RenderType t={arg} key={i} selected={selected} onClick={onClick} />),
                            (i) => (
                                <span key={`sep-${i}`}>,&nbsp;</span>
                            ),
                        )}
                        {') => '}
                        <RenderType t={t.result} selected={selected} onClick={onClick} />
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
                                args.map((a, i) => <RenderType key={i} t={a} selected={selected} onClick={onClick} />),
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
                        <RenderType t={target} selected={selected} onClick={onClick} />
                        &lt;
                        {interleave(
                            args.map((a, i) => <RenderType key={i} t={a} selected={selected} onClick={onClick} />),
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
