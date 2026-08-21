/**
 * DSH 插件构建配置（模板）。
 *   lib/host/index.js   host 工具半（node：agent 工具、API 路由）
 *   lib/client.js       browser 半（web GUI：侧边栏注入 + 面板挂载）
 *
 * client 契约（官方 client-modules 装载链）：
 *   - CJS 输出，banner/footer 实现 window.__ModuleLoader__.load({ id, factory })
 *   - external = 平台清单（react 家族 + @deepseek-ai 运行时宿主供给）
 *   - sourcemap 供浏览器调试（/plugins/<id>/client.js.map）
 */
import { defineConfig } from 'tsdown'

const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default defineConfig([
  {
    entry: { index: 'src/host/index.ts' },
    outDir: 'lib/host',
    format: ['esm'],
    platform: 'node',
    deps: { neverBundle: [/^@deepseek-ai\//, /^node:/] },
    sourcemap: true,
    dts: true,
  },
  {
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    deps: {
      // 平台清单永不打包（运行时由宿主供给）；其余模块全部打进 bundle
      neverBundle: PLATFORM_MODULES,
      alwaysBundle: (id: string) => (PLATFORM_MODULES.includes(id) ? undefined : true),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    sourcemap: true,
    clean: false,
    dts: false,
    outputOptions: {
      exports: 'named',
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-xxx", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
