export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 192,
      propList: ['*', '!border*'],
      selectorBlackList: ['.no-rem'],
      minPixelValue: 2,
    },
  },
}