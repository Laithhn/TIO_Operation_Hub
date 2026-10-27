// Integrates the vendored VtWebGuiFramework 3.6.1 / VtWebGuiIcons 2.4.0 sources (vendor/) into the Vite build.
// The framework was written for webpack: module roots (assets/, components/, utils/, desktopApp, store),
// SCSS files imported as CSS modules, and a Sass importer that reads the JS design tokens. This plugin
// reproduces exactly that, scoped to the vendored files, so the upstream sources stay unmodified.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithEsbuild, type Plugin, type UserConfig } from 'vite';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
export const vtPaths = {
  framework: path.join(webRoot, 'vendor', 'vt-web-gui-framework', 'src'),
  icons: path.join(webRoot, 'vendor', 'vt-web-gui-icons'),
  shims: path.join(webRoot, 'src', 'vt', 'shims')
};

const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
const inVendor = (id?: string) => !!id && (norm(id).startsWith(norm(path.join(webRoot, 'vendor'))) || norm(id).startsWith(norm(vtPaths.shims)));
const MODULE_ROOTS = new Set(['assets', 'components', 'utils', 'desktopApp']);
const SHIMS: Record<string, string> = {
  store: 'store.js',
  'react-redux': 'react-redux.js',
  '@reduxjs/toolkit': 'toolkit.js',
  'react-router-hash-link': 'hashLink.js'
};
const MODULE_QUERY = '?vt.module.scss';

/** Same conversion as @indigotree/dart-sass-json-importer: objects → maps, arrays → lists, other values verbatim. */
function toScss(value: unknown): string {
  if (Array.isArray(value)) return `(${value.map(toScss).join(', ')})`;
  if (value && typeof value === 'object') return `(${Object.entries(value).map(([k, v]) => `${k}: ${toScss(v)}`).join(', ')})`;
  if (value === '') return '""';
  return String(value);
}

