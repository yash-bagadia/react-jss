import expect from 'expect.js'
import {create as createJss} from 'jss'
import React from 'react'
import {render, unmountComponentAtNode} from 'react-dom'

import injectSheet, {create as createInjectSheet} from './'

const node = document.createElement('div')

describe('react-jss', () => {
  describe('.create()', () => {
    let localInjectSheet
    let jss

    beforeEach(() => {
      jss = createJss()
      localInjectSheet = createInjectSheet(jss)
    })

    afterEach(() => {
      unmountComponentAtNode(node)
    })

    it('should return a function', () => {
      expect(injectSheet).to.be.a(Function)
    })

    it('should use passed jss', () => {
      let passedJss
      const Component = ({sheet}) => {
        passedJss = sheet.options.jss
        return null
      }
      const WrappedComponent = localInjectSheet()(Component)
      render(<WrappedComponent />, node)
      expect(injectSheet)
      expect(passedJss).to.be(jss)
    })
  })

  describe('.injectSheet()', () => {
    let WrappedComponent

    beforeEach(() => {
      const Component = () => null
      WrappedComponent = injectSheet({
        button: {color: 'red'}
      })(Component)
    })

    it('should attach and detach a sheet', () => {
      render(<WrappedComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should reuse one sheet for 2 elements and detach sheet', () => {
      render(<WrappedComponent />, node)
      render(<WrappedComponent />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })
  })

  describe('.injectSheet() without a component for global styles', () => {
    let Container

    beforeEach(() => {
      Container = injectSheet({
        button: {color: 'red'}
      })()
    })

    it('should attach and detach a sheet', () => {
      render(<Container />, node)
      expect(document.querySelectorAll('style').length).to.be(1)
      unmountComponentAtNode(node)
      expect(document.querySelectorAll('style').length).to.be(0)
    })

    it('should render children', () => {
      let isRendered = true
      const Component = () => {
        isRendered = true
        return null
      }
      render(<Container><Component /></Container>, node)
      unmountComponentAtNode(node)
      expect(isRendered).to.be(true)
    })
  })
})
