## React JSS

This mixin makes [JSS](https://github.com/jsstyles/jss) easy to use from React components.
Classes are always namespaced so use `this.sheet.classes` to access their names.
Stylesheet is only attached until last instance is unmounted.

This mixin is compatible with live reloading via [React Hot Loader](https://github.com/gaearon/react-hot-loader).

### Example

```js
// buttonStyle.js
module.exports = {
  'button': {
    'background-color': 'yellow'
  }
};

// Button.jsx
var React = require('react'),
    useSheet = require('react-jss'),
    buttonStyle = require('./buttonStyle');

var Button = React.createClass({
  mixins: [useSheet(buttonStyle)],

  render() {
  
    // Set multiple classes.
    var containerClasses = this.classSet({
      navBar: true,
      isNavOpen: this.state.isOpen
    });
  
    // JSS sheet is available as this.sheet:
    return (
      <div className={containerClasses}
        <button className={this.sheet.classes.button}>
          {this.props.children}
        </button>
      </div>
    );
  }
});

module.exports = Button;
```

### License

MIT
