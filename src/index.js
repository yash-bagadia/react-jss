import React from 'react';
import jss from 'jss';

export default function injectSheet(rules, options) {
  let refs = 0;
  let sheet = null;

  function attach() {
    if (!sheet)
      sheet = jss.createStyleSheet(rules, options);

    sheet.attach();
  }

  function detach() {
    sheet.detach();
  }

  function ref() {
    if (refs === 0)
      attach();

    refs++;
    return sheet;
  }

  function deref() {
    refs--;

    if (refs === 0)
      detach();
  }

  return function wrap(DecoratedComponent) {
    const displayName =
      DecoratedComponent.displayName ||
      DecoratedComponent.name ||
      'Component';

    return class StyleSheetWrapper {
      static wrapped = DecoratedComponent;
      static displayName = `JSS(${displayName})`;

      componentWillMount() {
        this.sheet = ref();
      }

      componentWillUpdate() {
        if (process.env.NODE_ENV !== 'production') {
          // Support React Hot Loader
          if (this.sheet !== sheet) {
            this.sheet.detach();
            this.sheet = ref();
          }
        }
      }

      componentWillUnmount() {
        deref();
        this.sheet = null;
      }

      render() {
        return (
          <DecoratedComponent {...this.props}
                              sheet={this.sheet} />
        );
      }
    }
  };
}