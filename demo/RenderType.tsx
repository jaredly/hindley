import React from 'react';
import { Type } from '../infer/algw/algw-s2-return';
import { interleave } from './interleave';

export const colors = {
    punct: '#555',
    vbl: '#afa',
    con: '#aaf',
};

export const RenderType = ({ t }: { t: Type }) => {
    switch (t.type) {
        case 'var':
            return <span style={{ fontStyle: 'italic', color: colors.vbl }}>{t.name}</span>;
        case 'fn':
            return (
                <span style={{ color: colors.punct }}>
                    {'('}
                    {interleave(
                        t.args.map((arg, i) => <RenderType t={arg} key={i} />),
                        (i) => (
                            <span key={`sep-${i}`}>,&nbsp;</span>
                        ),
                    )}
                    {') => '}
                    <RenderType t={t.result} />
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
                            args.map((a, i) => <RenderType key={i} t={a} />),
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
                    <RenderType t={target} />(
                    {interleave(
                        args.map((a, i) => <RenderType key={i} t={a} />),
                        (i) => (
                            <span key={'c-' + i}>, </span>
                        ),
                    )}
                    )
                </span>
            );
        case 'con':
            return <span style={{ color: colors.con }}>{t.name}</span>;
    }
};
