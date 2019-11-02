# edtf-datepicker
Human friendly widget to produce dates as EDTF strings

## Acknowledgements

This datepicker is derived work from version 1.9.0 of [uxsolutions/bootstrap-datepicker](https://github.com/uxsolutions/bootstrap-datepicker), licensed under Apache License v2.0.

It also has a strict depency on [EDTF.js](https://github.com/inukshuk/edtf.js), licensed under AGPL v3.0.

## Requirements

- [Bootstrap](https://github.com/twbs/bootstrap) 2.0.4+
- [jQuery](https://github.com/jquery/jquery) 1.7.1+
- [EDTF.js](https://github.com/inukshuk/edtf.js) 2.7.0+

## Development

Once you cloned the repo, you'll need to install [grunt](https://gruntjs.com/) and the development dependencies using a package manager:

* [yarn](https://yarnpkg.com/) (recommended):

```
$ [sudo] yarn global add grunt-cli
$ yarn install
```

* [npm](https://www.npmjs.com/):

```
$ [sudo] npm install --global grunt-cli
$ npm install
```

To build the project, simply run:

```
$ npm run build
```

## Special notes on the EDTF dependency

While the widget in itself has been developed in ES5, it depends on the [EDTF.js parser](https://github.com/inukshuk/edtf.js), as registered in the `package.json` file. This library has been developed using ES6 features, and more specifically, **extends JavaScript built-ins** such as the `Date` element, which is not supported by older browsers, and [only partially transformed by Babel](https://babeljs.io/docs/en/learn#subclassable-built-ins). Therefore, this datepicker might not function well on older browsers, but feel free to open issues about it.

Moreover, the EDTF.js software being licensed as AGPL-3, it is not included in the `dist/js` directory as-is, but a simple `grunt browserify` command will generate an `edtf.js` file that can be used if needed. (this file is generated when building and required for the `index.html` demonstration page to function)
