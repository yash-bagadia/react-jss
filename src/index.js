import jss from 'jss';

export default function useSheet(rules, options) {
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

  const Mixin = {
    componentWillMount() {
      this.sheet = ref();
    },

    componentWillUnmount() {
      deref();
      this.sheet = null;
    },

    classSet(classNames) {
      const sheet = this.sheet;

      return Object
        .keys(classNames)
        .filter(function (className) {
          return classNames[className];
        })
        .map(function (className) {
          return sheet.classes[className] || className;
        })
        .join(' ');
    }
  };

  // Support React Hot Loader
  if (module.hot) {
    Mixin.componentWillUpdate = function () {
      if (this.sheet !== sheet) {
        this.sheet.detach();
        this.sheet = ref();
      }
    };
  }

  return Mixin;
}