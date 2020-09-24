let { Chunks } = require('../Chunks');
let { VueLoaderPlugin } = require('vue-loader');
let AppendVueStylesPlugin = require('../webpackPlugins/Css/AppendVueStylesPlugin');
let Log = require('../Log');

class Vue {
    constructor() {
        this.chunks = Chunks.instance();
    }

    /**
     * Register the component.
     *
     * @param {object} options
     * @param {2|3} [options.version] Which version of Vue to support. Detected automatically if not given.
     * @param {string|null} [options.globalStyles] A file to include w/ every vue style block.
     * @param {boolean|string} [options.extractStyles] Whether or not to extract vue styles. If given a string the name of the file to extract to.
     */
    register(options = {}) {
        this.version = this.resolveVueVersion(options.version);

        this.options = {
            ...{
                globalStyles: null,
                extractStyles: false
            },
            ...options
        };

        Mix.globalStyles = this.options.globalStyles;
        Mix.extractingStyles = !!this.options.extractStyles;
    }

    /**
     * Required dependencies for the component.
     */
    dependencies() {
        let dependencies = [this.compilerName()];

        if (this.options.extractStyles && this.options.globalStyles) {
            dependencies.push('sass-resources-loader');
        }

        return dependencies;
    }

    /**
     * Override the generated webpack configuration.
     *
     * @param {Object} webpackConfig
     */
    webpackConfig(webpackConfig) {
        // push -> unshift to combat vue loader webpack 5 bug
        webpackConfig.module.rules.unshift({
            test: /\.vue$/,
            use: [
                {
                    loader: this.loaderName(),
                    options: Config.vue || {}
                }
            ]
        });

        // Alias Vue to its ESM build if the user has not already given an alias
        webpackConfig.resolve.alias = webpackConfig.resolve.alias || {};

        if (!webpackConfig.resolve.alias['vue$']) {
            if (this.version === 2) {
                webpackConfig.resolve.alias['vue$'] = 'vue/dist/vue.esm.js';
            } else if (this.version === 2) {
                webpackConfig.resolve.alias['vue$'] =
                    'vue/dist/vue.esm-bundler.js';
            }
        }

        webpackConfig.resolve.extensions.push('.vue');

        this.updateChunks();
    }

    /**
     * webpack plugins to be appended to the master config.
     */
    webpackPlugins() {
        return [this.loaderPlugin(), new AppendVueStylesPlugin()];
    }

    /**
     * Update CSS chunks to extract vue styles
     *
     */
    updateChunks() {
        if (this.options.extractStyles === false) {
            return;
        }

        this.chunks.add(
            'styles-vue',
            this.styleChunkName(),
            [/.vue$/, module => module.type === 'css/mini-extract'],
            {
                chunks: 'all',
                enforce: true,
                type: 'css/mini-extract'
            }
        );
    }

    styleChunkName() {
        // If the user set extractStyles: true, we'll try
        // to append the Vue styles to an existing CSS chunk.
        if (this.options.extractStyles === true) {
            // FIXME: This could possibly be smarter but for now it finds the first defined style chunk
            let chunk = this.chunks.find((chunk, id) => {
                return id.startsWith('styles-');
            });

            if (chunk) {
                return chunk.name;
            }
        }

        return this.extractFile().relativePathWithoutExtension();
    }

    /**
     * Determine the extract file name.
     */
    extractFileName() {
        let fileName =
            typeof this.options.extractStyles === 'string'
                ? this.options.extractStyles
                : '/css/vue-styles.css';

        return fileName.replace(Config.publicPath, '').replace(/^\//, '');
    }

    extractFile() {
        return new File(this.extractFileName());
    }

    detectVueVersion() {
        let vue;

        try {
            vue = require('vue');
        } catch (e) {
            return false;
        }

        if (/^3\./.test(vue.version)) {
            return 3;
        }

        if (/^2\./.test(vue.version)) {
            return 2;
        }

        return false;
    }

    /**
     * @param {number|string|null} version
     */
    resolveVueVersion(version) {
        version = version || this.detectVueVersion();

        if (!version) {
            Log.error(
                `We couldn't find Vue in your project. Please ensure that it's installed (npm install vue). You can also explicitly set the version number: mix.vue({ version: 2 }).`
            );

            throw new Error();
        }

        if (version !== 2 && version !== 3) {
            Log.error(`Vue ${version} is not yet supported by Laravel Mix.`);

            throw new Error();
        }

        return parseInt(version);
    }

    compilerName() {
        if (this.version === 3) {
            return '@vue/compiler-sfc';
        }

        return 'vue-template-compiler';
    }

    loaderName() {
        return 'vue-loader';
    }

    loaderPlugin() {
        return new VueLoaderPlugin();
    }
}

module.exports = Vue;
