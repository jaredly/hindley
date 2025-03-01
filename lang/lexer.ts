/**
 * Lex text into the CST
 */

import { Collection, List, ListKind, NodeID, Nodes, NodeT, RecCollection, RecList, RecNodeT } from './nodes';

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

type Pos = { start: number; end: number; id: string };

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
    const nodes: Record<string, NodeT<Pos>> = {};
    const path: string[] = [];
    const ts = ticker();

    const add = (node: NodeT<Pos>) => {
        nodes[node.loc.id] = node
        const parent = nodes[path[path.length - 1]] as List<Pos>
        if (parent.children.length === 0 || parent.kind === 'smooshed') {
            parent.children.push(node.loc.id)
            return
        }
        const at = parent.children.length -1
        if (parent.children[at] === '') {
            parent.children[at] = node.loc.id
            return
        }
        const prev = parent.children[at]
        const smoosh: List<Pos> = {type: 'list', kind: 'smooshed',  children: [prev, node.loc.id], loc: {id: ts(), start: nodes[prev].loc.start, end: node.loc.end}}
        parent.children[at] = smoosh.loc.id
        nodes[smoosh.loc.id] = smoosh
        path.push(smoosh.loc.id)
    }

    let i = 0;
    while (i < input.length) {
        const char = input[i];
        let parent = nodes[path[path.length - 1]] as List<Pos>;

        const wrap = wrapKind(char);
        if (wrap) {
            const loc: Pos = { start: i, end: i, id: ts() };
            add({ type: 'list', kind: wrap, children: [], loc };)
            path.push(loc.id);
            i++;
            continue;
        }

        const close = closerKind(char);
        if (close) {
            while (parent.kind === 'smooshed' || parent.kind === 'spaced') {
                path.pop()
                parent.loc.end = i
                parent = nodes[path[path.length - 1]] as List<Pos>;
            }
            if (close !== parent.kind) {
                throw new Error(`unexpected close ${close} - expected ${parent.kind}`);
            }
            i++;
            parent.loc.end = i;
            path.pop();
            continue;
        }

        const kind = textKind(char, config);
        switch (kind) {
            case 'space':
                if (parent.kind === 'spaced') {
                    parent.children.push('');
                    i++;
                } else {
                    const prev = parent.children[parent.children.length - 1];
                    if (!prev) {
                        throw new Error('add a blank');
                    }
                    const loc: Pos = { start: i, end: i, id: ts() };
                    parent.children[parent.children.length - 1] = loc.id;
                    path.push(loc.id);
                    nodes[loc.id] = { type: 'list', kind: 'spaced', children: [prev, ''], loc };
                    i++;
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
