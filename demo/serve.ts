import { existsSync, readFileSync, unlinkSync, watch, writeFileSync } from 'fs';
import { join } from 'path';

import { loadConfig } from '@unocss/config';
import { createGenerator } from '@unocss/core';

const makeCss = async (js: string) => {
    const found: string[] = [];
    js.replace(/className:\s*"([^"]+)"/, (ok, what) => {
        found.push(...what.split(' '));
        return '';
    });
    const generator = await createGenerator((await loadConfig()).config);
    return generator.generate(found);
};

const bounce = (time: number, fn: () => unknown) => {
    let wait: null | Timer = null;
    return () => {
        if (wait != null) clearTimeout(wait);
        wait = setTimeout(() => fn(), time);
    };
};

let edited: string[] = [];
const rebuild = bounce(10, () => {
    console.log('rebuilding for', edited);
    edited = [];
    Bun.build({
        entrypoints: ['./run.tsx'],
        outdir: './',
        naming: 'run.js',
    })
        .then(async (one) => {
            if (!one.success) {
                if (existsSync('./run.js')) {
                    unlinkSync('./run.js');
                }
                console.log(one);
                throw new Error('build failureeee');
            }
            const css = await makeCss(readFileSync('./run.js', 'utf8'));
            writeFileSync('./run.css', css.css);
            console.log('rebuilt successfully');
        })
        .catch((err) => {
            console.log('failed? idk');
            console.error(err);
        });
});

const service = Bun.serve({
    port: 3152,
    async fetch(req) {
        let pathname = new URL(req.url).pathname;
        if (pathname === '/') {
            pathname = '/index.html';
        }
        // if (pathname === '/favicon.png') {
        //     return new Response(Bun.file('./favicon.png'));
        // }
        // if (pathname.startsWith('/fonts/')) {
        //     const path = join('../../../web', pathname.slice(1));
        //     return new Response(Bun.file(path));
        // }
        const file = Bun.file(join('.', pathname));
        return new Response(file);
    },
});

const ignore = ['.git/', 'node_modules/', 'worker.js', 'run.js'];

watch('..', { recursive: true }, (event, filename) => {
    if (ignore.some((n) => filename!.startsWith(n))) {
        // ignore
        return;
    }
    if (filename!.match(/\.tsx?$/)) {
        edited.push(filename!);
        rebuild();
    } else {
        console.log('ignore', filename);
    }
});

rebuild();

console.log(`Serving http://${service.hostname}:${service.port}`);
