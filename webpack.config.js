const fs = require('fs'); 
const path = require('path');
const webpack = require('webpack');

function isProduction(env) {
    return typeof env != 'undefined' && env.production;
}
const babel = {
    loader: 'babel-loader',
    options: {
        cacheDirectory: true
    }
};

module.exports = env => { return {
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.jsx?$/,
                include: function(absPath){ return (/frontend\/src/.test(absPath) || /exact-trie/.test(absPath) || /react-children-utilities/.test(absPath) || /react-element-spinner/.test(absPath) || /recoil/.test(absPath) || /src/.test(absPath)); },
                use: [
                    babel
                ]
            },
            {
                test: /\.tsx?$/,
                use: [
                    babel,
                    {
                        loader: 'ts-loader',
                        options: { allowTsInNodeModules: true, transpileOnly: true }
                    }
                ],
            }
        ]
    },
    resolve: {
        extensions: [ '.js', '.jsx', '.ts', '.tsx' ],
        alias: {
            'material-ui': 'material-ui/es',
        },
        modules: [path.resolve(__dirname, 'modules'), 'node_modules']
    },
    entry: path.resolve(__dirname, 'src', 'index.tsx'),
    mode: isProduction(env) ? 'production' : 'development',
    output: {
        filename: 'core_script_compiled.js',
        path: __dirname,
        pathinfo: false
    },
    devtool: isProduction(env) ? false : 'eval-cheap-module-source-map',
    optimization: {
        usedExports: true,
        concatenateModules: isProduction(env),
        removeAvailableModules: isProduction(env),
        removeEmptyChunks: isProduction(env),
        splitChunks: {
            chunks: 'async',
            minSize: 30000,
            maxSize: 0,
            minChunks: 1,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
            automaticNameDelimiter: '~',
            automaticNameMaxLength: 30,
            name: true,
            cacheGroups: {
              vendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true
              }
            }
        }
    },
    externals: {
        "react-cache": 'ReactCache',
        'babylonjs': 'BABYLON'
    },
    plugins: [
        //new BundleAnalyzerPlugin()
    ]
}};
