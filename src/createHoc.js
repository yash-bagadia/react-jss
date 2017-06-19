import React, {Component} from 'react'
import {instanceOf} from 'prop-types'
import {SheetsRegistry, getDynamicStyles} from 'jss'
import { themeListener } from '@iamstarkov/theming-w-listener'
import compose from './compose'
import getDisplayName from './getDisplayName'

const interceptor = initialState => {
  let state = initialState;
  return newState => {
    if (typeof newState !== 'undefined') {
      state = newState;
    }
    return state;
  };
}

const getStyles = (stylesOrSheet, theme) => {
  if (typeof stylesOrSheet !== 'function') {
    return stylesOrSheet;
  }
  return stylesOrSheet(theme)
}

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Jss} jss
 * @param {Component} InnerComponent
 * @param {Object|StyleSheet} stylesOrSheet
 * @param {Object} [options]
 * @return {Component}
 */
export default (jss, InnerComponent, stylesOrSheet, options = {}) => {
  const isThemingEnabled = typeof stylesOrSheet === 'function'
  let contextTypes = { jssSheetsRegistry: instanceOf(SheetsRegistry) }
  if (isThemingEnabled) {
    contextTypes = Object.assign({}, contextTypes, themeListener.contextTypes)
  }
  const displayName = `Jss(${getDisplayName(InnerComponent)})`
  const sharedStaticSheet = interceptor();
  const sharedStaticSheetCount = interceptor(0);

  // TODO: hot reload, current status of it, which version and how people use it
  // TODO: tests
  // TODO: if stylesOrSheet is sheet, or function returns a sheet:
  //  warning in dev, nothing in prod
  //  warning: we dont support theming for theming
  // TODO: Server-Side Rendering
  //  both dynamicSheet and staticSheet should be added in SheetsRegistry
  //  add tests for SSR's dynamicSheet
  // TODO: meta
  // TODO: add options for dynamicSheet and merge createHoc's options with { link: true };
  // TODO: ref counter
  // TODO: add reference to InnerComponent
  // TODO: tests:
  //  new theming
  //  fault-tolerant warning when stylesOrSheet is Sheet or its a function when
  //  rerender on theme updates with static and dynamic sheets
  //  it does work when functional styles uses different props
  //  in function styles: theme.color === (props => props.theme.color)()
  // TODO theming: deepEqual in componentWillReceiveProps for theme and warning
  // TODO two insctances of the same component with same functional styles but with different themes

  return class Jss extends Component {
    static displayName = displayName
    static InnerComponent = InnerComponent
    static contextTypes = contextTypes
    static defaultProps = InnerComponent.defaultProps

    constructor(props, context) {
      super(props, context)

      let theme;
      if (isThemingEnabled) {
        theme = themeListener.initial(context)
      }

      this.state = {
        ...this.createSheets(theme),
        theme
      }
    }

    createSheets = (theme) => {
      if (!sharedStaticSheet()) {
        sharedStaticSheet(
          jss.createStyleSheet(getStyles(stylesOrSheet, theme), options)
        )
      }
      const dynamicStyles = compose(sharedStaticSheet(), getDynamicStyles(getStyles(stylesOrSheet, theme)))
      let dynamicSheet;
      if (dynamicStyles) {
        dynamicSheet = jss.createStyleSheet(dynamicStyles, { link: true })
      }
      return { staticSheet: sharedStaticSheet, dynamicSheet }
    }

    attachSheets = (state) => {
      if (sharedStaticSheetCount() === 0) {
        state.staticSheet().attach()
      }
      sharedStaticSheetCount(sharedStaticSheetCount() + 1)
      if (state.dynamicSheet) {
        state.dynamicSheet.update(this.props).attach()
      }
      console.log(sharedStaticSheetCount())
    }

    setTheme = theme => this.setState({theme})

    componentWillMount() {
      this.attachSheets(this.state)
    }

    componentDidMount() {
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme);
    }

    componentWillReceiveProps(nextProps) {
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && nextState.theme && this.state.theme !== nextState.theme) {
        const newSheets = this.createSheets(nextState.theme)
        this.attachSheets(newSheets)
        this.setState(newSheets)
      }
    }

    componentDidUpdate(prevProps, prevState) {
      if (prevState.staticSheet() !== this.state.staticSheet) {
        sharedStaticSheetCount(sharedStaticSheetCount() - 1)
        if (sharedStaticSheetCount() === 0) {
          jss.removeStyleSheet(prevState.staticSheet)
        }
      }
      if (prevState.dynamicSheet !== this.state.dynamicSheet) {
        jss.removeStyleSheet(prevState.dynamicSheet)
      }
    }

    componentWillUnmount() {
      if (isThemingEnabled && this.unsubscribe) {
        unsubscribe()
      }
      sharedStaticSheetCount(sharedStaticSheetCount() - 1)
      if (sharedStaticSheetCount() === 0) {
        this.state.staticSheet().detach()
      }
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.detach()
      }
      console.log(sharedStaticSheetCount())
    }

    render() {
      const sheet = this.state.dynamicSheet || this.state.staticSheet()
      const theme = this.state.theme;
      return <InnerComponent sheet={sheet} classes={sheet.classes} theme={theme} {...this.props} />
    }
  }
}
