## 4.0.0 / 2016-09-24

- Added jss and jss-preset-default as a dependency, uses jss-preset-default by default #49.
- Added tests #28.
- Streamlined the api, default export is now a function without overloads, it is `injectSheet(styles, [options])(Component)`, same signature is used by ES7 decorators #37.
- Added component name as data-meta attribute to the sheet #22.
- Added a `create()` function to create a new `injectSheet` function which takes a `jss` instance.
- Updated readme.
- Added lint-staged.