/** Resolves a framework module path (relative to a vendored file, or under a module root) to a .js file. */
function resolveJs(spec: string, from?: string): string {
  // Sass normalises "./x.js" to "x.js", so a relative location is tried first, then the module roots.
  const bases = [...(from ? [path.resolve(path.dirname(from), spec)] : []), path.join(vtPaths.framework, spec)];
  for (const base of bases) for (const c of [base, base + '.js', path.join(base, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  throw new Error(`vt-framework: cannot resolve ${spec} from ${from ?? 'framework root'}`);
}

/** Evaluates one of the framework's CommonJS token files (assets/defines/index.js, components/.../defines.js) in Node. */
function loadDefines(file: string, cache = new Map<string, unknown>()): Record<string, unknown> {
  if (cache.has(file)) return cache.get(file) as Record<string, unknown>;
  const module = { exports: {} as Record<string, unknown> };
  const req = (spec: string) => loadDefines(resolveJs(spec, file), cache);
  new Function('module', 'exports', 'require', fs.readFileSync(file, 'utf8'))(module, module.exports, req);
  cache.set(file, module.exports);
  return module.exports;
}

/** Sass importer replacing webpack's dart-sass-json-importer: `@use "<path>.js" as x;` yields the file's exports as SCSS maps. */
const jsDefinesImporter = {
  canonicalize(url: string, context: { containingUrl: URL | null }) {
    if (!/\.js$/.test(url) || url.startsWith('vtjs:')) return null;
    const from = context.containingUrl?.protocol === 'file:' ? fileURLToPath(context.containingUrl) : undefined;
    const file = url.startsWith('file:') ? fileURLToPath(url) : resolveJs(url, from);
    return new URL('vtjs:' + encodeURIComponent(file));
  },
  load(canonical: URL) {
    const file = decodeURIComponent(canonical.pathname);
    const defines = loadDefines(file);
    return { contents: Object.entries(defines).map(([k, v]) => `$${k}: ${toScss(v)};`).join('\n') + '\n', syntax: 'scss' as const };
  }
};

/** Browser side: the same token files are CommonJS; turn `require`/`module.exports` into ES imports/exports. */
function cjsDefinesToEsm(code: string): string {
  let n = 0;
  const imports: string[] = [];
  const body = code
    .replace(/const (\w+) = require\('([^']+)'\);/g, (_, name: string, spec: string) => { imports.push(`import ${name} from '${spec}';`); return ''; })
    .replace(/module\.exports\s*=/, () => { n++; return 'export default'; });
  if (!n) throw new Error('vt-framework: expected module.exports in a defines file');
  return imports.join('\n') + '\n' + body;
}

function svgComponent(svg: string): string {
  const m = svg.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  const attrs: Record<string, string> = {};
  for (const a of (m?.[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) {
    if (a[1].startsWith('xmlns')) continue;
    attrs[a[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = a[2];
  }
  return `import { createElement } from 'react';\nconst attrs = ${JSON.stringify(attrs)};\nconst html = ${JSON.stringify(m?.[2] ?? '')};\n` +
    `export default function Svg(props) { return createElement('svg', { ...attrs, ...props, dangerouslySetInnerHTML: { __html: html } }); }\n`;
}

export function vtFramework(): Plugin {
  return {
    name: 'vt-web-gui-framework',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.startsWith('@vt/icons')) return this.resolve(path.join(vtPaths.icons, source.slice('@vt/icons'.length)), importer, { ...options, skipSelf: true });
      if (source.startsWith('@vt/')) {
        // The hub may reuse framework stylesheets as CSS modules (as the framework's own components do); only the global sheet stays global.
        const r = await this.resolve(path.join(vtPaths.framework, source.slice(4)), importer, { ...options, skipSelf: true });
        return r && /\.scss$/.test(r.id) && !/assets[\\/]styles[\\/]index\.scss$/.test(r.id) ? r.id + MODULE_QUERY : r;
      }
      if (!inVendor(importer)) return null;
      const first = source.split('/')[0];
      let resolved: { id: string } | null = null;
      if (SHIMS[source]) return path.join(vtPaths.shims, SHIMS[source]);
      if (first === 'VtWebGuiIcons') resolved = await this.resolve(path.join(vtPaths.icons, source.slice(first.length)), importer, { ...options, skipSelf: true });
      else if (MODULE_ROOTS.has(first)) resolved = await this.resolve(path.join(vtPaths.framework, source), importer, { ...options, skipSelf: true });
      else if (/\.s?css$/.test(source)) resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && /\.scss$/.test(resolved.id)) return resolved.id + MODULE_QUERY;
      return resolved;
    },
    load(id) {
      if (inVendor(id) && /\.svg$/.test(id)) return svgComponent(fs.readFileSync(id, 'utf8'));
      return null;
    },
    async transform(code, id) {
      if (!inVendor(id) || !/\.js$/.test(id.split('?')[0])) return null;
      // The framework writes JSX in .js files and its token files in CommonJS (webpack/Babel handled both).
      const src = /[\\/]defines(?:[\\/]index)?\.js$/.test(id) && code.includes('module.exports') ? cjsDefinesToEsm(code) : code;
      const out = await transformWithEsbuild(src, id, { loader: 'jsx', jsx: 'automatic' });
      return { code: out.code, map: out.map };
    }
  };
}

/** Vite config fragment: Sass load paths and the generated defines, CSS-module naming as in the framework's dev build, process.env defines. */
export function vtConfig(): UserConfig {
  return {
    css: {
      modules: {
        // As css-loader's localIdentName '[name]__[local]__[hash:base64:5]' in the framework's development build.
        generateScopedName: (local: string, file: string) => {
          const clean = file.split('?')[0];
          const hash = createHash('md5').update(norm(clean) + local).digest('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5);
          return `${path.basename(clean, '.scss')}__${local}__${hash}`;
        }
      },
      preprocessorOptions: { scss: { api: 'modern-compiler', loadPaths: [vtPaths.framework], importers: [jsDefinesImporter], quietDeps: true, silenceDeprecations: ['mixed-decls', 'slash-div'] } as never }
    },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    define: {
      'process.env.ELEM_ID_ROOT': JSON.stringify('root'),
      'process.env.ELEM_ID_TEMP': JSON.stringify('viTemporaries'),
      'process.env.DESKTOP_APP': 'false',
      'process.env.URL_I18N': JSON.stringify('/i18n')
    }
  };
}
