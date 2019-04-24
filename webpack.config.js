const ROOT_DIR = __dirname;
const SRC_DIR = `${ROOT_DIR}/src`;

const config = {
    mode: "production",
    name: "common",
    context: ROOT_DIR,
    entry: `${SRC_DIR}/index.ts`,
    output: {
        path: ROOT_DIR,
        filename: "index.js",
        pathinfo: false,
        globalObject: "this"
    },
    resolve: {
        extensions: [ ".ts" ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "babel-loader",
                exclude: [ "node_modules" ]
            }
        ]
    },
    performance: {
        hints: false
    },
    node: {
        fs: "empty"
    }
};

export default config;
