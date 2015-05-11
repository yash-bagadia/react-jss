## React JSS

Use this [higher-order component](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750) to inject [JSS](https://github.com/jsstyles/jss) stylesheets into your React components. The stylesheet is attached when there is at least one mounted component that uses it, and automatically detached when all components using it are unmounted. React JSS is compatible with live reloading using [React Hot Loader](https://github.com/gaearon/react-hot-loader).

React JSS wraps your React component and injects `this.props.sheet`, which is just a regular [JSS stylesheet](https://github.com/jsstyles/jss), as a prop into your component. This is a common pattern that is used for composition in React instead of mixins, and works equally well with old-style `createClass` classes, as well as the ES6 classes.

Because JSS class names are namespaced by default, you will need to reach into `this.props.sheet.classes` to get their real names. For example, if you define a `button` class in your JSS stylesheet, its real name will be available as `this.props.sheet.classes.button`.

### Installation

```
npm install --save react-jss
```

### Examples

#### ES5

```js
var React = require('react');
var injectJSS = require('react-jss');

var styles = {
  button: {
    'background-color': 'yellow'
  },
  label: {
    'font-weight': 'bold'
  }
};

var Button = React.createClass({
  render: function () {
    var classes = this.props.sheet.classes;

    return (
      <div className={classes.button}>
        <span className={classes.label}>
          {this.props.children}
        </span>
      </div>
    );
  }
})

module.exports = injectJSS(styles)(Button);
```

#### ES6

```js
import React, { Component } from 'react';
import injectJSS from 'react-jss';

const styles = {
  button: {
    'background-color': 'yellow'
  },
  label: {
    'font-weight': 'bold'
  }
};

class Button extends Component {
  render() {
    const { classes } = this.props.sheet;

    return (
      <div className={classes.button}>
        <span className={classes.label}>
          {this.props.children}
        </span>
      </div>
    );
  }
}

export default injectJSS(styles)(Button);
```

#### ES7 with [decorators](https://github.com/wycats/javascript-decorators) (`{ "stage": 0 }` in [.babelrc](https://babeljs.io/docs/usage/babelrc/))

```js
import React, { Component } from 'react';
import injectJSS from 'react-jss';

const styles = {
  button: {
    'background-color': 'yellow'
  },
  label: {
    'font-weight': 'bold'
  }
};

@injectJSS(styles)
export default class Button extends Component {
  render() {
    const { classes } = this.props.sheet;

    return (
      <div className={classes.button}>
        <span className={classes.label}>
          {this.props.children}
        </span>
      </div>
    );
  }
};
```

### Do you have a `classSet` helper?

We used to support a `classSet` helper in 0.x, but React is removing `React.addons.classSet` soon, and so are we. There are many alternative userland solutions, such as Jed Watson's excellent [classnames](https://github.com/JedWatson/classnames) library, so we suggest you use it instead.

It's easy to use with generated class names. If you're writing in ES6, you can use computed property names in the object literal:

```js
import classSet from 'classnames';

  // ...

  render() {
    const { classes } = this.props.sheet;
    return (
      <div className={classSet({
        [classes.normal]: true,
        [classes.active]: this.state.active
      })}>
        {this.props.children}
      </div>
    );
  );
```

If you're still writing in ES5 ([you should consider Babel though!](https://babeljs.io/)), you can just supply an array:

```js
 var classSet = require('classnames');

  // ...

 render: function () {
    var classes = this.props.sheet.classes;
    return (
      <div className={classSet(
        classes.normal,
        this.state.active && classes.active
      )}>
        {this.props.children}
      </div>
    );
  }
```

Either way, you can see now that there is no real need for a dedicated `classSet` helper in this project.

### API

React JSS exports a function that, when invoked with `rules` and `options`, will return another function. That second function takes a `ReactClass` and wraps it, returning the wrapper `ReactClass`. Both `rules` and `options` are passed as arguments to `jss.createStyleSheet` call internally.

```
injectJSS: (rules, [, options]) => (ReactClass) => ReactClass
```

This partial application matches the signature for [ES7 decorators](https://github.com/wycats/javascript-decorators).

### License

MIT
