export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 75,
      propList: ['*', '!border*'],
      selectorBlackList: ['.no-rem'],
      minPixelValue: 2,
    },
  },
}