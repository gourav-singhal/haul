import * as babel from '@babel/core';
import cache from './vendor/cache';
import transform from './vendor/transform';

const pkg = require('../../../../package.json');

const injectCaller = (opts: {
  [key: string]: any;
  caller?: { [key: string]: any };
}) => ({
  ...opts,
  caller: {
    name: 'babelWorkerLoader',
    supportsStaticESM: true,
    supportsDynamicImport: true,
    ...opts.caller,
  },
});

export async function process(
  this: any,
  source: string,
  inputSourceMap: string,
  filename: string,
  loaderOptions: {
    sourceMap?: any;
    sourceMaps?: any;
    cacheDirectory?: string;
    cacheIdentifier?: string;
    cacheCompression?: boolean;
  },
  sourceMap: string
) {
  if ('sourceMap' in loaderOptions && !('sourceMaps' in loaderOptions)) {
    loaderOptions = {
      ...loaderOptions,
      sourceMaps: loaderOptions.sourceMap,
    };
    delete loaderOptions.sourceMap;
  }

  const programmaticOptions = {
    ...loaderOptions,
    filename,
    inputSourceMap: inputSourceMap || undefined,
    sourceMaps:
      loaderOptions.sourceMaps === undefined
        ? sourceMap
        : loaderOptions.sourceMaps,
    sourceFileName: filename,
  };

  // Remove loader related options
  delete programmaticOptions.cacheDirectory;
  delete programmaticOptions.cacheIdentifier;
  delete programmaticOptions.cacheCompression;

  const config = babel!.loadPartialConfig(injectCaller(programmaticOptions));
  if (config) {
    let options = config.options;

    if (options.sourceMaps === 'inline') {
      // Babel glitch
      options.sourceMaps = true;
    }

    const { cacheDirectory = null, cacheCompression = true } = loaderOptions;

    const result = cacheDirectory
      ? await cache({
          source,
          options,
          cacheDirectory,
          cacheIdentifier:
            loaderOptions.cacheIdentifier ||
            JSON.stringify({
              options,
              '@haul-bundle/core': pkg.version,
            }),
          cacheCompression,
        })
      : await transform(source, options);

    if (result) {
      return [result.code, result.map];
    }
  }
  return [source, inputSourceMap];
}
