import React from 'react';
import { Type, Subst } from '../infer/algw/algw-s2-return';
import { colors, RenderType } from './RenderType';

export const ShowUnify = ({
    one,
    two,
    oneName,
    twoName,
    subst,
    message,
}: {
    one: Type;
    two: Type;
    subst: Subst;
    oneName: string;
    twoName: string;
    message?: string;
}) => {
    return (
        <div
            style={{
                border: `1px solid ${colors.accent}`,
                textAlign: 'center',
                display: 'inline-grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: 8,
            }}
        >
            <div style={{ minWidth: 0, gridColumn: '1/3' }}>{message}</div>
            <div
                style={{ backgroundColor: colors.accent, color: 'black', gridColumn: '1/3', marginBottom: 8, fontFamily: 'Lora', fontWeight: 'bold' }}
            >
                unify
            </div>
            {/* <div style={{ display: 'contents' }}> */}
            <span style={{ textAlign: 'right', marginLeft: 8, fontFamily: 'Lora', fontStyle: 'italic' }}>{oneName}</span>
            <div style={{ textAlign: 'left', marginRight: 8 }}>
                <RenderType t={one} />
            </div>
            {/* </div> */}
            <div
                style={{ backgroundColor: colors.accent, color: 'black', gridColumn: '1/3', marginBlock: 8, fontFamily: 'Lora', fontWeight: 'bold' }}
            >
                with
            </div>
            {/* <div> */}
            <span style={{ textAlign: 'right', marginLeft: 8, fontFamily: 'Lora', fontStyle: 'italic' }}>{twoName}</span>
            <div style={{ textAlign: 'left', marginRight: 8 }}>
                <RenderType t={two} />
            </div>
            {/* </div> */}
            <div
                style={{ backgroundColor: colors.accent, color: 'black', gridColumn: '1/3', marginBlock: 8, fontFamily: 'Lora', fontWeight: 'bold' }}
            >
                substitutions:
            </div>
            <div
                style={{
                    display: 'grid',
                    gridColumn: '1/3',
                    gridTemplateColumns: '1fr max-content max-content max-content 1fr',
                    columnGap: 8,
                    paddingBottom: 8,
                }}
            >
                {Object.entries(subst).map(([key, type]) => (
                    <div key={key} style={{ display: 'contents' }}>
                        <div />
                        <RenderType t={{ type: 'var', name: key }} />
                        <div>{'->'}</div>
                        <RenderType t={type} />
                        <div />
                    </div>
                ))}
            </div>
        </div>
    );
};
