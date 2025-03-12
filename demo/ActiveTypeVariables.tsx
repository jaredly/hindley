import React from 'react';
import { State, Tenv } from '../infer/algw/algw-s2-return';
import { colors } from './RenderType';

export const ActiveTypeVariables = ({ activeVbls, smap, glob }: { activeVbls: string[]; glob: State; smap: Tenv['scope'] }) => {
    return (
        <div
            style={{
                border: `1px solid ${colors.accent}`,
                textAlign: 'center',
                marginTop: 16,
                width: 300,
            }}
        >
            <div
                style={{
                    backgroundColor: colors.accent,
                    color: 'black',
                    gridColumn: '1/3',
                    marginBottom: 8,
                    fontFamily: 'Lora',
                    fontWeight: 'bold',
                }}
            >
                Active type variables
            </div>

            {!activeVbls.length ? (
                <div
                    style={{
                        marginTop: 24,
                        marginBottom: 16,
                    }}
                >
                    None yet
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'max-content 1fr',
                        marginLeft: 16,
                        marginTop: 24,
                        marginBottom: 16,
                        fontFamily: 'Jet Brains',
                    }}
                >
                    {activeVbls
                        .filter((k) => !smap[k])
                        .map((k) => (
                            <div style={{ display: 'contents' }} key={k}>
                                <div>{k}</div>
                                <div>{JSON.stringify(glob.tvarMeta[k])}</div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};
