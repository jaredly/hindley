/**
 * Lex text into the CST
 */

import { Collection, List, ListKind, NodeID, Nodes, NodeT, RecCollection, RecList, RecNodeT, Text } from './nodes';

export const lisp = {
    punct: [';', '.', '@', '=#+'],
    space: '',
    sep: ' \n',
    tableCol: ' :',
    tableRow: '\n',
    tableNew: ':',
} satisfies Config;

export const js = {
    // punct: [],
    // so js's default is just 'everything for itself'
    // tight: [...'~`!@#$%^&*_+-=\\./?:'],
    // punct: '~`!@#$%^&*_+-=\\./?:',
    punct: ['.', '/', '~`!@#$%^&*+-=\\/?:><'],
    space: ' ',
    sep: ',;\n',
    tableCol: ',:',
    tableRow: ';\n',
    tableNew: ':',
    xml: true,
} satisfies Config;

export type Config = {
    punct: string[];
    space: string;
    sep: string;
    xml?: boolean;
    tableCol: string;
    tableRow: string;
    tableNew: string;
};

// type NodeID = { start: number; end: number; id: string };

export type Kind = number | 'space' | 'sep' | 'string'; // | 'bar';

export const textKind = (grem: string, config: Config): Kind => {
    if (grem === '"') return 'string';
    if (config.sep.includes(grem)) return 'sep';
    if (config.space.includes(grem)) return 'space';
    return charClass(grem, config);
};

export const charClass = (grem: string, config: Config): number => {
    for (let i = 0; i < config.punct.length; i++) {
        if (config.punct[i].includes(grem)) {
            return i + 1;
        }
    }
    return 0; // 0 is the class for text
};

/* what is the core loop.

like, you can call 'lex'
and pass it in, like the ancestry?
maybe.
but when does it stop.
or we only ever have one function?
maybe that's what we do.

*/

const ticker = () => {
    let i = 0;
    return () => (i++).toString().padStart(3, '0');
};

