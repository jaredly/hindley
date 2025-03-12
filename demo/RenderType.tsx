import React from 'react';
import { Scheme, Type } from '../infer/algw/algw-s2-return';
import { interleave } from './interleave';

export const colors = {
    accent: '#aaf',
    punct: '#555',
    vbl: '#afa',
    con: '#aaf',
    hl: 'rgb(237 255 0)',
};

const hlstyle = {
    background: colors.hl, //'#550',
    color: 'black',
    padding: '0 4px',
    lineHeight: '18px',

    borderRadius: '50%',
    display: 'inline-block',
    border: '1px solid ' + colors.hl,
};

export const RenderScheme = ({ s, highlightVars }: { s: Scheme; highlightVars: string[] }) => {
    if (!s.vars.length) return <RenderType t={s.body} highlightVars={highlightVars} />;
    highlightVars = highlightVars.filter((h) => !s.vars.includes(h));
    return (
        <span>
            &lt;
            {s.vars.map((v, i) => (
                <RenderType t={{ type: 'var', name: v }} key={i} highlightVars={[]} />
            ))}
            &gt;
            <RenderType t={s.body} highlightVars={highlightVars} />
        </span>
    );
};

export const RenderType = ({ t, highlightVars }: { t: Type; highlightVars: string[] }) => {
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
                        ...(highlightVars.includes(t.name) ? hlstyle : undefined),
                    }}
                >
                    {t.name}
                </span>
            );
        case 'fn':
            return (
                <span style={{ color: colors.punct }}>
                    {'('}
                    {interleave(
                        t.args.map((arg, i) => <RenderType t={arg} key={i} highlightVars={highlightVars} />),
                        (i) => (
                            <span key={`sep-${i}`}>,&nbsp;</span>
                        ),
                    )}
                    {') => '}
                    <RenderType t={t.result} highlightVars={highlightVars} />
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
                        (
                        {interleave(
                            args.map((a, i) => <RenderType key={i} t={a} highlightVars={highlightVars} />),
                            (i) => (
                                <span key={'c-' + i}>, </span>
                            ),
                        )}
                        )
                    </span>
                );
            }
            return (
                <span style={{ color: colors.punct }}>
                    <RenderType t={target} highlightVars={highlightVars} />
                    &lt;
                    {interleave(
                        args.map((a, i) => <RenderType key={i} t={a} highlightVars={highlightVars} />),
                        (i) => (
                            <span key={'c-' + i}>, </span>
                        ),
                    )}
                    &gt;
                </span>
            );
        case 'con':
            return <span style={{ color: colors.con }}>{t.name}</span>;
    }
};
