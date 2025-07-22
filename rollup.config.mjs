import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
// import livereload from 'rollup-plugin-livereload';

export default [
  {
    input: 'popup/index.js',
    output: {
      dir: 'dist/popup',
      format: 'iife',
    },
    plugins: [
      // livereload({
      //   watch: 'popup/',
      //   verbose: true,
      //   delay: 1000,
      // }),
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs(),
      copy({
        targets: [
          {
            src: ['manifest.json', 'background.js', 'content.js', 'popup', 'images', 'lib'],
            dest: 'dist'
          }
        ]
      })
    ]
  }
];