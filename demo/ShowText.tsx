import React from 'react';
import { StackText, Subst, typeApply } from '../infer/algw/algw-s2-return';
import { colors, RenderType } from './RenderType';
import { OneStack, Num } from './App';
import { ShowUnify } from './RenderEvent';

export const ShowText = ({ text, subst }: { text: StackText; subst: Subst }) => {
    if (typeof text === 'string') return text;
    switch (text.type) {
        case 'hole':
            return (
                <span
                    style={{
                        display: 'inline-block',
                        border: '1px solid #aaf',
                        background: text.active ? `#aaf` : 'transparent',
                        borderRadius: 3,
                        width: '1em',
                        height: '26px',
                        marginBottom: -7,
                    }}
                />
            );
        case 'kwd':
            return <span style={{ color: colors.con }}>{text.kwd}</span>;
        case 'type':
            return (
                <span
                    style={{
                        border: '1px solid #aaf',
                        borderRadius: 3,
                        display: 'inline-block',
                        padding: '0px 4px',
                    }}
                >
                    <RenderType t={typeApply(subst, text.typ)} />
                </span>
            );
    }
};

export const ShowStacks = ({ stack, subst }: { subst: Subst; stack?: OneStack[] }) => {
    if (!stack) return null;
    return (
        <div>
            <div style={{ marginBottom: 12 }}>
                {stack.map((item, j) => {
                    if (item.type === 'unify') {
                        return (
                            <ShowUnify
                                key={j}
                                oneName={item.oneName}
                                twoName={item.twoName}
                                message={item.message}
                                one={item.one}
                                two={item.two}
                                subst={item.subst}
                            />
                        );
                    }
                    return (
                        <div key={j} style={{ marginBottom: 10 }}>
                            <Num n={j + 1} />
                            {item.text.map((t, i) => (
                                <ShowText subst={subst} text={t} key={i} />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
