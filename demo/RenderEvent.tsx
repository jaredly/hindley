import React from 'react';
import { Event, getGlobalState, Subst, Type } from '../infer/algw/algw-s2-return';
import { colors, RenderType } from './RenderType';

const accent = '#aaf';

export const ShowUnify = ({ one, two, subst, message }: { one: Type; two: Type; subst: Subst; message: string }) => {
    return (
        <div style={{ border: `1px solid ${accent}`, textAlign: 'center' }}>
            {message}
            <div style={{ backgroundColor: accent, color: 'black' }}>unify</div>
            <div>
                <RenderType t={one} />
            </div>
            <div style={{ backgroundColor: accent, color: 'black' }}>with</div>
            <div>
                <RenderType t={two} />
            </div>
            <div style={{ backgroundColor: accent, color: 'black' }}>substitutions:</div>
            <div style={{ height: 2, backgroundColor: accent }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr max-content max-content max-content 1fr', columnGap: 8 }}>
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

export const RenderEvent = ({ event }: { event: Event }) => {
    switch (event.type) {
        case 'new-var':
            return (
                <span>
                    New Variable {event.name}
                    <div>{JSON.stringify(getGlobalState().tvarMeta[event.name])}</div>
                </span>
            );
        case 'infer':
            return (
                <span>
                    Inferred {JSON.stringify(event.src)} <RenderType t={event.value} />
                </span>
            );
        case 'unify':
            return (
                <ShowUnify message={event.message} one={event.one} two={event.two} subst={event.subst} />
                // <div>
                //     <div>
                //         <RenderType t={event.one} />
                //     </div>
                //     <div>
                //         <RenderType t={event.two} />
                //     </div>
                //     <div>
                //         {Object.entries(event.subst).map(([key, type]) => (
                //             <div key={key}>
                //                 {key} : <RenderType t={type} />
                //             </div>
                //         ))}
                //     </div>
                // </div>
            );
        case 'scope':
            return <span>scope</span>;
    }
};