export const lex = (config: Config, input: string) => {
    const nodes: Record<string, NodeT<NodeID>> = {};
    const path: string[] = [];
    const ts = ticker();
    const smap: Record<string, { start: number; end: number }> = {};

    const getParent = () => nodes[path[path.length - 1]] as List<NodeID> | Text<NodeID>;

    const add = (node: NodeT<NodeID>) => {
        nodes[node.loc] = node;
        const parent = getParent();
        if (parent.type === 'text') {
            const last = parent.spans[parent.spans.length - 1];
            if (last?.type !== 'embed') throw new Error(`need embed to put in`);
            if (last.item === '') {
                last.item = node.loc;
                return;
            }
            const prev = last.item;
            const smoosh: List<NodeID> = { type: 'list', kind: 'smooshed', children: [prev, node.loc], loc: ts() };
            smap[smoosh.loc] = { start: smap[prev].start, end: smap[node.loc].end };
            last.item = smoosh.loc;
            nodes[smoosh.loc] = smoosh;
            path.push(smoosh.loc);
            return;
        }
        if (parent.children.length === 0 || parent.kind === 'smooshed') {
            parent.children.push(node.loc);
            return;
        }
        const at = parent.children.length - 1;
        if (parent.children[at] === '') {
            parent.children[at] = node.loc;
            return;
        }
        const prev = parent.children[at];
        const smoosh: List<NodeID> = { type: 'list', kind: 'smooshed', children: [prev, node.loc], loc: ts() };
        smap[smoosh.loc] = { start: smap[prev].start, end: smap[node.loc].end };
        parent.children[at] = smoosh.loc;
        nodes[smoosh.loc] = smoosh;
        path.push(smoosh.loc);
    };

    const addSpace = () => {
        let parent = getParent();

        if (parent.type === 'list' && parent.kind === 'smooshed') {
            path.pop();
            smap[parent.loc].end = i;
            parent = getParent();
        }

        if (parent.type === 'text') {
            const last = parent.spans[parent.spans.length - 1];
            if (last?.type !== 'embed') throw new Error(`need embed to put in`);
            let prev = last.item;
            if (prev == '') {
                prev = ts();
                nodes[prev] = { type: 'id', text: '', loc: prev };
                smap[prev] = { start: i, end: i };
            }
            const space: List<NodeID> = { type: 'list', kind: 'spaced', children: [prev, ''], loc: ts() };
            smap[space.loc] = { start: smap[prev].start, end: i };
            last.item = space.loc;
            nodes[space.loc] = space;
            path.push(space.loc);
            return;
        }

        if (parent.kind === 'spaced') {
            parent.children.push('');
        } else {
            let prev = parent.children.length ? parent.children[parent.children.length - 1] : null;
            if (prev == null) {
                prev = ts();
                nodes[prev] = { type: 'id', text: '', loc: prev };
                smap[prev] = { start: i, end: i };
            }
            const loc: NodeID = ts();
            smap[loc] = { start: i + 1, end: i + 1 };
            parent.children[parent.children.length - 1] = loc;
            path.push(loc);
            nodes[loc] = { type: 'list', kind: 'spaced', children: [prev, ''], loc };
        }
    };

    const addSep = () => {
        let parent = getParent();
        if (parent.type === 'text') {
            throw new Error(`cant sep in text embed`);
        }

        while (parent.kind === 'smooshed' || parent.kind === 'spaced') {
            path.pop();
            smap[parent.loc].end = i;
            parent = getParent();
            if (parent.type === 'text') {
                throw new Error(`cant sep in text embed`);
            }
        }

        parent.children.push('');
    };

    let i = 0;
    while (i < input.length) {
        const char = input[i];
        let parent = getParent();

        if (parent.type === 'text') {
            if (char === '"') {
                path.pop();
                smap[parent.loc].end = i + 1;
                i++;
                continue;
            }
            if (char === '$' && input[i + 1] === '{') {
                const loc = ts();
                const id = ts();
                parent.spans.push({ type: 'embed', item: id, loc });
            }
            if (!parent.spans.length) {
            }
            continue;
        }

        const wrap = wrapKind(char);
        if (wrap) {
            const loc: NodeID = ts();
            smap[loc] = { start: i, end: i };
            add({ type: 'list', kind: wrap, children: [], loc });
            path.push(loc);
            i++;
            continue;
        }

        const close = closerKind(char);
        if (close) {
            while (parent.kind === 'smooshed' || parent.kind === 'spaced') {
                path.pop();
                smap[parent.loc].end = i;
                parent = getParent();
                if (parent.type === 'text') {
                    throw new Error(`cant close in a text`);
                }
            }
            if (close !== parent.kind) {
                throw new Error(`unexpected close ${close} - expected ${parent.kind}`);
            }
            i++;
            smap[parent.loc].end = i;
            path.pop();
            continue;
        }

        const kind = textKind(char, config);
        switch (kind) {
            case 'space':
                addSpace();
                i++;
                continue;
            case 'sep':
                addSep();
                i++;
                continue;
            case 'string': {
                const loc: NodeID = ts();
                smap[loc] = { start: i, end: i };
                add({ type: 'text', loc, spans: [] });
                path.push(loc);
                i++;
                continue;
            }
        }
    }
};

export const wrapKind = (key: string): ListKind<any> | void => {
    switch (key) {
        case '(':
            return 'round';
        case '{':
            return 'curly';
        case '[':
            return 'square';
        // case '<':
        //     return 'angle';
    }
};

export const closerKind = (key: string): ListKind<any> | void => {
    switch (key) {
        case ')':
            return 'round';
        case '}':
            return 'curly';
        case ']':
            return 'square';
        // case '<':
        //     return 'angle';
    }
};

// export const keyUpdate = (state: TestState, key: string, mods: Mods, visual?: Visual, config: Config = js): KeyAction[] | void => {
//     } else if (wrapKind(key)) {
//         return handleWrap(state, key);
//     } else if (closerKind(key)) {
//         return handleClose(state, key);
//     } else {
//         // TODO ctrl-enter, need to pipe it in
//         return handleKey(state, key, config, mods);
//     }
// };
