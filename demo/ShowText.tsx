import React from 'react';
import { StackText, Subst, typeApply } from '../infer/algw/algw-s2-return';
import { colors, RenderType } from './RenderType';
import { OneStack, Num, Frame } from './App';
import { ShowUnify } from './ShowUnify';

export const ShowText = ({ text, subst, hv }: { hv: string[]; text: StackText; subst: Subst }) => {
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
                    <RenderType t={text.noSubst ? text.typ : typeApply(subst, text.typ)} highlightVars={hv} />
                </span>
            );
    }
};

export const ShowStacks = ({ stack, subst, hv }: { hv: string[]; subst: Subst; stack?: Frame }) => {
    if (!stack) return null;
    return (
        <div>
            <div style={{ marginBottom: 12, fontFamily: 'Jet Brains' }}>
                {stack.stack.map((item, j) => {
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
                                first={item.first}
                                hv={hv}
                            />
                        );
                    }
                    return (
                        <div key={j} style={{ marginBottom: 10 }}>
                            <Num n={j + 1} />
                            {item.text.map((t, i) => (
                                <ShowText subst={subst} text={t} key={i} hv={hv} />
                            ))}
                        </div>
                    );
                })}
                <div style={{ fontFamily: 'Lora', fontSize: '120%', marginTop: 12 }}>{stack.title}</div>
            </div>
        </div>
    );
};
